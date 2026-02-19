-- =============================================
-- PRODUCTS LOCATION SUPPORT
-- Migration: 009_products_location.sql
-- =============================================
-- Adds location_id to products so the sync page can show location-filtered
-- stats and product lists. Products with NULL location_id are treated as
-- global (shown when no location is selected; excluded when filtering by location).

-- Add location reference to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_location_id ON products(location_id);

-- Update view to include location_id and location_slug for filtering
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
