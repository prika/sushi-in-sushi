-- Migration 071: Add cancellation tracking columns to reservations
-- Tracks WHO cancelled (admin vs customer) and HOW (site vs phone)

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('admin', 'customer'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_source TEXT CHECK (cancellation_source IN ('site', 'phone'));

COMMENT ON COLUMN reservations.cancelled_by IS 'Who cancelled: admin or customer';
COMMENT ON COLUMN reservations.cancellation_source IS 'How it was cancelled: site (online) or phone (telephone/in-person)';
