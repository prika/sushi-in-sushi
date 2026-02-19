-- =============================================
-- RESET TABLES BY LOCATION - Selective Cleanup
-- =============================================
-- This script closes sessions and clears assignments for a specific location only
-- Safer than full reset when you only want to clean one restaurant
-- =============================================

-- CONFIGURATION: Set the location to reset
-- Change 'circunvalacao' to 'boavista' if needed
DO $$
DECLARE
  target_location VARCHAR := 'circunvalacao'; -- 👈 CHANGE THIS
  closed_sessions INT := 0;
  freed_tables INT := 0;
  removed_assignments INT := 0;
  cancelled_calls INT := 0;
BEGIN
  RAISE NOTICE '🔧 Resetting location: %', target_location;
  RAISE NOTICE '';

  -- Step 1: Close all active sessions for tables in this location
  UPDATE sessions
  SET
    status = 'closed',
    closed_at = NOW()
  WHERE status IN ('active', 'pending_payment')
    AND table_id IN (
      SELECT id FROM tables WHERE location = target_location
    );

  GET DIAGNOSTICS closed_sessions = ROW_COUNT;
  RAISE NOTICE '✅ Closed % sessions', closed_sessions;

  -- Step 2: Mark tables as available
  UPDATE tables
  SET
    status = 'available',
    current_session_id = NULL
  WHERE location = target_location
    AND status IN ('occupied', 'reserved');

  GET DIAGNOSTICS freed_tables = ROW_COUNT;
  RAISE NOTICE '✅ Freed % tables', freed_tables;

  -- Step 3: Clear waiter assignments for this location
  DELETE FROM waiter_tables
  WHERE table_id IN (
    SELECT id FROM tables WHERE location = target_location
  );

  GET DIAGNOSTICS removed_assignments = ROW_COUNT;
  RAISE NOTICE '✅ Removed % assignments', removed_assignments;

  -- Step 4: Cancel waiter calls for this location
  UPDATE waiter_calls
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE status IN ('pending', 'acknowledged')
    AND table_id IN (
      SELECT id FROM tables WHERE location = target_location
    );

  GET DIAGNOSTICS cancelled_calls = ROW_COUNT;
  RAISE NOTICE '✅ Cancelled % waiter calls', cancelled_calls;

  -- Final verification
  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY FOR %:', target_location;
  RAISE NOTICE '  - Sessions closed: %', closed_sessions;
  RAISE NOTICE '  - Tables freed: %', freed_tables;
  RAISE NOTICE '  - Assignments removed: %', removed_assignments;
  RAISE NOTICE '  - Calls cancelled: %', cancelled_calls;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Location reset complete!';
END $$;

-- Verify final state for the location
SELECT
  'circunvalacao' as location, -- 👈 CHANGE THIS to match target_location above
  (SELECT COUNT(*) FROM sessions s
   JOIN tables t ON t.id = s.table_id
   WHERE t.location = 'circunvalacao' AND s.status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM tables
   WHERE location = 'circunvalacao' AND status = 'occupied') as occupied_tables,
  (SELECT COUNT(*) FROM waiter_tables wt
   JOIN tables t ON t.id = wt.table_id
   WHERE t.location = 'circunvalacao') as active_assignments,
  (SELECT COUNT(*) FROM waiter_calls wc
   JOIN tables t ON t.id = wc.table_id
   WHERE t.location = 'circunvalacao' AND wc.status = 'pending') as pending_calls;
