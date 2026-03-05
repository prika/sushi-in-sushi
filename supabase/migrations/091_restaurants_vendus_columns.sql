-- Migration 091: Add Vendus POS columns to restaurants table
-- Consolida config Vendus na tabela restaurants (anteriormente em locations)

-- 1. Add Vendus columns to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS vendus_store_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vendus_register_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vendus_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Index for Vendus lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_vendus_enabled
  ON restaurants(vendus_enabled) WHERE vendus_enabled = true;

-- 3. Copy existing Vendus config from locations to restaurants (match by slug)
UPDATE restaurants r
SET
  vendus_store_id = l.vendus_store_id,
  vendus_register_id = l.vendus_register_id,
  vendus_enabled = COALESCE(l.vendus_enabled, false)
FROM locations l
WHERE r.slug = l.slug
  AND l.vendus_store_id IS NOT NULL;
