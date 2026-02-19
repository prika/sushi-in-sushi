-- Migration 029: Games System
-- Tables: game_questions, game_sessions, game_answers, game_prizes
-- Restaurant config: games_enabled, prize settings

-- Game questions pool (quiz, preference questions - tinder uses products directly)
CREATE TABLE IF NOT EXISTS game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('tinder', 'quiz', 'preference')),
    question_text TEXT NOT NULL,
    -- Quiz: options and correct answer
    options JSONB,
    correct_answer_index SMALLINT,
    -- Preference: two options
    option_a JSONB,
    option_b JSONB,
    -- Metadata
    category VARCHAR(50),
    difficulty SMALLINT DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
    points INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions (one round of games at a table)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    round_number INTEGER DEFAULT 1,
    total_questions INTEGER DEFAULT 6,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game answers (each answer from each participant)
CREATE TABLE IF NOT EXISTS game_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
    question_id UUID NOT NULL REFERENCES game_questions(id),
    game_type VARCHAR(20) NOT NULL,
    answer JSONB NOT NULL,
    score_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_session_id, session_customer_id, question_id)
);

-- Game prizes awarded
CREATE TABLE IF NOT EXISTS game_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
    session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
    display_name VARCHAR(100) NOT NULL,
    prize_type VARCHAR(30) NOT NULL CHECK (prize_type IN ('discount_percentage', 'free_product', 'free_dinner')),
    prize_value TEXT NOT NULL,
    prize_description TEXT,
    total_score INTEGER DEFAULT 0,
    redeemed BOOLEAN DEFAULT false,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant config: games columns
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS games_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS games_prize_type VARCHAR(30) DEFAULT 'none'
    CHECK (games_prize_type IN ('none', 'discount_percentage', 'free_product', 'free_dinner')),
  ADD COLUMN IF NOT EXISTS games_prize_value TEXT,
  ADD COLUMN IF NOT EXISTS games_prize_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS games_min_rounds_for_prize INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS games_questions_per_round INTEGER NOT NULL DEFAULT 6;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_game_questions_active ON game_questions(game_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_game_questions_restaurant ON game_questions(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_sessions_session ON game_sessions(session_id, status);
CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_answers(game_session_id, session_customer_id);
CREATE INDEX IF NOT EXISTS idx_game_prizes_session ON game_prizes(session_id);

-- RLS (public access, like session_customers)
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_questions_select" ON game_questions FOR SELECT USING (true);
CREATE POLICY "game_sessions_all" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "game_answers_all" ON game_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "game_prizes_all" ON game_prizes FOR ALL USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON game_questions TO anon, authenticated;
GRANT ALL ON game_sessions TO anon, authenticated;
GRANT ALL ON game_answers TO anon, authenticated;
GRANT ALL ON game_prizes TO anon, authenticated;

-- Trigger updated_at for game_questions
CREATE TRIGGER update_game_questions_updated_at
  BEFORE UPDATE ON game_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration 030: Seed game questions (quiz + preference)
-- Global questions (restaurant_id = NULL) available to all restaurants

-- =============================================
-- QUIZ QUESTIONS (~20)
-- =============================================

INSERT INTO game_questions (game_type, question_text, options, correct_answer_index, category, difficulty, points) VALUES
-- Sushi Knowledge
('quiz', 'Qual é o peixe mais popular no sushi?', '["Salmão", "Atum", "Polvo", "Enguia"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é wasabi verdadeiro?', '["Uma raiz japonesa", "Uma pasta artificial", "Uma alga", "Uma flor"]', 0, 'sushi_knowledge', 2, 10),
('quiz', 'De que país é originário o sushi?', '["Japão", "China", "Coreia do Sul", "Tailândia"]', 0, 'culture', 1, 10),
('quiz', 'O que significa a palavra ''nigiri''?', '["Agarrar/Apertar", "Cortar", "Rolar", "Misturar"]', 0, 'sushi_knowledge', 2, 10),
('quiz', 'O que dá a cor rosa ao gengibre de sushi?', '["Vinagre de arroz", "Corante alimentar", "Beterraba/processo natural", "É a cor natural"]', 2, 'ingredients', 2, 10),
('quiz', 'Quantas peças tem um maki roll standard?', '["6 a 8", "2 a 3", "10 a 12", "15 ou mais"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é nori?', '["Alga marinha seca", "Arroz temperado", "Peixe curado", "Molho de soja especial"]', 0, 'ingredients', 1, 10),
('quiz', 'Qual é a temperatura ideal do arroz de sushi?', '["Temperatura corporal (~37°C)", "Frio de frigorífico", "Muito quente", "Congelado"]', 0, 'techniques', 3, 10),
('quiz', 'O que é sashimi?', '["Peixe cru sem arroz", "Peixe cru com arroz", "Peixe frito", "Peixe grelhado"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'Qual é a faca tradicional para cortar sushi?', '["Yanagiba", "Santoku", "Nakiri", "Deba"]', 0, 'techniques', 3, 10),

-- Ingredients
('quiz', 'Qual destes NÃO é um tipo de sushi?', '["Ramen", "Nigiri", "Temaki", "Uramaki"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é ponzu?', '["Molho cítrico japonês", "Um tipo de sushi", "Arroz de sushi", "Peixe fumado"]', 0, 'ingredients', 2, 10),
('quiz', 'Qual é o ingrediente principal do miso?', '["Soja fermentada", "Alga", "Arroz", "Peixe"]', 0, 'ingredients', 2, 10),
('quiz', 'O que é edamame?', '["Vagem de soja verde", "Alga frita", "Tofu grelhado", "Cogumelo japonês"]', 0, 'ingredients', 1, 10),
('quiz', 'Qual peixe é conhecido como ''maguro'' em japonês?', '["Atum", "Salmão", "Dourada", "Robalo"]', 0, 'ingredients', 2, 10),

-- Culture
('quiz', 'Como se diz ''obrigado'' em japonês?', '["Arigatou", "Konnichiwa", "Sayonara", "Sumimasen"]', 0, 'culture', 1, 10),
('quiz', 'O que significa ''omakase''?', '["Confiar no chef", "Menu fixo", "Buffet livre", "Pedido rápido"]', 0, 'culture', 2, 10),
('quiz', 'Em que lado se coloca o molho de soja?', '["No peixe, não no arroz", "No arroz", "Em ambos", "Nunca se usa"]', 0, 'culture', 2, 10),
('quiz', 'Qual é a bebida alcoólica tradicional japonesa feita de arroz?', '["Sake", "Shochu", "Umeshu", "Awamori"]', 0, 'culture', 1, 10),
('quiz', 'Quantos anos demora a formação de um sushi chef tradicional?', '["Cerca de 10 anos", "1 ano", "3 meses", "20 anos"]', 0, 'culture', 3, 10);

-- =============================================
-- PREFERENCE QUESTIONS (~15)
-- =============================================

INSERT INTO game_questions (game_type, question_text, option_a, option_b, category, points) VALUES
('preference', 'Preferes...', '{"label": "Nigiri"}', '{"label": "Maki"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Salmão"}', '{"label": "Atum"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Quente"}', '{"label": "Frio"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Cru"}', '{"label": "Cozinhado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Com wasabi"}', '{"label": "Sem wasabi"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Molho de soja"}', '{"label": "Ponzu"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Tempura"}', '{"label": "Grelhado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Uramaki"}', '{"label": "Temaki"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Edamame"}', '{"label": "Gyoza"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Sake"}', '{"label": "Cerveja japonesa"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Sashimi"}', '{"label": "Nigiri"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Camarão"}', '{"label": "Polvo"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Doce"}', '{"label": "Salgado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Miso soup"}', '{"label": "Ramen"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Chopsticks"}', '{"label": "Garfo"}', 'preferences', 10);
-- Enable Supabase Realtime for game_answers (leaderboard live updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;
  END IF;
END $$;
-- Migration 032: Unified Game Scoring
-- Makes tinder/swipe rating game part of the unified game scoring system
-- Tinder answers stored in game_answers alongside quiz/preference for cumulative scoring

-- 1. Add game_type to game_sessions for tracking which type of game
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS game_type VARCHAR(20);

-- 2. Make question_id nullable (tinder uses product_id instead of game_questions)
ALTER TABLE game_answers ALTER COLUMN question_id DROP NOT NULL;

-- 3. Add product_id column for tinder answers
ALTER TABLE game_answers
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- 4. Drop old unique constraint, replace with partial unique indexes
ALTER TABLE game_answers
DROP CONSTRAINT IF EXISTS game_answers_game_session_id_session_customer_id_question_i_key;

-- 5. CHECK: must have either question_id or product_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_answers_question_or_product_check'
  ) THEN
    ALTER TABLE game_answers ADD CONSTRAINT game_answers_question_or_product_check
      CHECK (question_id IS NOT NULL OR product_id IS NOT NULL);
  END IF;
END $$;

-- 6. Unique indexes for deduplication (use COALESCE to handle NULL session_customer_id)
-- Quiz/Preference: unique per question per player per game session
DROP INDEX IF EXISTS idx_game_answers_unique_question;
CREATE UNIQUE INDEX idx_game_answers_unique_question
  ON game_answers(game_session_id, COALESCE(session_customer_id, '00000000-0000-0000-0000-000000000000'), question_id)
  WHERE question_id IS NOT NULL;

-- Tinder: unique per product per player per game session
DROP INDEX IF EXISTS idx_game_answers_unique_product;
CREATE UNIQUE INDEX idx_game_answers_unique_product
  ON game_answers(game_session_id, COALESCE(session_customer_id, '00000000-0000-0000-0000-000000000000'), product_id)
  WHERE product_id IS NOT NULL;

-- 7. Performance index for product-based queries
CREATE INDEX IF NOT EXISTS idx_game_answers_product
  ON game_answers(product_id) WHERE product_id IS NOT NULL;
-- Migration 033: Add games_mode to restaurants
-- Allows admin to choose between 'selection' (user picks game) and 'random' (random game assigned)

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS games_mode VARCHAR(20) DEFAULT 'selection';

-- Add CHECK constraint separately to avoid IF NOT EXISTS issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_games_mode_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_games_mode_check
      CHECK (games_mode IN ('selection', 'random'));
  END IF;
END $$;
-- Track which kitchen staff prepared each order and when
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by uuid REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_started_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_prepared_by ON orders(prepared_by);
CREATE INDEX IF NOT EXISTS idx_orders_preparing_started_at ON orders(preparing_started_at) WHERE preparing_started_at IS NOT NULL;

COMMENT ON COLUMN orders.prepared_by IS 'Staff member who started preparing this order';
COMMENT ON COLUMN orders.preparing_started_at IS 'Timestamp when preparation started';
COMMENT ON COLUMN orders.ready_at IS 'Timestamp when order was marked ready';
-- Add order_id to product_ratings for per-order-item ratings
ALTER TABLE product_ratings ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_ratings_order ON product_ratings(order_id) WHERE order_id IS NOT NULL;

-- New unique constraint for per-order-item ratings (order_id present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_order_unique
ON product_ratings(session_id, session_customer_id, order_id)
WHERE order_id IS NOT NULL;

-- Keep existing constraints for backwards compatibility (order_id IS NULL)
-- The existing UNIQUE(session_id, session_customer_id, product_id) still applies to legacy ratings

COMMENT ON COLUMN product_ratings.order_id IS 'Order item being rated; NULL for legacy per-product ratings';
-- Track when an order was delivered (completes stage timing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at) WHERE delivered_at IS NOT NULL;

COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order was delivered';
-- =============================================
-- ADD SESSION_CUSTOMER_ID TO WAITER_CALLS
-- Track which customer made the waiter call
-- =============================================

-- 1. Add column
ALTER TABLE waiter_calls ADD COLUMN IF NOT EXISTS session_customer_id uuid;

-- 2. Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_waiter_calls_customer
  ON waiter_calls(session_customer_id) WHERE session_customer_id IS NOT NULL;

COMMENT ON COLUMN waiter_calls.session_customer_id IS 'Customer who initiated the call (from session_customers)';

-- 3. Recreate view with customer_name
DROP VIEW IF EXISTS waiter_calls_with_details;
CREATE VIEW waiter_calls_with_details AS
SELECT
    wc.*,
    t.number as table_number,
    t.name as table_name,
    s.name as acknowledged_by_name,
    wa.staff_name as assigned_waiter_name,
    wa.staff_id as assigned_waiter_id,
    sc.display_name as customer_name
FROM waiter_calls wc
JOIN tables t ON wc.table_id = t.id
LEFT JOIN staff s ON wc.acknowledged_by = s.id
LEFT JOIN waiter_assignments wa ON wc.table_id = wa.table_id
LEFT JOIN session_customers sc ON wc.session_customer_id = sc.id;

-- 4. Grant permissions
GRANT SELECT ON waiter_calls_with_details TO anon, authenticated;
-- =============================================
-- SUSHI IN SUSHI - IDENTITY VERIFICATION
-- Migration: 038_identity_verification.sql
-- Adds email/phone verification for session customers
-- =============================================

-- =============================================
-- SESSION CUSTOMERS: ADD VERIFICATION FIELDS
-- =============================================
ALTER TABLE session_customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20) CHECK (verification_type IN ('email', 'phone'));

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_session_customers_verification_token
  ON session_customers(verification_token)
  WHERE verification_token IS NOT NULL;

-- =============================================
-- CUSTOMERS: ADD VERIFICATION FIELDS (for loyalty program)
-- =============================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- VERIFICATION LOGS TABLE (for audit and rate limiting)
-- =============================================
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    session_customer_id UUID REFERENCES session_customers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Verification details
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('email', 'phone')),
    contact_value TEXT NOT NULL, -- email or phone number
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'verified', 'expired', 'failed')),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for verification logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_session_customer
  ON verification_logs(session_customer_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_customer
  ON verification_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_token
  ON verification_logs(token)
  WHERE status = 'sent';

-- Rate limiting: prevent spam (max 3 verifications per contact per hour)
CREATE INDEX IF NOT EXISTS idx_verification_logs_rate_limit
  ON verification_logs(contact_value, created_at);

-- =============================================
-- VERIFICATION LOGS: TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_verification_logs_updated_at ON verification_logs;
CREATE TRIGGER update_verification_logs_updated_at
    BEFORE UPDATE ON verification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION LOGS: ROW LEVEL SECURITY
-- =============================================
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read their own verification logs" ON verification_logs;
CREATE POLICY "Anyone can read their own verification logs" ON verification_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert verification logs" ON verification_logs;
CREATE POLICY "Anyone can insert verification logs" ON verification_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update verification logs" ON verification_logs;
CREATE POLICY "Anyone can update verification logs" ON verification_logs
    FOR UPDATE USING (true);

-- =============================================
-- VERIFICATION LOGS: GRANTS
-- =============================================
GRANT ALL ON verification_logs TO anon, authenticated;

-- =============================================
-- FUNCTION: Generate verification token
-- =============================================
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate 6-digit numeric token
    token := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN token;
END;
$$;

-- =============================================
-- ENABLE REALTIME FOR VERIFICATION LOGS
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'verification_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE verification_logs;
    END IF;
END $$;
-- =============================================
-- Migration: 039_session_ordering_mode
-- Description: Adds ordering_mode field to sessions table
--              for controlling whether clients can order or only waiter can
-- =============================================

-- Add ordering_mode column to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS ordering_mode VARCHAR(20) DEFAULT 'client'
CHECK (ordering_mode IN ('client', 'waiter_only'));

-- Add comment for documentation
COMMENT ON COLUMN sessions.ordering_mode IS
  'Controls who can submit orders: client (default), waiter_only (lock mode)';

-- Add index for filtering sessions by ordering mode
CREATE INDEX IF NOT EXISTS idx_sessions_ordering_mode
  ON sessions(ordering_mode);

-- =============================================
-- Row Level Security (RLS) Policy
-- =============================================

-- Only staff (admin/waiter) can update ordering_mode
DROP POLICY IF EXISTS "Staff can update session ordering mode" ON sessions;

CREATE POLICY "Staff can update session ordering mode"
ON sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'waiter')
      )
  )
);
-- Migration: Waiter Location Filter
-- Ensures waiters can only access tables from their assigned restaurant location
--
-- This migration adds RLS policies to enforce location-based access control for waiters.
-- Admins can still see all tables.

