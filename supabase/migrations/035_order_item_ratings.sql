-- Add order_id to product_ratings for per-order-item ratings
ALTER TABLE product_ratings ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_ratings_order ON product_ratings(order_id) WHERE order_id IS NOT NULL;

-- New unique constraint for per-order-item ratings (order_id present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_order_unique
ON product_ratings(session_id, session_customer_id, order_id)
WHERE order_id IS NOT NULL;

-- Keep existing constraints for backwards compatibility (order_id IS NULL)
-- The existing UNIQUE(session_id, session_customer_id, product_id) still applies to legacy ratings

COMMENT ON COLUMN product_ratings.order_id IS 'Order item being rated; NULL for legacy per-product ratings';
