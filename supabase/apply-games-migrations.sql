-- ============================================================
-- Consolidated Games Migrations (029 + 030 + 031)
-- Apply via Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql
-- ============================================================

-- ============================================================
-- MIGRATION 029: Games System Tables
-- ============================================================

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
  ADD COLUMN IF NOT EXISTS games_prize_type VARCHAR(30) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS games_prize_value TEXT,
  ADD COLUMN IF NOT EXISTS games_prize_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS games_min_rounds_for_prize INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS games_questions_per_round INTEGER NOT NULL DEFAULT 6;

-- Add CHECK constraint for games_prize_type (separate to avoid IF NOT EXISTS issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_games_prize_type_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_games_prize_type_check
      CHECK (games_prize_type IN ('none', 'discount_percentage', 'free_product', 'free_dinner'));
  END IF;
END $$;

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

-- Drop policies first if they exist to avoid conflicts
DROP POLICY IF EXISTS "game_questions_select" ON game_questions;
DROP POLICY IF EXISTS "game_sessions_all" ON game_sessions;
DROP POLICY IF EXISTS "game_answers_all" ON game_answers;
DROP POLICY IF EXISTS "game_prizes_all" ON game_prizes;

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
DROP TRIGGER IF EXISTS update_game_questions_updated_at ON game_questions;
CREATE TRIGGER update_game_questions_updated_at
  BEFORE UPDATE ON game_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- MIGRATION 030: Seed Game Questions (Quiz + Preference)
-- ============================================================

-- Check if questions already exist before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM game_questions LIMIT 1) THEN
    -- Quiz questions
    INSERT INTO game_questions (game_type, question_text, options, correct_answer_index, category, difficulty, points) VALUES
    ('quiz', 'Qual e o peixe mais popular no sushi?', '["Salmao", "Atum", "Polvo", "Enguia"]', 0, 'sushi_knowledge', 1, 10),
    ('quiz', 'O que e wasabi verdadeiro?', '["Uma raiz japonesa", "Uma pasta artificial", "Uma alga", "Uma flor"]', 0, 'sushi_knowledge', 2, 10),
    ('quiz', 'De que pais e originario o sushi?', '["Japao", "China", "Coreia do Sul", "Tailandia"]', 0, 'culture', 1, 10),
    ('quiz', 'O que significa a palavra ''nigiri''?', '["Agarrar/Apertar", "Cortar", "Rolar", "Misturar"]', 0, 'sushi_knowledge', 2, 10),
    ('quiz', 'O que da a cor rosa ao gengibre de sushi?', '["Vinagre de arroz", "Corante alimentar", "Beterraba/processo natural", "E a cor natural"]', 2, 'ingredients', 2, 10),
    ('quiz', 'Quantas pecas tem um maki roll standard?', '["6 a 8", "2 a 3", "10 a 12", "15 ou mais"]', 0, 'sushi_knowledge', 1, 10),
    ('quiz', 'O que e nori?', '["Alga marinha seca", "Arroz temperado", "Peixe curado", "Molho de soja especial"]', 0, 'ingredients', 1, 10),
    ('quiz', 'Qual e a temperatura ideal do arroz de sushi?', '["Temperatura corporal (~37C)", "Frio de frigorifico", "Muito quente", "Congelado"]', 0, 'techniques', 3, 10),
    ('quiz', 'O que e sashimi?', '["Peixe cru sem arroz", "Peixe cru com arroz", "Peixe frito", "Peixe grelhado"]', 0, 'sushi_knowledge', 1, 10),
    ('quiz', 'Qual e a faca tradicional para cortar sushi?', '["Yanagiba", "Santoku", "Nakiri", "Deba"]', 0, 'techniques', 3, 10),
    ('quiz', 'Qual destes NAO e um tipo de sushi?', '["Ramen", "Nigiri", "Temaki", "Uramaki"]', 0, 'sushi_knowledge', 1, 10),
    ('quiz', 'O que e ponzu?', '["Molho citrico japones", "Um tipo de sushi", "Arroz de sushi", "Peixe fumado"]', 0, 'ingredients', 2, 10),
    ('quiz', 'Qual e o ingrediente principal do miso?', '["Soja fermentada", "Alga", "Arroz", "Peixe"]', 0, 'ingredients', 2, 10),
    ('quiz', 'O que e edamame?', '["Vagem de soja verde", "Alga frita", "Tofu grelhado", "Cogumelo japones"]', 0, 'ingredients', 1, 10),
    ('quiz', 'Qual peixe e conhecido como ''maguro'' em japones?', '["Atum", "Salmao", "Dourada", "Robalo"]', 0, 'ingredients', 2, 10),
    ('quiz', 'Como se diz ''obrigado'' em japones?', '["Arigatou", "Konnichiwa", "Sayonara", "Sumimasen"]', 0, 'culture', 1, 10),
    ('quiz', 'O que significa ''omakase''?', '["Confiar no chef", "Menu fixo", "Buffet livre", "Pedido rapido"]', 0, 'culture', 2, 10),
    ('quiz', 'Em que lado se coloca o molho de soja?', '["No peixe, nao no arroz", "No arroz", "Em ambos", "Nunca se usa"]', 0, 'culture', 2, 10),
    ('quiz', 'Qual e a bebida alcoolica tradicional japonesa feita de arroz?', '["Sake", "Shochu", "Umeshu", "Awamori"]', 0, 'culture', 1, 10),
    ('quiz', 'Quantos anos demora a formacao de um sushi chef tradicional?', '["Cerca de 10 anos", "1 ano", "3 meses", "20 anos"]', 0, 'culture', 3, 10);

    -- Preference questions
    INSERT INTO game_questions (game_type, question_text, option_a, option_b, category, points) VALUES
    ('preference', 'Preferes...', '{"label": "Nigiri"}', '{"label": "Maki"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Salmao"}', '{"label": "Atum"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Quente"}', '{"label": "Frio"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Cru"}', '{"label": "Cozinhado"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Com wasabi"}', '{"label": "Sem wasabi"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Molho de soja"}', '{"label": "Ponzu"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Tempura"}', '{"label": "Grelhado"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Uramaki"}', '{"label": "Temaki"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Edamame"}', '{"label": "Gyoza"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Sake"}', '{"label": "Cerveja japonesa"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Sashimi"}', '{"label": "Nigiri"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Camarao"}', '{"label": "Polvo"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Doce"}', '{"label": "Salgado"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Miso soup"}', '{"label": "Ramen"}', 'preferences', 10),
    ('preference', 'Preferes...', '{"label": "Chopsticks"}', '{"label": "Garfo"}', 'preferences', 10);
  END IF;
