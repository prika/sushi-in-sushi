-- Track when an order was delivered (completes stage timing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at) WHERE delivered_at IS NOT NULL;

COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order was delivered';