-- =============================================
-- RLS Policy: Tables - Location-based access
-- =============================================

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Waiters can only view tables from their location" ON tables;

-- Create new policy: Waiters can only SELECT tables from their assigned location
CREATE POLICY "Waiters can only view tables from their location"
ON tables FOR SELECT
USING (
  -- Public access: Anyone can view tables (needed for customer QR code access)
  -- Location filtering only applies to authenticated staff

  -- If not authenticated, allow access (for customer QR codes)
  auth.uid() IS NULL

  OR

  -- Admins can see all tables
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
  )

  OR

  -- Kitchen staff can see all tables (needed for kitchen display)
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'kitchen' LIMIT 1)
  )

  OR

  -- Waiters can only see tables from their location
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
      AND staff.is_active = true
      AND staff.role_id = (SELECT id FROM roles WHERE name = 'waiter' LIMIT 1)
      AND staff.location = tables.location
  )
);

-- =============================================
-- Comment for documentation
-- =============================================

COMMENT ON POLICY "Waiters can only view tables from their location" ON tables IS
'Restricts waiter access to only tables from their assigned restaurant location. Admins and kitchen staff can see all tables.';
-- Migration: Fix Waiter Table Assignments
-- Cleans up incorrect assignments where waiter location doesn't match table location
-- Disables auto-assignment on all restaurants

