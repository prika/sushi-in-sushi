-- 080_staff_team_columns.sql
-- Add team/website display columns to staff table + seed team members
-- WARNING: This migration deletes all existing staff and auth records (section 3).
-- It was a one-time seed for initial deployment. Do NOT re-run against production.

-- ============================================================
-- 1. Schema: Add team display columns to staff
-- ============================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS public_position TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Storage bucket for staff photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-photos',
  'team-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "team_photos_public_read" ON storage.objects;
CREATE POLICY "team_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-photos');

DROP POLICY IF EXISTS "team_photos_auth_insert" ON storage.objects;
CREATE POLICY "team_photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'team-photos');

DROP POLICY IF EXISTS "team_photos_auth_update" ON storage.objects;
CREATE POLICY "team_photos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'team-photos');

DROP POLICY IF EXISTS "team_photos_auth_delete" ON storage.objects;
CREATE POLICY "team_photos_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'team-photos');

-- ============================================================
-- 3. Clean existing staff + auth data (fresh start)
--    SAFETY: Only runs on fresh/dev databases (no orders or sessions).
--    Skipped automatically if operational data exists.
-- ============================================================
DO $$
DECLARE
  v_auth_ids uuid[];
  v_has_operational_data boolean;
BEGIN
  -- Guard: skip destructive wipe if the DB has real operational data
  SELECT EXISTS(SELECT 1 FROM orders LIMIT 1) OR EXISTS(SELECT 1 FROM sessions LIMIT 1)
  INTO v_has_operational_data;

  IF v_has_operational_data THEN
    RAISE NOTICE '[080] Skipping staff wipe: operational data exists (orders/sessions found)';
    RETURN;
  END IF;

  -- Collect auth_user_ids before deleting staff
  SELECT array_agg(auth_user_id)
  INTO v_auth_ids
  FROM staff
  WHERE auth_user_id IS NOT NULL;

  -- Null out NO ACTION FK references that would block deletion
  UPDATE invoices SET issued_by = NULL WHERE issued_by IN (SELECT id FROM staff);
  UPDATE invoices SET voided_by = NULL WHERE voided_by IN (SELECT id FROM staff);
  UPDATE vendus_sync_log SET initiated_by = NULL WHERE initiated_by IN (SELECT id FROM staff);
  UPDATE reservation_settings SET updated_by = NULL WHERE updated_by IN (SELECT id FROM staff);
  UPDATE staff_time_off SET approved_by = NULL WHERE approved_by IN (SELECT id FROM staff);
  UPDATE staff_registration_requests SET reviewed_by = NULL WHERE reviewed_by IN (SELECT id FROM staff);

  -- Delete staff (CASCADE handles waiter_tables, staff_time_off; SET NULL handles the rest)
  DELETE FROM staff;

  -- Delete auth records for old staff
  IF v_auth_ids IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = ANY(v_auth_ids);
    DELETE FROM auth.users WHERE id = ANY(v_auth_ids);
  END IF;
END $$;

-- ============================================================
-- 4. Seed team members as staff with Supabase Auth accounts
--    Default password set via p_password param (rotate after deployment)
--    Emails: nome@sushinsushi.pt
-- ============================================================

-- Helper function (dropped at the end)
CREATE OR REPLACE FUNCTION _seed_staff_member(
  p_name TEXT,
  p_email TEXT,
  p_role_id INTEGER,
  p_photo TEXT,
  p_position TEXT,
  p_order INTEGER,
  p_visible BOOLEAN,
  p_password TEXT DEFAULT 'SushiAdmin2026#Pt'
) RETURNS void AS $$
DECLARE
  v_auth_id uuid;
  v_staff_id uuid;
  v_existing_auth_id uuid;
