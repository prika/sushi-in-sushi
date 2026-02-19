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
  ADD COLUMN IF NOT EXISTS games_prize_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
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
