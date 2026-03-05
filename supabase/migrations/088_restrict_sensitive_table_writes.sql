-- 088_restrict_sensitive_table_writes.sql
-- Fix overly permissive RLS from 084: customers, daily_metrics, invoices
-- were changed to FOR ALL TO authenticated but should restrict writes to admin.
-- Original intent: staff can read, only admin can write (invoices: staff can also create).

-- ============================================================
-- 1. customers — staff read, admin write
-- ============================================================
DROP POLICY IF EXISTS "customers_auth_all" ON public.customers;
DROP POLICY IF EXISTS "customers_auth_read" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_update" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_delete" ON public.customers;

CREATE POLICY "customers_auth_read" ON public.customers
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "customers_admin_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "customers_admin_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "customers_admin_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 2. daily_metrics — staff read, admin write
-- ============================================================
DROP POLICY IF EXISTS "daily_metrics_auth_all" ON public.daily_metrics;
DROP POLICY IF EXISTS "daily_metrics_auth_read" ON public.daily_metrics;
DROP POLICY IF EXISTS "daily_metrics_admin_insert" ON public.daily_metrics;
DROP POLICY IF EXISTS "daily_metrics_admin_update" ON public.daily_metrics;
DROP POLICY IF EXISTS "daily_metrics_admin_delete" ON public.daily_metrics;

CREATE POLICY "daily_metrics_auth_read" ON public.daily_metrics
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "daily_metrics_admin_insert" ON public.daily_metrics
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "daily_metrics_admin_update" ON public.daily_metrics
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "daily_metrics_admin_delete" ON public.daily_metrics
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 3. invoices — staff read + create, admin update/delete
-- ============================================================
DROP POLICY IF EXISTS "invoices_auth_all" ON public.invoices;
DROP POLICY IF EXISTS "invoices_auth_read" ON public.invoices;
DROP POLICY IF EXISTS "invoices_auth_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_admin_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_admin_delete" ON public.invoices;

CREATE POLICY "invoices_auth_read" ON public.invoices
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- Any staff can create invoices (e.g. waiter closing a session)
CREATE POLICY "invoices_auth_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "invoices_admin_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "invoices_admin_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 4. site_settings — public read, admin-only write
--    078 had USING (true) on FOR ALL which allows anon writes
-- ============================================================
DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;

-- public read already exists: "site_settings_public_read" FOR SELECT USING (true)

CREATE POLICY "site_settings_admin_insert" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "site_settings_admin_delete" ON public.site_settings
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 5. storage: team-photos — public read, admin-only write
--    080 had no auth checks on insert/update/delete
-- ============================================================
DROP POLICY IF EXISTS "team_photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_auth_delete" ON storage.objects;

CREATE POLICY "team_photos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-photos' AND is_current_user_admin());

CREATE POLICY "team_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-photos' AND is_current_user_admin())
  WITH CHECK (bucket_id = 'team-photos' AND is_current_user_admin());

CREATE POLICY "team_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-photos' AND is_current_user_admin());
