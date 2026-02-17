-- =============================================
-- Migration: 039_session_ordering_mode
-- Description: Adds ordering_mode field to sessions table
--              for controlling whether clients can order or only waiter can
-- =============================================

-- Add ordering_mode column to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS ordering_mode VARCHAR(20) DEFAULT 'client'
CHECK (ordering_mode IN ('client', 'waiter_only'));

-- Add comment for documentation
COMMENT ON COLUMN sessions.ordering_mode IS
  'Controls who can submit orders: client (default), waiter_only (lock mode)';

-- Add index for filtering sessions by ordering mode
CREATE INDEX IF NOT EXISTS idx_sessions_ordering_mode
  ON sessions(ordering_mode);

-- =============================================
-- Row Level Security (RLS) Policy
-- =============================================

-- Only staff (admin/waiter) can update ordering_mode
DROP POLICY IF EXISTS "Staff can update session ordering mode" ON sessions;

CREATE POLICY "Staff can update session ordering mode"
ON sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'waiter')
      )
  )
);
