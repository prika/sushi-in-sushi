-- Migration 072: Lock down reservation_cancel_tokens RLS
-- All operations go through API routes using createAdminClient() (service role),
-- which bypasses RLS. No client-side access is needed or safe for this table.

-- Drop the permissive policy that allowed unrestricted access
DROP POLICY IF EXISTS "cancel_tokens_all" ON reservation_cancel_tokens;

-- Revoke all privileges from anon and authenticated roles
REVOKE ALL ON reservation_cancel_tokens FROM anon, authenticated;
