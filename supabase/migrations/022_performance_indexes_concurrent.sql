-- =====================================================
-- Performance Indexes - CONCURRENT Version (Production)
-- Description: Create indexes with CONCURRENTLY for zero-downtime deployment
-- Created: 2026-02-06
--
-- IMPORTANT: This file CANNOT be run via Supabase migrations (npx supabase db push)
-- because CONCURRENTLY cannot run inside a transaction.
--
-- HOW TO USE:
-- 1. Connect directly to your production database:
--    psql $DATABASE_URL
--
-- 2. Run this file:
--    \i supabase/migrations/021_performance_indexes_concurrent.sql
--
-- OR run directly:
--    psql $DATABASE_URL < supabase/migrations/021_performance_indexes_concurrent.sql
--
-- BENEFITS OF CONCURRENTLY:
-- - No table locks during index creation
-- - Zero downtime
-- - Production-safe
--
-- TRADEOFF:
-- - Takes longer to create indexes
-- - Cannot run in transaction (migrations use transactions)
-- =====================================================

-- ORDERS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC)
  WHERE status IN ('pending', 'preparing', 'ready');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_session_id
  ON orders(session_id)
  WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_product_session
  ON orders(product_id, session_id);

-- SESSIONS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_table_status
  ON sessions(table_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status_created
  ON sessions(status, created_at DESC)
  WHERE status IN ('active', 'pending_payment');

-- PRODUCTS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_available
  ON products(category_id, is_available);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_available_name
  ON products(name)
  WHERE is_available = true;

-- RESERVATIONS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_date_status
  ON reservations(date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_datetime_status
  ON reservations(date, time, status)
  WHERE status IN ('pending', 'confirmed');

-- STAFF TIME OFF TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_time_off_dates
  ON staff_time_off(start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_time_off_staff_dates
  ON staff_time_off(staff_id, start_date, end_date)
  WHERE status = 'approved';

-- WAITER TABLES TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waiter_tables_staff_table
  ON waiter_tables(staff_id, table_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waiter_tables_table_staff
  ON waiter_tables(table_id, staff_id);

-- WAITER CALLS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waiter_calls_table_status
  ON waiter_calls(table_id, status, created_at DESC)
  WHERE status = 'pending';

-- CUSTOMERS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email
  ON customers(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_points
  ON customers(points DESC)
  WHERE points > 0;

-- TABLES TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_location_status
  ON tables(location, status)
  WHERE is_active = true;

-- STAFF TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_role_location
  ON staff(role_id, location);

-- Add comments (these don't need CONCURRENTLY)
COMMENT ON INDEX idx_orders_status_created IS 'Optimizes kitchen orders query with status filter and sort by created_at';
COMMENT ON INDEX idx_orders_session_id IS 'Optimizes session orders lookup, excludes cancelled orders';
COMMENT ON INDEX idx_orders_product_session IS 'Optimizes queries joining orders with products and sessions';
COMMENT ON INDEX idx_sessions_table_status IS 'Optimizes table availability and active session checks';
COMMENT ON INDEX idx_sessions_status_created IS 'Optimizes active sessions query with status filter';
COMMENT ON INDEX idx_products_category_available IS 'Optimizes product listing by category with availability filter';
COMMENT ON INDEX idx_products_available_name IS 'Optimizes product search by name for available products only';
COMMENT ON INDEX idx_reservations_date_status IS 'Optimizes reservation lookup by date with status filter';
COMMENT ON INDEX idx_reservations_datetime_status IS 'Optimizes queries for active reservations sorted by datetime';
COMMENT ON INDEX idx_staff_time_off_dates IS 'Optimizes date range queries for calendar and overlap detection';
COMMENT ON INDEX idx_staff_time_off_staff_dates IS 'Optimizes staff availability lookup for approved time offs';
COMMENT ON INDEX idx_waiter_tables_staff_table IS 'Optimizes waiter table assignment lookups';
COMMENT ON INDEX idx_waiter_tables_table_staff IS 'Optimizes table to waiter lookup (reverse direction)';
COMMENT ON INDEX idx_waiter_calls_table_status IS 'Optimizes pending waiter calls lookup by table';
COMMENT ON INDEX idx_customers_email IS 'Optimizes customer lookup by email for authentication';
COMMENT ON INDEX idx_customers_points IS 'Optimizes queries for top customers by loyalty points';
COMMENT ON INDEX idx_tables_location_status IS 'Optimizes table availability queries by location';
COMMENT ON INDEX idx_staff_role_location IS 'Optimizes staff queries filtered by role and location';

-- Update statistics
ANALYZE orders;
ANALYZE sessions;
ANALYZE products;
ANALYZE categories;
ANALYZE reservations;
ANALYZE staff_time_off;
ANALYZE waiter_tables;
ANALYZE waiter_calls;
ANALYZE customers;
ANALYZE tables;
ANALYZE staff;
