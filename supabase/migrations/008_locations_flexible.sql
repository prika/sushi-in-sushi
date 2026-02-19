-- =============================================
-- FLEXIBLE LOCATIONS (support more restaurants)
-- Migration: 008_locations_flexible.sql
-- =============================================

-- Remove hardcoded slug constraint to allow dynamic locations
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_slug_check;
