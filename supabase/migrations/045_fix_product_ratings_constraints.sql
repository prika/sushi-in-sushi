-- =============================================
-- Migration 045: Fix product_ratings unique constraints
-- Replace partial indexes with full unique constraints for onConflict support
-- =============================================

-- Drop existing partial indexes
DROP INDEX IF EXISTS idx_product_ratings_order_unique;
DROP INDEX IF EXISTS idx_product_ratings_anon_unique;

-- Drop existing unique constraint (will recreate below)
ALTER TABLE product_ratings DROP CONSTRAINT IF EXISTS product_ratings_session_id_session_customer_id_product_id_key;

-- Add proper unique constraints for upsert support
-- These allow NULL values but enforce uniqueness when values are present

-- Constraint 1: For per-order-item ratings (when order_id is present)
-- Allows: same session + customer can rate different order_ids differently
CREATE UNIQUE INDEX idx_product_ratings_order_upsert
ON product_ratings(session_id, session_customer_id, order_id)
WHERE order_id IS NOT NULL AND session_customer_id IS NOT NULL;

-- Constraint 2: For per-product ratings (when order_id is NULL)
-- Allows: same session + customer can rate different products differently
CREATE UNIQUE INDEX idx_product_ratings_product_upsert
ON product_ratings(session_id, session_customer_id, product_id)
WHERE order_id IS NULL AND session_customer_id IS NOT NULL;

-- Constraint 3: For anonymous ratings (when session_customer_id is NULL)
-- Allows: anonymous users can rate each product once per session
CREATE UNIQUE INDEX idx_product_ratings_anon_upsert
ON product_ratings(session_id, product_id)
WHERE session_customer_id IS NULL;

-- Keep indexes for query performance
CREATE INDEX IF NOT EXISTS idx_product_ratings_session ON product_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_order ON product_ratings(order_id) WHERE order_id IS NOT NULL;

COMMENT ON INDEX idx_product_ratings_order_upsert IS
  'Unique constraint for per-order-item ratings with identified customer';
COMMENT ON INDEX idx_product_ratings_product_upsert IS
  'Unique constraint for per-product ratings with identified customer';
COMMENT ON INDEX idx_product_ratings_anon_upsert IS
  'Unique constraint for anonymous per-product ratings';
