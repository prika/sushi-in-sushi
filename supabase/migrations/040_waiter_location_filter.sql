-- Migration: Waiter Location Filter
-- Ensures waiters can only access tables from their assigned restaurant location
--
-- This migration adds RLS policies to enforce location-based access control for waiters.
-- Admins can still see all tables.

-- =============================================
-- RLS Policy: Tables - Location-based access
-- =============================================

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Waiters can only view tables from their location" ON tables;

-- Create new policy: Waiters can only SELECT tables from their assigned location
CREATE POLICY "Waiters can only view tables from their location"
ON tables FOR SELECT
USING (
  -- Public access: Anyone can view tables (needed for customer QR code access)
  -- Location filtering only applies to authenticated staff

  -- If not authenticated, allow access (for customer QR codes)
  auth.uid() IS NULL

  OR

  -- Admins can see all tables
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
  )

  OR

  -- Kitchen staff can see all tables (needed for kitchen display)
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'kitchen' LIMIT 1)
  )

  OR

  -- Waiters can only see tables from their location
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'waiter' LIMIT 1)
      AND staff.location = tables.location
  )
);

-- =============================================
-- Comment for documentation
-- =============================================

COMMENT ON POLICY "Waiters can only view tables from their location" ON tables IS
'Restricts waiter access to only tables from their assigned restaurant location. Admins and kitchen staff can see all tables.';