-- =============================================
-- 1. Remove incorrect waiter-table assignments
-- =============================================

-- Find and remove assignments where staff location != table location
DELETE FROM waiter_tables
WHERE id IN (
  SELECT wt.id
  FROM waiter_tables wt
  JOIN staff s ON s.id = wt.staff_id
  JOIN tables t ON t.id = wt.table_id
  JOIN roles r ON r.id = s.role_id
  WHERE r.name = 'waiter'
    AND s.location IS NOT NULL
    AND t.location IS NOT NULL
    AND s.location != t.location
);

-- Report: Show how many incorrect assignments were removed
DO $$
DECLARE
  removed_count INT;
BEGIN
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RAISE NOTICE 'Removed % incorrect waiter-table assignments', removed_count;
END $$;

-- =============================================
-- 2. Disable auto-assignment on all restaurants
-- =============================================

-- Set auto_table_assignment = FALSE for all restaurants
UPDATE restaurants
SET auto_table_assignment = FALSE
WHERE auto_table_assignment = TRUE;

-- Report: Show updated restaurants
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Disabled auto-assignment on % restaurants', updated_count;
END $$;

-- =============================================
-- 3. Add index for faster location filtering
-- =============================================

-- Index for waiter-table assignments by staff location (if not exists)
CREATE INDEX IF NOT EXISTS idx_waiter_tables_staff_location
ON waiter_tables (staff_id)
INCLUDE (table_id);

