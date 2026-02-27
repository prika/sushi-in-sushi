-- Migration 067: Add allergens to ingredients (EU 14 mandatory allergens)
-- Stored as TEXT[] for efficient querying with @> and ANY()
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
