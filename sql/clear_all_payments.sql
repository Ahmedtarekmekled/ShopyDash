-- =====================================================
-- FORCE CLEAR ALL COMMISSION PAYMENTS
-- Run this in Supabase SQL Editor
-- This will delete all commission payments and solve the 
-- negative outstanding balances that occurred from test manual payments.
-- =====================================================

TRUNCATE TABLE public.commission_payments;
TRUNCATE TABLE public.driver_payments;