-- =============================================
-- 4. Verification queries (commented out)
-- =============================================

-- Uncomment to verify no incorrect assignments remain:
-- SELECT
--   s.name as waiter_name,
--   s.location as waiter_location,
--   t.number as table_number,
--   t.location as table_location,
--   'MISMATCH' as status
-- FROM waiter_tables wt
-- JOIN staff s ON s.id = wt.staff_id
-- JOIN tables t ON t.id = wt.table_id
-- JOIN roles r ON r.id = s.role_id
-- WHERE r.name = 'waiter'
--   AND s.location IS NOT NULL
--   AND t.location IS NOT NULL
--   AND s.location != t.location;

-- Uncomment to verify auto-assignment is disabled:
-- SELECT
--   name,
--   slug,
--   auto_table_assignment,
--   CASE
--     WHEN auto_table_assignment THEN '⚠️ STILL ENABLED'
--     ELSE '✅ DISABLED'
--   END as status
-- FROM restaurants;

-- =============================================
-- Documentation
-- =============================================

COMMENT ON INDEX idx_waiter_tables_staff_location IS
'Improves performance when filtering waiter assignments by staff location';
-- =============================================
-- Migration: Enable Auto-Assignment
-- Re-enables automatic waiter assignment for both restaurants
-- =============================================

