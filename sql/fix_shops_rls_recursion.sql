-- ==========================================
-- FIX FOR INFINITE RECURSION IN SHOPS TABLE
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- Ensure RLS is enabled
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 1. Drop all existing policies on shops to break any recursive loops
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'shops' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shops', pol.policyname);
  END LOOP;
END $$;

-- 2. Create clean, direct policies that do not query the 'shops' table or helper functions that might recurse

-- A) Anyone can view shops
CREATE POLICY "Anyone can view shops" 
ON public.shops FOR SELECT 
USING (true);

-- B) Authenticated users can create their own shop
CREATE POLICY "Users can create their own shop" 
ON public.shops FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

-- C) Owners and Admins can update shops
CREATE POLICY "Owners and Admins can update shops" 
ON public.shops FOR UPDATE 
TO authenticated 
USING (
  owner_id = auth.uid() OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
)
WITH CHECK (
  owner_id = auth.uid() OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- D) Owners and Admins can delete shops
CREATE POLICY "Owners and Admins can delete shops" 
ON public.shops FOR DELETE 
TO authenticated 
USING (
  owner_id = auth.uid() OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Reset the caching or notify user
-- Recursion is usually solved by this.
