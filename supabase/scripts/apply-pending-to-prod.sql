-- =============================================
-- CONSOLIDATED PRODUCTION MIGRATION
-- Migrations: 024 → 058 (excluindo 051 import data)
-- =============================================
-- SEGURO para executar múltiplas vezes (idempotente).
-- Executar via Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new
--
-- NOTA: Se o editor tiver timeout, executar cada secção separadamente.
-- Cada secção está marcada com "-- === SECTION X ===" e pode ser copiada individualmente.
--
-- PRÉ-REQUISITOS: Migrations 000-023 já aplicadas (core system).
-- EXCLUÍDO: 051_import_vendus_products.sql (6K linhas de dados — executar separadamente se necessário)
-- =============================================


-- =============================================================================
-- === SECTION 1: Product & Order Enhancements (024-028) =======================
-- =============================================================================

-- 024: Order cooldown setting
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS order_cooldown_minutes INTEGER NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_order_cooldown_minutes_check') THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_order_cooldown_minutes_check CHECK (order_cooldown_minutes >= 0);
  END IF;
END $$;

-- 025: Progressive registration
ALTER TABLE session_customers
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'anonymous';

CREATE TABLE IF NOT EXISTS device_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  total_visits INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS enable_upgrade_prompt BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS upgrade_prompt_after_minutes INTEGER DEFAULT 15;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_session_customers_device_id') THEN
    CREATE INDEX idx_session_customers_device_id ON session_customers(device_id);
  END IF;
END $$;

ALTER TABLE device_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'device_profiles' AND policyname = 'device_profiles_select') THEN
    CREATE POLICY "device_profiles_select" ON device_profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'device_profiles' AND policyname = 'device_profiles_insert') THEN
    CREATE POLICY "device_profiles_insert" ON device_profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'device_profiles' AND policyname = 'device_profiles_update') THEN
    CREATE POLICY "device_profiles_update" ON device_profiles FOR UPDATE USING (true);
  END IF;
END $$;
GRANT ALL ON device_profiles TO anon, authenticated;

-- 026: Multiple product images
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Backfill from image_url
UPDATE products SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url != ''
  AND (image_urls IS NULL OR image_urls = '{}');

