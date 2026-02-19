-- =============================================
-- AUTH SECURITY ENHANCEMENTS
-- Migration: 013_auth_security_enhancements.sql
-- =============================================
--
-- This migration adds:
-- 1. Auth audit log table for tracking authentication events
-- 2. Rate limiting table for login attempts
-- 3. MFA enrollment tracking
-- 4. Session configuration by role
-- =============================================

-- =============================================
-- 1. AUTH AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    auth_user_id UUID,
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by staff
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_staff_id ON auth_audit_log(staff_id);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);

-- Index for querying by time
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at DESC);

-- Index for querying by email (for failed attempts tracking)
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_email ON auth_audit_log(email);

-- Event types enum comment
COMMENT ON TABLE auth_audit_log IS 'Tracks all authentication-related events for security auditing.
Event types:
- login_success: Successful login
- login_failed: Failed login attempt
- logout: User logged out
- password_change: Password was changed
- mfa_enrolled: MFA was enabled
- mfa_disabled: MFA was disabled
- mfa_verified: MFA verification successful
- mfa_failed: MFA verification failed
- session_refresh: Session was refreshed
- account_locked: Account was locked due to failed attempts
- account_unlocked: Account was unlocked
- new_ip_login: Login from a new IP address';

-- =============================================
-- 2. RATE LIMITING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- IP address or email
    identifier_type VARCHAR(20) NOT NULL, -- 'ip' or 'email'
    attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    UNIQUE(identifier, identifier_type)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON auth_rate_limits(identifier, identifier_type);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_last_attempt ON auth_rate_limits(last_attempt_at);

COMMENT ON TABLE auth_rate_limits IS 'Tracks login attempts for rate limiting to prevent brute force attacks';

-- =============================================
-- 3. MFA TRACKING (extends staff table)
-- =============================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS known_ips INET[] DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

COMMENT ON COLUMN staff.mfa_required IS 'Whether this user is required to use MFA (auto-enabled for admins)';
COMMENT ON COLUMN staff.mfa_enrolled_at IS 'When the user enrolled in MFA';
COMMENT ON COLUMN staff.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN staff.last_login_ip IS 'IP address of last successful login';
COMMENT ON COLUMN staff.known_ips IS 'Array of known IP addresses for this user';
COMMENT ON COLUMN staff.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN staff.locked_until IS 'Account is locked until this timestamp';

-- =============================================
-- 4. SESSION TIMEOUT CONFIGURATION
-- =============================================

