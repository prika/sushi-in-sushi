-- =============================================
-- SUPABASE AUTH INTEGRATION FOR STAFF
-- Migration: 011_supabase_auth_integration.sql
-- =============================================

-- 1. Add auth_user_id column to link staff to auth.users
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);

-- 3. Function to get current staff record by auth.uid()
CREATE OR REPLACE FUNCTION get_current_staff()
RETURNS SETOF staff AS $$
  SELECT * FROM staff
  WHERE auth_user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Function to get current staff role name
CREATE OR REPLACE FUNCTION get_current_staff_role()
RETURNS VARCHAR AS $$
  SELECT r.name
  FROM staff s
  JOIN roles r ON s.role_id = r.id
  WHERE s.auth_user_id = auth.uid()
  AND s.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Function to get current staff location
CREATE OR REPLACE FUNCTION get_current_staff_location()
RETURNS VARCHAR AS $$
  SELECT s.location
  FROM staff s
  WHERE s.auth_user_id = auth.uid()
  AND s.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_current_staff_role() = 'admin', false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Function to check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION current_user_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_current_staff_role() = ANY(allowed_roles), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. Function to check if current user is staff (any role)
CREATE OR REPLACE FUNCTION is_current_user_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN staff.auth_user_id IS 'Link to Supabase Auth user (auth.users table)';
COMMENT ON FUNCTION get_current_staff() IS 'Returns the staff record for the currently authenticated user';
COMMENT ON FUNCTION get_current_staff_role() IS 'Returns the role name (admin/kitchen/waiter) for the current user';
COMMENT ON FUNCTION is_current_user_admin() IS 'Returns true if the current user is an admin';
COMMENT ON FUNCTION current_user_has_role(TEXT[]) IS 'Returns true if the current user has any of the specified roles';
COMMENT ON FUNCTION is_current_user_staff() IS 'Returns true if the current user is an active staff member';
