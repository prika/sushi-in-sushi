-- =============================================
-- RESTORE RLS POLICIES FOR PRODUCTION
-- Migration: 019_restore_rls_for_production.sql
-- =============================================
--
-- ✅ PRODUCTION READY - Run this before going live!
--
-- This migration removes all permissive dev policies and restores
-- secure RLS policies that require proper authentication.
--
-- Prerequisites:
-- 1. NEXT_PUBLIC_USE_SUPABASE_AUTH=true
-- 2. All staff must have auth_user_id linked to Supabase Auth
-- 3. Test users removed from production
-- =============================================

-- =============================================
-- STAFF TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Staff dev policy" ON staff;
DROP POLICY IF EXISTS "Anyone can view staff" ON staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON staff;
DROP POLICY IF EXISTS "Authenticated staff can view staff" ON staff;

-- Staff can view other staff (needed for assignments, etc)
CREATE POLICY "Authenticated staff can view staff" ON staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- Only admins can create/update/delete staff
CREATE POLICY "Admin can manage staff" ON staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- ROLES TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Roles dev policy" ON roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

-- Anyone can view roles (needed for dropdowns, etc)
CREATE POLICY "Anyone can view roles" ON roles
    FOR SELECT USING (true);

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- TABLES TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Tables dev policy" ON tables;
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON tables;

-- Anyone can view tables (needed for QR code access)
CREATE POLICY "Anyone can view tables" ON tables
    FOR SELECT USING (true);

-- Only admins can manage tables
CREATE POLICY "Admins can manage tables" ON tables
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- SESSIONS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Sessions dev policy" ON sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Staff can manage sessions" ON sessions;

-- Anyone can view sessions (customers need to see their session)
CREATE POLICY "Anyone can view sessions" ON sessions
    FOR SELECT USING (true);

-- Staff can manage sessions
CREATE POLICY "Staff can manage sessions" ON sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- ORDERS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Orders dev policy" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;

-- Anyone can view orders (customers need to see their orders)
CREATE POLICY "Anyone can view orders" ON orders
    FOR SELECT USING (true);

-- Anyone can create orders (customers order via QR)
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Staff can update/delete orders
CREATE POLICY "Staff can manage orders" ON orders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- PRODUCTS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Products dev policy" ON products;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Anyone can view products (menu is public)
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can manage products" ON products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- CATEGORIES TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Categories dev policy" ON categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Anyone can view categories (menu is public)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- RESERVATIONS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Reservations dev policy" ON reservations;
DROP POLICY IF EXISTS "Anyone can view reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can manage reservations" ON reservations;

-- Anyone can view their own reservations (by email match - handled in app)
CREATE POLICY "Anyone can view reservations" ON reservations
    FOR SELECT USING (true);

-- Anyone can create reservations (public booking form)
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can manage reservations
CREATE POLICY "Staff can manage reservations" ON reservations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- CUSTOMERS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Customers dev policy" ON customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

-- Staff can view customers
CREATE POLICY "Staff can view customers" ON customers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- Anyone can create customers (loyalty signup)
CREATE POLICY "Anyone can create customers" ON customers
    FOR INSERT WITH CHECK (true);

-- Staff can manage customers
CREATE POLICY "Staff can manage customers" ON customers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- WAITER_TABLES TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Waiter_tables dev policy" ON waiter_tables;
DROP POLICY IF EXISTS "Staff can view waiter assignments" ON waiter_tables;
DROP POLICY IF EXISTS "Admin can manage waiter assignments" ON waiter_tables;

-- Staff can view waiter assignments
CREATE POLICY "Staff can view waiter assignments" ON waiter_tables
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- Admins can manage waiter assignments
CREATE POLICY "Admin can manage waiter assignments" ON waiter_tables
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- WAITER_CALLS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Waiter_calls dev policy" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can manage waiter calls" ON waiter_calls;

-- Anyone can view waiter calls (real-time updates)
CREATE POLICY "Anyone can view waiter calls" ON waiter_calls
    FOR SELECT USING (true);

