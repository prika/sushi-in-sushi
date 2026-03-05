-- 090_restrict_admin_only_table_writes.sql
-- Fix overly permissive RLS from 082/084: several tables used FOR ALL TO authenticated
-- but only admin should write. Reads stay open (authenticated or anon as appropriate).
-- All admin writes go through API routes with createAdminClient() (service role),
-- so these restrictions are defense-in-depth.

-- ============================================================
-- 1. products — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "products_auth_all" ON public.products;
DROP POLICY IF EXISTS "products_auth_read" ON public.products;
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

CREATE POLICY "products_auth_read" ON public.products
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "products_anon_read"

CREATE POLICY "products_admin_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "products_admin_update" ON public.products
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "products_admin_delete" ON public.products
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 2. categories — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "categories_auth_all" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_read" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

CREATE POLICY "categories_auth_read" ON public.categories
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "categories_anon_read"

CREATE POLICY "categories_admin_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "categories_admin_update" ON public.categories
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "categories_admin_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 3. ingredients — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "ingredients_auth_all" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_auth_read" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_admin_insert" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_admin_update" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_admin_delete" ON public.ingredients;

CREATE POLICY "ingredients_auth_read" ON public.ingredients
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "ingredients_anon_read"

CREATE POLICY "ingredients_admin_insert" ON public.ingredients
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "ingredients_admin_update" ON public.ingredients
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "ingredients_admin_delete" ON public.ingredients
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 4. product_ingredients — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "product_ingredients_auth_all" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_auth_read" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_admin_insert" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_admin_update" ON public.product_ingredients;
DROP POLICY IF EXISTS "product_ingredients_admin_delete" ON public.product_ingredients;

CREATE POLICY "product_ingredients_auth_read" ON public.product_ingredients
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "product_ingredients_anon_read"

CREATE POLICY "product_ingredients_admin_insert" ON public.product_ingredients
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "product_ingredients_admin_update" ON public.product_ingredients
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "product_ingredients_admin_delete" ON public.product_ingredients
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 5. payment_methods — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "payment_methods_auth_all" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_auth_read" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_admin_insert" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_admin_update" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_admin_delete" ON public.payment_methods;

CREATE POLICY "payment_methods_auth_read" ON public.payment_methods
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "payment_methods_anon_read"

CREATE POLICY "payment_methods_admin_insert" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "payment_methods_admin_update" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "payment_methods_admin_delete" ON public.payment_methods
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 6. kitchen_zones — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "kitchen_zones_auth_all" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_auth_read" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_admin_insert" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_admin_update" ON public.kitchen_zones;
DROP POLICY IF EXISTS "kitchen_zones_admin_delete" ON public.kitchen_zones;

CREATE POLICY "kitchen_zones_auth_read" ON public.kitchen_zones
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "kitchen_zones_anon_read"

CREATE POLICY "kitchen_zones_admin_insert" ON public.kitchen_zones
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "kitchen_zones_admin_update" ON public.kitchen_zones
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "kitchen_zones_admin_delete" ON public.kitchen_zones
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 7. locations — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "locations_auth_all" ON public.locations;
DROP POLICY IF EXISTS "locations_auth_read" ON public.locations;
DROP POLICY IF EXISTS "locations_admin_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_admin_update" ON public.locations;
DROP POLICY IF EXISTS "locations_admin_delete" ON public.locations;

CREATE POLICY "locations_auth_read" ON public.locations
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "locations_anon_read"

CREATE POLICY "locations_admin_insert" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "locations_admin_update" ON public.locations
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "locations_admin_delete" ON public.locations
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 8. restaurant_hours — public read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "restaurant_hours_auth_all" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_auth_read" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_admin_insert" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_admin_update" ON public.restaurant_hours;
DROP POLICY IF EXISTS "restaurant_hours_admin_delete" ON public.restaurant_hours;

CREATE POLICY "restaurant_hours_auth_read" ON public.restaurant_hours
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- anon read already exists: "restaurant_hours_anon_read"

CREATE POLICY "restaurant_hours_admin_insert" ON public.restaurant_hours
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "restaurant_hours_admin_update" ON public.restaurant_hours
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "restaurant_hours_admin_delete" ON public.restaurant_hours
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 9. staff_time_off — staff read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Authenticated manage staff_time_off" ON public.staff_time_off;
DROP POLICY IF EXISTS "staff_time_off_auth_read" ON public.staff_time_off;
DROP POLICY IF EXISTS "staff_time_off_admin_insert" ON public.staff_time_off;
DROP POLICY IF EXISTS "staff_time_off_admin_update" ON public.staff_time_off;
DROP POLICY IF EXISTS "staff_time_off_admin_delete" ON public.staff_time_off;

CREATE POLICY "staff_time_off_auth_read" ON public.staff_time_off
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "staff_time_off_admin_insert" ON public.staff_time_off
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "staff_time_off_admin_update" ON public.staff_time_off
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "staff_time_off_admin_delete" ON public.staff_time_off
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 10. vendus_retry_queue — staff read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Authenticated manage retry queue" ON public.vendus_retry_queue;
DROP POLICY IF EXISTS "vendus_retry_queue_auth_read" ON public.vendus_retry_queue;
DROP POLICY IF EXISTS "vendus_retry_queue_admin_insert" ON public.vendus_retry_queue;
DROP POLICY IF EXISTS "vendus_retry_queue_admin_update" ON public.vendus_retry_queue;
DROP POLICY IF EXISTS "vendus_retry_queue_admin_delete" ON public.vendus_retry_queue;

CREATE POLICY "vendus_retry_queue_auth_read" ON public.vendus_retry_queue
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "vendus_retry_queue_admin_insert" ON public.vendus_retry_queue
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "vendus_retry_queue_admin_update" ON public.vendus_retry_queue
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "vendus_retry_queue_admin_delete" ON public.vendus_retry_queue
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 11. vendus_sync_log — staff read, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Authenticated manage sync log" ON public.vendus_sync_log;
DROP POLICY IF EXISTS "vendus_sync_log_auth_read" ON public.vendus_sync_log;
DROP POLICY IF EXISTS "vendus_sync_log_admin_insert" ON public.vendus_sync_log;
DROP POLICY IF EXISTS "vendus_sync_log_admin_update" ON public.vendus_sync_log;
DROP POLICY IF EXISTS "vendus_sync_log_admin_delete" ON public.vendus_sync_log;

CREATE POLICY "vendus_sync_log_auth_read" ON public.vendus_sync_log
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "vendus_sync_log_admin_insert" ON public.vendus_sync_log
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "vendus_sync_log_admin_update" ON public.vendus_sync_log
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "vendus_sync_log_admin_delete" ON public.vendus_sync_log
  FOR DELETE TO authenticated
  USING (is_current_user_admin());