-- Enable auto-assignment for both restaurants
UPDATE restaurants
SET auto_table_assignment = TRUE
WHERE slug IN ('circunvalacao', 'boavista');

-- Verify the change
DO $$
DECLARE
  enabled_count INT;
BEGIN
  SELECT COUNT(*) INTO enabled_count
  FROM restaurants
  WHERE auto_table_assignment = TRUE;

  RAISE NOTICE '✅ Auto-assignment enabled for % restaurants', enabled_count;
END $$;

-- Show final status
SELECT
  name,
  slug,
  auto_table_assignment,
  CASE
    WHEN auto_table_assignment THEN '✅ ENABLED - Auto-assign active'
    ELSE '⚠️ DISABLED - Manual assign only'
  END as status
FROM restaurants
ORDER BY name;

-- Show current waiter assignments by location
SELECT
  s.location as waiter_location,
  s.name as waiter_name,
  COUNT(wt.table_id) as assigned_tables
FROM staff s
LEFT JOIN waiter_tables wt ON wt.staff_id = s.id
JOIN roles r ON r.id = s.role_id
WHERE r.name = 'waiter'
  AND s.is_active = true
GROUP BY s.location, s.name, s.id
ORDER BY s.location, assigned_tables;

-- =============================================
-- IMPORTANT NOTES
-- =============================================
-- After enabling auto-assignment:
-- 1. When a customer scans QR code → system auto-assigns to least busy waiter
-- 2. System filters waiters by table location automatically
-- 3. Waiter can still manually "comandar" unassigned tables
-- 4. Assignment is based on "least occupied tables" algorithm
-- =============================================
-- Migration: Auto-update table status when session closes
-- Creates function to close session and update table status
-- =============================================