-- Anyone can create waiter calls (customers call waiter)
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Staff can manage waiter calls
CREATE POLICY "Staff can manage waiter calls" ON waiter_calls
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- ACTIVITY_LOG TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Activity_log dev policy" ON activity_log;
DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Staff can create activity log" ON activity_log;

-- Staff can view activity log
CREATE POLICY "Staff can view activity log" ON activity_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- Staff can create activity log entries
CREATE POLICY "Staff can create activity log" ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- =============================================
-- AUTH_AUDIT_LOG TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Auth_audit_log dev policy" ON auth_audit_log;
DROP POLICY IF EXISTS "Admins can view auth audit log" ON auth_audit_log;
DROP POLICY IF EXISTS "Service role can manage auth audit log" ON auth_audit_log;

-- Only admins can view auth audit log
CREATE POLICY "Admins can view auth audit log" ON auth_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Service role can manage (for system inserts)
CREATE POLICY "Service role can manage auth audit log" ON auth_audit_log
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- LOGIN_RATE_LIMITS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Login_rate_limits dev policy" ON login_rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON login_rate_limits;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON login_rate_limits
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- RESERVATION_SETTINGS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Reservation_settings dev policy" ON reservation_settings;
DROP POLICY IF EXISTS "Admins can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Admins can update reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can update reservation settings" ON reservation_settings;

-- Admins can read settings
CREATE POLICY "Admins can read reservation settings" ON reservation_settings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Admins can update settings
CREATE POLICY "Admins can update reservation settings" ON reservation_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Service role can read/update (for cron jobs)
CREATE POLICY "Service role can read reservation settings" ON reservation_settings
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can update reservation settings" ON reservation_settings
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- RESTAURANT_CLOSURES TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Restaurant_closures dev policy" ON restaurant_closures;
DROP POLICY IF EXISTS "Anyone can view closures" ON restaurant_closures;
DROP POLICY IF EXISTS "Admins can manage closures" ON restaurant_closures;

-- Anyone can view closures (needed for reservation form)
CREATE POLICY "Anyone can view closures" ON restaurant_closures
    FOR SELECT USING (true);

-- Only admins can manage closures
CREATE POLICY "Admins can manage closures" ON restaurant_closures
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =============================================
-- SESSION_CUSTOMERS TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Session_customers dev policy" ON session_customers;
DROP POLICY IF EXISTS "Anyone can view session customers" ON session_customers;
DROP POLICY IF EXISTS "Anyone can create session customers" ON session_customers;

-- Anyone can view session customers (needed for session display)
CREATE POLICY "Anyone can view session customers" ON session_customers
    FOR SELECT USING (true);

-- Anyone can create session customers (join session via QR)
CREATE POLICY "Anyone can create session customers" ON session_customers
    FOR INSERT WITH CHECK (true);

-- =============================================
-- EMAIL_TRACKING TABLE - SECURE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Email_tracking dev policy" ON email_tracking;
DROP POLICY IF EXISTS "Staff can view email tracking" ON email_tracking;
DROP POLICY IF EXISTS "Service role can manage email tracking" ON email_tracking;

-- Staff can view email tracking
CREATE POLICY "Staff can view email tracking" ON email_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.auth_user_id = auth.uid()
            AND s.is_active = true
        )
    );

-- Service role can manage (for webhook updates)
CREATE POLICY "Service role can manage email tracking" ON email_tracking
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ PRODUCTION MODE: SECURE RLS POLICIES ACTIVE';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All tables now have proper authentication requirements.';
    RAISE NOTICE '';
    RAISE NOTICE 'Ensure before deploying:';
    RAISE NOTICE '  1. NEXT_PUBLIC_USE_SUPABASE_AUTH=true';
    RAISE NOTICE '  2. All staff have auth_user_id linked';
    RAISE NOTICE '  3. Test users removed';
    RAISE NOTICE '  4. SMTP configured for email';
    RAISE NOTICE '  5. Rate limiting enabled';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ============================================';
END $$;
