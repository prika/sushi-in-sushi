-- Migration 079: Customer auth link + Staff registration requests
-- Apply in Supabase SQL Editor

-- 1. Link customers to Supabase Auth users
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique partial index (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_idx
  ON customers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2. Staff registration requests table
CREATE TABLE IF NOT EXISTS staff_registration_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  role_id     INTEGER     REFERENCES roles(id),        -- set by admin on approval
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID        REFERENCES staff(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE staff_registration_requests ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS "public_insert_staff_requests" ON staff_registration_requests;
DROP POLICY IF EXISTS "admin_all_staff_requests" ON staff_registration_requests;

-- Anyone can submit a request (public form)
CREATE POLICY "public_insert_staff_requests"
  ON staff_registration_requests
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read (admin will use service role)
CREATE POLICY "admin_all_staff_requests"
  ON staff_registration_requests
  FOR ALL
  USING (true);
