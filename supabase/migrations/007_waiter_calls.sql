-- =============================================
-- SUSHI IN SUSHI - WAITER CALLS SYSTEM
-- Migration: 007_waiter_calls.sql
-- =============================================

-- =============================================
-- WAITER CALLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS waiter_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which table is calling
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

    -- Call details
    call_type VARCHAR(50) DEFAULT 'assistance' CHECK (call_type IN ('assistance', 'bill', 'order', 'other')),
    message TEXT,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),

    -- Who responded
    acknowledged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Location for filtering
    location VARCHAR(50) NOT NULL CHECK (location IN ('circunvalacao', 'boavista')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_waiter_calls_table ON waiter_calls(table_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_session ON waiter_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_location ON waiter_calls(location);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_created ON waiter_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_pending ON waiter_calls(location, status) WHERE status = 'pending';

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_waiter_calls_updated_at ON waiter_calls;
CREATE TRIGGER update_waiter_calls_updated_at
    BEFORE UPDATE ON waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;

-- Anyone can create a waiter call (from the public table ordering page)
DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Anyone can view waiter calls (needed for real-time updates on customer side)
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
CREATE POLICY "Anyone can view waiter calls" ON waiter_calls
    FOR SELECT USING (true);

-- Staff can update waiter calls (acknowledge, complete)
DROP POLICY IF EXISTS "Staff can update waiter calls" ON waiter_calls;
CREATE POLICY "Staff can update waiter calls" ON waiter_calls
    FOR UPDATE USING (true);

-- =============================================
-- VIEW: WAITER CALLS WITH DETAILS
-- =============================================
CREATE OR REPLACE VIEW waiter_calls_with_details AS
SELECT
    wc.*,
    t.number as table_number,
    t.name as table_name,
    s.name as acknowledged_by_name,
    wa.staff_name as assigned_waiter_name,
    wa.staff_id as assigned_waiter_id
FROM waiter_calls wc
JOIN tables t ON wc.table_id = t.id
LEFT JOIN staff s ON wc.acknowledged_by = s.id
LEFT JOIN waiter_assignments wa ON wc.table_id = wa.table_id;

-- =============================================
-- VIEW: TABLES WITH ASSIGNED WAITER
-- =============================================
CREATE OR REPLACE VIEW tables_with_waiter AS
SELECT
    t.*,
    wa.staff_id as waiter_id,
    wa.staff_name as waiter_name,
    wa.staff_email as waiter_email,
    wa.assigned_at as waiter_assigned_at
FROM tables t
LEFT JOIN waiter_assignments wa ON t.id = wa.table_id;

-- =============================================
-- FIX: RLS POLICIES FOR PUBLIC ORDERING
-- Sessions and orders need to allow anonymous access for the QR code ordering page
-- =============================================

-- Sessions policies (for public ordering)
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
CREATE POLICY "Anyone can view sessions" ON sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
CREATE POLICY "Anyone can update sessions" ON sessions
    FOR UPDATE USING (true);

-- Orders policies (for public ordering)
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders
    FOR SELECT USING (true);

-- Tables policies (for public ordering - need to read table info)
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
CREATE POLICY "Anyone can view tables" ON tables
    FOR SELECT USING (true);

-- Products/Categories policies (for public ordering - need to read menu)
DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON waiter_calls TO anon, authenticated;
GRANT SELECT ON waiter_calls_with_details TO anon, authenticated;
GRANT SELECT ON tables_with_waiter TO anon, authenticated;

-- Enable realtime for waiter_calls (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'waiter_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
    END IF;
END $$;
