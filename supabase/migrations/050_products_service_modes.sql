-- =============================================
-- PRODUCTS SERVICE MODES
-- Migration: 050_products_service_modes.sql
-- =============================================
-- Adds service_modes array to products to distinguish delivery/takeaway/dine-in.
-- Vendus uses categories like "Delivery" and "Take away" instead of real product
-- categories. This column stores the service channel while keeping category_id
-- for actual product categorization (Sushi, Bebidas, etc.).

-- Add service_modes array column
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS service_modes TEXT[] DEFAULT '{}';

-- GIN index for efficient array containment queries (e.g. WHERE service_modes @> '{delivery}')
CREATE INDEX IF NOT EXISTS idx_products_service_modes
    ON products USING GIN (service_modes);

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