END $$;


-- ============================================================
-- MIGRATION 031: Games Mode (selection vs random)
-- ============================================================

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


-- ============================================================
-- MIGRATION 032: Unified Game Scoring
-- ============================================================
-- Makes tinder/swipe rating game part of the unified game scoring system

-- 1. Add game_type to game_sessions for tracking
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS game_type VARCHAR(20);

-- 2. Make question_id nullable (tinder uses product_id instead)
ALTER TABLE game_answers ALTER COLUMN question_id DROP NOT NULL;

-- 3. Add product_id column for tinder answers
ALTER TABLE game_answers
ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;

-- 4. Drop old unique constraint
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
DROP INDEX IF EXISTS idx_game_answers_unique_question;
CREATE UNIQUE INDEX idx_game_answers_unique_question
  ON game_answers(game_session_id, COALESCE(session_customer_id, '00000000-0000-0000-0000-000000000000'), question_id)
  WHERE question_id IS NOT NULL;

DROP INDEX IF EXISTS idx_game_answers_unique_product;
CREATE UNIQUE INDEX idx_game_answers_unique_product
  ON game_answers(game_session_id, COALESCE(session_customer_id, '00000000-0000-0000-0000-000000000000'), product_id)
  WHERE product_id IS NOT NULL;

-- 7. Performance index for product-based queries
CREATE INDEX IF NOT EXISTS idx_game_answers_product
  ON game_answers(product_id) WHERE product_id IS NOT NULL;
