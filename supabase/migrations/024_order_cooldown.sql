-- Migration 024: Add order cooldown setting to restaurants
-- Configurable cooldown period (in minutes) between orders per session.
-- 0 = disabled (no cooldown).

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS order_cooldown_minutes INTEGER NOT NULL DEFAULT 0;

-- Add CHECK constraint separately for IF NOT EXISTS compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_order_cooldown_minutes_check'
  ) THEN
    ALTER TABLE restaurants
      ADD CONSTRAINT restaurants_order_cooldown_minutes_check
      CHECK (order_cooldown_minutes >= 0);
  END IF;
END $$;