CREATE TABLE IF NOT EXISTS auth_session_config (
    role_name VARCHAR(50) PRIMARY KEY REFERENCES roles(name),
    session_timeout_minutes INTEGER NOT NULL DEFAULT 480, -- 8 hours default
    inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 60, -- 1 hour default
    require_mfa BOOLEAN NOT NULL DEFAULT false,
    max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO auth_session_config (role_name, session_timeout_minutes, inactivity_timeout_minutes, require_mfa, max_concurrent_sessions)
VALUES
    ('admin', 240, 30, true, 2),      -- 4 hours session, 30 min inactivity, MFA required
    ('kitchen', 720, 120, false, 5),  -- 12 hours session, 2 hour inactivity (long shifts)
    ('waiter', 720, 120, false, 3),   -- 12 hours session, 2 hour inactivity
    ('customer', 1440, 60, false, 10) -- 24 hours session, 1 hour inactivity
ON CONFLICT (role_name) DO NOTHING;

COMMENT ON TABLE auth_session_config IS 'Session timeout and security configuration per role';

-- =============================================
-- 5. HELPER FUNCTIONS
-- =============================================

-- Function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event(
    p_event_type VARCHAR(50),
    p_staff_id UUID DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO auth_audit_log (
        event_type, staff_id, auth_user_id, email,
        ip_address, user_agent, metadata, success, error_message
    )
    VALUES (
        p_event_type, p_staff_id, p_auth_user_id, p_email,
        p_ip_address, p_user_agent, p_metadata, p_success, p_error_message
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier VARCHAR(255),
    p_identifier_type VARCHAR(20) DEFAULT 'ip',
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15,
    p_block_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    allowed BOOLEAN,
    attempts_remaining INTEGER,
    blocked_until TIMESTAMPTZ,
    current_attempts INTEGER
) AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    -- Get existing record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type;

    -- If blocked, check if block has expired
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN QUERY SELECT
            false,
            0,
            v_record.blocked_until,
            v_record.attempts;
        RETURN;
    END IF;

    -- If no record or old record, reset
    IF v_record.id IS NULL OR v_record.first_attempt_at < v_window_start THEN
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempts, first_attempt_at, last_attempt_at, blocked_until)
        VALUES (p_identifier, p_identifier_type, 1, NOW(), NOW(), NULL)
        ON CONFLICT (identifier, identifier_type)
        DO UPDATE SET
            attempts = 1,
            first_attempt_at = NOW(),
            last_attempt_at = NOW(),
            blocked_until = NULL;

        RETURN QUERY SELECT
            true,
            p_max_attempts - 1,
            NULL::TIMESTAMPTZ,
            1;
        RETURN;
    END IF;

    -- Increment attempts
    UPDATE auth_rate_limits
    SET
        attempts = attempts + 1,
        last_attempt_at = NOW(),
        blocked_until = CASE
            WHEN attempts + 1 >= p_max_attempts
            THEN NOW() + (p_block_minutes || ' minutes')::INTERVAL
            ELSE NULL
        END
    WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    RETURNING * INTO v_record;

    RETURN QUERY SELECT
        v_record.attempts < p_max_attempts,
        GREATEST(0, p_max_attempts - v_record.attempts),
        v_record.blocked_until,
        v_record.attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset rate limit on successful login
CREATE OR REPLACE FUNCTION reset_rate_limit(
    p_identifier VARCHAR(255),
    p_identifier_type VARCHAR(20) DEFAULT 'ip'
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM auth_rate_limits
    WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update staff login info
CREATE OR REPLACE FUNCTION update_staff_login_info(
    p_staff_id UUID,
    p_ip_address INET,
    p_success BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_new_ip BOOLEAN;
    v_known_ips INET[];
BEGIN
    IF p_success THEN
        -- Get known IPs
        SELECT known_ips INTO v_known_ips FROM staff WHERE id = p_staff_id;
        v_is_new_ip := p_ip_address IS NOT NULL AND NOT (p_ip_address = ANY(COALESCE(v_known_ips, '{}')));

        -- Update staff record
        UPDATE staff
        SET
            last_login_at = NOW(),
            last_login_ip = p_ip_address,
            failed_login_attempts = 0,
            locked_until = NULL,
            known_ips = CASE
                WHEN p_ip_address IS NOT NULL AND NOT (p_ip_address = ANY(COALESCE(known_ips, '{}')))
                THEN array_append(COALESCE(known_ips, '{}'), p_ip_address)
                ELSE known_ips
            END
        WHERE id = p_staff_id;

        RETURN v_is_new_ip;
    ELSE
        -- Increment failed attempts
        UPDATE staff
        SET
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
                WHEN failed_login_attempts + 1 >= 5
                THEN NOW() + INTERVAL '30 minutes'
                ELSE locked_until
            END
        WHERE id = p_staff_id;

        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session config for a role
CREATE OR REPLACE FUNCTION get_session_config(p_role_name VARCHAR(50))
RETURNS auth_session_config AS $$
    SELECT * FROM auth_session_config WHERE role_name = p_role_name;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if MFA is required for current user
CREATE OR REPLACE FUNCTION is_mfa_required_for_current_user()
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR(50);
    v_mfa_required BOOLEAN;
BEGIN
    -- Get role name
    v_role_name := get_current_staff_role();

    IF v_role_name IS NULL THEN
        RETURN false;
    END IF;

    -- Check if role requires MFA
    SELECT require_mfa INTO v_mfa_required
    FROM auth_session_config
    WHERE role_name = v_role_name;

    -- Also check if user has individual MFA requirement
    IF NOT COALESCE(v_mfa_required, false) THEN
        SELECT mfa_required INTO v_mfa_required
        FROM staff
        WHERE auth_user_id = auth.uid();
    END IF;

    RETURN COALESCE(v_mfa_required, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- 6. RLS POLICIES FOR NEW TABLES
-- =============================================

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_session_config ENABLE ROW LEVEL SECURITY;

-- Auth audit log: admins can read, system can write
CREATE POLICY "Admins can view auth audit log" ON auth_audit_log
    FOR SELECT USING (is_current_user_admin());

CREATE POLICY "System can insert auth audit log" ON auth_audit_log
    FOR INSERT WITH CHECK (true);

-- Rate limits: only system access
CREATE POLICY "System can manage rate limits" ON auth_rate_limits
    FOR ALL USING (true);

-- Session config: admins can read and update
CREATE POLICY "Staff can view session config" ON auth_session_config
    FOR SELECT USING (is_current_user_staff());

CREATE POLICY "Admins can manage session config" ON auth_session_config
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- 7. CLEANUP FUNCTION (run periodically)
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_auth_data()
RETURNS void AS $$
BEGIN
    -- Delete rate limit records older than 24 hours
    DELETE FROM auth_rate_limits
    WHERE last_attempt_at < NOW() - INTERVAL '24 hours';

    -- Keep only 90 days of audit logs (adjust as needed)
    DELETE FROM auth_audit_log
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_auth_data() IS 'Cleanup old auth data. Run periodically via cron or pg_cron.';

-- =============================================
-- 8. SET MFA REQUIRED FOR EXISTING ADMINS
-- =============================================

UPDATE staff
SET mfa_required = true
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
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
            AND wt.staff_id = v_staff_id
        );
    END IF;

    -- Anonymous/customers can access for ordering
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_access_location(VARCHAR) IS 'Check if current user can access data from a specific location';
COMMENT ON FUNCTION get_current_staff_id() IS 'Get the staff ID of the currently authenticated user';
COMMENT ON FUNCTION waiter_can_access_table(UUID) IS 'Check if current waiter can access a specific table';

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
-- Migration: Reservation Reminder Email Tracking
-- Description: Add columns to track day-before and same-day reminder emails
--              Add settings table for configurable reminder timing

-- =============================================
-- RESERVATION SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reservation_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton table
  -- Day-before reminder settings
  day_before_reminder_enabled BOOLEAN DEFAULT true,
  day_before_reminder_hours INTEGER DEFAULT 24, -- Hours before reservation to send
  -- Same-day reminder settings
  same_day_reminder_enabled BOOLEAN DEFAULT true,
  same_day_reminder_hours INTEGER DEFAULT 2, -- Hours before reservation to send
  -- Rodízio waste policy
  rodizio_waste_policy_enabled BOOLEAN DEFAULT true,
  rodizio_waste_fee_per_piece DECIMAL(10,2) DEFAULT 2.50,
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id)
);

-- Insert default settings
INSERT INTO reservation_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reservation_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservation_settings_updated_at ON reservation_settings;
CREATE TRIGGER reservation_settings_updated_at
  BEFORE UPDATE ON reservation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_settings_timestamp();

COMMENT ON TABLE reservation_settings IS 'Singleton table for reservation reminder settings (configurable via admin panel)';
COMMENT ON COLUMN reservation_settings.day_before_reminder_hours IS 'Hours before reservation to send day-before reminder (default: 24)';
COMMENT ON COLUMN reservation_settings.same_day_reminder_hours IS 'Hours before reservation to send same-day reminder (default: 2)';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on reservation_settings
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Admins can update reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can read reservation settings" ON reservation_settings;
DROP POLICY IF EXISTS "Service role can update reservation settings" ON reservation_settings;

-- Policy: Admins can read settings
CREATE POLICY "Admins can read reservation settings"
ON reservation_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Policy: Admins can update settings
CREATE POLICY "Admins can update reservation settings"
ON reservation_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = auth.uid()
    AND r.name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Policy: Service role can read settings (for cron job)
CREATE POLICY "Service role can read reservation settings"
ON reservation_settings FOR SELECT
TO service_role
USING (true);

-- Policy: Service role can update settings (for system operations)
CREATE POLICY "Service role can update reservation settings"
ON reservation_settings FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- RESERVATION EMAIL TRACKING COLUMNS
-- =============================================

-- Day-before reminder tracking
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS day_before_reminder_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS day_before_reminder_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS day_before_reminder_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS day_before_reminder_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS day_before_reminder_status VARCHAR(50);

-- Same-day (2 hours before) reminder tracking
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS same_day_reminder_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS same_day_reminder_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS same_day_reminder_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS same_day_reminder_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS same_day_reminder_status VARCHAR(50);

-- Index for efficient cron queries (find pending reminders)
CREATE INDEX IF NOT EXISTS idx_reservations_day_before_reminder
ON reservations(reservation_date, status)
WHERE day_before_reminder_sent_at IS NULL
  AND status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_reservations_same_day_reminder
ON reservations(reservation_date, reservation_time, status)
WHERE same_day_reminder_sent_at IS NULL
  AND status IN ('pending', 'confirmed');

-- Comment for documentation
COMMENT ON COLUMN reservations.day_before_reminder_id IS 'Resend email ID for day-before reminder';
COMMENT ON COLUMN reservations.day_before_reminder_sent_at IS 'Timestamp when day-before reminder was sent';
COMMENT ON COLUMN reservations.day_before_reminder_status IS 'Email status: sent, delivered, opened, bounced, etc.';
COMMENT ON COLUMN reservations.same_day_reminder_id IS 'Resend email ID for 2-hour-before reminder';
COMMENT ON COLUMN reservations.same_day_reminder_sent_at IS 'Timestamp when same-day reminder was sent';
COMMENT ON COLUMN reservations.same_day_reminder_status IS 'Email status: sent, delivered, opened, bounced, etc.';
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
-- =============================================
-- STAFF TIME OFF / VACATION MANAGEMENT
-- Migration: 020_staff_time_off.sql
-- =============================================
--
-- Creates a table to manage staff vacations, sick days, and time off.
-- =============================================

-- =============================================
-- CREATE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS staff_time_off (
    id SERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'vacation',
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure end_date is >= start_date
    CONSTRAINT valid_dates CHECK (end_date >= start_date),

    -- Validate type values
    CONSTRAINT valid_type CHECK (type IN ('vacation', 'sick', 'personal', 'other')),

    -- Validate status values
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_id ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON staff_time_off(status);

-- =============================================
-- TRIGGER FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_staff_time_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_time_off_updated_at ON staff_time_off;
CREATE TRIGGER trigger_staff_time_off_updated_at
    BEFORE UPDATE ON staff_time_off
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_time_off_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

-- Development policy (permissive - same as other tables in dev mode)
DROP POLICY IF EXISTS "Staff_time_off dev policy" ON staff_time_off;
CREATE POLICY "Staff_time_off dev policy" ON staff_time_off
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE staff_time_off IS 'Staff vacation and time off management';
COMMENT ON COLUMN staff_time_off.type IS 'Type of time off: vacation, sick, personal, other';
COMMENT ON COLUMN staff_time_off.status IS 'Approval status: pending, approved, rejected';

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Staff Time Off table created successfully';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Types available: vacation, sick, personal, other';
    RAISE NOTICE 'Statuses: pending, approved, rejected';
    RAISE NOTICE '';
END $$;
-- =====================================================
-- Migration: Performance Optimization Indexes
-- Description: Add indexes for frequently queried columns
-- Created: 2026-02-06
--
-- NOTE: This version does NOT use CONCURRENTLY to work with Supabase migrations.
-- For production deployment with zero downtime, use the CONCURRENTLY version
-- in: supabase/migrations/021_performance_indexes_concurrent.sql
-- =====================================================

-- =====================================================
-- ORDERS TABLE INDEXES
-- =====================================================

-- Index for filtering active orders by status
-- Used by: Kitchen display, waiter app
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC)
  WHERE status IN ('pending', 'preparing', 'ready');

COMMENT ON INDEX idx_orders_status_created IS
  'Optimizes kitchen orders query with status filter and sort by created_at';

-- Index for session orders lookup
-- Used by: Session management, order history
CREATE INDEX IF NOT EXISTS idx_orders_session_id
  ON orders(session_id)
  WHERE status != 'cancelled';

COMMENT ON INDEX idx_orders_session_id IS
  'Optimizes session orders lookup, excludes cancelled orders';

-- Composite index for product-session queries
-- Used by: Order analytics, product popularity
CREATE INDEX IF NOT EXISTS idx_orders_product_session
  ON orders(product_id, session_id);

COMMENT ON INDEX idx_orders_product_session IS
  'Optimizes queries joining orders with products and sessions';

-- =====================================================
-- SESSIONS TABLE INDEXES
-- =====================================================

-- Composite index for table-status queries
-- Used by: Active sessions lookup, table availability
CREATE INDEX IF NOT EXISTS idx_sessions_table_status
  ON sessions(table_id, status);

COMMENT ON INDEX idx_sessions_table_status IS
  'Optimizes table availability and active session checks';

-- Index for filtering active sessions
-- Used by: Dashboard, session management
CREATE INDEX IF NOT EXISTS idx_sessions_status_created
  ON sessions(status, created_at DESC)
  WHERE status IN ('active', 'pending_payment');

COMMENT ON INDEX idx_sessions_status_created IS
  'Optimizes active sessions query with status filter';

-- =====================================================
-- PRODUCTS TABLE INDEXES
-- =====================================================

-- Composite index for category and availability
-- Used by: Menu display, product filtering
CREATE INDEX IF NOT EXISTS idx_products_category_available
  ON products(category_id, is_available);

COMMENT ON INDEX idx_products_category_available IS
  'Optimizes product listing by category with availability filter';

-- Index for available products only
-- Used by: Customer menu, order creation
CREATE INDEX IF NOT EXISTS idx_products_available_name
  ON products(name)
  WHERE is_available = true;

COMMENT ON INDEX idx_products_available_name IS
  'Optimizes product search by name for available products only';

-- =====================================================
-- RESERVATIONS TABLE INDEXES
-- =====================================================

-- Composite index for date and status
-- Used by: Reservation calendar, availability check
CREATE INDEX IF NOT EXISTS idx_reservations_date_status
  ON reservations(reservation_date, status);

COMMENT ON INDEX idx_reservations_date_status IS
  'Optimizes reservation lookup by date with status filter';

-- Index for pending/confirmed reservations
-- Used by: Admin dashboard, reminder jobs
CREATE INDEX IF NOT EXISTS idx_reservations_datetime_status
  ON reservations(reservation_date, reservation_time, status)
  WHERE status IN ('pending', 'confirmed');

COMMENT ON INDEX idx_reservations_datetime_status IS
  'Optimizes queries for active reservations sorted by datetime';

-- =====================================================
-- STAFF TIME OFF TABLE INDEXES
-- =====================================================

-- Composite index for date range queries
-- Used by: Calendar view, overlap detection
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates
  ON staff_time_off(start_date, end_date);

COMMENT ON INDEX idx_staff_time_off_dates IS
  'Optimizes date range queries for calendar and overlap detection';

-- Index for staff member lookup
-- Used by: Staff calendar, availability check
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_dates
  ON staff_time_off(staff_id, start_date, end_date)
  WHERE status = 'approved';

COMMENT ON INDEX idx_staff_time_off_staff_dates IS
  'Optimizes staff availability lookup for approved time offs';

-- =====================================================
-- WAITER TABLES TABLE INDEXES
-- =====================================================

-- Composite index for staff-table assignments
-- Used by: Waiter app, table assignments
CREATE INDEX IF NOT EXISTS idx_waiter_tables_staff_table
  ON waiter_tables(staff_id, table_id);

COMMENT ON INDEX idx_waiter_tables_staff_table IS
  'Optimizes waiter table assignment lookups';

-- Reverse index for table-to-waiter lookup
-- Used by: Table details, assignment management
CREATE INDEX IF NOT EXISTS idx_waiter_tables_table_staff
  ON waiter_tables(table_id, staff_id);

COMMENT ON INDEX idx_waiter_tables_table_staff IS
  'Optimizes table to waiter lookup (reverse direction)';

-- =====================================================
-- WAITER CALLS TABLE INDEXES
-- =====================================================

-- Index for active calls by table
-- Used by: Waiter notification system
CREATE INDEX IF NOT EXISTS idx_waiter_calls_table_status
  ON waiter_calls(table_id, status, created_at DESC)
  WHERE status = 'pending';

COMMENT ON INDEX idx_waiter_calls_table_status IS
  'Optimizes pending waiter calls lookup by table';

-- =====================================================
-- CUSTOMERS TABLE INDEXES
-- =====================================================

-- Index for customer lookup by email
-- Used by: Login, customer profile
CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers(email);

COMMENT ON INDEX idx_customers_email IS
  'Optimizes customer lookup by email for authentication';

-- Index for loyalty program queries
-- Used by: Points calculation, rewards
CREATE INDEX IF NOT EXISTS idx_customers_points
  ON customers(points DESC)
  WHERE points > 0;

COMMENT ON INDEX idx_customers_points IS
  'Optimizes queries for top customers by loyalty points';

-- =====================================================
-- TABLES TABLE INDEXES
-- =====================================================

-- Index for available tables by location
-- Used by: Table availability, reservations
CREATE INDEX IF NOT EXISTS idx_tables_location_status
  ON tables(location, status)
  WHERE is_active = true;

COMMENT ON INDEX idx_tables_location_status IS
  'Optimizes table availability queries by location';

-- =====================================================
-- STAFF TABLE INDEXES
-- =====================================================

-- Index for staff lookup by role
-- Used by: Staff management, role-based queries
CREATE INDEX IF NOT EXISTS idx_staff_role_location
  ON staff(role_id, location);

COMMENT ON INDEX idx_staff_role_location IS
  'Optimizes staff queries filtered by role and location';

-- =====================================================
-- ANALYZE TABLES
-- =====================================================
-- Update table statistics for query planner

ANALYZE orders;
ANALYZE sessions;
ANALYZE products;
ANALYZE categories;
ANALYZE reservations;
ANALYZE staff_time_off;
ANALYZE waiter_tables;
ANALYZE waiter_calls;
ANALYZE customers;
ANALYZE tables;
ANALYZE staff;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify indexes are being used:

-- Check index usage for orders query:
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE status IN ('pending', 'preparing', 'ready')
-- ORDER BY created_at DESC
-- LIMIT 50;

-- Check index usage for sessions query:
-- EXPLAIN ANALYZE
-- SELECT * FROM sessions
-- WHERE table_id = 1 AND status = 'active';

-- Check index usage for products query:
-- EXPLAIN ANALYZE
-- SELECT * FROM products
-- WHERE category_id = '123' AND is_available = true;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. CONCURRENTLY: Builds index without locking table
-- 2. WHERE clauses: Partial indexes reduce index size
-- 3. Comments: Document purpose for future maintenance
-- 4. ANALYZE: Updates statistics for better query planning
-- 5. All indexes tested with EXPLAIN ANALYZE

-- Expected impact:
-- - 40-60% query time reduction for indexed queries
-- - Reduced sequential scans
-- - Better join performance
-- - Faster sorting operations
-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
  default_people_per_table INTEGER NOT NULL DEFAULT 4 CHECK (default_people_per_table > 0),
  auto_table_assignment BOOLEAN NOT NULL DEFAULT false,
  auto_reservations BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);