BEGIN
  -- Check if staff with this email already exists
  SELECT id, auth_user_id INTO v_staff_id, v_existing_auth_id
  FROM staff WHERE email = p_email;

  IF v_staff_id IS NOT NULL THEN
    -- Staff exists: update team fields
    UPDATE staff SET
      photo_url = p_photo,
      public_position = p_position,
      display_order = p_order,
      show_on_website = p_visible
    WHERE id = v_staff_id;

    -- Create auth account if missing
    IF v_existing_auth_id IS NULL THEN
      -- Check if auth user with this email exists
      SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email;

      IF v_auth_id IS NULL THEN
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          is_super_admin, confirmation_token, recovery_token,
          email_change_token_new, email_change
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
          'authenticated', 'authenticated', p_email,
          crypt(p_password, gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('name', p_name),
          false, '', '', '', ''
        ) RETURNING id INTO v_auth_id;

        INSERT INTO auth.identities (
          id, user_id, provider_id, provider, identity_data,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          v_auth_id, v_auth_id, p_email, 'email',
          jsonb_build_object('sub', v_auth_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
          now(), now(), now()
        );
      END IF;

      UPDATE staff SET auth_user_id = v_auth_id WHERE id = v_staff_id;
    END IF;
  ELSE
    -- New staff: create auth user + staff record

    -- Check if auth user with this email already exists
    SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email;

    IF v_auth_id IS NULL THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', p_email,
        crypt(p_password, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', p_name),
        false, '', '', '', ''
      ) RETURNING id INTO v_auth_id;

      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_auth_id, v_auth_id, p_email, 'email',
        jsonb_build_object('sub', v_auth_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
        now(), now(), now()
      );
    END IF;

    INSERT INTO staff (name, email, role_id, is_active, auth_user_id, photo_url, public_position, display_order, show_on_website)
    VALUES (p_name, p_email, p_role_id, true, v_auth_id, p_photo, p_position, p_order, p_visible);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Seed: 12 team members (fresh)
-- Roles: admin=1, kitchen=2, waiter=3
-- ============================================================

-- Gerentes (admin)
SELECT _seed_staff_member('Evandro',  'evandro@sushinsushi.pt',  1, '/photos/evandro.jpg',  'Gerente e Chef de Cozinha', 1,  true);
SELECT _seed_staff_member('Yessa',    'yessa@sushinsushi.pt',    1, '/photos/yessa.jpg',    'Gerente e Chef de Cozinha', 2,  true);

-- Chefs / Cozinha (kitchen)
SELECT _seed_staff_member('Mayra',    'mayra@sushinsushi.pt',    2, '/photos/mayra.jpg',    'Chef de Cozinha',           3,  true);
SELECT _seed_staff_member('Vitoria',  'vitoria@sushinsushi.pt',  2, '/photos/vitoria.jpg',  'Assistente de Cozinha',     4,  true);
SELECT _seed_staff_member('Waleska',  'waleska@sushinsushi.pt',  2, '/photos/waleska.jpg',  'Assistente de Cozinha',     5,  true);
SELECT _seed_staff_member('Rakib',    'rakib@sushinsushi.pt',    2, '/photos/rakib.jpg',    'Assistente de Cozinha',     6,  true);
SELECT _seed_staff_member('Ricky',    'ricky@sushinsushi.pt',    2, '/photos/ricky.jpg',    'Assistente de Cozinha',     7,  true);

-- Atendentes (waiter)
SELECT _seed_staff_member('Line',     'line@sushinsushi.pt',     3, '/photos/line.jpg',     'Assistente de Mesa',        8,  true);
SELECT _seed_staff_member('Chloe',    'chloe@sushinsushi.pt',    3, '/photos/chloe.jpg',    'Assistente de Mesa',        9,  true);

-- Membros sem nome definido (ocultos do site, editar depois)
SELECT _seed_staff_member('Membro 1', 'membro1@sushinsushi.pt',  2, '/photos/unknown.jpg',  'Assistente de Cozinha',     10, false);
SELECT _seed_staff_member('Membro 2', 'membro2@sushinsushi.pt',  2, '/photos/unknown2.jpg', 'Assistente de Cozinha',     11, false);
SELECT _seed_staff_member('Membro 3', 'membro3@sushinsushi.pt',  2, '/photos/unknown3.jpg', 'Assistente de Cozinha',     12, false);

-- Clean up helper
DROP FUNCTION IF EXISTS _seed_staff_member;