-- Storage bucket (may already exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 027: Products RLS for admin update
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN roles r ON r.id = s.role_id
      WHERE s.auth_user_id = auth.uid() AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products" ON products
  FOR ALL
  USING (auth.role() = 'service_role');

-- 028: Product ratings
CREATE TABLE IF NOT EXISTS product_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  is_swipe_right BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Defensive: ensure columns exist if table was created by an older migration
ALTER TABLE product_ratings ADD COLUMN IF NOT EXISTS session_customer_id UUID;
ALTER TABLE product_ratings ADD COLUMN IF NOT EXISTS is_swipe_right BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_product_ratings_session ON product_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ratings' AND policyname = 'product_ratings_insert') THEN
    CREATE POLICY "product_ratings_insert" ON product_ratings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ratings' AND policyname = 'product_ratings_select') THEN
    CREATE POLICY "product_ratings_select" ON product_ratings FOR SELECT USING (true);
  END IF;
END $$;
GRANT ALL ON product_ratings TO anon, authenticated;


-- =============================================================================
-- === SECTION 2: Games & Gamification (029-033) ===============================
-- =============================================================================

-- 029: Games base
CREATE TABLE IF NOT EXISTS game_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type TEXT NOT NULL CHECK (game_type IN ('tinder', 'quiz', 'preference')),
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER DEFAULT 10,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE game_questions ADD COLUMN IF NOT EXISTS game_type TEXT;
ALTER TABLE game_questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE game_questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
-- Defensive: ensure columns exist if table was created by an older migration
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS session_customer_id UUID;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_type TEXT;

CREATE TABLE IF NOT EXISTS game_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE game_answers ADD COLUMN IF NOT EXISTS game_session_id UUID;
ALTER TABLE game_answers ADD COLUMN IF NOT EXISTS question_id UUID;

CREATE INDEX IF NOT EXISTS idx_game_sessions_session ON game_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_customer ON game_sessions(session_customer_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_answers(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_questions_type ON game_questions(game_type, is_active);

ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_questions' AND policyname = 'game_questions_select') THEN
    CREATE POLICY "game_questions_select" ON game_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'game_sessions_all') THEN
    CREATE POLICY "game_sessions_all" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_answers' AND policyname = 'game_answers_all') THEN
    CREATE POLICY "game_answers_all" ON game_answers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON game_questions TO anon, authenticated;
GRANT ALL ON game_sessions TO anon, authenticated;
GRANT ALL ON game_answers TO anon, authenticated;

-- 031: Game answers realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 032: Unified game scoring
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_bonus INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS game_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('discount', 'free_item', 'points', 'badge')),
  prize_value JSONB NOT NULL DEFAULT '{}',
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Defensive: ensure columns exist if table was created by an older migration
ALTER TABLE game_prizes ADD COLUMN IF NOT EXISTS game_session_id UUID;
ALTER TABLE game_prizes ADD COLUMN IF NOT EXISTS session_customer_id UUID;
ALTER TABLE game_prizes ADD COLUMN IF NOT EXISTS prize_type TEXT;
ALTER TABLE game_prizes ADD COLUMN IF NOT EXISTS prize_value JSONB DEFAULT '{}';
ALTER TABLE game_prizes ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;

ALTER TABLE game_prizes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_prizes' AND policyname = 'game_prizes_all') THEN
    CREATE POLICY "game_prizes_all" ON game_prizes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT ALL ON game_prizes TO anon, authenticated;

-- 033: Games mode
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'solo' CHECK (game_mode IN ('solo', 'versus', 'coop'));


-- =============================================================================
-- === SECTION 3: Order & Staff Management (034-038) ===========================
-- =============================================================================

-- 034: Order prepared_by
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS prepared_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_prepared_by ON orders(prepared_by);

-- 035: Order item ratings
ALTER TABLE product_ratings
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_product_ratings_order ON product_ratings(order_id);

-- 036: Order delivered_at
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

-- 037: Waiter calls → customer
ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS session_customer_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waiter_calls_session_customer_id_fkey') THEN
    ALTER TABLE waiter_calls ADD CONSTRAINT waiter_calls_session_customer_id_fkey
      FOREIGN KEY (session_customer_id) REFERENCES session_customers(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_waiter_calls_customer ON waiter_calls(session_customer_id);

-- Recreate view with customer name
DROP VIEW IF EXISTS waiter_calls_with_details;
CREATE OR REPLACE VIEW waiter_calls_with_details AS
SELECT
  wc.*,
  t.number AS table_number,
  t.name AS table_name,
  t.location AS table_location,
  sc.display_name AS customer_name
FROM waiter_calls wc
LEFT JOIN tables t ON t.id = wc.table_id
LEFT JOIN session_customers sc ON sc.id = wc.session_customer_id;

-- 038: Identity verification
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('session_customer', 'customer')),
  entity_id UUID NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'phone')),
  target TEXT NOT NULL,
  token_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS verification_type TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS target TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_verification_logs_entity ON verification_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_status ON verification_logs(status, expires_at);

ALTER TABLE session_customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_type TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification_logs' AND policyname = 'verification_logs_select') THEN
    CREATE POLICY "verification_logs_select" ON verification_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification_logs' AND policyname = 'verification_logs_insert') THEN
    CREATE POLICY "verification_logs_insert" ON verification_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;
GRANT ALL ON verification_logs TO anon, authenticated;


-- =============================================================================
-- === SECTION 4: Session & Table Control (039-045) ============================
-- =============================================================================

-- 039: Session ordering mode
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS ordering_mode TEXT DEFAULT 'client';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_ordering_mode_check') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_ordering_mode_check CHECK (ordering_mode IN ('client', 'waiter_only'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sessions_ordering_mode ON sessions(ordering_mode);

DROP POLICY IF EXISTS "Staff can update session ordering mode" ON sessions;
CREATE POLICY "Staff can update session ordering mode" ON sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN roles r ON r.id = s.role_id
      WHERE s.auth_user_id = auth.uid() AND r.name IN ('admin', 'waiter')
    )
  );

-- 040: Waiter location filter RLS
DROP POLICY IF EXISTS "Waiters can only view tables from their location" ON tables;
CREATE POLICY "Waiters can only view tables from their location" ON tables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN roles r ON r.id = s.role_id
      WHERE s.auth_user_id = auth.uid()
        AND r.name IN ('admin', 'kitchen')
    )
    OR
    EXISTS (
      SELECT 1 FROM staff s
      JOIN roles r ON r.id = s.role_id
      WHERE s.auth_user_id = auth.uid()
        AND r.name = 'waiter'
        AND s.location = tables.location
    )
    OR
    auth.uid() IS NULL  -- Public access for QR codes
  );

