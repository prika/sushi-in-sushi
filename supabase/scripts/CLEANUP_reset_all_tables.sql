-- =============================================
-- RESET ALL TABLES - Emergency Cleanup
-- =============================================
-- WARNING: This script closes all sessions and clears all table assignments
-- Use only for testing or emergency cleanup scenarios
-- =============================================

-- Step 1: Close all active sessions
UPDATE sessions
SET
  status = 'closed',
  closed_at = NOW()
WHERE status IN ('active', 'pending_payment');

-- Report how many sessions were closed
DO $$
DECLARE
  closed_count INT;
BEGIN
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RAISE NOTICE '✅ Closed % active sessions', closed_count;
END $$;

-- Step 2: Mark all tables as available
UPDATE tables
SET
  status = 'available',
  current_session_id = NULL
WHERE status IN ('occupied', 'reserved');

-- Report how many tables were freed
DO $$
DECLARE
  freed_count INT;
BEGIN
  GET DIAGNOSTICS freed_count = ROW_COUNT;
  RAISE NOTICE '✅ Freed % tables (now available)', freed_count;
END $$;

-- Step 3: Clear all waiter-table assignments
DELETE FROM waiter_tables;

-- Report how many assignments were removed
DO $$
DECLARE
  assignments_count INT;
BEGIN
  GET DIAGNOSTICS assignments_count = ROW_COUNT;
  RAISE NOTICE '✅ Removed % waiter-table assignments', assignments_count;
END $$;

-- Step 4: Cancel all pending waiter calls
UPDATE waiter_calls
SET
  status = 'completed',
  completed_at = NOW()
WHERE status IN ('pending', 'acknowledged');

-- Report how many calls were cancelled
DO $$
DECLARE
  calls_count INT;
BEGIN
  GET DIAGNOSTICS calls_count = ROW_COUNT;
  RAISE NOTICE '✅ Cancelled % pending waiter calls', calls_count;
END $$;

-- =============================================
-- Verification Queries
-- =============================================

-- Show final state
DO $$
DECLARE
  active_sessions INT;
  occupied_tables INT;
  active_assignments INT;
  pending_calls INT;
BEGIN
  SELECT COUNT(*) INTO active_sessions FROM sessions WHERE status = 'active';
  SELECT COUNT(*) INTO occupied_tables FROM tables WHERE status = 'occupied';
  SELECT COUNT(*) INTO active_assignments FROM waiter_tables;
  SELECT COUNT(*) INTO pending_calls FROM waiter_calls WHERE status = 'pending';

  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL STATE:';
  RAISE NOTICE '  - Active sessions: %', active_sessions;
  RAISE NOTICE '  - Occupied tables: %', occupied_tables;
  RAISE NOTICE '  - Waiter assignments: %', active_assignments;
  RAISE NOTICE '  - Pending calls: %', pending_calls;
  RAISE NOTICE '';

  IF active_sessions = 0 AND occupied_tables = 0 AND active_assignments = 0 AND pending_calls = 0 THEN
    RAISE NOTICE '✅ System fully reset - All clear!';
  ELSE
    RAISE WARNING '⚠️ Some items remain - check manually';
  END IF;
END $$;

-- Show available tables by location
SELECT
  location,
  COUNT(*) as available_tables
FROM tables
WHERE status = 'available' AND is_active = true
GROUP BY location
ORDER BY location;
