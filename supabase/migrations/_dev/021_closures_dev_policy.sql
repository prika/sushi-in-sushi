-- =============================================
-- RESTAURANT CLOSURES - DEV POLICY
-- Migration: 021_closures_dev_policy.sql
-- =============================================
--
-- Adds a permissive development policy to restaurant_closures table
-- to work with custom JWT authentication (not Supabase Auth)
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow read for authenticated users" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow read for anon (for reservation form)" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow insert/update/delete for admin" ON restaurant_closures;

-- Development policy (permissive - allows all operations)
-- This works with custom JWT auth where auth.uid() is not available
DROP POLICY IF EXISTS "Restaurant_closures dev policy" ON restaurant_closures;
CREATE POLICY "Restaurant_closures dev policy" ON restaurant_closures
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Restaurant closures dev policy added';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';
END $$;
