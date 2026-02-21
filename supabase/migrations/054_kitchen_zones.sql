-- =============================================
-- KITCHEN ZONES + CATEGORY ZONE ASSIGNMENT
-- Migration: 054_kitchen_zones.sql
-- =============================================

-- 1. Create kitchen_zones table
CREATE TABLE IF NOT EXISTS kitchen_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_zones_slug ON kitchen_zones(slug);
CREATE INDEX IF NOT EXISTS idx_kitchen_zones_sort_order ON kitchen_zones(sort_order);

-- 2. Add zone_id FK to categories (nullable for backwards compat)
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES kitchen_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_zone_id ON categories(zone_id);

-- 3. RLS for kitchen_zones
ALTER TABLE kitchen_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view kitchen_zones" ON kitchen_zones;
CREATE POLICY "Anyone can view kitchen_zones" ON kitchen_zones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can manage kitchen_zones" ON kitchen_zones;
CREATE POLICY "Authenticated can manage kitchen_zones" ON kitchen_zones
    FOR ALL USING (true);

-- 4. Grants
GRANT SELECT ON kitchen_zones TO anon, authenticated;
GRANT ALL ON kitchen_zones TO authenticated;

-- 5. Seed default zones
INSERT INTO kitchen_zones (name, slug, color, sort_order) VALUES
    ('Quentes', 'quentes', '#EF4444', 1),
    ('Frios', 'frios', '#3B82F6', 2),
    ('Bar', 'bar', '#F59E0B', 3)
ON CONFLICT (slug) DO NOTHING;
