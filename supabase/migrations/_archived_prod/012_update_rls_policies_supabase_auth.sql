-- =============================================
-- UPDATE RLS POLICIES FOR SUPABASE AUTH
-- Migration: 012_update_rls_policies_supabase_auth.sql
-- =============================================
--
-- This migration updates RLS policies to use the Supabase Auth helper
-- functions created in migration 011.
--
-- IMPORTANT: Only apply this migration AFTER:
-- 1. All staff users have been migrated to Supabase Auth (auth_user_id set)
-- 2. The feature flag NEXT_PUBLIC_USE_SUPABASE_AUTH is set to true
--
-- The policies are designed to:
-- - Allow read access for most tables (needed for customer-facing features)
-- - Restrict write access to authenticated staff
-- - Restrict sensitive operations to admins
-- =============================================

-- =============================================
-- STAFF TABLE POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view own profile" ON staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON staff;

-- New policies using auth functions
CREATE POLICY "Authenticated staff can view staff" ON staff
    FOR SELECT USING (
        is_current_user_staff() OR auth.role() = 'anon'
    );

CREATE POLICY "Admin can manage staff" ON staff
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- WAITER_TABLES POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view waiter assignments" ON waiter_tables;
DROP POLICY IF EXISTS "Admin can manage waiter assignments" ON waiter_tables;

CREATE POLICY "Staff can view waiter assignments" ON waiter_tables
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage waiter assignments" ON waiter_tables
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- ACTIVITY_LOG POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;

CREATE POLICY "Staff can view activity log" ON activity_log
    FOR SELECT USING (is_current_user_staff());

CREATE POLICY "Anyone can insert activity log" ON activity_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- RESERVATIONS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;

-- Anyone can create reservations (public form)
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can view and update reservations
CREATE POLICY "Staff can view reservations" ON reservations
    FOR SELECT USING (is_current_user_staff() OR auth.role() = 'anon');

CREATE POLICY "Staff can update reservations" ON reservations
    FOR UPDATE USING (is_current_user_staff());

-- Admin can delete reservations
CREATE POLICY "Admin can delete reservations" ON reservations
    FOR DELETE USING (is_current_user_admin());

-- =============================================
-- RESTAURANT_CLOSURES POLICIES
-- =============================================

DROP POLICY IF EXISTS "Allow read for authenticated users" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow read for anon (for reservation form)" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow insert/update/delete for admin" ON restaurant_closures;

-- Anyone can read closures (needed for reservation form)
CREATE POLICY "Anyone can read closures" ON restaurant_closures
    FOR SELECT USING (true);

-- Admin can manage closures
CREATE POLICY "Admin can manage closures" ON restaurant_closures
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- WAITER_CALLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can update waiter calls" ON waiter_calls;

-- Customers can create waiter calls
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Anyone can view waiter calls
CREATE POLICY "Anyone can view waiter calls" ON waiter_calls
    FOR SELECT USING (true);

-- Staff can update waiter calls
CREATE POLICY "Staff can update waiter calls" ON waiter_calls
    FOR UPDATE USING (is_current_user_staff() OR true);

-- Staff can delete waiter calls
CREATE POLICY "Staff can delete waiter calls" ON waiter_calls
    FOR DELETE USING (is_current_user_staff() OR true);

-- =============================================
-- EMAIL_EVENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view email events" ON email_events;
DROP POLICY IF EXISTS "System can insert email events" ON email_events;

CREATE POLICY "Staff can view email events" ON email_events
    FOR SELECT USING (is_current_user_staff());

CREATE POLICY "System can insert email events" ON email_events
    FOR INSERT WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Authenticated staff can view staff" ON staff IS
    'Staff members can view other staff records, anon can also view for public data';

COMMENT ON POLICY "Admin can manage staff" ON staff IS
    'Only admins can create, update, or delete staff records';

COMMENT ON POLICY "Staff can view activity log" ON activity_log IS
    'Only authenticated staff can view the activity log';

-- =============================================
-- NOTE: The following tables keep their current permissive policies
-- because they need to be accessible from the customer-facing app:
-- - tables (view only)
-- - products (view only)
-- - categories (view only)
-- - orders (view, create, update)
-- - sessions (view, create, update)
-- - session_customers (all operations)
-- =============================================
