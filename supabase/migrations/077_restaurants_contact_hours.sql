-- Migration 077: Add phone and opening hours to restaurants table
-- Used by RestaurantSchema (schema.org SEO) and managed via admin

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS opens_at   TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS closes_at  TEXT DEFAULT '23:00';

-- Populate existing restaurants with known values
UPDATE restaurants SET
  phone     = '+351912348545',
  opens_at  = '12:00',
  closes_at = '23:00'
WHERE slug = 'circunvalacao';

UPDATE restaurants SET
  phone     = '+351924667938',
  opens_at  = '12:00',
  closes_at = '22:00'
WHERE slug = 'boavista';