-- 041: Fix waiter assignments (cleanup mismatched locations)
DELETE FROM waiter_tables
WHERE id IN (
  SELECT wt.id FROM waiter_tables wt
  JOIN staff s ON s.id = wt.staff_id
  JOIN tables t ON t.id = wt.table_id
  JOIN roles r ON r.id = s.role_id
  WHERE r.name = 'waiter' AND s.location IS NOT NULL AND t.location IS NOT NULL AND s.location != t.location
);
CREATE INDEX IF NOT EXISTS idx_waiter_tables_staff_location ON waiter_tables (staff_id) INCLUDE (table_id);

-- 042: Enable auto-assignment
UPDATE restaurants SET auto_table_assignment = TRUE WHERE slug IN ('circunvalacao', 'boavista');

-- 043+044: Close session function (combined, correct UUID type)
DROP FUNCTION IF EXISTS close_session_and_free_table(UUID);
CREATE OR REPLACE FUNCTION close_session_and_free_table(session_id_param UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  table_id_var UUID;
BEGIN
  SELECT table_id INTO table_id_var FROM sessions WHERE id = session_id_param;
  UPDATE sessions SET status = 'closed', closed_at = NOW() WHERE id = session_id_param;
  IF table_id_var IS NOT NULL THEN
    UPDATE tables SET current_session_id = NULL WHERE id = table_id_var;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO anon;

-- 045: Fix product ratings constraints
DROP INDEX IF EXISTS idx_product_ratings_unique_per_order;
DROP INDEX IF EXISTS idx_product_ratings_unique_per_product;
DROP INDEX IF EXISTS idx_product_ratings_unique_anonymous;
ALTER TABLE product_ratings DROP CONSTRAINT IF EXISTS product_ratings_unique_per_order;
ALTER TABLE product_ratings DROP CONSTRAINT IF EXISTS product_ratings_unique_per_product;

-- Deduplicate before creating unique indexes (keep most recent rating)
DELETE FROM product_ratings a USING product_ratings b
WHERE a.id < b.id
  AND a.order_id IS NOT NULL AND b.order_id IS NOT NULL
  AND a.session_customer_id IS NOT NULL AND b.session_customer_id IS NOT NULL
  AND a.order_id = b.order_id AND a.session_customer_id = b.session_customer_id;

DELETE FROM product_ratings a USING product_ratings b
WHERE a.id < b.id
  AND a.order_id IS NULL AND b.order_id IS NULL
  AND a.session_customer_id IS NOT NULL AND b.session_customer_id IS NOT NULL
  AND a.product_id = b.product_id AND a.session_customer_id = b.session_customer_id
  AND a.session_id = b.session_id;

DELETE FROM product_ratings a USING product_ratings b
WHERE a.id < b.id
  AND a.session_customer_id IS NULL AND b.session_customer_id IS NULL
  AND a.product_id = b.product_id AND a.session_id = b.session_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_unique_per_order
  ON product_ratings (order_id, session_customer_id)
  WHERE order_id IS NOT NULL AND session_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_unique_per_product
  ON product_ratings (product_id, session_customer_id, session_id)
  WHERE order_id IS NULL AND session_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_unique_anonymous
  ON product_ratings (product_id, session_id)
  WHERE session_customer_id IS NULL;


-- =============================================================================
-- === SECTION 5: Vendus POS Integration (046-049) =============================
-- =============================================================================
-- Nota: Pode já estar aplicado via apply-vendus-to-prod.sql. Tudo idempotente.

-- 046: Vendus integration core
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendus_id TEXT,
  ADD COLUMN IF NOT EXISTS vendus_sync_status TEXT DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vendus_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vendus_tax_id TEXT;

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS vendus_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendus_store_id TEXT,
  ADD COLUMN IF NOT EXISTS vendus_register_id TEXT;

CREATE TABLE IF NOT EXISTS vendus_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  vendus_id TEXT,
  location_id UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  error_message TEXT,
  details JSONB DEFAULT '{}',
  initiated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS vendus_id TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS initiated_by TEXT;
ALTER TABLE vendus_sync_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_created ON vendus_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_entity ON vendus_sync_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS vendus_retry_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  location_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE vendus_retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_vendus_retry_pending ON vendus_retry_queue(status, next_retry_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  location_id UUID,
  vendus_id TEXT,
  vendus_document_number TEXT,
  vendus_document_type TEXT,
  vendus_series TEXT,
  vendus_hash TEXT,
  subtotal NUMERIC(10,2),
  tax_amount NUMERIC(10,2),
  total NUMERIC(10,2),
  payment_method_id UUID,
  paid_amount NUMERIC(10,2),
  change_amount NUMERIC(10,2) DEFAULT 0,
  customer_nif TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'voided', 'cancelled')),
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  issued_by TEXT,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  void_reason TEXT,
  raw_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vendus_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vendus_document_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vendus_document_type TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_nif TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issued_by TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS raw_response JSONB DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendus ON invoices(vendus_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  vendus_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS vendus_id TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Seed payment methods
INSERT INTO payment_methods (name, slug, vendus_id, sort_order) VALUES
  ('Dinheiro', 'cash', '1', 1),
  ('Cartão Multibanco', 'card', '2', 2),
  ('MB Way', 'mbway', '3', 3),
  ('Transferência', 'transfer', '4', 4)
ON CONFLICT (slug) DO NOTHING;

-- Views
DROP VIEW IF EXISTS products_with_vendus_status;
DROP VIEW IF EXISTS invoices_with_details;

CREATE OR REPLACE VIEW invoices_with_details AS
SELECT
  i.*,
  s.table_id,
  t.number as table_number,
  l.slug as location_slug,
  l.name as location_name,
  pm.name as payment_method_name,
  pm.slug as payment_method_slug
FROM invoices i
LEFT JOIN sessions s ON s.id = i.session_id
LEFT JOIN tables t ON t.id = s.table_id
LEFT JOIN locations l ON l.id = i.location_id
LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id;

-- RLS for new tables
ALTER TABLE vendus_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendus_sync_log' AND policyname = 'vendus_sync_log_all') THEN
    CREATE POLICY "vendus_sync_log_all" ON vendus_sync_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendus_retry_queue' AND policyname = 'vendus_retry_queue_all') THEN
    CREATE POLICY "vendus_retry_queue_all" ON vendus_retry_queue FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_all') THEN
    CREATE POLICY "invoices_all" ON invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'payment_methods_select') THEN
    CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT USING (true);
  END IF;
