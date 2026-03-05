-- 081_security_fixes.sql
-- Fix Supabase Database Linter security warnings:
--   - 12 views with SECURITY DEFINER → switch to SECURITY INVOKER
--   - 1 table (locations) without RLS → enable RLS + add policies
--   - 34 functions without search_path → set search_path = public
--   - RLS always-true policies → tighten where safe
--   - Clean up leftover team_members artifacts

-- ============================================================
-- 1. Convert SECURITY DEFINER views to SECURITY INVOKER
-- ============================================================
ALTER VIEW IF EXISTS public.waiter_assignments SET (security_invoker = on);
ALTER VIEW IF EXISTS public.session_metrics_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.invoices_with_details SET (security_invoker = on);
ALTER VIEW IF EXISTS public.waiter_calls_with_details SET (security_invoker = on);
ALTER VIEW IF EXISTS public.products_with_vendus_status SET (security_invoker = on);
ALTER VIEW IF EXISTS public.todays_reservations SET (security_invoker = on);
ALTER VIEW IF EXISTS public.recent_sync_operations SET (security_invoker = on);
ALTER VIEW IF EXISTS public.tables_full_status SET (security_invoker = on);
ALTER VIEW IF EXISTS public.orders_with_customer SET (security_invoker = on);
ALTER VIEW IF EXISTS public.staff_with_roles SET (security_invoker = on);
ALTER VIEW IF EXISTS public.reservations_with_details SET (security_invoker = on);
ALTER VIEW IF EXISTS public.session_with_customers SET (security_invoker = on);

-- ============================================================
-- 2. Enable RLS on public.locations
-- ============================================================
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
CREATE POLICY "locations_public_read"
  ON public.locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "locations_auth_manage" ON public.locations;
CREATE POLICY "locations_auth_manage"
  ON public.locations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 3. Fix function search_path (set search_path = public)
--    ALTER FUNCTION does not support IF EXISTS, so we wrap
--    each in a DO block with EXCEPTION handling.
-- ============================================================
DO $$ BEGIN ALTER FUNCTION public.update_ingredients_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_updated_at_column() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_closures_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_team_members_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_staff_time_off_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_reservation_settings_timestamp() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_session_first_order() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_session_metrics() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_table_on_session_start() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_session_metrics() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_session_config() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.close_session_transactional() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.close_session_and_free_table() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.check_table_availability() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_available_slots() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_date_closed() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_closure_reason() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_current_staff() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_current_staff_role() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_current_staff_location() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_current_staff_id() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_current_user_admin() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.current_user_has_role() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_current_user_staff() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_staff_login_info() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_mfa_required_for_current_user() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.can_access_location() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.waiter_can_access_table() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.log_auth_event() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.check_rate_limit() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.reset_rate_limit() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.generate_verification_token() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.cleanup_auth_data() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.set_product_ingredients() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================
-- 4. Tighten RLS policies where safe
--    NOTE: Many "always true" policies are INTENTIONAL because:
--    - QR code ordering (mesa/) uses anon key → needs open INSERT/UPDATE on orders, sessions
--    - Game tables need public access for QR code users
--    - System tables (activity_log, email_events) need unrestricted INSERT
--    - Admin operations use createAdminClient() (service role) which bypasses RLS
--
--    We tighten only policies where authenticated-only makes sense.
-- ============================================================

-- categories: restrict write to authenticated
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- customers: admin-only management
DROP POLICY IF EXISTS "Admin can manage customers" ON public.customers;
CREATE POLICY "Admin can manage customers"
  ON public.customers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- daily_metrics: admin-only
DROP POLICY IF EXISTS "Admin can manage daily metrics" ON public.daily_metrics;
CREATE POLICY "Admin can manage daily metrics"
  ON public.daily_metrics FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- invoices: restrict to authenticated
DROP POLICY IF EXISTS "Admin can manage invoices" ON public.invoices;
CREATE POLICY "Admin can manage invoices"
  ON public.invoices FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
CREATE POLICY "Staff can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- kitchen_zones: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated can manage kitchen_zones" ON public.kitchen_zones;
CREATE POLICY "Authenticated can manage kitchen_zones"
  ON public.kitchen_zones FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ingredients: public read, authenticated write
DROP POLICY IF EXISTS "ingredients_all" ON public.ingredients;
CREATE POLICY "ingredients_read"
  ON public.ingredients FOR SELECT
  USING (true);
CREATE POLICY "ingredients_manage"
  ON public.ingredients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- product_ingredients: public read, authenticated write
DROP POLICY IF EXISTS "product_ingredients_all" ON public.product_ingredients;
CREATE POLICY "product_ingredients_read"
  ON public.product_ingredients FOR SELECT
  USING (true);
CREATE POLICY "product_ingredients_manage"
  ON public.product_ingredients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- customer_companions: restrict to authenticated
DROP POLICY IF EXISTS "Service role full access to companions" ON public.customer_companions;
CREATE POLICY "Authenticated manage companions"
  ON public.customer_companions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- auth_audit_log: restrict insert to authenticated
DROP POLICY IF EXISTS "System can insert auth audit log" ON public.auth_audit_log;
CREATE POLICY "Authenticated can insert auth audit log"
  ON public.auth_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- auth_rate_limits: restrict to authenticated
DROP POLICY IF EXISTS "System can manage rate limits" ON public.auth_rate_limits;
CREATE POLICY "Authenticated manage rate limits"
  ON public.auth_rate_limits FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 5. Clean up leftover team_members artifacts
-- ============================================================
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP FUNCTION IF EXISTS public.update_team_members_updated_at() CASCADE;
