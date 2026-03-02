-- Migration 065: Add SEO fields to products table
-- Supports AI-generated descriptions for menu SEO and Schema.org markup

ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMPTZ;
