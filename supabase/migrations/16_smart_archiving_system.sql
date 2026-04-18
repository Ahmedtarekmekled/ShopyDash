-- =====================================================
-- 16_SMART_ARCHIVING_SYSTEM.SQL
-- Custom Archiving for Shops (Months) and Couriers (Days)
-- =====================================================

-- 1. Add is_archived column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.parent_orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Modify RLS so Drivers and Shops CANNOT see archived orders
-- (Admins and Security Definer Functions can still see them)

-- For Orders (Shops view)
DROP POLICY IF EXISTS "Shop owners can view own orders" ON public.orders;
CREATE POLICY "Shop owners can view own orders"
  ON public.orders FOR SELECT
  USING (owns_shop(shop_id) AND is_archived = false);

-- For Parent Orders (Drivers view)
DROP POLICY IF EXISTS "Drivers can view their parent orders" ON public.parent_orders;
CREATE POLICY "Drivers can view their parent orders"
  ON public.parent_orders FOR SELECT
  USING (auth.uid() = delivery_user_id AND is_archived = false);


-- 3. Create the Manual Cleanup Function (RPC)
CREATE OR REPLACE FUNCTION admin_cleanup_old_data(
    p_shop_months INT DEFAULT 6,
    p_courier_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shop_date TIMESTAMPTZ := NOW() - (p_shop_months || ' months')::INTERVAL;
    v_courier_date TIMESTAMPTZ := NOW() - (p_courier_days || ' days')::INTERVAL;
    v_deleted_notifications INT;
    v_deleted_cancelled_orders INT;
    v_archived_orders INT;
    v_archived_parent_orders INT;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- A. Hard Delete: Old Notifications (Older than the max of both)
    WITH deleted_notifs AS (
        DELETE FROM notifications 
        WHERE created_at < LEAST(v_shop_date, v_courier_date)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_notifications FROM deleted_notifs;

    -- B. Hard Delete: Fully Cancelled/Rejected Orders (No financial impact)
    WITH deleted_orders AS (
        DELETE FROM orders 
        WHERE status IN ('CANCELLED', 'REJECTED') 
          AND created_at < v_shop_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_cancelled_orders FROM deleted_orders;

    -- C. Soft Delete (Archive): Shop Orders
    WITH archived_o AS (
        UPDATE orders 
        SET is_archived = true 
        WHERE status = 'DELIVERED' 
          AND created_at < v_shop_date
          AND is_archived = false
        RETURNING id
    )
    SELECT COUNT(*) INTO v_archived_orders FROM archived_o;

    -- D. Soft Delete (Archive): Courier Parent Orders
    WITH archived_po AS (
        UPDATE parent_orders 
        SET is_archived = true 
        WHERE status = 'DELIVERED' 
          AND created_at < v_courier_date
          AND is_archived = false
        RETURNING id
    )
    SELECT COUNT(*) INTO v_archived_parent_orders FROM archived_po;

    -- Return Summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cleanup completed successfully.',
        'deleted_notifications', v_deleted_notifications,
        'deleted_cancelled_orders', v_deleted_cancelled_orders,
        'archived_shop_orders', v_archived_orders,
        'archived_courier_orders', v_archived_parent_orders
    );
END;
$$;
