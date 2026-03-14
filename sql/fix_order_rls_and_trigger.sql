-- =====================================================
-- FIX: Order RLS Policies + Parent Status Trigger + RPC
-- Run this ENTIRE script in your Supabase SQL Editor
-- =====================================================

-- ─────────────────────────────────────────────────────
-- STEP 1: Fix order_items RLS Policies
-- ─────────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;
CREATE POLICY "Anyone can view order items" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage order items" ON order_items;
CREATE POLICY "Admins can manage order items" ON order_items
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  );

-- ─────────────────────────────────────────────────────
-- STEP 2: Fix order_status_history RLS Policies
-- ─────────────────────────────────────────────────────
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view status history" ON order_status_history;
CREATE POLICY "Anyone can view status history" ON order_status_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own status history" ON order_status_history;
CREATE POLICY "Users can insert own status history" ON order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shop owners can insert status history" ON order_status_history;
CREATE POLICY "Shop owners can insert status history" ON order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN shops ON shops.id = orders.shop_id
      WHERE orders.id = order_id
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage status history" ON order_status_history;
CREATE POLICY "Admins can manage status history" ON order_status_history
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  );

-- ─────────────────────────────────────────────────────
-- STEP 3: Fix orders table RLS Policies
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────
-- STEP 4: Create the update_shop_order_status RPC function
-- This is what the shop owner calls to accept/progress orders
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_shop_order_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_id UUID;
    v_sibling_statuses TEXT[];
    v_new_parent_status TEXT;
BEGIN
    -- 1. Update the Sub-Order status
    UPDATE orders 
    SET status = p_status::order_status, 
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING parent_order_id INTO v_parent_id;

    -- If the order was not found at all
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- If it's a standalone order (no parent), just return success
    IF v_parent_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Standalone order updated');
    END IF;

    -- 2. Calculate New Parent Status based on ALL siblings
    SELECT array_agg(status::text) INTO v_sibling_statuses
    FROM orders
    WHERE parent_order_id = v_parent_id;

    IF v_sibling_statuses IS NULL THEN
        RETURN jsonb_build_object('success', true, 'parent_id', v_parent_id);
    END IF;

    IF 'DELIVERED' = ALL(v_sibling_statuses) THEN
        v_new_parent_status := 'DELIVERED';
    ELSIF 'CANCELLED' = ALL(v_sibling_statuses) OR 'CANCELLED_BY_SHOP' = ALL(v_sibling_statuses) OR 'CANCELLED_BY_ADMIN' = ALL(v_sibling_statuses) THEN
        v_new_parent_status := 'CANCELLED';
    ELSIF 'OUT_FOR_DELIVERY' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'OUT_FOR_DELIVERY';
    ELSIF 'READY_FOR_PICKUP' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'READY_FOR_PICKUP';
    ELSIF 'PREPARING' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'PROCESSING';
    ELSIF 'CONFIRMED' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'PROCESSING';
    ELSE
        v_new_parent_status := 'PLACED';
    END IF;

    -- 3. Update Parent Order
    UPDATE parent_orders
    SET status = v_new_parent_status,
        updated_at = NOW()
    WHERE id = v_parent_id;

    RETURN jsonb_build_object(
        'success', true, 
        'parent_id', v_parent_id, 
        'new_parent_status', v_new_parent_status
    );
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (Shop Owners, Admins, etc.)
GRANT EXECUTE ON FUNCTION update_shop_order_status(UUID, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────
-- STEP 5: Ensure Parent Order Status Trigger exists
-- (Backup sync mechanism for when direct SQL updates happen)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_parent_order_status()
RETURNS TRIGGER AS $$
DECLARE
    p_id UUID;
    sibling_statuses TEXT[];
    new_parent_status TEXT;
BEGIN
    p_id := NEW.parent_order_id;
    
    IF p_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT array_agg(status::text) INTO sibling_statuses
    FROM orders
    WHERE parent_order_id = p_id;

    IF 'DELIVERED' = ALL(sibling_statuses) THEN
        new_parent_status := 'DELIVERED';
    ELSIF 'CANCELLED' = ALL(sibling_statuses) OR 'CANCELLED_BY_SHOP' = ALL(sibling_statuses) OR 'CANCELLED_BY_ADMIN' = ALL(sibling_statuses) THEN
        new_parent_status := 'CANCELLED';
    ELSIF 'OUT_FOR_DELIVERY' = ANY(sibling_statuses) THEN
        new_parent_status := 'OUT_FOR_DELIVERY';
    ELSIF 'READY_FOR_PICKUP' = ANY(sibling_statuses) THEN
        new_parent_status := 'READY_FOR_PICKUP';
    ELSIF 'PREPARING' = ANY(sibling_statuses) THEN
        new_parent_status := 'PROCESSING';
    ELSIF 'CONFIRMED' = ANY(sibling_statuses) THEN
        new_parent_status := 'PROCESSING';
    ELSE
        new_parent_status := 'PLACED';
    END IF;

    UPDATE parent_orders 
    SET status = new_parent_status, updated_at = NOW() 
    WHERE id = p_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_parent_status_trigger ON orders;
CREATE TRIGGER update_parent_status_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_parent_order_status();

DROP TRIGGER IF EXISTS update_parent_on_link_trigger ON orders;
CREATE TRIGGER update_parent_on_link_trigger
AFTER UPDATE OF parent_order_id ON orders
FOR EACH ROW
WHEN (NEW.parent_order_id IS NOT NULL AND OLD.parent_order_id IS NULL)
EXECUTE FUNCTION update_parent_order_status();

-- ─────────────────────────────────────────────────────
-- STEP 6: Fix parent_orders RLS
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "parent_orders_select" ON parent_orders;
CREATE POLICY "parent_orders_select" ON parent_orders
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = delivery_user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ADMIN', 'DELIVERY'))
  );

DROP POLICY IF EXISTS "parent_orders_insert" ON parent_orders;
CREATE POLICY "parent_orders_insert" ON parent_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parent_orders_update" ON parent_orders;
CREATE POLICY "parent_orders_update" ON parent_orders
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    auth.uid() = delivery_user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ADMIN', 'DELIVERY'))
  );

-- ─────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────
SELECT 'RPC Functions' as check_type, proname as name
FROM pg_proc 
WHERE proname IN ('update_shop_order_status', 'update_parent_order_status', 'update_driver_order_status')
UNION ALL
SELECT 'Triggers' as check_type, tgname as name
FROM pg_trigger 
WHERE tgname IN ('update_parent_status_trigger', 'update_parent_on_link_trigger');
