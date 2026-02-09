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
