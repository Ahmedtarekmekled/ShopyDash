-- ENABLE ROW LEVEL SECURITY FOR FINANCIAL SETTINGS TABLES

-- 1. Shop Financial Settings
ALTER TABLE shop_financial_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on shop_financial_settings
CREATE POLICY "Admins can manage shop_financial_settings"
ON shop_financial_settings FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Shop owners can ONLY read their own shop_financial_settings
CREATE POLICY "Shop owners can view their own shop_financial_settings"
ON shop_financial_settings FOR SELECT
TO authenticated
USING (
  shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
);


-- 2. Driver Financial Settings
ALTER TABLE driver_financial_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on driver_financial_settings
CREATE POLICY "Admins can manage driver_financial_settings"
ON driver_financial_settings FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Drivers can ONLY read their own driver_financial_settings
CREATE POLICY "Drivers can view their own driver_financial_settings"
ON driver_financial_settings FOR SELECT
TO authenticated
USING (driver_id = auth.uid());
