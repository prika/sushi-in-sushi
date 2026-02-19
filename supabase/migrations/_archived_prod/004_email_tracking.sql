-- =============================================
-- SUSHI IN SUSHI - EMAIL TRACKING
-- Migration: 004_email_tracking.sql
-- =============================================

-- =============================================
-- ADD EMAIL TRACKING COLUMNS TO RESERVATIONS
-- =============================================

-- Email tracking for customer confirmation email
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_status VARCHAR(50) DEFAULT NULL;

-- Email tracking for confirmation email (when admin confirms)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR(50) DEFAULT NULL;

-- Email status values: 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'

-- =============================================
-- EMAIL EVENTS LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to reservation
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,

    -- Resend email ID
    email_id VARCHAR(255) NOT NULL,

    -- Event type: 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
    event_type VARCHAR(50) NOT NULL,

    -- Email type: 'customer_confirmation', 'reservation_confirmed', 'restaurant_notification'
    email_type VARCHAR(50),

    -- Recipient email
    recipient_email VARCHAR(255),

    -- Raw event data from Resend webhook
    raw_data JSONB,

    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_email_events_reservation ON email_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Staff can view email events
DROP POLICY IF EXISTS "Staff can view email events" ON email_events;
CREATE POLICY "Staff can view email events" ON email_events
    FOR SELECT USING (true);

-- System can insert email events (via service role)
DROP POLICY IF EXISTS "System can insert email events" ON email_events;
CREATE POLICY "System can insert email events" ON email_events
    FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATE VIEW TO INCLUDE EMAIL STATUS
-- =============================================
DROP VIEW IF EXISTS todays_reservations;
DROP VIEW IF EXISTS reservations_with_details;

CREATE OR REPLACE VIEW reservations_with_details AS
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
    END as status_label,
    CASE
        WHEN r.customer_email_opened_at IS NOT NULL THEN 'opened'
        WHEN r.customer_email_delivered_at IS NOT NULL THEN 'delivered'
        WHEN r.customer_email_sent_at IS NOT NULL THEN 'sent'
        ELSE 'not_sent'
    END as email_status_label
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN staff s ON r.confirmed_by = s.id;

-- Recreate today's reservations view
CREATE OR REPLACE VIEW todays_reservations AS
SELECT * FROM reservations_with_details
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON email_events TO authenticated;
GRANT SELECT ON reservations_with_details TO authenticated;
GRANT SELECT ON todays_reservations TO authenticated;
