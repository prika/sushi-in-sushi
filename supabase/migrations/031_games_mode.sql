-- Migration 031: Add games_mode to restaurants
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
