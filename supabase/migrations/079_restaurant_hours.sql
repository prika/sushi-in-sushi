-- Migration 079: Per-day opening hours with split shifts
-- Replaces the single opens_at/closes_at on restaurants with per-day, multi-shift hours.
-- Closed days are handled by restaurant_closures (is_recurring = true).

-- ─── restaurant_hours table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_hours (
  id                SERIAL PRIMARY KEY,
  restaurant_slug   TEXT NOT NULL,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  opens_at          TEXT NOT NULL,   -- "HH:MM"
  closes_at         TEXT NOT NULL,   -- "HH:MM"
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_restaurant_hours_slug
    FOREIGN KEY (restaurant_slug) REFERENCES restaurants(slug)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- Prevent duplicate shifts
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_hours_unique
  ON restaurant_hours (restaurant_slug, day_of_week, opens_at);

-- RLS: public read, admin write
ALTER TABLE restaurant_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurant_hours_public_read" ON restaurant_hours;
CREATE POLICY "restaurant_hours_public_read"
  ON restaurant_hours FOR SELECT USING (true);

DROP POLICY IF EXISTS "restaurant_hours_admin_write" ON restaurant_hours;
CREATE POLICY "restaurant_hours_admin_write"
  ON restaurant_hours FOR ALL USING (true);

-- ─── Circunvalação: Tue–Sat 12:00–15:00 + 18:00–22:00 ──────────────────────

INSERT INTO restaurant_hours (restaurant_slug, day_of_week, opens_at, closes_at) VALUES
  ('circunvalacao', 2, '12:00', '15:00'),  -- Tuesday   lunch
  ('circunvalacao', 2, '18:00', '22:00'),  -- Tuesday   dinner
  ('circunvalacao', 3, '12:00', '15:00'),  -- Wednesday lunch
  ('circunvalacao', 3, '18:00', '22:00'),  -- Wednesday dinner
  ('circunvalacao', 4, '12:00', '15:00'),  -- Thursday  lunch
  ('circunvalacao', 4, '18:00', '22:00'),  -- Thursday  dinner
  ('circunvalacao', 5, '12:00', '15:00'),  -- Friday    lunch
  ('circunvalacao', 5, '18:00', '22:00'),  -- Friday    dinner
  ('circunvalacao', 6, '12:00', '15:00'),  -- Saturday  lunch
  ('circunvalacao', 6, '18:00', '22:00')   -- Saturday  dinner
ON CONFLICT DO NOTHING;

-- ─── Boavista: Tue–Fri 12:00–15:00 + 16:00–21:30 ───────────────────────────

INSERT INTO restaurant_hours (restaurant_slug, day_of_week, opens_at, closes_at) VALUES
  ('boavista', 2, '12:00', '15:00'),  -- Tuesday   lunch
  ('boavista', 2, '16:00', '21:30'),  -- Tuesday   dinner
  ('boavista', 3, '12:00', '15:00'),  -- Wednesday lunch
  ('boavista', 3, '16:00', '21:30'),  -- Wednesday dinner
  ('boavista', 4, '12:00', '15:00'),  -- Thursday  lunch
  ('boavista', 4, '16:00', '21:30'),  -- Thursday  dinner
  ('boavista', 5, '12:00', '15:00'),  -- Friday    lunch
  ('boavista', 5, '16:00', '21:30')   -- Friday    dinner
ON CONFLICT DO NOTHING;

-- ─── Recurring weekly closures ──────────────────────────────────────────────
-- Clear existing recurring closures to set definitive schedule

DELETE FROM restaurant_closures WHERE is_recurring = true;

-- Circunvalação: Closed Sunday (0) and Monday (1)
INSERT INTO restaurant_closures (closure_date, location, reason, is_recurring, recurring_day_of_week)
VALUES
  ('2000-01-02', 'circunvalacao', 'Folga semanal', true, 0),  -- Sunday
  ('2000-01-03', 'circunvalacao', 'Folga semanal', true, 1);  -- Monday

-- Boavista: Closed Saturday (6), Sunday (0), Monday (1)
INSERT INTO restaurant_closures (closure_date, location, reason, is_recurring, recurring_day_of_week)
VALUES
  ('2000-01-01', 'boavista', 'Folga semanal', true, 6),  -- Saturday
  ('2000-01-02', 'boavista', 'Folga semanal', true, 0),  -- Sunday
  ('2000-01-03', 'boavista', 'Folga semanal', true, 1);  -- Monday

-- ─── Update opens_at/closes_at for backward compat ─────────────────────────

UPDATE restaurants SET opens_at = '12:00', closes_at = '22:00' WHERE slug = 'circunvalacao';
UPDATE restaurants SET opens_at = '12:00', closes_at = '21:30' WHERE slug = 'boavista';
