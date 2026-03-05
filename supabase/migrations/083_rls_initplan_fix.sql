-- 083_rls_initplan_fix.sql
-- Fix auth_rls_initplan warnings: wrap auth.role() in (select ...) for performance
-- Fix multiple_permissive_policies: drop old duplicate policies
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================
-- 1. Drop old duplicate policies (different names from originals)
-- ============================================================

-- categories: old "Admins can manage categories" (plural) duplicates our "Admin can manage categories"
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- auth_session_config: merge "Admins can manage session config" + "Staff can view session config" into one
DROP POLICY IF EXISTS "Staff can view session config" ON public.auth_session_config;
DROP POLICY IF EXISTS "Admins can manage session config" ON public.auth_session_config;
CREATE POLICY "Authenticated manage session config"
  ON public.auth_session_config FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ingredients: drop old + recreate with initplan fix
DROP POLICY IF EXISTS "ingredients_manage" ON public.ingredients;
CREATE POLICY "ingredients_manage"
  ON public.ingredients FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- product_ingredients: drop old + recreate with initplan fix
DROP POLICY IF EXISTS "product_ingredients_manage" ON public.product_ingredients;
CREATE POLICY "product_ingredients_manage"
  ON public.product_ingredients FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 2. Fix initplan: recreate policies from 081/082 with (select auth.role())
-- ============================================================

-- locations
DROP POLICY IF EXISTS "locations_auth_manage" ON public.locations;
CREATE POLICY "locations_auth_manage"
  ON public.locations FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- categories
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- customers
DROP POLICY IF EXISTS "Admin can manage customers" ON public.customers;
CREATE POLICY "Admin can manage customers"
  ON public.customers FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- daily_metrics
DROP POLICY IF EXISTS "Admin can manage daily metrics" ON public.daily_metrics;
CREATE POLICY "Admin can manage daily metrics"
  ON public.daily_metrics FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- invoices
DROP POLICY IF EXISTS "Admin can manage invoices" ON public.invoices;
CREATE POLICY "Admin can manage invoices"
  ON public.invoices FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
CREATE POLICY "Staff can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- kitchen_zones
DROP POLICY IF EXISTS "Authenticated can manage kitchen_zones" ON public.kitchen_zones;
CREATE POLICY "Authenticated can manage kitchen_zones"
  ON public.kitchen_zones FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- customer_companions
DROP POLICY IF EXISTS "Authenticated manage companions" ON public.customer_companions;
CREATE POLICY "Authenticated manage companions"
  ON public.customer_companions FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- auth_audit_log
DROP POLICY IF EXISTS "Authenticated can insert auth audit log" ON public.auth_audit_log;
CREATE POLICY "Authenticated can insert auth audit log"
  ON public.auth_audit_log FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- auth_rate_limits
DROP POLICY IF EXISTS "Authenticated manage rate limits" ON public.auth_rate_limits;
CREATE POLICY "Authenticated manage rate limits"
  ON public.auth_rate_limits FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- payment_methods
DROP POLICY IF EXISTS "Admin can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admin can manage payment methods"
  ON public.payment_methods FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- products
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products"
  ON public.products FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- restaurant_hours
DROP POLICY IF EXISTS "restaurant_hours_admin_write" ON public.restaurant_hours;
CREATE POLICY "restaurant_hours_admin_write"
  ON public.restaurant_hours FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- site_settings
DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
CREATE POLICY "site_settings_admin_write"
  ON public.site_settings FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- staff_registration_requests
DROP POLICY IF EXISTS "admin_all_staff_requests" ON public.staff_registration_requests;
CREATE POLICY "admin_all_staff_requests"
  ON public.staff_registration_requests FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- staff_time_off
DROP POLICY IF EXISTS "Authenticated manage staff_time_off" ON public.staff_time_off;
CREATE POLICY "Authenticated manage staff_time_off"
  ON public.staff_time_off FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- table_status_history
DROP POLICY IF EXISTS "Staff can insert table history" ON public.table_status_history;
CREATE POLICY "Staff can insert table history"
  ON public.table_status_history FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- reservation_tables
DROP POLICY IF EXISTS "insert_reservation_tables" ON public.reservation_tables;
CREATE POLICY "insert_reservation_tables"
  ON public.reservation_tables FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "delete_reservation_tables" ON public.reservation_tables;
CREATE POLICY "delete_reservation_tables"
  ON public.reservation_tables FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- vendus_retry_queue
DROP POLICY IF EXISTS "Authenticated manage retry queue" ON public.vendus_retry_queue;
CREATE POLICY "Authenticated manage retry queue"
  ON public.vendus_retry_queue FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- vendus_sync_log
DROP POLICY IF EXISTS "Authenticated manage sync log" ON public.vendus_sync_log;
CREATE POLICY "Authenticated manage sync log"
  ON public.vendus_sync_log FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 3. Fix initplan on PRE-EXISTING policies (from earlier migrations)
--    These use auth.uid() or custom functions without (select ...)
-- ============================================================

-- staff: "Authenticated staff can view staff"
DROP POLICY IF EXISTS "Authenticated staff can view staff" ON public.staff;
CREATE POLICY "Authenticated staff can view staff"
  ON public.staff FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- restaurants: "restaurants_admin_all"
DROP POLICY IF EXISTS "restaurants_admin_all" ON public.restaurants;
CREATE POLICY "restaurants_admin_all"
  ON public.restaurants FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- reservation_settings: read + update
