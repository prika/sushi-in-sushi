-- =============================================
-- LOCATION-BASED RLS POLICIES
-- Migration: 014_location_based_rls_policies.sql
-- =============================================
--
-- This migration enhances RLS policies with location-based restrictions:
-- - Staff can only see/modify data from their assigned location
-- - Admins can see all locations
-- - Waiters can only see their assigned tables
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if current user can access a specific location
CREATE OR REPLACE FUNCTION can_access_location(target_location VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR(50);
    v_staff_location VARCHAR(50);
BEGIN
    v_role_name := get_current_staff_role();

    -- Admins can access all locations
    IF v_role_name = 'admin' THEN
        RETURN true;
    END IF;

    -- Get staff location
    v_staff_location := get_current_staff_location();

    -- Staff can only access their assigned location
    -- NULL location means access to all (for backwards compatibility)
    IF v_staff_location IS NULL THEN
        RETURN true;
    END IF;

    RETURN v_staff_location = target_location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current staff ID
CREATE OR REPLACE FUNCTION get_current_staff_id()
RETURNS UUID AS $$
    SELECT s.id
    FROM staff s
    WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if waiter can access a specific table (UUID version)
CREATE OR REPLACE FUNCTION waiter_can_access_table(table_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR(50);
    v_staff_id UUID;
BEGIN
    v_role_name := get_current_staff_role();

    -- Admins can access all tables
    IF v_role_name = 'admin' THEN
        RETURN true;
    END IF;

    -- Kitchen staff can access all tables (for orders)
    IF v_role_name = 'kitchen' THEN
        RETURN true;
    END IF;

    -- Waiters can only access assigned tables
    IF v_role_name = 'waiter' THEN
        v_staff_id := get_current_staff_id();
        RETURN EXISTS (
            SELECT 1 FROM waiter_tables wt
            WHERE wt.table_id = table_id_param
            AND wt.waiter_id = v_staff_id
            AND wt.is_active = true
        );
    END IF;

    -- Anonymous/customers can access for ordering
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if waiter can access a specific table (INTEGER version for backwards compatibility)
CREATE OR REPLACE FUNCTION waiter_can_access_table(table_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR(50);
    v_staff_id UUID;
    v_table_uuid UUID;
BEGIN
    v_role_name := get_current_staff_role();

    -- Admins can access all tables
    IF v_role_name = 'admin' THEN
        RETURN true;
    END IF;

    -- Kitchen staff can access all tables (for orders)
    IF v_role_name = 'kitchen' THEN
        RETURN true;
    END IF;

    -- Get UUID from integer ID (if tables uses integer primary key)
    SELECT id INTO v_table_uuid FROM tables WHERE id::text = table_id_param::text LIMIT 1;

    -- Waiters can only access assigned tables
    IF v_role_name = 'waiter' THEN
        v_staff_id := get_current_staff_id();
        IF v_table_uuid IS NOT NULL THEN
            RETURN EXISTS (
                SELECT 1 FROM waiter_tables wt
                WHERE wt.table_id = v_table_uuid
                AND wt.waiter_id = v_staff_id
                AND wt.is_active = true
            );
        END IF;
        RETURN false;
    END IF;

    -- Anonymous/customers can access for ordering
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_access_location(VARCHAR) IS 'Check if current user can access data from a specific location';
COMMENT ON FUNCTION get_current_staff_id() IS 'Get the staff ID of the currently authenticated user';
COMMENT ON FUNCTION waiter_can_access_table(UUID) IS 'Check if current waiter can access a specific table (UUID version)';
COMMENT ON FUNCTION waiter_can_access_table(INTEGER) IS 'Check if current waiter can access a specific table (INTEGER version for backwards compatibility)';

-- =============================================
-- TABLES POLICIES (Location-based)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Staff can view tables by location" ON tables;
DROP POLICY IF EXISTS "Admin can manage tables" ON tables;

-- Staff can view tables from their location
CREATE POLICY "Staff can view tables by location" ON tables
    FOR SELECT USING (
        -- Anonymous users can view (for customer ordering)
        auth.role() = 'anon'
        OR
        -- Staff can view tables from their location
        can_access_location(location::VARCHAR)
    );

-- Admin can manage tables
CREATE POLICY "Admin can manage tables" ON tables
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- SESSIONS POLICIES (Location-based)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
DROP POLICY IF EXISTS "Staff can view sessions by location" ON sessions;

-- Staff can view sessions from tables at their location
CREATE POLICY "Staff can view sessions by location" ON sessions
    FOR SELECT USING (
        -- Anonymous can view (for customer features)
        auth.role() = 'anon'
        OR
        -- Staff can view based on table location
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = sessions.table_id
            AND can_access_location(t.location::VARCHAR)
        )
    );

-- Anyone can create sessions (customers starting meals)
CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

-- Staff can update sessions at their location
CREATE POLICY "Staff can update sessions" ON sessions
    FOR UPDATE USING (
        -- Anonymous can update (for customer features)
        auth.role() = 'anon'
        OR
        -- Staff based on location
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = sessions.table_id
            AND can_access_location(t.location::VARCHAR)
        )
    );

-- =============================================
-- ORDERS POLICIES (Location + Table access)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Staff can view orders by location" ON orders;

-- Kitchen can only see pending/preparing orders
-- Waiters can only see orders from their tables
CREATE POLICY "Staff can view orders by location" ON orders
    FOR SELECT USING (
        -- Anonymous can view (for customer features)
        auth.role() = 'anon'
        OR
        -- Kitchen sees pending/preparing orders from their location
        (
            get_current_staff_role() = 'kitchen'
            AND status IN ('pending', 'preparing', 'ready')
            AND EXISTS (
                SELECT 1 FROM sessions s
                JOIN tables t ON t.id = s.table_id
                WHERE s.id = orders.session_id
                AND can_access_location(t.location::VARCHAR)
            )
        )
        OR
        -- Admins see all
        is_current_user_admin()
        OR
        -- Waiters see orders from their assigned tables
        (
            get_current_staff_role() = 'waiter'
            AND EXISTS (
                SELECT 1 FROM sessions s
                WHERE s.id = orders.session_id
                AND waiter_can_access_table(s.table_id)
            )
        )
    );

-- Anyone can create orders (customers ordering)
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Staff can update orders based on their role
CREATE POLICY "Staff can update orders" ON orders
    FOR UPDATE USING (
        -- Anonymous can update (customer cancel)
        auth.role() = 'anon'
        OR
        -- Kitchen can update orders they can see
        (
            get_current_staff_role() = 'kitchen'
            AND EXISTS (
                SELECT 1 FROM sessions s
                JOIN tables t ON t.id = s.table_id
                WHERE s.id = orders.session_id
                AND can_access_location(t.location::VARCHAR)
            )
        )
        OR
        -- Admin can update all
        is_current_user_admin()
        OR
        -- Waiters can update orders from their tables
        (
            get_current_staff_role() = 'waiter'
            AND EXISTS (
                SELECT 1 FROM sessions s
                WHERE s.id = orders.session_id
                AND waiter_can_access_table(s.table_id)
            )
        )
    );

-- =============================================
-- RESERVATIONS POLICIES (Location-based)
-- =============================================

DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;

-- Anyone can create reservations (public form)
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can view reservations from their location
CREATE POLICY "Staff can view reservations by location" ON reservations
    FOR SELECT USING (
        -- Anonymous can view (for reservation lookup)
        auth.role() = 'anon'
        OR
        -- Staff can view based on location
        can_access_location(location::VARCHAR)
    );

-- Staff can update reservations from their location
CREATE POLICY "Staff can update reservations by location" ON reservations
    FOR UPDATE USING (can_access_location(location::VARCHAR));

-- Admin can delete reservations
CREATE POLICY "Admin can delete reservations" ON reservations
    FOR DELETE USING (is_current_user_admin());

-- =============================================
-- WAITER_CALLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can update waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can delete waiter calls" ON waiter_calls;

-- Customers can create waiter calls
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Staff can view waiter calls from their location/tables
CREATE POLICY "Staff can view waiter calls by location" ON waiter_calls
    FOR SELECT USING (
        -- Anonymous can view
        auth.role() = 'anon'
        OR
        -- Admin sees all
        is_current_user_admin()
        OR
        -- Staff based on table access
        waiter_can_access_table(table_id)
    );

-- Staff can update waiter calls they can access
CREATE POLICY "Staff can update waiter calls" ON waiter_calls
    FOR UPDATE USING (
        auth.role() = 'anon'
        OR is_current_user_admin()
        OR waiter_can_access_table(table_id)
    );

-- Staff can delete waiter calls they can access
CREATE POLICY "Staff can delete waiter calls" ON waiter_calls
    FOR DELETE USING (
        is_current_user_admin()
        OR waiter_can_access_table(table_id)
    );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Staff can view tables by location" ON tables IS
    'Staff can only view tables from their assigned location, admins can view all';

COMMENT ON POLICY "Staff can view sessions by location" ON sessions IS
    'Staff can only view sessions from tables at their location';

COMMENT ON POLICY "Staff can view orders by location" ON orders IS
    'Kitchen sees pending orders from their location, waiters see orders from assigned tables';

COMMENT ON POLICY "Staff can view reservations by location" ON reservations IS
    'Staff can only view reservations for their location';
