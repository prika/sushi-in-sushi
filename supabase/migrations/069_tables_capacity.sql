-- Migration 069: Add capacity column to tables
-- Each table gets its own capacity (defaults to restaurant's default_people_per_table)

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4;

-- Populate capacity from each restaurant's default_people_per_table
UPDATE tables t
SET capacity = r.default_people_per_table
FROM restaurants r
WHERE t.location = r.slug;
