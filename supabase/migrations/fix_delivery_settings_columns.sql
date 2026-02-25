-- Add missing columns to delivery_settings table
ALTER TABLE public.delivery_settings 
    ADD COLUMN IF NOT EXISTS is_platform_paused BOOLEAN DEFAULT false;

-- Fix RLS: drop old policies and recreate with proper WITH CHECK for writes
DROP POLICY IF EXISTS "Admins can update delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Admins can insert delivery settings" ON public.delivery_settings;

CREATE POLICY "Admins can update delivery settings" ON public.delivery_settings
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admins can insert delivery settings" ON public.delivery_settings
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Reload cache
NOTIFY pgrst, 'reload schema';
