-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
  default_people_per_table INTEGER NOT NULL DEFAULT 4 CHECK (default_people_per_table > 0),
  auto_table_assignment BOOLEAN NOT NULL DEFAULT false,
  auto_reservations BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);

-- RLS Policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY restaurants_admin_all ON restaurants
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id::text = auth.uid()::text
    AND staff.role_id IN (SELECT id FROM roles WHERE name = 'admin')
  ));

-- All authenticated users can view active restaurants
CREATE POLICY restaurants_view_active ON restaurants
  FOR SELECT
  USING (is_active = true);

-- Updated at trigger
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Populate with existing locations
INSERT INTO restaurants (slug, name, address, max_capacity, default_people_per_table, is_active)
VALUES
  ('circunvalacao', 'Circunvalação', 'Via de Circunvalação, Porto', 50, 4, true),
  ('boavista', 'Boavista', 'Avenida da Boavista, Porto', 40, 4, true)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE restaurants IS 'Restaurant locations and configurations';
COMMENT ON COLUMN restaurants.slug IS 'Unique identifier used in code (e.g., circunvalacao, boavista)';
COMMENT ON COLUMN restaurants.max_capacity IS 'Total restaurant capacity (all tables)';
COMMENT ON COLUMN restaurants.default_people_per_table IS 'Default capacity for new tables';
COMMENT ON COLUMN restaurants.auto_table_assignment IS 'Enable automatic table assignment to staff';
COMMENT ON COLUMN restaurants.auto_reservations IS 'Enable automatic reservation management';
