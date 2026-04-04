-- =====================================================
-- ADMIN DASHBOARD: Cancelled Orders Analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_cancelled_orders_by_shop(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    shop_id UUID,
    shop_name TEXT,
    cancelled_count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    RETURN QUERY
    SELECT 
        o.shop_id,
        MAX(s.name) as shop_name,
        COUNT(o.id) as cancelled_count
    FROM orders o
    JOIN shops s ON o.shop_id = s.id
    WHERE o.status::TEXT LIKE 'CANCELLED%'
      AND (p_start_date IS NULL OR o.created_at >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at <= p_end_date)
    GROUP BY o.shop_id
    ORDER BY cancelled_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cancellation_reasons(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    reason TEXT,
    reason_count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Admins only.';
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(o.cancellation_reason, 'بدون سبب') as reason,
        COUNT(o.id) as reason_count
    FROM orders o
    WHERE o.status::TEXT LIKE 'CANCELLED%'
      AND (p_start_date IS NULL OR o.created_at >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at <= p_end_date)
    GROUP BY COALESCE(o.cancellation_reason, 'بدون سبب')
    ORDER BY reason_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
