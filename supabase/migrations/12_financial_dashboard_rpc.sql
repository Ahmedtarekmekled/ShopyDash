-- =====================================================
-- 12_FINANCIAL_DASHBOARD_RPC.SQL
-- Accounting-Grade Dashboards
-- =====================================================

-- 1. SHOPS FINANCIAL DASHBOARD
CREATE OR REPLACE FUNCTION get_financial_dashboard_shops(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    shop_id UUID,
    shop_name TEXT,
    is_premium BOOLEAN,
    total_orders BIGINT,
    gross_revenue DECIMAL,
    commission_owed DECIMAL,
    commission_paid DECIMAL,
    subscription_owed DECIMAL,
    subscription_paid DECIMAL,
    premium_owed DECIMAL,
    premium_paid DECIMAL,
    total_outstanding DECIMAL,
    last_payment_date TIMESTAMPTZ,
    financial_status TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    RETURN QUERY
    WITH OrderAgg AS (
        SELECT 
            o.shop_id,
            COUNT(o.id) as total_orders,
            SUM(COALESCE(o.shop_gross_revenue, 0)) as gross_rev,
            SUM(COALESCE(o.shop_platform_fee, 0)) as comm_owed
        FROM orders o
        WHERE o.status = 'DELIVERED'
          AND (p_start_date IS NULL OR o.created_at >= p_start_date)
          AND (p_end_date IS NULL OR o.created_at <= p_end_date)
        GROUP BY o.shop_id
    ),
    CommPayments AS (
        SELECT cp.shop_id, SUM(cp.amount) as paid, MAX(cp.paid_at) as last_paid
        FROM commission_payments cp
        WHERE (p_start_date IS NULL OR cp.paid_at >= p_start_date)
          AND (p_end_date IS NULL OR cp.paid_at <= p_end_date)
        GROUP BY cp.shop_id
    ),
    PremiumAgg AS (
        SELECT pp.shop_id, 
               SUM(pp.amount) as owed, 
               SUM(CASE WHEN pp.payment_date IS NOT NULL THEN pp.amount ELSE 0 END) as paid,
               MAX(pp.payment_date) as last_paid
        FROM premium_subscription_payments pp
        WHERE (p_start_date IS NULL OR pp.created_at >= p_start_date)
          AND (p_end_date IS NULL OR pp.created_at <= p_end_date)
        GROUP BY pp.shop_id
    ),
    SubAgg AS (
        SELECT sp.shop_id, 
               SUM(sp.amount) as owed, 
               SUM(CASE WHEN sp.status = 'PAID' THEN sp.amount ELSE 0 END) as paid,
               MAX(sp.paid_at) as last_paid
        FROM subscription_payments sp
        WHERE (p_start_date IS NULL OR sp.created_at >= p_start_date)
          AND (p_end_date IS NULL OR sp.created_at <= p_end_date)
        GROUP BY sp.shop_id
    )
    SELECT 
        s.id as shop_id,
        s.name as shop_name,
        COALESCE(s.is_premium_active, false) as is_premium,
        COALESCE(oa.total_orders, 0) as total_orders,
        COALESCE(oa.gross_rev, 0) as gross_revenue,
        COALESCE(oa.comm_owed, 0) as commission_owed,
        COALESCE(cp.paid, 0) as commission_paid,
        COALESCE(sub.owed, 0) as subscription_owed,
        COALESCE(sub.paid, 0) as subscription_paid,
        COALESCE(prem.owed, 0) as premium_owed,
        COALESCE(prem.paid, 0) as premium_paid,
        
        -- Total Outstanding = (All Owed) - (All Paid)
        (
            COALESCE(oa.comm_owed, 0) + COALESCE(sub.owed, 0) + COALESCE(prem.owed, 0)
        ) - (
            COALESCE(cp.paid, 0) + COALESCE(sub.paid, 0) + COALESCE(prem.paid, 0)
        ) as total_outstanding,
        
        GREATEST(cp.last_paid, sub.last_paid, prem.last_paid) as last_payment_date,
        
        -- Dynamic Status Evaluation
        CASE 
            WHEN (
                COALESCE(oa.comm_owed, 0) + COALESCE(sub.owed, 0) + COALESCE(prem.owed, 0)
                - (COALESCE(cp.paid, 0) + COALESCE(sub.paid, 0) + COALESCE(prem.paid, 0))
            ) > 5000 THEN 'CRITICAL'
            WHEN (
                COALESCE(oa.comm_owed, 0) + COALESCE(sub.owed, 0) + COALESCE(prem.owed, 0)
                - (COALESCE(cp.paid, 0) + COALESCE(sub.paid, 0) + COALESCE(prem.paid, 0))
            ) > 1000 THEN 'LATE'
            ELSE 'GOOD'
        END as financial_status
        
    FROM shops s
    LEFT JOIN OrderAgg oa ON s.id = oa.shop_id
    LEFT JOIN CommPayments cp ON s.id = cp.shop_id
    LEFT JOIN PremiumAgg prem ON s.id = prem.shop_id
    LEFT JOIN SubAgg sub ON s.id = sub.shop_id
    ORDER BY total_outstanding DESC NULLS LAST
    LIMIT p_limit 
    OFFSET p_offset;

END;
$$ LANGUAGE plpgsql;


-- 2. DRIVERS FINANCIAL DASHBOARD
DROP FUNCTION IF EXISTS get_financial_dashboard_drivers(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT);
CREATE OR REPLACE FUNCTION get_financial_dashboard_drivers(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    driver_phone TEXT,
    total_deliveries BIGINT,
    gross_earnings DECIMAL,
    platform_fee_owed DECIMAL,
    customer_fee_owed DECIMAL,
    platform_fee_paid DECIMAL,
    total_outstanding DECIMAL,
    last_settlement_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    RETURN QUERY
    WITH DriverAgg AS (
        SELECT 
            po.delivery_user_id,
            COUNT(po.id) as total_deliveries,
            SUM(COALESCE(po.total_delivery_fee, 0)) as gross_earnings,
            SUM(COALESCE(po.driver_platform_fee_amount, 0)) as fee_owed,
            SUM(COALESCE(po.platform_fee, 0)) as customer_fee_owed
        FROM parent_orders po
        WHERE po.status = 'DELIVERED' AND po.delivery_user_id IS NOT NULL
          AND (p_start_date IS NULL OR po.created_at >= p_start_date)
          AND (p_end_date IS NULL OR po.created_at <= p_end_date)
        GROUP BY po.delivery_user_id
    ),
    DriverPays AS (
        SELECT dp.driver_id, SUM(dp.amount) as paid, MAX(dp.paid_at) as last_paid
        FROM driver_payments dp
        WHERE (p_start_date IS NULL OR dp.paid_at >= p_start_date)
          AND (p_end_date IS NULL OR dp.paid_at <= p_end_date)
        GROUP BY dp.driver_id
    )
    SELECT 
        p.id as driver_id,
        p.full_name as driver_name,
        p.phone as driver_phone,
        COALESCE(da.total_deliveries, 0) as total_deliveries,
        COALESCE(da.gross_earnings, 0) as gross_earnings,
        COALESCE(da.fee_owed, 0) as platform_fee_owed,
        COALESCE(da.customer_fee_owed, 0) as customer_fee_owed,
        COALESCE(dp.paid, 0) as platform_fee_paid,
        ((COALESCE(da.fee_owed, 0) + COALESCE(da.customer_fee_owed, 0)) - COALESCE(dp.paid, 0)) as total_outstanding,
        dp.last_paid as last_settlement_date
    FROM profiles p
    LEFT JOIN DriverAgg da ON p.id = da.delivery_user_id
    LEFT JOIN DriverPays dp ON p.id = dp.driver_id
    WHERE p.role = 'DELIVERY'
    ORDER BY total_outstanding DESC NULLS LAST
    LIMIT p_limit 
    OFFSET p_offset;

END;
$$ LANGUAGE plpgsql;


-- 3. PLATFORM FINANCIAL DASHBOARD (Global Rollup)
CREATE OR REPLACE FUNCTION get_financial_dashboard_platform(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shop_comm_owed DECIMAL := 0;
    v_shop_comm_paid DECIMAL := 0;
    
    v_prem_owed DECIMAL := 0;
    v_prem_paid DECIMAL := 0;
    
    v_sub_owed DECIMAL := 0;
    v_sub_paid DECIMAL := 0;
    
    v_driver_fee_owed DECIMAL := 0;
    v_driver_fee_paid DECIMAL := 0;

    v_customer_fee_paid DECIMAL := 0;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    -- Aggregate Shop Commissions
    SELECT COALESCE(SUM(shop_platform_fee), 0) INTO v_shop_comm_owed
    FROM orders WHERE status = 'DELIVERED' 
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);
      
    SELECT COALESCE(SUM(amount), 0) INTO v_shop_comm_paid
    FROM commission_payments 
    WHERE (p_start_date IS NULL OR paid_at >= p_start_date)
      AND (p_end_date IS NULL OR paid_at <= p_end_date);

    -- Aggregate Premiums
    SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(CASE WHEN payment_date IS NOT NULL THEN amount ELSE 0 END), 0)
    INTO v_prem_owed, v_prem_paid
    FROM premium_subscription_payments
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    -- Aggregate Subscriptions
    SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0)
    INTO v_sub_owed, v_sub_paid
    FROM subscription_payments
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    -- Aggregate Driver Fees
    SELECT COALESCE(SUM(driver_platform_fee_amount), 0) INTO v_driver_fee_owed
    FROM parent_orders WHERE status = 'DELIVERED'
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);
      
    -- Aggregate Customer Platform Fees (Owed by drivers, not yet held by platform)
    SELECT COALESCE(SUM(platform_fee), 0) INTO v_customer_fee_paid
    FROM parent_orders WHERE status = 'DELIVERED'
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    RETURN jsonb_build_object(
        'shop_commissions', jsonb_build_object('owed', v_shop_comm_owed, 'paid', v_shop_comm_paid, 'outstanding', v_shop_comm_owed - v_shop_comm_paid),
        'premium_subscriptions', jsonb_build_object('owed', v_prem_owed, 'paid', v_prem_paid, 'outstanding', v_prem_owed - v_prem_paid),
        'regular_subscriptions', jsonb_build_object('owed', v_sub_owed, 'paid', v_sub_paid, 'outstanding', v_sub_owed - v_sub_paid),
        'driver_fees', jsonb_build_object('owed', v_driver_fee_owed, 'paid', v_driver_fee_paid, 'outstanding', v_driver_fee_owed - v_driver_fee_paid),
        'customer_fees', jsonb_build_object('owed', v_customer_fee_paid),
        'platform_total', jsonb_build_object(
            'total_receivable_outstanding', (v_shop_comm_owed - v_shop_comm_paid) + (v_prem_owed - v_prem_paid) + (v_sub_owed - v_sub_paid) + (v_driver_fee_owed - v_driver_fee_paid) + v_customer_fee_paid,
            'total_collected', v_shop_comm_paid + v_prem_paid + v_sub_paid + v_driver_fee_paid,
            'net_profit', v_shop_comm_paid + v_prem_paid + v_sub_paid + v_driver_fee_paid
        )
    );
