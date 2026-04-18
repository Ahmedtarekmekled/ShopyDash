-- =====================================================
-- 11_FINANCIAL_MANAGEMENT_CORE.SQL
-- Full Financial Management System Implementation
-- =====================================================

-- 1. ADD PREMIUM COLUMNS TO SHOPS
-- We ensure the legacy is_premium is replaced or shadowed appropriately
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'is_premium_active') THEN
        ALTER TABLE public.shops ADD COLUMN is_premium_active BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'premium_expires_at') THEN
        ALTER TABLE public.shops ADD COLUMN premium_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. FINANCIAL SETTINGS TABLES
CREATE TABLE IF NOT EXISTS public.shop_financial_settings (
    shop_id UUID PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5,2) DEFAULT 0.00,
    subscription_fee DECIMAL(10,2) DEFAULT 0.00,
    financial_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_cycle_start_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.driver_financial_settings (
    driver_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform_fee_type TEXT DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' or 'FLAT'
    platform_fee_rate DECIMAL(10,2) DEFAULT 0.00,
    financial_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 3. LEDGER TABLES (Strictly insert-only records for auditing)
CREATE TABLE IF NOT EXISTS public.commission_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id),
    amount DECIMAL(10,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_by_admin UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id),
    billing_month DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PAID',
    notes TEXT,
    created_by_admin UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.premium_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_by_admin UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id),
    amount DECIMAL(10,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_by_admin UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect Ledgers from destructive edits
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert and select commission_payments" ON public.commission_payments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admins can insert and select subscription_payments" ON public.subscription_payments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admins can insert and select premium_payments" ON public.premium_subscription_payments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admins can insert and select driver_payments" ON public.driver_payments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));


-- 4. PER-ORDER FINANCIAL SNAPSHOT COLUMNS
DO $$ 
BEGIN
    -- Orders table (Shop Snapshot)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shop_platform_commission_rate') THEN
        ALTER TABLE public.orders ADD COLUMN shop_platform_commission_rate DECIMAL(5,2);
        ALTER TABLE public.orders ADD COLUMN shop_gross_revenue DECIMAL(10,2);
        ALTER TABLE public.orders ADD COLUMN shop_platform_fee DECIMAL(10,2);
        ALTER TABLE public.orders ADD COLUMN shop_net_revenue DECIMAL(10,2);
    END IF;

    -- Parent Orders table (Driver Snapshot)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_orders' AND column_name = 'driver_platform_fee_type') THEN
        ALTER TABLE public.parent_orders ADD COLUMN driver_platform_fee_type TEXT;
        ALTER TABLE public.parent_orders ADD COLUMN driver_platform_fee_rate DECIMAL(10,2);
        ALTER TABLE public.parent_orders ADD COLUMN driver_platform_fee_amount DECIMAL(10,2);
        ALTER TABLE public.parent_orders ADD COLUMN driver_net_earning DECIMAL(10,2);
    END IF;
END $$;


-- 5. ORDER COMPLETION TRIGGERS FOR SNAPSHOTTING
-- Trigger for Shop Commission (orders table)
CREATE OR REPLACE FUNCTION snapshot_shop_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2) := 0;
    v_financial_start TIMESTAMPTZ;
BEGIN
    -- Only trigger when status CHANCES to DELIVERED
    IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
        -- Fetch current live settings for this shop
        SELECT commission_percentage, financial_start_date 
        INTO v_commission_rate, v_financial_start
        FROM public.shop_financial_settings
        WHERE shop_id = NEW.shop_id;

        -- If the shop has a financial start date, and this order is created AFTER it, we calculate
        IF v_financial_start IS NOT NULL AND NEW.created_at >= v_financial_start THEN
            NEW.shop_platform_commission_rate := COALESCE(v_commission_rate, 0);
            NEW.shop_gross_revenue := NEW.total;
            -- Convert percentage to multiplier (e.g., 10% = 0.1)
            NEW.shop_platform_fee := (NEW.total * COALESCE(v_commission_rate, 0) / 100);
            NEW.shop_net_revenue := NEW.total - NEW.shop_platform_fee;
        ELSE
            -- Pre-financial start date: platform takes 0, historically immutable
            NEW.shop_platform_commission_rate := 0;
            NEW.shop_gross_revenue := NEW.total;
            NEW.shop_platform_fee := 0;
            NEW.shop_net_revenue := NEW.total;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_snapshot_shop_financials ON public.orders;
CREATE TRIGGER trigger_snapshot_shop_financials
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION snapshot_shop_financials();


-- Trigger for Driver Platform Fee (parent_orders table)
CREATE OR REPLACE FUNCTION snapshot_driver_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_type TEXT := 'PERCENTAGE';
    v_fee_rate DECIMAL(10,2) := 0;
    v_financial_start TIMESTAMPTZ;
    v_delivery_fee DECIMAL(10,2) := COALESCE(NEW.total_delivery_fee, 0);
BEGIN
    -- Only trigger when STATUS changes to DELIVERED and there is a driver
    IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' AND NEW.delivery_user_id IS NOT NULL THEN
        
        -- Fetch current live settings for this driver
        SELECT platform_fee_type, platform_fee_rate, financial_start_date
        INTO v_fee_type, v_fee_rate, v_financial_start
        FROM public.driver_financial_settings
        WHERE driver_id = NEW.delivery_user_id;

        -- Check financial start date bounding
        IF v_financial_start IS NOT NULL AND NEW.created_at >= v_financial_start THEN
            NEW.driver_platform_fee_type := v_fee_type;
            NEW.driver_platform_fee_rate := COALESCE(v_fee_rate, 0);
            
            IF v_fee_type = 'FLAT' THEN
                NEW.driver_platform_fee_amount := LEAST(v_fee_rate, v_delivery_fee); -- Don't charge more than fee itself
            ELSE
                -- PERCENTAGE
                NEW.driver_platform_fee_amount := (v_delivery_fee * COALESCE(v_fee_rate, 0) / 100);
            END IF;
            
            NEW.driver_net_earning := v_delivery_fee - NEW.driver_platform_fee_amount;
        ELSE
            -- Pre-financial start date
            NEW.driver_platform_fee_type := 'PERCENTAGE';
            NEW.driver_platform_fee_rate := 0;
            NEW.driver_platform_fee_amount := 0;
            NEW.driver_net_earning := v_delivery_fee;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_snapshot_driver_financials ON public.parent_orders;
CREATE TRIGGER trigger_snapshot_driver_financials
BEFORE UPDATE ON public.parent_orders
FOR EACH ROW
EXECUTE FUNCTION snapshot_driver_financials();


-- 6. PREMIUM EXPIRATION CRON JOB
-- Supabase relies on pg_cron for scheduled jobs. We create a function to clean up expired premiums.
CREATE OR REPLACE FUNCTION expire_premium_shops()
RETURNS void AS $$
BEGIN
    UPDATE public.shops
    SET is_premium_active = false
    WHERE is_premium_active = true 
      AND premium_expires_at IS NOT NULL 
      AND premium_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe setup of pg_cron wrapper (In case pg_cron isn't loaded, this avoids blocking the whole script)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Run every hour at minute 0
        PERFORM cron.schedule('expire-premium-shops-hourly', '0 * * * *', 'SELECT expire_premium_shops();');
    ELSE
        RAISE NOTICE 'pg_cron extension is not enabled. Please enable it in Supabase dashboard to allow automatic premium expiration, or call expire_premium_shops() via RPC from a worker.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to schedule cron job. Ensure pg_cron is enabled.';
END $$;

