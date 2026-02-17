-- =============================================
-- Migration: Enable Auto-Assignment
-- Re-enables automatic waiter assignment for both restaurants
-- =============================================

-- Enable auto-assignment for both restaurants
UPDATE restaurants
SET auto_table_assignment = TRUE
WHERE slug IN ('circunvalacao', 'boavista');

-- Verify the change
DO $$
DECLARE
  enabled_count INT;
BEGIN
  SELECT COUNT(*) INTO enabled_count
  FROM restaurants
  WHERE auto_table_assignment = TRUE;

  RAISE NOTICE '✅ Auto-assignment enabled for % restaurants', enabled_count;
END $$;

-- Show final status
SELECT
  name,
  slug,
  auto_table_assignment,
  CASE
    WHEN auto_table_assignment THEN '✅ ENABLED - Auto-assign active'
    ELSE '⚠️ DISABLED - Manual assign only'
  END as status
FROM restaurants
ORDER BY name;

-- Show current waiter assignments by location
SELECT
  s.location as waiter_location,
  s.name as waiter_name,
  COUNT(wt.table_id) as assigned_tables
FROM staff s
LEFT JOIN waiter_tables wt ON wt.staff_id = s.id
JOIN roles r ON r.id = s.role_id
WHERE r.name = 'waiter'
  AND s.is_active = true
GROUP BY s.location, s.name, s.id
ORDER BY s.location, assigned_tables;

-- =============================================
-- IMPORTANT NOTES
-- =============================================
-- After enabling auto-assignment:
-- 1. When a customer scans QR code → system auto-assigns to least busy waiter
-- 2. System filters waiters by table location automatically
-- 3. Waiter can still manually "comandar" unassigned tables
-- 4. Assignment is based on "least occupied tables" algorithm
