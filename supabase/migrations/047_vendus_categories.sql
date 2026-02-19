-- =============================================
-- VENDUS CATEGORIES SYNC
-- Migration: 047_vendus_categories.sql
-- =============================================

-- Add Vendus columns to categories for sync mapping
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_categories_vendus_id ON categories(vendus_id);
