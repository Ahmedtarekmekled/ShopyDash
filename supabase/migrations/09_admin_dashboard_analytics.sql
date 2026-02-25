-- =====================================================
-- ADMIN DASHBOARD ANALYTICS & METRICS
-- =====================================================

-- 1. Global Metrics RPC
CREATE OR REPLACE FUNCTION get_admin_global_metrics(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
) 
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_revenue DECIMAL := 0;
    v_total_commission DECIMAL := 0;
    v_active_shops INT := 0;
    v_pending_shops INT := 0;
    v_active_drivers INT := 0;
    v_online_drivers INT := 0;
    v_avg_order_value DECIMAL := 0;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    -- Revenue & Commission (Parent Orders for precision of platform fees)
    SELECT 
        COALESCE(SUM(total), 0), 
        COALESCE(SUM(platform_fee), 0), 
        COALESCE(AVG(total), 0)
    INTO v_total_revenue, v_total_commission, v_avg_order_value
    FROM parent_orders
    WHERE status = 'DELIVERED'
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    -- Shop Stats
    SELECT COUNT(*) INTO v_active_shops FROM shops WHERE status = 'APPROVED' AND is_open = TRUE;
    SELECT COUNT(*) INTO v_pending_shops FROM shops WHERE status = 'PENDING';

    -- Driver Stats
    SELECT COUNT(*) INTO v_active_drivers FROM profiles WHERE role = 'DELIVERY';

    -- Build JSON
    RETURN jsonb_build_object(
        'total_revenue', v_total_revenue,
        'total_commission', v_total_commission,
        'active_shops', v_active_shops,
        'pending_shops', v_pending_shops,
        'active_drivers', v_active_drivers,
        'online_drivers', v_online_drivers,
        'avg_order_value', v_avg_order_value
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Shop Performance Metrics RPC
CREATE OR REPLACE FUNCTION get_shop_performance_metrics(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    shop_id UUID,
    shop_name TEXT,
    shop_logo TEXT,
    total_orders BIGINT,
    completed_orders BIGINT,
    cancelled_orders BIGINT,
    revenue DECIMAL,
    commission_paid DECIMAL,
    acceptance_rate DECIMAL
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
    WITH ShopStats AS (
        SELECT 
            o.shop_id,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN o.status LIKE 'CANCELLED%' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(CASE WHEN o.status = 'DELIVERED' THEN o.total ELSE 0 END) as revenue_gen
        FROM orders o
        WHERE (p_start_date IS NULL OR o.created_at >= p_start_date)
          AND (p_end_date IS NULL OR o.created_at <= p_end_date)
        GROUP BY o.shop_id
    )
    SELECT 
        s.id as shop_id,
        s.name as shop_name,
        s.logo_url as shop_logo,
        COALESCE(ss.total_orders, 0) as total_orders,
        COALESCE(ss.completed_orders, 0) as completed_orders,
        COALESCE(ss.cancelled_orders, 0) as cancelled_orders,
        COALESCE(ss.revenue_gen, 0) as revenue,
        0::DECIMAL as commission_paid,  -- Multi-store holds Platform Fee externally
        CASE 
            WHEN COALESCE(ss.total_orders, 0) > 0 
            THEN ROUND((COALESCE(ss.completed_orders, 0)::DECIMAL / COALESCE(ss.total_orders, 1)::DECIMAL) * 100, 2)
            ELSE 0 
        END as acceptance_rate
    FROM shops s
    LEFT JOIN ShopStats ss ON s.id = ss.shop_id
    ORDER BY ss.total_orders DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- 3. Driver Performance Metrics RPC
CREATE OR REPLACE FUNCTION get_driver_performance_metrics(
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
    completed_deliveries BIGINT,
    cancelled_deliveries BIGINT,
    earnings DECIMAL,
    acceptance_rate DECIMAL
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
    WITH DriverStats AS (
        SELECT 
            po.delivery_user_id,
            COUNT(po.id) as total_deliveries,
            SUM(CASE WHEN po.status = 'DELIVERED' THEN 1 ELSE 0 END) as completed_deliveries,
            SUM(CASE WHEN po.status LIKE 'CANCELLED%' THEN 1 ELSE 0 END) as cancelled_deliveries,
            SUM(CASE WHEN po.status = 'DELIVERED' THEN COALESCE(po.total_delivery_fee, 0) ELSE 0 END) as total_earnings
        FROM parent_orders po
        WHERE po.delivery_user_id IS NOT NULL
          AND (p_start_date IS NULL OR po.created_at >= p_start_date)
          AND (p_end_date IS NULL OR po.created_at <= p_end_date)
        GROUP BY po.delivery_user_id
    )
    SELECT 
        p.id as driver_id,
        p.full_name as driver_name,
        p.phone as driver_phone,
        COALESCE(ds.total_deliveries, 0) as total_deliveries,
        COALESCE(ds.completed_deliveries, 0) as completed_deliveries,
        COALESCE(ds.cancelled_deliveries, 0) as cancelled_deliveries,
        COALESCE(ds.total_earnings, 0) as earnings,
        CASE 
            WHEN COALESCE(ds.total_deliveries, 0) > 0 
            THEN ROUND((COALESCE(ds.completed_deliveries, 0)::DECIMAL / COALESCE(ds.total_deliveries, 1)::DECIMAL) * 100, 2)
            ELSE 0 
        END as acceptance_rate
    FROM profiles p
    LEFT JOIN DriverStats ds ON p.id = ds.delivery_user_id
    WHERE p.role = 'DELIVERY'
    ORDER BY ds.total_deliveries DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 4. Platform Growth Chart RPC
CREATE OR REPLACE FUNCTION get_platform_growth_chart(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    day_date DATE,
    total_orders BIGINT,
    total_revenue DECIMAL
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
        DATE(created_at) as day_date,
        COUNT(id) as total_orders,
        SUM(CASE WHEN status = 'DELIVERED' THEN total ELSE 0 END) as total_revenue
    FROM parent_orders
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC;
END;
$$ LANGUAGE plpgsql;
