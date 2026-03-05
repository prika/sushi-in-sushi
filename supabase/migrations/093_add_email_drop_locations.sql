-- Migration 093: Add email to restaurants + drop locations table
-- Part of Phase 3: Final cleanup of locations → restaurants consolidation

-- 1. Add email column to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Copy email data from known locations (populate from locations if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
    UPDATE restaurants SET email = 'circunvalacao@sushinsushi.pt' WHERE slug = 'circunvalacao' AND email IS NULL;
    UPDATE restaurants SET email = 'boavista@sushinsushi.pt' WHERE slug = 'boavista' AND email IS NULL;
  END IF;
END $$;

-- 3. Drop ALL dependent views BEFORE dropping columns
DROP VIEW IF EXISTS invoices_with_details CASCADE;
DROP VIEW IF EXISTS products_with_vendus_status CASCADE;
DROP VIEW IF EXISTS recent_sync_operations CASCADE;

-- 4. Drop location_id columns (data already migrated to restaurant_id in migration 092)
ALTER TABLE invoices DROP COLUMN IF EXISTS location_id;
ALTER TABLE products DROP COLUMN IF EXISTS location_id;

-- Drop location_id from vendus tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendus_sync_log' AND column_name = 'location_id') THEN
    ALTER TABLE vendus_sync_log DROP COLUMN location_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendus_retry_queue' AND column_name = 'location_id') THEN
    ALTER TABLE vendus_retry_queue DROP COLUMN location_id;
  END IF;
END $$;

-- 5. Recreate views using restaurants instead of locations

-- invoices_with_details: now joins on restaurant_id → restaurants
CREATE OR REPLACE VIEW invoices_with_details AS
SELECT
    i.*,
    pm.name as payment_method_name,
    s.name as issued_by_name,
    sv.name as voided_by_name,
    sess.table_id,
    t.number as table_number,
    t.name as table_name,
    r.slug as location_slug,
    r.name as location_name,
    CASE
        WHEN i.status = 'pending' THEN 'Pendente'
        WHEN i.status = 'issued' THEN 'Emitida'
        WHEN i.status = 'voided' THEN 'Anulada'
        WHEN i.status = 'error' THEN 'Erro'
        ELSE i.status
    END as status_label
FROM invoices i
LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
LEFT JOIN staff s ON i.issued_by = s.id
LEFT JOIN staff sv ON i.voided_by = sv.id
LEFT JOIN sessions sess ON i.session_id = sess.id
LEFT JOIN tables t ON sess.table_id = t.id
LEFT JOIN restaurants r ON i.restaurant_id = r.id;

-- products_with_vendus_status: recreate (was already using restaurants from 092)
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

-- recent_sync_operations: recreate (uses vsl.* which no longer has location_id)
CREATE OR REPLACE VIEW recent_sync_operations AS
SELECT
    vsl.*,
    s.name as initiated_by_name
FROM vendus_sync_log vsl
LEFT JOIN staff s ON vsl.initiated_by = s.id
ORDER BY vsl.started_at DESC
LIMIT 100;

-- 6. Grant access on views
GRANT SELECT ON invoices_with_details TO authenticated;
GRANT SELECT ON products_with_vendus_status TO authenticated;
GRANT SELECT ON recent_sync_operations TO authenticated;

-- 7. Drop locations table
DROP TABLE IF EXISTS locations CASCADE;