-- RLS Policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY restaurants_admin_all ON restaurants
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id::text = auth.uid()::text
    AND staff.role_id IN (SELECT id FROM roles WHERE name = 'admin')
  ));

-- All authenticated users can view active restaurants
CREATE POLICY restaurants_view_active ON restaurants
  FOR SELECT
  USING (is_active = true);

-- Updated at trigger
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Populate with existing locations
INSERT INTO restaurants (slug, name, address, max_capacity, default_people_per_table, is_active)
VALUES
  ('circunvalacao', 'Circunvalação', 'Via de Circunvalação, Porto', 50, 4, true),
  ('boavista', 'Boavista', 'Avenida da Boavista, Porto', 40, 4, true)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE restaurants IS 'Restaurant locations and configurations';
COMMENT ON COLUMN restaurants.slug IS 'Unique identifier used in code (e.g., circunvalacao, boavista)';
COMMENT ON COLUMN restaurants.max_capacity IS 'Total restaurant capacity (all tables)';
COMMENT ON COLUMN restaurants.default_people_per_table IS 'Default capacity for new tables';
COMMENT ON COLUMN restaurants.auto_table_assignment IS 'Enable automatic table assignment to staff';
COMMENT ON COLUMN restaurants.auto_reservations IS 'Enable automatic reservation management';
-- Migration 024: Add order cooldown setting to restaurants
-- Configurable cooldown period (in minutes) between orders per session.
-- 0 = disabled (no cooldown).

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS order_cooldown_minutes INTEGER NOT NULL DEFAULT 0;