END $$;

GRANT ALL ON vendus_sync_log TO anon, authenticated;
GRANT ALL ON vendus_retry_queue TO anon, authenticated;
GRANT ALL ON invoices TO anon, authenticated;
GRANT ALL ON payment_methods TO anon, authenticated;

-- 047: Vendus categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS vendus_id TEXT;

-- 048: Locations flexible
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 049: Products location
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_location ON products(location_id);


-- =============================================================================
-- === SECTION 6: Product Service Modes & Pricing (050, 052-053) ===============
-- =============================================================================

-- 050: Service modes
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS service_modes TEXT[] DEFAULT '{dine_in}';
CREATE INDEX IF NOT EXISTS idx_products_service_modes ON products USING GIN (service_modes);

-- 052: Service prices
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS service_prices JSONB DEFAULT '{}';

-- 053: Vendus IDs per service mode
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendus_ids JSONB DEFAULT '{}';

-- Migrate existing vendus_id into vendus_ids
UPDATE products
SET vendus_ids = jsonb_build_object('dine_in', vendus_id)
WHERE vendus_id IS NOT NULL
  AND (vendus_ids IS NULL OR vendus_ids = '{}'::jsonb);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vendus_id_key;
CREATE INDEX IF NOT EXISTS idx_products_vendus_ids ON products USING GIN (vendus_ids);

-- Recreate products_with_vendus_status view (latest version with all new columns)
DROP VIEW IF EXISTS products_with_vendus_status;
CREATE OR REPLACE VIEW products_with_vendus_status AS
SELECT
  p.*,
  c.name as category_name,
  l.slug as location_slug,
  CASE
    WHEN p.vendus_sync_status = 'synced' THEN 'Sincronizado'
    WHEN p.vendus_sync_status = 'pending' THEN 'Pendente'
    WHEN p.vendus_sync_status = 'error' THEN 'Erro'
    WHEN p.vendus_sync_status = 'not_applicable' THEN 'N/A'
    ELSE 'Pendente'
  END as sync_status_label,
  p.vendus_synced_at as last_synced
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN locations l ON p.location_id = l.id;


-- =============================================================================
-- === SECTION 7: Kitchen & Ingredients (054-055) ==============================
-- =============================================================================

-- 054: Kitchen zones
CREATE TABLE IF NOT EXISTS kitchen_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kitchen_zones ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE kitchen_zones ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';
ALTER TABLE kitchen_zones ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE kitchen_zones ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES kitchen_zones(id) ON DELETE SET NULL;

