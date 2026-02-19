-- Ratings from customers at the table (swipe game)
CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  session_customer_id uuid REFERENCES session_customers(id) ON DELETE SET NULL,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, session_customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ratings_session ON product_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);

-- Deduplicate anonymous ratings: UNIQUE allows multiple NULLs, so we need a partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_anon_unique
ON product_ratings(session_id, product_id)
WHERE session_customer_id IS NULL;

COMMENT ON TABLE product_ratings IS 'Customer ratings from mesa swipe game; used for table leader and free drink reward';

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert ratings for session" ON product_ratings;
CREATE POLICY "Allow insert ratings for session"
ON product_ratings FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select ratings by session" ON product_ratings;
CREATE POLICY "Allow select ratings by session"
ON product_ratings FOR SELECT TO anon, authenticated
USING (true);
