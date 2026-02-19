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