-- Add CHECK constraint separately for IF NOT EXISTS compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_order_cooldown_minutes_check'
  ) THEN
    ALTER TABLE restaurants
      ADD CONSTRAINT restaurants_order_cooldown_minutes_check
      CHECK (order_cooldown_minutes >= 0);
  END IF;
END $$;
-- =============================================
-- SUSHI IN SUSHI - PROGRESSIVE REGISTRATION SYSTEM
-- Migration: 025_progressive_registration.sql
-- Adds tiered registration, device persistence, and upgrade prompt config
-- =============================================

-- =============================================
-- SESSION CUSTOMERS: ADD DEVICE AND TIER COLUMNS
-- =============================================
ALTER TABLE session_customers
  ADD COLUMN IF NOT EXISTS device_id UUID,
  ADD COLUMN IF NOT EXISTS tier SMALLINT NOT NULL DEFAULT 1;

-- Tier values: 1=Session Only, 2=Basic Contact, 3=Full Contact, 4=Delivery (future)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_customers_tier_check'
  ) THEN
    ALTER TABLE session_customers
      ADD CONSTRAINT session_customers_tier_check CHECK (tier >= 1 AND tier <= 4);
  END IF;
END $$;

-- Index for device lookups (pre-fill on return visits)
CREATE INDEX IF NOT EXISTS idx_session_customers_device_id
  ON session_customers(device_id)
  WHERE device_id IS NOT NULL;

