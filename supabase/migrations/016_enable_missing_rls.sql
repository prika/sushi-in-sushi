-- =============================================
-- SUSHI IN SUSHI - ENABLE MISSING RLS
-- Migration: 016_enable_missing_rls.sql
-- Description: Enable Row Level Security on tables that were missing it
-- =============================================

-- =============================================
-- ROLES TABLE
-- Note: roles table was created in 001 but RLS was never enabled
-- =============================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read roles (needed for auth checks)
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
CREATE POLICY "Anyone can view roles" ON roles
    FOR SELECT USING (true);

-- Only admins can manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Service role can manage roles (for system operations)
DROP POLICY IF EXISTS "Service role can manage roles" ON roles;
CREATE POLICY "Service role can manage roles" ON roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- TABLES TABLE (base table for restaurant tables)
-- =============================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Policies already created in 007, but let's ensure they exist
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
CREATE POLICY "Anyone can view tables" ON tables
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage tables" ON tables;
CREATE POLICY "Admins can manage tables" ON tables
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role can manage tables" ON tables;
CREATE POLICY "Service role can manage tables" ON tables
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products (public menu)
DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

-- Admins can manage products
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products" ON products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories (public menu)
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Admins can manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role can manage categories" ON categories;
CREATE POLICY "Service role can manage categories" ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- SESSIONS TABLE
-- =============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies already created in 007, but ensure complete set
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
CREATE POLICY "Anyone can view sessions" ON sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
CREATE POLICY "Anyone can update sessions" ON sessions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;
CREATE POLICY "Service role can manage sessions" ON sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- ORDERS TABLE
-- =============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies already created in 007, but ensure complete set
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders
    FOR SELECT USING (true);

-- Staff can update orders (kitchen needs to update status)
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
CREATE POLICY "Anyone can update orders" ON orders
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Service role can manage orders" ON orders;
CREATE POLICY "Service role can manage orders" ON orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE roles IS 'User roles for access control (admin, kitchen, waiter, customer)';
COMMENT ON TABLE tables IS 'Restaurant tables for both locations';
COMMENT ON TABLE products IS 'Menu products/items';
COMMENT ON TABLE categories IS 'Product categories for menu organization';
COMMENT ON TABLE sessions IS 'Table sessions (dining experiences)';
COMMENT ON TABLE orders IS 'Individual orders within sessions';
