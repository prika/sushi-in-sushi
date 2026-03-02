-- =============================================
-- 059: Add quantity column to products
-- =============================================
-- Tracks number of pieces per product (e.g., 8 peças de sushi)
-- Default 1 for existing products

ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN products.quantity IS 'Number of pieces in this product';
