-- 055_ingredients_catalog.sql
-- Creates a normalized ingredient catalog and product-ingredient junction table

-- Master catalog of ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'un')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_name_unique
  ON ingredients (LOWER(name));

-- Index for sort order queries
CREATE INDEX IF NOT EXISTS idx_ingredients_sort_order
  ON ingredients (sort_order ASC);

-- Junction table: which ingredients belong to which product, with quantity
CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, ingredient_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product
  ON product_ingredients (product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient
  ON product_ingredients (ingredient_id);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all - matches existing pattern)
CREATE POLICY "ingredients_all" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "product_ingredients_all" ON product_ingredients FOR ALL USING (true) WITH CHECK (true);

-- Trigger: auto-update updated_at on ingredients
CREATE OR REPLACE FUNCTION update_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ingredients_updated_at ON ingredients;
CREATE TRIGGER trigger_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredients_updated_at();
