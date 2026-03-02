-- =============================================
-- Migration 076: Customer Session Stats
-- Transfers accumulated session data (games, ratings, allergens, companions)
-- to the customers table when a session closes.
-- =============================================

-- =============================================
-- GAME STATS on customers
-- =============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS prizes_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS prizes_redeemed INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- RATING STATS on customers
-- =============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ratings_given INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ratings_sum INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS avg_rating_given NUMERIC(3,1) NOT NULL DEFAULT 0;

-- =============================================
-- ALLERGENS (union of all declared allergens across sessions)
-- =============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}';

-- =============================================
-- COMPANION TRACKING (who dines together)
-- Symmetric: both (A,B) and (B,A) rows exist for simple querying
-- =============================================
CREATE TABLE IF NOT EXISTS customer_companions (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    companion_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    shared_sessions INTEGER NOT NULL DEFAULT 1,
    last_shared_session_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (customer_id, companion_id),
    CHECK (customer_id <> companion_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_companions_customer ON customer_companions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_companions_companion ON customer_companions(companion_id);

-- RLS
ALTER TABLE customer_companions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to companions" ON customer_companions;
CREATE POLICY "Service role full access to companions" ON customer_companions
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON customer_companions TO anon, authenticated;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_companions_updated_at ON customer_companions;
CREATE TRIGGER update_customer_companions_updated_at
    BEFORE UPDATE ON customer_companions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
