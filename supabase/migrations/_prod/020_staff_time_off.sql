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
