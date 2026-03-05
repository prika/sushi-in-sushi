-- 084_consolidate_rls_policies.sql
-- Fix multiple_permissive_policies warnings: overlapping policies per role/action.
-- Strategy: use TO role targeting to eliminate cross-role overlap.
--   - FOR ALL TO authenticated: write+read for authenticated
--   - FOR SELECT TO anon: public read where needed
--   - Drop redundant old policies from pre-014 migrations

-- ============================================================
-- 1. Public read + authenticated write tables
--    Pattern: FOR ALL TO authenticated + FOR SELECT TO anon
-- ============================================================

-- categories
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_all" ON public.categories;
DROP POLICY IF EXISTS "categories_anon_read" ON public.categories;
CREATE POLICY "categories_auth_all" ON public.categories
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "categories_anon_read" ON public.categories
  FOR SELECT TO anon USING (true);

-- ingredients
DROP POLICY IF EXISTS "ingredients_manage" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_read" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_auth_all" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_anon_read" ON public.ingredients;
CREATE POLICY "ingredients_auth_all" ON public.ingredients
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "ingredients_anon_read" ON public.ingredients
  FOR SELECT TO anon USING (true);

-- product_ingredients
DROP POLICY IF EXISTS "product_ingredients_manage" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_read" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_auth_all" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_anon_read" ON public.product_ingredients;
CREATE POLICY "product_ingredients_auth_all" ON public.product_ingredients
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "product_ingredients_anon_read" ON public.product_ingredients
  FOR SELECT TO anon USING (true);

-- products
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "products_auth_all" ON public.products;
DROP POLICY IF EXISTS "products_anon_read" ON public.products;
CREATE POLICY "products_auth_all" ON public.products
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "products_anon_read" ON public.products
  FOR SELECT TO anon USING (true);

-- kitchen_zones
DROP POLICY IF EXISTS "Authenticated can manage kitchen_zones" ON public.kitchen_zones;
DROP POLICY IF EXISTS "Anyone can view kitchen_zones" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_auth_all" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_anon_read" ON public.kitchen_zones;
CREATE POLICY "kitchen_zones_auth_all" ON public.kitchen_zones
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "kitchen_zones_anon_read" ON public.kitchen_zones
  FOR SELECT TO anon USING (true);

-- locations
DROP POLICY IF EXISTS "locations_auth_manage" ON public.locations;
DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
DROP POLICY IF EXISTS "locations_auth_all" ON public.locations;
DROP POLICY IF EXISTS "locations_anon_read" ON public.locations;
CREATE POLICY "locations_auth_all" ON public.locations
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "locations_anon_read" ON public.locations
  FOR SELECT TO anon USING (true);

-- payment_methods
DROP POLICY IF EXISTS "Admin can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Anyone can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_auth_all" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_anon_read" ON public.payment_methods;
CREATE POLICY "payment_methods_auth_all" ON public.payment_methods
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "payment_methods_anon_read" ON public.payment_methods
  FOR SELECT TO anon USING (true);

-- restaurant_hours
DROP POLICY IF EXISTS "restaurant_hours_admin_write" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_public_read" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_auth_all" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_anon_read" ON public.restaurant_hours;
CREATE POLICY "restaurant_hours_auth_all" ON public.restaurant_hours
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "restaurant_hours_anon_read" ON public.restaurant_hours
  FOR SELECT TO anon USING (true);

-- ============================================================
-- 2. Authenticated-only tables (no public read needed)
--    Drop redundant SELECT/INSERT policies, single FOR ALL
-- ============================================================

