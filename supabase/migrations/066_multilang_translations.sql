-- Migration 066: Multi-language translations for products and ingredients
-- Uses JSONB columns: {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."}

-- Product translations (descriptions, SEO titles, SEO descriptions)
ALTER TABLE products ADD COLUMN IF NOT EXISTS descriptions JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_titles JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_descriptions JSONB DEFAULT '{}';

-- Migrate existing data to PT key
UPDATE products SET descriptions = jsonb_build_object('pt', description)
  WHERE description IS NOT NULL AND (descriptions IS NULL OR descriptions = '{}');

UPDATE products SET seo_titles = jsonb_build_object('pt', seo_title)
  WHERE seo_title IS NOT NULL AND (seo_titles IS NULL OR seo_titles = '{}');

UPDATE products SET seo_descriptions = jsonb_build_object('pt', seo_description)
  WHERE seo_description IS NOT NULL AND (seo_descriptions IS NULL OR seo_descriptions = '{}');

-- Ingredient name translations
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}';

UPDATE ingredients SET name_translations = jsonb_build_object('pt', name)
  WHERE name IS NOT NULL AND (name_translations IS NULL OR name_translations = '{}');
