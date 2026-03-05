-- Migration 078: Site settings singleton + restaurant branding columns
-- Removes all hardcoded values from RestaurantSchema and admin forms

-- ─── site_settings singleton table ──────────────────────────────────────────
-- Stores global brand data (brand name, social links, etc.)
-- Only one row allowed (id = 1 enforced by CHECK constraint)

CREATE TABLE IF NOT EXISTS site_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name       TEXT NOT NULL DEFAULT 'Sushi in Sushi',
  description      TEXT,
  price_range      TEXT DEFAULT '€€-€€€',
  -- Social media
  facebook_url     TEXT,
  instagram_url    TEXT,
  -- Review & discovery platforms
  google_reviews_url TEXT,  -- Google Business Profile reviews link
  tripadvisor_url  TEXT,
  thefork_url      TEXT,    -- TheFork / LaFourchette
  zomato_url       TEXT,
  -- Maps / location
  google_maps_url  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Defensive: add columns that may be missing if the table pre-existed
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_reviews_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tripadvisor_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS thefork_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS zomato_url TEXT;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default row with known values
INSERT INTO site_settings (
  id, brand_name, description, price_range, facebook_url, instagram_url, google_maps_url
) VALUES (
  1,
  'Sushi in Sushi',
  'Restaurante de sushi fusion no Porto. Rodízio, à carta, delivery e takeaway. Tradição japonesa com criatividade contemporânea.',
  '€€-€€€',
  'https://www.facebook.com/sushinsushi',
  'https://www.instagram.com/sushi_in_sushi_porto',
  'https://www.google.com/maps/search/?api=1&query=Sushi+in+Sushi+Porto'
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS (admin-only write, public read)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write"
  ON site_settings FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- ─── New restaurant branding columns ────────────────────────────────────────

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS address_locality TEXT DEFAULT 'Porto',
  ADD COLUMN IF NOT EXISTS address_country  TEXT DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS google_maps_url  TEXT;

-- Populate existing restaurants
UPDATE restaurants SET
  address_locality = 'Porto',
  address_country  = 'PT'
WHERE address_locality IS NULL;
