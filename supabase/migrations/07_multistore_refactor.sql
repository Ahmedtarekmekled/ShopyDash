-- =====================================================
-- MULTI-STORE & REGION LIMITS REFACTORING
-- =====================================================

-- 1. Create region_limits table
CREATE TABLE IF NOT EXISTS region_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    max_stores_allowed INTEGER DEFAULT 3 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(region_id)
);

-- Enable RLS for region_limits
ALTER TABLE region_limits ENABLE ROW LEVEL SECURITY;

-- Admins can manage region limits
CREATE POLICY "Admins can manage region limits"
  ON region_limits
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );

-- Everyone can read active region limits (needed for checkout validation)
CREATE POLICY "Anyone can read region limits"
  ON region_limits FOR SELECT
  USING (is_active = TRUE);


-- 2. Refactor cancel_shop_order RPC to subtract from parent totals
DROP FUNCTION IF EXISTS cancel_shop_order(UUID, TEXT, UUID, order_status);

CREATE OR REPLACE FUNCTION cancel_shop_order(
    p_order_id UUID,
    p_reason TEXT,
    p_actor_id UUID,
    p_status order_status
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_status order_status;
    v_parent_id UUID;
    v_order_subtotal DECIMAL(10, 2);
    v_order_total DECIMAL(10, 2);
    v_sibling_statuses order_status[];
    v_new_parent_status VARCHAR;
BEGIN
    -- Input Validation
    IF length(trim(p_reason)) = 0 OR p_reason IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason is required';
    END IF;

    IF p_status NOT IN ('CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
         RAISE EXCEPTION 'Invalid cancellation status';
    END IF;

    -- Fetch current status, parent_id, and monetary values
    SELECT status, parent_order_id, subtotal, total 
    INTO v_order_status, v_parent_id, v_order_subtotal, v_order_total
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Strict Status Validation
    IF v_order_status IN ('OUT_FOR_DELIVERY', 'DELIVERED') THEN
        RAISE EXCEPTION 'Cannot cancel order in current status (%)', v_order_status;
    END IF;

    -- Check if already cancelled
    IF v_order_status::text LIKE 'CANCELLED%' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    -- Atomic Update of Sub-Order
    UPDATE orders 
    SET status = p_status,
        cancellation_reason = p_reason,
        cancelled_by = p_actor_id,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Parent Sync Logic
    IF v_parent_id IS NOT NULL THEN
        -- 1. Deduct monetary amounts from parent order
        UPDATE parent_orders
        SET subtotal = GREATEST(0, subtotal - COALESCE(v_order_subtotal, 0)),
            total = GREATEST(0, total - COALESCE(v_order_total, 0)),
            updated_at = NOW()
        WHERE id = v_parent_id;

        -- 2. Recalculate Parent Status
        -- Get all sibling statuses (including the one just updated)
        SELECT array_agg(status) INTO v_sibling_statuses
        FROM orders
        WHERE parent_order_id = v_parent_id;

        -- Determine if ALL siblings are now cancelled
        IF (
            SELECT bool_and(
                s::text = 'CANCELLED' OR 
                s::text = 'CANCELLED_BY_SHOP' OR 
                s::text = 'CANCELLED_BY_ADMIN'
            )
            FROM unnest(v_sibling_statuses) s
        ) THEN
            v_new_parent_status := 'CANCELLED';
        ELSE
            v_new_parent_status := NULL; 
        END IF;

        IF v_new_parent_status IS NOT NULL THEN
            UPDATE parent_orders
            SET status = v_new_parent_status,
                updated_at = NOW()
            WHERE id = v_parent_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Order cancelled successfully',
        'status', p_status
    );
END;
$$ LANGUAGE plpgsql;

-- Grant access
GRANT EXECUTE ON FUNCTION cancel_shop_order(UUID, TEXT, UUID, order_status) TO authenticated;

