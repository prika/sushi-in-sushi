-- Migration 092: Re-point location FKs from locations → restaurants
-- Adiciona restaurant_id a invoices e products, preenche via slug match

-- =============================================
-- 1. INVOICES: adicionar restaurant_id
-- =============================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_id ON invoices(restaurant_id);

-- Preencher restaurant_id via slug match (locations.slug → restaurants.slug)
UPDATE invoices i
SET restaurant_id = r.id
FROM locations l, restaurants r
WHERE i.location_id = l.id
  AND l.slug = r.slug
  AND i.restaurant_id IS NULL;

-- =============================================
-- 2. PRODUCTS: adicionar restaurant_id
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);

-- Preencher restaurant_id via slug match
UPDATE products p
SET restaurant_id = r.id
FROM locations l, restaurants r
WHERE p.location_id = l.id
  AND l.slug = r.slug
  AND p.restaurant_id IS NULL;

-- =============================================
-- 3. VENDUS_SYNC_LOG: adicionar restaurant_id
-- =============================================
ALTER TABLE vendus_sync_log
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

UPDATE vendus_sync_log vsl
SET restaurant_id = r.id
FROM locations l, restaurants r
WHERE vsl.location_id = l.id
  AND l.slug = r.slug
  AND vsl.restaurant_id IS NULL;

-- =============================================
-- 4. VENDUS_RETRY_QUEUE: adicionar restaurant_id
-- =============================================
ALTER TABLE vendus_retry_queue
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

UPDATE vendus_retry_queue vrq
SET restaurant_id = r.id
FROM locations l, restaurants r
WHERE vrq.location_id = l.id
  AND l.slug = r.slug
  AND vrq.restaurant_id IS NULL;

-- =============================================
-- 5. Recriar view products_with_vendus_status
-- =============================================
DROP VIEW IF EXISTS products_with_vendus_status CASCADE;
CREATE OR REPLACE VIEW products_with_vendus_status AS
SELECT
    p.*,
    c.name as category_name,
    r.slug as location_slug,
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
LEFT JOIN restaurants r ON p.restaurant_id = r.id;