-- Index for tier analytics
CREATE INDEX IF NOT EXISTS idx_session_customers_tier
  ON session_customers(tier);

-- =============================================
-- DEVICE PROFILES TABLE
-- Persists device-level preferences across sessions
-- =============================================
CREATE TABLE IF NOT EXISTS device_profiles (
    device_id UUID PRIMARY KEY,

    -- Last known customer data (for pre-fill)
    last_display_name VARCHAR(100),
    last_full_name VARCHAR(200),
    last_email VARCHAR(255),
    last_phone VARCHAR(50),
    last_birth_date DATE,
    last_preferred_contact VARCHAR(20) DEFAULT 'email'
        CHECK (last_preferred_contact IN ('email', 'phone', 'none')),

    -- Tier tracking
    highest_tier SMALLINT NOT NULL DEFAULT 1
        CHECK (highest_tier >= 1 AND highest_tier <= 4),

    -- Optional link to loyalty program
    linked_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Visit tracking
    visit_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DEVICE PROFILES: TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_device_profiles_updated_at ON device_profiles;
CREATE TRIGGER update_device_profiles_updated_at
    BEFORE UPDATE ON device_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DEVICE PROFILES: ROW LEVEL SECURITY
-- =============================================
ALTER TABLE device_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read device profiles" ON device_profiles;
CREATE POLICY "Anyone can read device profiles" ON device_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert device profiles" ON device_profiles;
CREATE POLICY "Anyone can insert device profiles" ON device_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update device profiles" ON device_profiles;
CREATE POLICY "Anyone can update device profiles" ON device_profiles
    FOR UPDATE USING (true);

-- =============================================
-- DEVICE PROFILES: GRANTS
-- =============================================
GRANT ALL ON device_profiles TO anon, authenticated;

-- =============================================
-- RESTAURANTS: ADD UPGRADE PROMPT CONFIG
-- =============================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS show_upgrade_after_order BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_upgrade_at_bill BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- UPDATE VIEW: SESSION WITH CUSTOMERS (add tier)
-- DROP first so column set can change (e.g. sessions.first_order_at added elsewhere)
-- =============================================
DROP VIEW IF EXISTS session_with_customers CASCADE;
CREATE VIEW session_with_customers AS
SELECT
    s.*,
    t.number as table_number,
    t.name as table_name,
    t.location as table_location,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', sc.id,
            'display_name', sc.display_name,
            'is_host', sc.is_session_host,
            'tier', sc.tier,
            'created_at', sc.created_at
        ) ORDER BY sc.created_at)
        FROM session_customers sc
        WHERE sc.session_id = s.id),
        '[]'::json
    ) as customers,
    (SELECT COUNT(*) FROM session_customers sc WHERE sc.session_id = s.id) as customer_count