ALTER TABLE kitchen_zones ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_zones' AND policyname = 'kitchen_zones_select') THEN
    CREATE POLICY "kitchen_zones_select" ON kitchen_zones FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kitchen_zones' AND policyname = 'kitchen_zones_manage') THEN
    CREATE POLICY "kitchen_zones_manage" ON kitchen_zones FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT ALL ON kitchen_zones TO anon, authenticated;

-- Seed default zones
INSERT INTO kitchen_zones (name, slug, color, sort_order) VALUES
  ('Quentes', 'quentes', '#EF4444', 1),
  ('Frios', 'frios', '#3B82F6', 2),
  ('Bar', 'bar', '#8B5CF6', 3)
ON CONFLICT (slug) DO NOTHING;

-- 055: Ingredients catalog
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'g',
  is_allergen BOOLEAN DEFAULT false,
  allergen_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g';
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_allergen BOOLEAN DEFAULT false;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2),
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, ingredient_id)
);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS ingredient_id UUID;
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingredients' AND policyname = 'ingredients_select') THEN
    CREATE POLICY "ingredients_select" ON ingredients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingredients' AND policyname = 'ingredients_manage') THEN
    CREATE POLICY "ingredients_manage" ON ingredients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ingredients' AND policyname = 'product_ingredients_select') THEN
    CREATE POLICY "product_ingredients_select" ON product_ingredients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ingredients' AND policyname = 'product_ingredients_manage') THEN
    CREATE POLICY "product_ingredients_manage" ON product_ingredients FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON ingredients TO anon, authenticated;
GRANT ALL ON product_ingredients TO anon, authenticated;

-- Auto-update trigger for ingredients.updated_at
CREATE OR REPLACE FUNCTION update_ingredients_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_ingredients_updated_at ON ingredients;
CREATE TRIGGER trigger_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_ingredients_updated_at();


-- =============================================================================
-- === SECTION 8: Session & Billing Fixes (056-057) ============================
-- =============================================================================

-- 056: Fix session status constraint
UPDATE sessions SET status = 'pending_payment' WHERE status = 'billing';
UPDATE sessions SET status = 'active' WHERE status = 'ordering';
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('active', 'pending_payment', 'paid', 'closed'));

-- 057: Billing fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_nif VARCHAR(20);


-- =============================================================================
-- === SECTION 9: Reservation Table Assignment (058) ===========================
-- =============================================================================

-- Waiter alert setting
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS waiter_alert_minutes INTEGER DEFAULT 60;

-- Junction table: reservation → multiple tables
CREATE TABLE IF NOT EXISTS reservation_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reservation_id, table_id)
);
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS reservation_id UUID;
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS table_id UUID;
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_reservation_tables_reservation ON reservation_tables(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_tables_table ON reservation_tables(table_id);

-- Flag for quick filtering
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS tables_assigned BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_reservations_unassigned ON reservations(reservation_date, status)
  WHERE tables_assigned = false AND status = 'confirmed';

-- RLS
ALTER TABLE reservation_tables ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'view_reservation_tables') THEN
    CREATE POLICY "view_reservation_tables" ON reservation_tables FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'insert_reservation_tables') THEN
    CREATE POLICY "insert_reservation_tables" ON reservation_tables FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'delete_reservation_tables') THEN
    CREATE POLICY "delete_reservation_tables" ON reservation_tables FOR DELETE USING (true);
  END IF;
END $$;
GRANT ALL ON reservation_tables TO anon, authenticated;


-- =============================================================================
-- === VERIFICATION ============================================================
-- =============================================================================
-- Executar estas queries após aplicar para verificar:

-- 1. Novas tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'device_profiles', 'product_ratings', 'game_questions', 'game_sessions',
    'game_answers', 'game_prizes', 'verification_logs', 'vendus_sync_log',
    'vendus_retry_queue', 'invoices', 'payment_methods', 'kitchen_zones',
    'ingredients', 'product_ingredients', 'reservation_tables'
  )
ORDER BY table_name;

-- 2. Novas colunas em tabelas existentes
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name IN ('ordering_mode', 'customer_nif');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('vendus_id', 'vendus_ids', 'service_modes', 'service_prices', 'location_id', 'image_urls');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'reservations' AND column_name = 'tables_assigned';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'reservation_settings' AND column_name = 'waiter_alert_minutes';

-- 3. Função close_session_and_free_table
SELECT proname FROM pg_proc WHERE proname = 'close_session_and_free_table';

-- 4. Payment methods seeded
SELECT name, slug, vendus_id FROM payment_methods ORDER BY sort_order;