-- Function to close a session and update table status
CREATE OR REPLACE FUNCTION close_session_and_free_table(
  session_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  table_id_var UUID;
BEGIN
  -- Get table_id from session
  SELECT table_id INTO table_id_var
  FROM sessions
  WHERE id = session_id_param;

  -- Close the session
  UPDATE sessions
  SET 
    status = 'closed',
    closed_at = NOW()
  WHERE id = session_id_param;

  -- Update table status to available if table exists
  IF table_id_var IS NOT NULL THEN
    UPDATE tables
    SET 
      current_session_id = NULL
    WHERE id = table_id_var;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO anon;

COMMENT ON FUNCTION close_session_and_free_table IS 
  'Closes a session and frees the table by setting status to available';
-- =============================================
-- Migration 044: Fix close_session_and_free_table function
-- Corrects table_id_var type from UUID to INTEGER
-- =============================================

-- Drop and recreate function with correct type
DROP FUNCTION IF EXISTS close_session_and_free_table(UUID);

CREATE OR REPLACE FUNCTION close_session_and_free_table(
  session_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  table_id_var UUID;  -- sessions.table_id is UUID
BEGIN
  -- Get table_id from session
  SELECT table_id INTO table_id_var
  FROM sessions
  WHERE id = session_id_param;

  -- Close the session
  UPDATE sessions
  SET
    status = 'closed',
    closed_at = NOW()
  WHERE id = session_id_param;

  -- Update table status to available if table exists
  IF table_id_var IS NOT NULL THEN
    UPDATE tables
    SET
      current_session_id = NULL
    WHERE id = table_id_var;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO anon;

COMMENT ON FUNCTION close_session_and_free_table IS
  'Closes a session and frees the table by setting status to available. Fixed: table_id_var is INTEGER.';
-- =============================================
-- Migration 045: Fix product_ratings unique constraints
-- Replace partial indexes with full unique constraints for onConflict support
-- =============================================

-- Drop existing partial indexes
DROP INDEX IF EXISTS idx_product_ratings_order_unique;
DROP INDEX IF EXISTS idx_product_ratings_anon_unique;

-- Drop existing unique constraint (will recreate below)
ALTER TABLE product_ratings DROP CONSTRAINT IF EXISTS product_ratings_session_id_session_customer_id_product_id_key;

-- Add proper unique constraints for upsert support
-- These allow NULL values but enforce uniqueness when values are present

-- Constraint 1: For per-order-item ratings (when order_id is present)
-- Allows: same session + customer can rate different order_ids differently
CREATE UNIQUE INDEX idx_product_ratings_order_upsert
ON product_ratings(session_id, session_customer_id, order_id)
WHERE order_id IS NOT NULL AND session_customer_id IS NOT NULL;

-- Constraint 2: For per-product ratings (when order_id is NULL)
-- Allows: same session + customer can rate different products differently
CREATE UNIQUE INDEX idx_product_ratings_product_upsert
ON product_ratings(session_id, session_customer_id, product_id)
WHERE order_id IS NULL AND session_customer_id IS NOT NULL;

-- Constraint 3: For anonymous ratings (when session_customer_id is NULL)
-- Allows: anonymous users can rate each product once per session
CREATE UNIQUE INDEX idx_product_ratings_anon_upsert
ON product_ratings(session_id, product_id)
WHERE session_customer_id IS NULL;

-- Keep indexes for query performance
CREATE INDEX IF NOT EXISTS idx_product_ratings_session ON product_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_order ON product_ratings(order_id) WHERE order_id IS NOT NULL;

COMMENT ON INDEX idx_product_ratings_order_upsert IS
  'Unique constraint for per-order-item ratings with identified customer';
COMMENT ON INDEX idx_product_ratings_product_upsert IS
  'Unique constraint for per-product ratings with identified customer';
COMMENT ON INDEX idx_product_ratings_anon_upsert IS
  'Unique constraint for anonymous per-product ratings';
-- =============================================
-- SUSHI IN SUSHI - VENDUS POS INTEGRATION
-- Migration: 046_vendus_integration.sql
-- =============================================

-- =============================================
-- EXTEND PRODUCTS TABLE
-- =============================================
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendus_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS vendus_sync_status VARCHAR(20) DEFAULT 'pending'
        CHECK (vendus_sync_status IN ('pending', 'synced', 'error', 'not_applicable'));

-- Index for vendus lookups
CREATE INDEX IF NOT EXISTS idx_products_vendus_id ON products(vendus_id);
CREATE INDEX IF NOT EXISTS idx_products_vendus_sync_status ON products(vendus_sync_status);

-- =============================================
-- EXTEND TABLES TABLE
-- =============================================
ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS vendus_table_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_room_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

-- Index for vendus lookups
CREATE INDEX IF NOT EXISTS idx_tables_vendus_table_id ON tables(vendus_table_id);

-- =============================================
-- LOCATIONS TABLE (extend if exists or create)
-- =============================================
DO $$
BEGIN
    -- Check if locations table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
        CREATE TABLE locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL CHECK (slug IN ('circunvalacao', 'boavista')),
            address TEXT,
            phone VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insert default locations
        INSERT INTO locations (name, slug) VALUES
            ('Circunvalacao', 'circunvalacao'),
            ('Boavista', 'boavista');
    END IF;
END $$;

-- Add Vendus columns to locations
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS vendus_store_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_register_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_enabled BOOLEAN DEFAULT false;

-- =============================================
-- PAYMENT METHODS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    vendus_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment methods
INSERT INTO payment_methods (name, slug, sort_order) VALUES
    ('Dinheiro', 'cash', 1),
    ('Multibanco', 'card', 2),
    ('MB Way', 'mbway', 3),
    ('Transferencia', 'transfer', 4)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Local references
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

    -- Vendus references
    vendus_id VARCHAR(50) UNIQUE,
    vendus_document_number VARCHAR(50),
    vendus_document_type VARCHAR(20) DEFAULT 'FR', -- FR=Fatura-Recibo, FT=Fatura, FS=Fatura Simplificada
    vendus_series VARCHAR(20),
    vendus_hash VARCHAR(255),

    -- Invoice data
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Payment info
    payment_method_id INTEGER REFERENCES payment_methods(id),
    paid_amount DECIMAL(10, 2),
    change_amount DECIMAL(10, 2) DEFAULT 0,

    -- Customer (optional, for NIF)
    customer_nif VARCHAR(20),
    customer_name VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'issued', 'voided', 'error')),
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES staff(id),
    void_reason TEXT,

    -- PDF storage
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    issued_by UUID REFERENCES staff(id),
    error_message TEXT,
    raw_response JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK for location_id if table already existed without it (e.g. from prior migration run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoices_location_id_fkey' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT invoices_location_id_fkey
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendus_id ON invoices(vendus_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_number ON invoices(vendus_document_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

-- =============================================
-- VENDUS SYNC LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_sync_log (
    id SERIAL PRIMARY KEY,

    -- Operation details
    operation VARCHAR(50) NOT NULL, -- 'product_sync', 'table_import', 'invoice_create', etc.
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('push', 'pull', 'both')),

    -- Entity references
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'table', 'invoice', 'category'
    entity_id VARCHAR(100),
    vendus_id VARCHAR(100),

    -- Location context
    location_id UUID,

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'error', 'partial')),

    -- Details
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,

    -- Request/Response data (for debugging)
    request_data JSONB,
    response_data JSONB,

    -- Staff and timing
    initiated_by UUID REFERENCES staff(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

-- Indexes for sync log
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_operation ON vendus_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_status ON vendus_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_entity ON vendus_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_created ON vendus_sync_log(started_at);

-- =============================================
-- VENDUS RETRY QUEUE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_retry_queue (
    id SERIAL PRIMARY KEY,

    -- Operation to retry
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    location_id UUID,

    -- Payload
    payload JSONB NOT NULL,

    -- Retry management
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_error TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_vendus_retry_queue_status_retry
    ON vendus_retry_queue(status, next_retry_at)
    WHERE status = 'pending';

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at for invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for locations (if trigger doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_locations_updated_at') THEN
        CREATE TRIGGER update_locations_updated_at
            BEFORE UPDATE ON locations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_retry_queue ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
CREATE POLICY "Anyone can view payment methods" ON payment_methods
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage payment methods" ON payment_methods;
CREATE POLICY "Admin can manage payment methods" ON payment_methods
    FOR ALL USING (true);

-- Invoices policies
DROP POLICY IF EXISTS "Staff can view invoices" ON invoices;
CREATE POLICY "Staff can view invoices" ON invoices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can create invoices" ON invoices;
CREATE POLICY "Staff can create invoices" ON invoices
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage invoices" ON invoices;
CREATE POLICY "Admin can manage invoices" ON invoices
    FOR ALL USING (true);

-- Sync log policies
DROP POLICY IF EXISTS "Staff can view sync log" ON vendus_sync_log;
CREATE POLICY "Staff can view sync log" ON vendus_sync_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage sync log" ON vendus_sync_log;
CREATE POLICY "System can manage sync log" ON vendus_sync_log
    FOR ALL USING (true);

-- Retry queue policies
DROP POLICY IF EXISTS "Admin can view retry queue" ON vendus_retry_queue;
CREATE POLICY "Admin can view retry queue" ON vendus_retry_queue
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage retry queue" ON vendus_retry_queue;
CREATE POLICY "System can manage retry queue" ON vendus_retry_queue
    FOR ALL USING (true);

-- =============================================
-- VIEWS
-- =============================================

-- Products with Vendus sync status
CREATE OR REPLACE VIEW products_with_vendus_status AS
SELECT
    p.*,
    c.name as category_name,
    CASE
        WHEN p.vendus_sync_status = 'synced' THEN 'Sincronizado'
        WHEN p.vendus_sync_status = 'pending' THEN 'Pendente'
        WHEN p.vendus_sync_status = 'error' THEN 'Erro'
        WHEN p.vendus_sync_status = 'not_applicable' THEN 'N/A'
        ELSE 'Pendente'
    END as sync_status_label,
    p.vendus_synced_at as last_synced
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Recent sync operations
CREATE OR REPLACE VIEW recent_sync_operations AS
SELECT
    vsl.*,
    s.name as initiated_by_name
FROM vendus_sync_log vsl
LEFT JOIN staff s ON vsl.initiated_by = s.id
ORDER BY vsl.started_at DESC
LIMIT 100;

-- Invoices with details
CREATE OR REPLACE VIEW invoices_with_details AS
SELECT
    i.*,
    pm.name as payment_method_name,
    s.name as issued_by_name,
    sv.name as voided_by_name,
    sess.table_id,
    t.number as table_number,
    t.name as table_name,
    CASE
        WHEN i.status = 'pending' THEN 'Pendente'
        WHEN i.status = 'issued' THEN 'Emitida'
        WHEN i.status = 'voided' THEN 'Anulada'
        WHEN i.status = 'error' THEN 'Erro'
        ELSE i.status
    END as status_label
FROM invoices i
LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
LEFT JOIN staff s ON i.issued_by = s.id
LEFT JOIN staff sv ON i.voided_by = sv.id
LEFT JOIN sessions sess ON i.session_id = sess.id
LEFT JOIN tables t ON sess.table_id = t.id;

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON payment_methods TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON vendus_sync_log TO authenticated;
GRANT ALL ON vendus_retry_queue TO authenticated;
GRANT SELECT ON products_with_vendus_status TO authenticated;
GRANT SELECT ON recent_sync_operations TO authenticated;
GRANT SELECT ON invoices_with_details TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- =============================================
-- VENDUS CATEGORIES SYNC
-- Migration: 047_vendus_categories.sql
-- =============================================

-- Add Vendus columns to categories for sync mapping
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_categories_vendus_id ON categories(vendus_id);
-- =============================================
-- FLEXIBLE LOCATIONS (support more restaurants)
-- Migration: 048_locations_flexible.sql
-- =============================================

-- Remove hardcoded slug constraint to allow dynamic locations
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_slug_check;
-- =============================================
-- PRODUCTS LOCATION SUPPORT
-- Migration: 049_products_location.sql
-- =============================================
-- Adds location_id to products so the sync page can show location-filtered
-- stats and product lists. Products with NULL location_id are treated as
-- global (shown when no location is selected; excluded when filtering by location).

-- Add location reference to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_location_id ON products(location_id);

-- Update view to include location_id and location_slug for filtering
-- Must DROP first because p.* expansion changed (new location_id column shifts positions)
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