END;
$$ LANGUAGE plpgsql;

-- GRANT EXECUTES
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_shops TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_drivers TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_platform TO authenticated;

-- RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 4. DRIVER PERSONAL FINANCIAL DASHBOARD
CREATE OR REPLACE FUNCTION get_my_driver_financials()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
    
    v_deliveries_owed DECIMAL := 0;
    v_customer_cash_owed DECIMAL := 0;
    v_total_paid DECIMAL := 0;
BEGIN
    -- Security Check
    SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
    IF v_role != 'DELIVERY' AND v_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Access Denied: Drivers only.';
    END IF;

    -- Aggregate Owed
    SELECT 
        COALESCE(SUM(driver_platform_fee_amount), 0),
        COALESCE(SUM(platform_fee), 0)
    INTO 
        v_deliveries_owed,
        v_customer_cash_owed
    FROM parent_orders 
    WHERE status = 'DELIVERED' AND delivery_user_id = v_user_id;

    -- Aggregate Paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM driver_payments 
    WHERE driver_id = v_user_id;

    RETURN jsonb_build_object(
        'deliveries_fee_owed', v_deliveries_owed,
        'customer_cash_owed', v_customer_cash_owed,
        'total_owed', v_deliveries_owed + v_customer_cash_owed,
        'total_paid', v_total_paid,
        'net_outstanding', (v_deliveries_owed + v_customer_cash_owed) - v_total_paid
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_my_driver_financials TO authenticated;
