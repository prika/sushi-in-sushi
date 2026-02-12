-- Track which kitchen staff prepared each order and when
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by uuid REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_started_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_prepared_by ON orders(prepared_by);
CREATE INDEX IF NOT EXISTS idx_orders_preparing_started_at ON orders(preparing_started_at) WHERE preparing_started_at IS NOT NULL;

COMMENT ON COLUMN orders.prepared_by IS 'Staff member who started preparing this order';
COMMENT ON COLUMN orders.preparing_started_at IS 'Timestamp when preparation started';
COMMENT ON COLUMN orders.ready_at IS 'Timestamp when order was marked ready';
