-- Migration 073: Piece limiter per order for Rodizio mode
-- Adds configurable limit on number of pieces per person per order

ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS piece_limiter_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS piece_limiter_mode TEXT NOT NULL DEFAULT 'warning';

ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS piece_limiter_max_per_person INTEGER NOT NULL DEFAULT 15;

-- Add CHECK constraints separately (idempotent with DO blocks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'piece_limiter_mode_check'
  ) THEN
    ALTER TABLE reservation_settings
      ADD CONSTRAINT piece_limiter_mode_check
      CHECK (piece_limiter_mode IN ('block', 'warning'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'piece_limiter_max_per_person_check'
  ) THEN
    ALTER TABLE reservation_settings
      ADD CONSTRAINT piece_limiter_max_per_person_check
      CHECK (piece_limiter_max_per_person >= 1 AND piece_limiter_max_per_person <= 100);
  END IF;
END $$;
