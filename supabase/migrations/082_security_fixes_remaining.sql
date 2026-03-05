-- 082_security_fixes_remaining.sql
-- Fix remaining linter warnings from 081:
--   - Functions with parameters (dynamic ALTER via pg_proc)
--   - More RLS policies to tighten

-- ============================================================
-- 1. Fix ALL public functions without search_path (dynamic)
--    This catches functions with parameters that 081 missed.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- regular functions only
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- ============================================================
-- 2. Tighten remaining RLS policies
--    Tables where admin/service-role is the only writer.
--    QR code tables (orders, sessions, session_customers,
--    game_*, device_profiles, reservations public insert)
--    must stay open — anon key needs access.
-- ============================================================

-- payment_methods: admin-only (staff.auth_user_id = auth.uid() and role = admin)
DROP POLICY IF EXISTS "Admin can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admin can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- products: admin write (public read exists separately)
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products"
  ON public.products FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- restaurant_hours: admin-only write
DROP POLICY IF EXISTS "restaurant_hours_admin_write" ON public.restaurant_hours;
CREATE POLICY "restaurant_hours_admin_write"
  ON public.restaurant_hours FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- site_settings: admin-only write
DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
CREATE POLICY "site_settings_admin_write"
  ON public.site_settings FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- staff_registration_requests: admin manage (public insert stays open for registration form)
DROP POLICY IF EXISTS "admin_all_staff_requests" ON public.staff_registration_requests;
CREATE POLICY "admin_all_staff_requests"
  ON public.staff_registration_requests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- staff_time_off: replace dev policy with authenticated
DROP POLICY IF EXISTS "Staff_time_off dev policy" ON public.staff_time_off;
DROP POLICY IF EXISTS "Authenticated manage staff_time_off" ON public.staff_time_off;
CREATE POLICY "Authenticated manage staff_time_off"
  ON public.staff_time_off FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- table_status_history: restrict insert to authenticated
DROP POLICY IF EXISTS "Staff can insert table history" ON public.table_status_history;
CREATE POLICY "Staff can insert table history"
  ON public.table_status_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- reservation_tables: restrict to authenticated
DROP POLICY IF EXISTS "insert_reservation_tables" ON public.reservation_tables;
CREATE POLICY "insert_reservation_tables"
  ON public.reservation_tables FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "delete_reservation_tables" ON public.reservation_tables;
CREATE POLICY "delete_reservation_tables"
  ON public.reservation_tables FOR DELETE
  USING (auth.role() = 'authenticated');

-- vendus_retry_queue: system/authenticated only
DROP POLICY IF EXISTS "System can manage retry queue" ON public.vendus_retry_queue;
DROP POLICY IF EXISTS "Authenticated manage retry queue" ON public.vendus_retry_queue;
CREATE POLICY "Authenticated manage retry queue"
  ON public.vendus_retry_queue FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- vendus_sync_log: system/authenticated only
DROP POLICY IF EXISTS "System can manage sync log" ON public.vendus_sync_log;
DROP POLICY IF EXISTS "Authenticated manage sync log" ON public.vendus_sync_log;
CREATE POLICY "Authenticated manage sync log"
  ON public.vendus_sync_log FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
