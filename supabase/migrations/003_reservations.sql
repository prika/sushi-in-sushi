-- =============================================
-- SUSHI IN SUSHI - RESERVATIONS SYSTEM
-- Migration: 003_reservations.sql
-- =============================================

-- =============================================
-- RESERVATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Customer info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Reservation details
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),

    -- Location and table
    location VARCHAR(50) NOT NULL CHECK (location IN ('circunvalacao', 'boavista')),
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

    -- Service type preference
    is_rodizio BOOLEAN DEFAULT true,

    -- Special requests
    special_requests TEXT,
    occasion VARCHAR(50), -- 'birthday', 'anniversary', 'business', 'other'

    -- Status management
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

    -- Staff assignment
    confirmed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Cancellation info
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Linked session (when reservation is seated)
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    seated_at TIMESTAMP WITH TIME ZONE,

    -- Marketing consent
    marketing_consent BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_location ON reservations(location);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(phone);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, reservation_time);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can create a reservation (for the public form)
DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can view all reservations
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
CREATE POLICY "Staff can view reservations" ON reservations
    FOR SELECT USING (true);

-- Staff can update reservations
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
CREATE POLICY "Staff can update reservations" ON reservations
    FOR UPDATE USING (true);

-- Admin can delete reservations
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;
CREATE POLICY "Admin can delete reservations" ON reservations
    FOR DELETE USING (true);

-- =============================================
-- VIEWS
-- =============================================

-- Drop existing view first to avoid column name conflicts
DROP VIEW IF EXISTS reservations_with_details CASCADE;

-- Reservations with table info
CREATE VIEW reservations_with_details AS
SELECT
    r.*,
    t.number as table_number,
    t.name as table_name,
    s.name as confirmed_by_name,
    CONCAT(r.first_name, ' ', r.last_name) as customer_name,
    CASE
        WHEN r.status = 'pending' THEN 'Pendente'
        WHEN r.status = 'confirmed' THEN 'Confirmada'
        WHEN r.status = 'cancelled' THEN 'Cancelada'
        WHEN r.status = 'completed' THEN 'Concluída'
        WHEN r.status = 'no_show' THEN 'Não Compareceu'
        ELSE r.status
    END as status_label
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN staff s ON r.confirmed_by = s.id;

-- Today's reservations
CREATE OR REPLACE VIEW todays_reservations AS
SELECT * FROM reservations_with_details
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check table availability for a given time slot
CREATE OR REPLACE FUNCTION check_table_availability(
    p_location VARCHAR(50),
    p_date DATE,
    p_time TIME,
    p_party_size INTEGER,
    p_duration_minutes INTEGER DEFAULT 120
)
RETURNS TABLE (
    table_id UUID,
    table_number INTEGER,
    table_name VARCHAR(255),
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id as table_id,
        t.number as table_number,
        t.name as table_name,
        NOT EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.table_id = t.id
            AND r.reservation_date = p_date
            AND r.status IN ('pending', 'confirmed')
            AND (
                (r.reservation_time, r.reservation_time + (p_duration_minutes * INTERVAL '1 minute'))
                OVERLAPS
                (p_time, p_time + (p_duration_minutes * INTERVAL '1 minute'))
            )
        ) as is_available
    FROM tables t
    WHERE t.location = p_location
    AND t.is_active = true
    AND (t.status IS NULL OR t.status != 'inactive')
    ORDER BY t.number;
END;
$$ LANGUAGE plpgsql;

-- Get available time slots for a date
CREATE OR REPLACE FUNCTION get_available_slots(
    p_location VARCHAR(50),
    p_date DATE,
    p_party_size INTEGER
)
RETURNS TABLE (
    slot_time TIME,
    tables_available INTEGER
) AS $$
DECLARE
    v_start_time TIME := '12:00:00';
    v_end_time TIME := '22:00:00';
    v_slot_interval INTERVAL := '30 minutes';
    v_current_time TIME;
BEGIN
    v_current_time := v_start_time;

    WHILE v_current_time <= v_end_time LOOP
        RETURN QUERY
        SELECT
            v_current_time as slot_time,
            (
                SELECT COUNT(*)::INTEGER
                FROM check_table_availability(p_location, p_date, v_current_time, p_party_size)
                WHERE is_available = true
            ) as tables_available;

        v_current_time := v_current_time + v_slot_interval;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON reservations TO anon;
GRANT ALL ON reservations TO authenticated;
GRANT SELECT ON reservations_with_details TO authenticated;
GRANT SELECT ON todays_reservations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
