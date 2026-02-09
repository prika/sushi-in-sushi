-- =============================================
-- FIX RLS POLICIES FOR DEVELOPMENT
-- Migration: 018_fix_staff_rls_for_dev.sql
-- =============================================
--
-- ⚠️  DEVELOPMENT ONLY - Remove before production!
--
-- Problem: RLS policies use auth.uid() and is_current_user_admin() which require Supabase Auth.
-- When using legacy JWT auth, these functions return false/null and block all operations.
--
-- Solution: Allow all operations on all tables for development.
-- =============================================

-- =============================================
-- HELPER FUNCTION TO CREATE DEV POLICIES
-- =============================================

CREATE OR REPLACE FUNCTION create_dev_policy(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Drop existing dev policy if exists
    EXECUTE format('DROP POLICY IF EXISTS "%s dev policy" ON %I', table_name, table_name);

    -- Create permissive policy
    EXECUTE format('CREATE POLICY "%s dev policy" ON %I FOR ALL USING (true) WITH CHECK (true)', table_name, table_name);

    RAISE NOTICE 'Created dev policy for table: %', table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping', table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policy for %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STAFF TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated staff can view staff" ON staff;
DROP POLICY IF EXISTS "Anyone can view staff" ON staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own profile" ON staff;
DROP POLICY IF EXISTS "Staff dev policy" ON staff;
CREATE POLICY "Staff dev policy" ON staff FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ROLES TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON roles;
DROP POLICY IF EXISTS "Roles dev policy" ON roles;
CREATE POLICY "Roles dev policy" ON roles FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TABLES TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON tables;
DROP POLICY IF EXISTS "Tables dev policy" ON tables;
CREATE POLICY "Tables dev policy" ON tables FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SESSIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Staff can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Sessions dev policy" ON sessions;
CREATE POLICY "Sessions dev policy" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ORDERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can manage orders" ON orders;
DROP POLICY IF EXISTS "Orders dev policy" ON orders;
CREATE POLICY "Orders dev policy" ON orders FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Products dev policy" ON products;
CREATE POLICY "Products dev policy" ON products FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Categories dev policy" ON categories;
CREATE POLICY "Categories dev policy" ON categories FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- RESERVATIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can manage reservations" ON reservations;
DROP POLICY IF EXISTS "Reservations dev policy" ON reservations;
CREATE POLICY "Reservations dev policy" ON reservations FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Customers dev policy" ON customers;
CREATE POLICY "Customers dev policy" ON customers FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- WAITER_TABLES TABLE
-- =============================================
DROP POLICY IF EXISTS "Staff can view waiter assignments" ON waiter_tables;
DROP POLICY IF EXISTS "Admin can manage waiter assignments" ON waiter_tables;
DROP POLICY IF EXISTS "Waiter_tables dev policy" ON waiter_tables;
CREATE POLICY "Waiter_tables dev policy" ON waiter_tables FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- WAITER_CALLS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can manage waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Waiter_calls dev policy" ON waiter_calls;
CREATE POLICY "Waiter_calls dev policy" ON waiter_calls FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ACTIVITY_LOG TABLE
-- =============================================
DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Staff can create activity log" ON activity_log;
DROP POLICY IF EXISTS "Activity_log dev policy" ON activity_log;
CREATE POLICY "Activity_log dev policy" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- AUTH_AUDIT_LOG TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can view auth audit log" ON auth_audit_log;
DROP POLICY IF EXISTS "Service role can manage auth audit log" ON auth_audit_log;
DROP POLICY IF EXISTS "Auth_audit_log dev policy" ON auth_audit_log;
CREATE POLICY "Auth_audit_log dev policy" ON auth_audit_log FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- LOGIN_RATE_LIMITS TABLE (if exists)
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_rate_limits') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Service role can manage rate limits" ON login_rate_limits';
        EXECUTE 'DROP POLICY IF EXISTS "Login_rate_limits dev policy" ON login_rate_limits';
        EXECUTE 'CREATE POLICY "Login_rate_limits dev policy" ON login_rate_limits FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- =============================================
-- RESERVATION_SETTINGS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Admins can update reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can update reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Reservation_settings dev policy" ON reservation_settings;
CREATE POLICY "Reservation_settings dev policy" ON reservation_settings FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- RESTAURANT_CLOSURES TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view closures" ON restaurant_closures;
DROP POLICY IF EXISTS "Admins can manage closures" ON restaurant_closures;
DROP POLICY IF EXISTS "Restaurant_closures dev policy" ON restaurant_closures;
CREATE POLICY "Restaurant_closures dev policy" ON restaurant_closures FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SESSION_CUSTOMERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view session customers" ON session_customers;
DROP POLICY IF EXISTS "Anyone can create session customers" ON session_customers;
DROP POLICY IF EXISTS "Session_customers dev policy" ON session_customers;
CREATE POLICY "Session_customers dev policy" ON session_customers FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- EMAIL_TRACKING TABLE
-- =============================================
DROP POLICY IF EXISTS "Staff can view email tracking" ON email_tracking;
DROP POLICY IF EXISTS "Service role can manage email tracking" ON email_tracking;
DROP POLICY IF EXISTS "Email_tracking dev policy" ON email_tracking;
CREATE POLICY "Email_tracking dev policy" ON email_tracking FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- CLEANUP HELPER FUNCTION
-- =============================================
DROP FUNCTION IF EXISTS create_dev_policy(TEXT);

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ============================================';
    RAISE NOTICE '⚠️  DEV MODE: ALL RLS POLICIES ARE NOW PERMISSIVE';
    RAISE NOTICE '⚠️  ============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables with permissive policies:';
    RAISE NOTICE '  - staff';
    RAISE NOTICE '  - roles';
    RAISE NOTICE '  - tables';
    RAISE NOTICE '  - sessions';
    RAISE NOTICE '  - orders';
    RAISE NOTICE '  - products';
    RAISE NOTICE '  - categories';
    RAISE NOTICE '  - reservations';
    RAISE NOTICE '  - customers';
    RAISE NOTICE '  - waiter_tables';
    RAISE NOTICE '  - waiter_calls';
    RAISE NOTICE '  - activity_log';
    RAISE NOTICE '  - auth_audit_log';
    RAISE NOTICE '  - login_rate_limits';
    RAISE NOTICE '  - reservation_settings';
    RAISE NOTICE '  - restaurant_closures';
    RAISE NOTICE '  - session_customers';
    RAISE NOTICE '  - email_tracking';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  REMEMBER: Restore secure policies before production!';
    RAISE NOTICE '⚠️  ============================================';
END $$;
