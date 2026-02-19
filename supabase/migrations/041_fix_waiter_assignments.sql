-- Migration: Fix Waiter Table Assignments
-- Cleans up incorrect assignments where waiter location doesn't match table location
-- Disables auto-assignment on all restaurants

-- =============================================
-- 1. Remove incorrect waiter-table assignments
-- =============================================

-- Find and remove assignments where staff location != table location
DELETE FROM waiter_tables
WHERE id IN (
  SELECT wt.id
  FROM waiter_tables wt
  JOIN staff s ON s.id = wt.staff_id
  JOIN tables t ON t.id = wt.table_id
  JOIN roles r ON r.id = s.role_id
  WHERE r.name = 'waiter'
    AND s.location IS NOT NULL
    AND t.location IS NOT NULL
    AND s.location != t.location
);

-- Report: Show how many incorrect assignments were removed
DO $$
DECLARE
  removed_count INT;
BEGIN
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RAISE NOTICE 'Removed % incorrect waiter-table assignments', removed_count;
END $$;

-- =============================================
-- 2. Disable auto-assignment on all restaurants
-- =============================================

-- Set auto_table_assignment = FALSE for all restaurants
UPDATE restaurants
SET auto_table_assignment = FALSE
WHERE auto_table_assignment = TRUE;

-- Report: Show updated restaurants
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Disabled auto-assignment on % restaurants', updated_count;
END $$;

-- =============================================
-- 3. Add index for faster location filtering
-- =============================================

-- Index for waiter-table assignments by staff location (if not exists)
CREATE INDEX IF NOT EXISTS idx_waiter_tables_staff_location
ON waiter_tables (staff_id)
INCLUDE (table_id);

-- =============================================
-- 4. Verification queries (commented out)
-- =============================================

-- Uncomment to verify no incorrect assignments remain:
-- SELECT
--   s.name as waiter_name,
--   s.location as waiter_location,
--   t.number as table_number,
--   t.location as table_location,
--   'MISMATCH' as status
-- FROM waiter_tables wt
-- JOIN staff s ON s.id = wt.staff_id
-- JOIN tables t ON t.id = wt.table_id
-- JOIN roles r ON r.id = s.role_id
-- WHERE r.name = 'waiter'
--   AND s.location IS NOT NULL
--   AND t.location IS NOT NULL
--   AND s.location != t.location;

-- Uncomment to verify auto-assignment is disabled:
-- SELECT
--   name,
--   slug,
--   auto_table_assignment,
--   CASE
--     WHEN auto_table_assignment THEN '⚠️ STILL ENABLED'
--     ELSE '✅ DISABLED'
--   END as status
-- FROM restaurants;

-- =============================================
-- Documentation
-- =============================================

COMMENT ON INDEX idx_waiter_tables_staff_location IS
'Improves performance when filtering waiter assignments by staff location';