-- customers
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admin can manage customers" ON public.customers;
DROP POLICY IF EXISTS "customers_auth_all" ON public.customers;
CREATE POLICY "customers_auth_all" ON public.customers
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- daily_metrics
DROP POLICY IF EXISTS "Staff can view daily metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Admin can manage daily metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "daily_metrics_auth_all" ON public.daily_metrics;
CREATE POLICY "daily_metrics_auth_all" ON public.daily_metrics
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- invoices
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "invoices_auth_all" ON public.invoices;
CREATE POLICY "invoices_auth_all" ON public.invoices
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- staff_registration_requests: fix overlap (admin ALL + public INSERT)
DROP POLICY IF EXISTS "admin_all_staff_requests" ON public.staff_registration_requests;
DROP POLICY IF EXISTS "public_insert_staff_requests" ON public.staff_registration_requests;
DROP POLICY IF EXISTS "staff_requests_auth_all" ON public.staff_registration_requests;
DROP POLICY IF EXISTS "staff_requests_anon_insert" ON public.staff_registration_requests;
CREATE POLICY "staff_requests_auth_all" ON public.staff_registration_requests
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "staff_requests_anon_insert" ON public.staff_registration_requests
  FOR INSERT TO anon
  WITH CHECK ((select auth.role()) = 'anon');

-- ============================================================
-- 3. orders: drop old redundant policies, keep location-based
--    "Staff can view orders by location" already includes anon access.
--    "Staff can update orders" already includes anon access.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_delete" ON public.orders;

-- Authenticated-only DELETE (location-based, consistent with SELECT/UPDATE)
-- QR users cancel via UPDATE, not DELETE
CREATE POLICY "orders_auth_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN tables t ON t.id = s.table_id
      WHERE s.id = orders.session_id
      AND can_access_location(t.location::VARCHAR)
    )
  );

-- Keep: "Anyone can create orders" (INSERT — QR code)
-- Keep: "Staff can view orders by location" (SELECT — from 083)
-- Keep: "Staff can update orders" (UPDATE — from 083)

-- ============================================================
-- 4. sessions: drop old redundant policies, keep location-based
--    "Staff can view sessions by location" already includes anon access.
--    "Staff can update sessions" already includes anon access.
--    "Staff can update session ordering mode" is redundant (permissive
--     policies are OR'd, so the broader UPDATE already covers it).
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can update session ordering mode" ON public.sessions;
DROP POLICY IF EXISTS "sessions_auth_delete" ON public.sessions;

-- Authenticated-only DELETE (location-based, consistent with SELECT/UPDATE)
CREATE POLICY "sessions_auth_delete" ON public.sessions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = sessions.table_id
      AND can_access_location(t.location::VARCHAR)
    )
  );

-- Keep: "Anyone can create sessions" (INSERT — QR code)
-- Keep: "Staff can view sessions by location" (SELECT — from 083)
-- Keep: "Staff can update sessions" (UPDATE — from 083)

-- ============================================================
-- 5. tables: consolidate 3 overlapping SELECT policies
--    Split admin write into per-operation to avoid FOR ALL→SELECT overlap.
-- ============================================================

DROP POLICY IF EXISTS "Admin can manage tables" ON public.tables;
DROP POLICY IF EXISTS "Staff can view tables by location" ON public.tables;
DROP POLICY IF EXISTS "Waiters can only view tables from their location" ON public.tables;
DROP POLICY IF EXISTS "tables_anon_read" ON public.tables;
DROP POLICY IF EXISTS "tables_auth_read" ON public.tables;
DROP POLICY IF EXISTS "tables_admin_insert" ON public.tables;
DROP POLICY IF EXISTS "tables_admin_update" ON public.tables;
DROP POLICY IF EXISTS "tables_admin_delete" ON public.tables;

-- Anon read (QR code table access)
CREATE POLICY "tables_anon_read" ON public.tables
  FOR SELECT TO anon USING (true);

-- Staff read (location-based)
CREATE POLICY "tables_auth_read" ON public.tables
  FOR SELECT TO authenticated
  USING (can_access_location(location::VARCHAR));

-- Admin write (split by operation to avoid SELECT overlap)
CREATE POLICY "tables_admin_insert" ON public.tables
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "tables_admin_update" ON public.tables
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "tables_admin_delete" ON public.tables
  FOR DELETE TO authenticated
  USING (is_current_user_admin());
