-- Migration 070: Reservation cancel tokens for customer self-service cancellation
-- Stores 6-digit verification codes sent via email for identity confirmation

CREATE TABLE IF NOT EXISTS reservation_cancel_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting (max 3 per email per hour)
CREATE INDEX IF NOT EXISTS idx_cancel_tokens_email_created
  ON reservation_cancel_tokens(email, created_at);

-- RLS
ALTER TABLE reservation_cancel_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cancel_tokens_all" ON reservation_cancel_tokens FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON reservation_cancel_tokens TO anon, authenticated;
