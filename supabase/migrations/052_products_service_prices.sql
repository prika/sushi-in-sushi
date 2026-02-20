-- =============================================
-- PRODUCTS SERVICE PRICES
-- Migration: 052_products_service_prices.sql
-- =============================================
-- Adds per-service-mode pricing as JSONB.
-- Keys are service mode slugs (delivery, takeaway, dine_in),
-- values are decimal prices. Falls back to products.price when
-- a mode is not present.

-- Add service_prices JSONB column
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS service_prices JSONB DEFAULT '{}';

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
