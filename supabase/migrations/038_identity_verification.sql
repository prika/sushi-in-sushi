-- =============================================
-- SUSHI IN SUSHI - IDENTITY VERIFICATION
-- Migration: 038_identity_verification.sql
-- Adds email/phone verification for session customers
-- =============================================

-- =============================================
-- SESSION CUSTOMERS: ADD VERIFICATION FIELDS
-- =============================================
ALTER TABLE session_customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20) CHECK (verification_type IN ('email', 'phone'));

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_session_customers_verification_token
  ON session_customers(verification_token)
  WHERE verification_token IS NOT NULL;

-- =============================================
-- CUSTOMERS: ADD VERIFICATION FIELDS (for loyalty program)
-- =============================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- VERIFICATION LOGS TABLE (for audit and rate limiting)
-- =============================================
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    session_customer_id UUID REFERENCES session_customers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Verification details
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('email', 'phone')),
    contact_value TEXT NOT NULL, -- email or phone number
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'verified', 'expired', 'failed')),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for verification logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_session_customer
  ON verification_logs(session_customer_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_customer
  ON verification_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_token
  ON verification_logs(token)
  WHERE status = 'sent';

-- Rate limiting: prevent spam (max 3 verifications per contact per hour)
CREATE INDEX IF NOT EXISTS idx_verification_logs_rate_limit
  ON verification_logs(contact_value, created_at);

-- =============================================
-- VERIFICATION LOGS: TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_verification_logs_updated_at ON verification_logs;
CREATE TRIGGER update_verification_logs_updated_at
    BEFORE UPDATE ON verification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION LOGS: ROW LEVEL SECURITY
-- =============================================
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read their own verification logs" ON verification_logs;
CREATE POLICY "Anyone can read their own verification logs" ON verification_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert verification logs" ON verification_logs;
CREATE POLICY "Anyone can insert verification logs" ON verification_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update verification logs" ON verification_logs;
CREATE POLICY "Anyone can update verification logs" ON verification_logs
    FOR UPDATE USING (true);

-- =============================================
-- VERIFICATION LOGS: GRANTS
-- =============================================
GRANT ALL ON verification_logs TO anon, authenticated;

-- =============================================
-- FUNCTION: Generate verification token
-- =============================================
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate 6-digit numeric token
    token := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN token;
END;
$$;

-- =============================================
-- ENABLE REALTIME FOR VERIFICATION LOGS
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'verification_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE verification_logs;
    END IF;
END $$;
