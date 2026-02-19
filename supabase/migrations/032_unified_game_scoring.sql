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
