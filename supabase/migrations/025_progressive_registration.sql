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
