-- =====================================================
-- ABO-HOMMOS MARKETPLACE - ROW LEVEL SECURITY POLICIES
-- Security Check: Enforce Shop Approval for Product Creation
-- =====================================================

-- Drop the overly permissive existing policies that only check ownership
DROP POLICY IF EXISTS "Shop owners can create products" ON products;
DROP POLICY IF EXISTS "Shop owners can update own products" ON products;

-- 1. Create Policy: Must own shop AND shop must be APPROVED securely
CREATE POLICY "Shop owners can create products"
  ON products FOR INSERT
  WITH CHECK (
    owns_shop(shop_id) AND 
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND status = 'APPROVED')
  );

-- 2. Update Policy: Must own shop AND shop must be APPROVED securely
CREATE POLICY "Shop owners can update own products"
  ON products FOR UPDATE
  USING (
    owns_shop(shop_id) AND 
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND status = 'APPROVED')
  )
  WITH CHECK (
    owns_shop(shop_id) AND 
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND status = 'APPROVED')
  );