DROP POLICY IF EXISTS "Admins can read reservation settings" ON public.reservation_settings;
CREATE POLICY "Admins can read reservation settings"
  ON public.reservation_settings FOR SELECT
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admins can update reservation settings" ON public.reservation_settings;
CREATE POLICY "Admins can update reservation settings"
  ON public.reservation_settings FOR UPDATE
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 4. Fix initplan on location-based policies
--    Original policies from 014, 039, 040 use auth.role()/auth.uid()
--    without (select ...) wrapper. Recreate with initplan fix.
--    IMPORTANT: can_access_location() takes 1 param (VARCHAR),
--    sessions/orders join through tables for location.
-- ============================================================

-- ----- tables -----

-- From migration 014: "Staff can view tables by location"
DROP POLICY IF EXISTS "Staff can view tables by location" ON public.tables;
CREATE POLICY "Staff can view tables by location"
  ON public.tables FOR SELECT
  USING (
    (select auth.role()) = 'anon'
    OR
    can_access_location(location::VARCHAR)
  );

-- From migration 040: "Waiters can only view tables from their location"
DROP POLICY IF EXISTS "Waiters can only view tables from their location" ON public.tables;
CREATE POLICY "Waiters can only view tables from their location"
  ON public.tables FOR SELECT
  USING (
    (select auth.uid()) IS NULL
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = (select auth.uid())
        AND staff.is_active = true
        AND staff.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
    )
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = (select auth.uid())
        AND staff.is_active = true
        AND staff.role_id = (SELECT id FROM roles WHERE name = 'kitchen' LIMIT 1)
    )
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = (select auth.uid())
        AND staff.is_active = true
        AND staff.role_id = (SELECT id FROM roles WHERE name = 'waiter' LIMIT 1)
        AND staff.location = tables.location
    )
  );

-- ----- sessions -----

-- From migration 014: "Staff can view sessions by location"
DROP POLICY IF EXISTS "Staff can view sessions by location" ON public.sessions;
CREATE POLICY "Staff can view sessions by location"
  ON public.sessions FOR SELECT
  USING (
    (select auth.role()) = 'anon'
    OR
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = sessions.table_id
      AND can_access_location(t.location::VARCHAR)
    )
  );

-- From migration 014: "Staff can update sessions"
DROP POLICY IF EXISTS "Staff can update sessions" ON public.sessions;
CREATE POLICY "Staff can update sessions"
  ON public.sessions FOR UPDATE
  USING (
    (select auth.role()) = 'anon'
    OR
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = sessions.table_id
      AND can_access_location(t.location::VARCHAR)
    )
  );

-- From migration 039: "Staff can update session ordering mode"
DROP POLICY IF EXISTS "Staff can update session ordering mode" ON public.sessions;
CREATE POLICY "Staff can update session ordering mode"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = (select auth.uid())
        AND staff.is_active = true
        AND staff.role_id IN (
          SELECT id FROM roles WHERE name IN ('admin', 'waiter')
        )
    )
  );

-- ----- orders -----

-- From migration 014: "Staff can view orders by location"
DROP POLICY IF EXISTS "Staff can view orders by location" ON public.orders;
CREATE POLICY "Staff can view orders by location"
  ON public.orders FOR SELECT
  USING (
    (select auth.role()) = 'anon'
    OR
    (
      get_current_staff_role() = 'kitchen'
      AND status IN ('pending', 'preparing', 'ready')
      AND EXISTS (
        SELECT 1 FROM sessions s
        JOIN tables t ON t.id = s.table_id
        WHERE s.id = orders.session_id
        AND can_access_location(t.location::VARCHAR)
      )
    )
    OR
    is_current_user_admin()
    OR
    (
      get_current_staff_role() = 'waiter'
      AND EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = orders.session_id
        AND waiter_can_access_table(s.table_id)
      )
    )
  );

-- From migration 014: "Staff can update orders"
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (
    (select auth.role()) = 'anon'
    OR
    (
      get_current_staff_role() = 'kitchen'
      AND EXISTS (
        SELECT 1 FROM sessions s
        JOIN tables t ON t.id = s.table_id
        WHERE s.id = orders.session_id
        AND can_access_location(t.location::VARCHAR)
      )
    )
    OR
    is_current_user_admin()
    OR
    (
      get_current_staff_role() = 'waiter'
      AND EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = orders.session_id
        AND waiter_can_access_table(s.table_id)
      )
    )
  );

-- ----- reservations -----

-- From migration 014: "Staff can view reservations by location"
DROP POLICY IF EXISTS "Staff can view reservations by location" ON public.reservations;
CREATE POLICY "Staff can view reservations by location"
  ON public.reservations FOR SELECT
  USING (
    (select auth.role()) = 'anon'
    OR
    can_access_location(location::VARCHAR)
  );

-- From migration 014: "Staff can update reservations by location"
DROP POLICY IF EXISTS "Staff can update reservations by location" ON public.reservations;
CREATE POLICY "Staff can update reservations by location"
  ON public.reservations FOR UPDATE
  USING (can_access_location(location::VARCHAR));

-- ----- waiter_calls -----

-- From migration 014: "Staff can view waiter calls by location"
DROP POLICY IF EXISTS "Staff can view waiter calls by location" ON public.waiter_calls;
CREATE POLICY "Staff can view waiter calls by location"
  ON public.waiter_calls FOR SELECT
  USING (
    (select auth.role()) = 'anon'
    OR
    is_current_user_admin()
    OR
    waiter_can_access_table(table_id)
  );

-- From migration 014: "Staff can update waiter calls"
DROP POLICY IF EXISTS "Staff can update waiter calls" ON public.waiter_calls;
CREATE POLICY "Staff can update waiter calls"
  ON public.waiter_calls FOR UPDATE
  USING (
    (select auth.role()) = 'anon'
    OR is_current_user_admin()
    OR waiter_can_access_table(table_id)
  );