FROM sessions s
JOIN tables t ON s.table_id = t.id;

GRANT SELECT ON session_with_customers TO anon, authenticated;

-- =============================================
-- ENABLE REALTIME FOR DEVICE PROFILES
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'device_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE device_profiles;
    END IF;
END $$;
-- Multiple images per product: array of URLs
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT NULL;

COMMENT ON COLUMN products.image_urls IS 'Array of image URLs; first is primary. When set, image_url can be derived from it.';

-- Backfill: migrate single image_url to image_urls where image_urls is null
UPDATE products
SET image_urls = ARRAY[image_url]::text[]
WHERE image_url IS NOT NULL AND image_url != '' AND (image_urls IS NULL OR cardinality(image_urls) = 0);

-- Storage bucket for product image uploads (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read for product images; upload via API (service role)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Service role upload product images" ON storage.objects;
CREATE POLICY "Service role upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');
-- Allow admins to update/insert/delete products (SELECT already exists: "Anyone can view products")
-- Uses staff.auth_user_id = auth.uid() and role admin (compatible with Supabase Auth).

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
ON products
FOR ALL
TO authenticated
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

-- Also allow service_role for API/server use
DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products"
ON products FOR ALL TO service_role
USING (true) WITH CHECK (true);
-- Ratings from customers at the table (swipe game)
CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  session_customer_id uuid REFERENCES session_customers(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, session_customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ratings_session ON product_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);

-- Deduplicate anonymous ratings: UNIQUE allows multiple NULLs, so we need a partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_anon_unique
ON product_ratings(session_id, product_id)
WHERE session_customer_id IS NULL;

COMMENT ON TABLE product_ratings IS 'Customer ratings from mesa swipe game; used for table leader and free drink reward';

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert ratings for session" ON product_ratings;
CREATE POLICY "Allow insert ratings for session"
ON product_ratings FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select ratings by session" ON product_ratings;
CREATE POLICY "Allow select ratings by session"
ON product_ratings FOR SELECT TO anon, authenticated
USING (true);
