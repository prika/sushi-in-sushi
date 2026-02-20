-- =============================================
-- PRODUCTS VENDUS IDS (multi-mode mapping)
-- Migration: 053_products_vendus_ids.sql
-- =============================================
-- Adds vendus_ids JSONB column mapping service_mode -> vendus_id.
-- In Vendus POS, a single product (e.g. "Salmon Nigiri") exists as
-- multiple entries — one per service category (Sala, Delivery, Take Away),
-- each with its own vendus_id and price.
-- Example: {"dine_in": "12345", "delivery": "12346", "takeaway": "12347"}

-- Add vendus_ids JSONB column
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS vendus_ids JSONB DEFAULT '{}';

-- Migrate existing vendus_id data into vendus_ids map
-- Products with a vendus_id get it mapped under "dine_in" key (reasonable default)
UPDATE products
SET vendus_ids = jsonb_build_object('dine_in', vendus_id)
WHERE vendus_id IS NOT NULL
  AND (vendus_ids IS NULL OR vendus_ids = '{}'::jsonb);

-- Drop UNIQUE constraint on vendus_id (auto-generated name from migration 046)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vendus_id_key;

-- GIN index for efficient JSONB lookups
CREATE INDEX IF NOT EXISTS idx_products_vendus_ids
    ON products USING GIN (vendus_ids);

-- Recreate view (p.* expansion changes with new column)
DROP VIEW IF EXISTS products_with_vendus_status;
CREATE OR REPLACE VIEW products_with_vendus_status AS
SELECT
    p.*,
    c.name as category_name,
    l.slug as location_slug,
    CASE
        WHEN p.vendus_sync_status = 'synced' THEN 'Sincronizado'
        WHEN p.vendus_sync_status = 'pending' THEN 'Pendente'
        WHEN p.vendus_sync_status = 'error' THEN 'Erro'
        WHEN p.vendus_sync_status = 'not_applicable' THEN 'N/A'
        ELSE 'Pendente'
    END as sync_status_label,
    p.vendus_synced_at as last_synced
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN locations l ON p.location_id = l.id;
