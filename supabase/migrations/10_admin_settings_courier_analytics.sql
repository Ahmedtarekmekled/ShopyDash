-- =====================================================
-- ADMIN DELIVERY SETTINGS & COURIER ANALYTICS
-- =====================================================

-- 1. Create delivery_settings table for Admin controls (Platform Pause, Fees, etc.)
CREATE TABLE IF NOT EXISTS delivery_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    base_fee DECIMAL DEFAULT 0,
    km_rate DECIMAL DEFAULT 0,
    pickup_stop_fee DECIMAL DEFAULT 0,
    min_fee DECIMAL DEFAULT 0,
    max_fee DECIMAL DEFAULT 0,
    max_active_orders INT DEFAULT 3,
    platform_fee_fixed DECIMAL DEFAULT 0,
    platform_fee_percent DECIMAL DEFAULT 0,
    return_to_customer BOOLEAN DEFAULT false,
    mapbox_profile TEXT DEFAULT 'driving',
    fallback_mode TEXT DEFAULT 'fixed_fee',
    fixed_fallback_fee DECIMAL DEFAULT 0,
    is_platform_paused BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT delivery_settings_singleton CHECK (id)
);

-- Enable RLS
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read of settings so the frontend can check `is_platform_paused` if needed
CREATE POLICY "Public can read delivery settings" ON delivery_settings
    FOR SELECT USING (true);

-- Only admins can update delivery_settings
CREATE POLICY "Admins can update delivery settings" ON delivery_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- Insert default row
INSERT INTO delivery_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 2. Courier Analytics Chart RPC
CREATE OR REPLACE FUNCTION get_courier_analytics(
    p_courier_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    date TEXT,
    earnings DECIMAL,
    delivered_count BIGINT
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
    SELECT 
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
        SUM(COALESCE(total_delivery_fee, 0)) as earnings,
        COUNT(id) as delivered_count
    FROM parent_orders
    WHERE delivery_user_id = p_courier_id
      AND status = 'DELIVERED'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC;
END;
$$ LANGUAGE plpgsql;
