-- =====================================================
-- ADMIN DASHBOARD ANALYTICS & METRICS: Top Customers
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_customers_metrics(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    user_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    total_orders BIGINT,
    total_spent DECIMAL
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
        po.user_id::UUID,
        MAX(po.customer_name) as customer_name,
        MAX(po.customer_phone) as customer_phone,
        COUNT(po.id) as total_orders,
        SUM(po.total) as total_spent
    FROM 
        parent_orders po
    WHERE 
        po.status != 'CANCELLED'
        AND (p_start_date IS NULL OR po.created_at >= p_start_date)
        AND (p_end_date IS NULL OR po.created_at <= p_end_date)
    GROUP BY 
        po.user_id
    ORDER BY 
        total_orders DESC
    LIMIT 
        p_limit;
END;
$$ LANGUAGE plpgsql;
