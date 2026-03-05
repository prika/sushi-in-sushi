-- 089_upsert_restaurant_hours.sql
-- Atomic replace of restaurant_hours: delete + insert in a single transaction.

CREATE OR REPLACE FUNCTION upsert_restaurant_hours(
  p_slug TEXT,
  p_hours JSONB DEFAULT '[]'::JSONB
) RETURNS void AS $$
BEGIN
  DELETE FROM restaurant_hours WHERE restaurant_slug = p_slug;

  IF jsonb_array_length(p_hours) > 0 THEN
    INSERT INTO restaurant_hours (restaurant_slug, day_of_week, opens_at, closes_at)
    SELECT
      p_slug,
      (elem->>'day_of_week')::INTEGER,
      elem->>'opens_at',
      elem->>'closes_at'
    FROM jsonb_array_elements(p_hours) AS elem;
  END IF;
END;
$$ LANGUAGE plpgsql;
