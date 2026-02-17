-- Migration: Restaurant Closures / Days Off
-- This table stores dates when the restaurant is closed (holidays, maintenance, etc.)

-- Create restaurant_closures table
CREATE TABLE IF NOT EXISTS restaurant_closures (
    id SERIAL PRIMARY KEY,
    closure_date DATE NOT NULL,
    location VARCHAR(50) CHECK (location IN ('circunvalacao', 'boavista', NULL)),
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_day_of_week INTEGER CHECK (recurring_day_of_week >= 0 AND recurring_day_of_week <= 6),
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one closure per date per location (NULL location = both)
    CONSTRAINT unique_closure_date_location UNIQUE (closure_date, location)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_closures_date ON restaurant_closures(closure_date);
CREATE INDEX IF NOT EXISTS idx_closures_location ON restaurant_closures(location);
CREATE INDEX IF NOT EXISTS idx_closures_recurring ON restaurant_closures(is_recurring, recurring_day_of_week);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_closures_updated_at ON restaurant_closures;
CREATE TRIGGER trigger_closures_updated_at
    BEFORE UPDATE ON restaurant_closures
    FOR EACH ROW
    EXECUTE FUNCTION update_closures_updated_at();

-- Function to check if a date is closed for a location
CREATE OR REPLACE FUNCTION is_date_closed(
    check_date DATE,
    check_location VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
    is_closed BOOLEAN := false;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date)::INTEGER;

    -- Check for specific date closure (for this location or all locations)
    SELECT EXISTS (
        SELECT 1 FROM restaurant_closures
        WHERE closure_date = check_date
        AND (location = check_location OR location IS NULL)
        AND (is_recurring = false OR is_recurring IS NULL)
    ) INTO is_closed;

    IF is_closed THEN
        RETURN true;
    END IF;

    -- Check for recurring weekly closure (for this location or all locations)
    SELECT EXISTS (
        SELECT 1 FROM restaurant_closures
        WHERE is_recurring = true
        AND recurring_day_of_week = day_of_week
        AND (location = check_location OR location IS NULL)
    ) INTO is_closed;

    RETURN is_closed;
END;
$$ LANGUAGE plpgsql;

-- Function to get closure reason for a date
CREATE OR REPLACE FUNCTION get_closure_reason(
    check_date DATE,
    check_location VARCHAR(50)
)
RETURNS TEXT AS $$
DECLARE
    closure_reason TEXT;
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date)::INTEGER;

    -- First check specific date closure
    SELECT reason INTO closure_reason
    FROM restaurant_closures
    WHERE closure_date = check_date
    AND (location = check_location OR location IS NULL)
    AND (is_recurring = false OR is_recurring IS NULL)
    LIMIT 1;

    IF closure_reason IS NOT NULL THEN
        RETURN closure_reason;
    END IF;

    -- Then check recurring closure
    SELECT reason INTO closure_reason
    FROM restaurant_closures
    WHERE is_recurring = true
    AND recurring_day_of_week = day_of_week
    AND (location = check_location OR location IS NULL)
    LIMIT 1;

    RETURN closure_reason;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE restaurant_closures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read for authenticated users"
    ON restaurant_closures FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read for anon (for reservation form)"
    ON restaurant_closures FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert/update/delete for admin"
    ON restaurant_closures FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Add some comments
COMMENT ON TABLE restaurant_closures IS 'Stores restaurant closure dates (holidays, days off, maintenance)';
COMMENT ON COLUMN restaurant_closures.location IS 'NULL means closure applies to all locations';
COMMENT ON COLUMN restaurant_closures.is_recurring IS 'If true, closure repeats every week on recurring_day_of_week';
COMMENT ON COLUMN restaurant_closures.recurring_day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
