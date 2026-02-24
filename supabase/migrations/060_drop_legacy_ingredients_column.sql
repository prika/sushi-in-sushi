-- =============================================
-- 060: Drop legacy ingredients JSONB column
-- =============================================
-- The inline JSONB ingredients field on products is replaced by
-- the normalized tables: ingredients + product_ingredients (migration 055)

ALTER TABLE products DROP COLUMN IF EXISTS ingredients;
