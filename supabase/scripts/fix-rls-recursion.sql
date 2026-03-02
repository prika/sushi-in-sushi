-- =============================================
-- FIX RLS INFINITE RECURSION
-- =============================================
-- Problem: Migration 016 created policies that:
-- 1. Self-reference the roles table (infinite recursion)
-- 2. Use s.id = auth.uid() instead of s.auth_user_id = auth.uid()
--
-- Fix: Use is_current_user_admin() SECURITY DEFINER function
-- which was created in migration 011 and doesn't trigger RLS.
--
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- ROLES TABLE: Fix infinite recursion
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- TABLES TABLE: Fix wrong auth check
DROP POLICY IF EXISTS "Admins can manage tables" ON tables;
CREATE POLICY "Admins can manage tables" ON tables
    FOR ALL
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- PRODUCTS TABLE: Fix wrong auth check
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
    FOR ALL
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- CATEGORIES TABLE: Fix wrong auth check
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());
