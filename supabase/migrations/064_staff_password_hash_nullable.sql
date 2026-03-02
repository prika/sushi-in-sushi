-- Migration 064: Remove password_hash, add auth_user_id
-- Staff auth is now managed exclusively via Supabase Auth.
-- The password_hash column is no longer needed.

-- 1. Drop views that depend on staff columns (they use s.*)
DROP VIEW IF EXISTS staff_with_roles CASCADE;

-- 2. Drop the legacy column
ALTER TABLE staff DROP COLUMN IF EXISTS password_hash;

-- 3. Add auth_user_id if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Recreate the view without password_hash
CREATE OR REPLACE VIEW staff_with_roles AS
SELECT
    s.*,
    r.name as role_name,
    r.description as role_description
FROM staff s
JOIN roles r ON s.role_id = r.id;

-- 5. Restore permissions
GRANT SELECT ON staff_with_roles TO authenticated;
GRANT SELECT ON staff_with_roles TO anon;
