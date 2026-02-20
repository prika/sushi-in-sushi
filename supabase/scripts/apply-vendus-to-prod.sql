-- =============================================
-- VENDUS POS - PROD MIGRATION (046 + 047 + 048 + 049)
-- =============================================
-- Seguro para correr em prod: usa IF NOT EXISTS, ADD COLUMN IF NOT EXISTS.
-- NAO apaga tabelas, colunas ou dados existentes.
-- Idempotente: pode ser corrido varias vezes sem efeitos colaterais.
-- =============================================

-- =============================================
-- 1. LOCATIONS (criar se nao existe + colunas Vendus)
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
        CREATE TABLE locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            address TEXT,
            phone VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        INSERT INTO locations (name, slug) VALUES
            ('Circunvalacao', 'circunvalacao'),
            ('Boavista', 'boavista');
    END IF;
END $$;

-- Remove hardcoded slug constraint (048) to allow dynamic locations
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_slug_check;

-- Add Vendus columns to locations
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS vendus_store_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_register_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_enabled BOOLEAN DEFAULT false;

-- Trigger updated_at for locations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_locations_updated_at') THEN
        CREATE TRIGGER update_locations_updated_at
            BEFORE UPDATE ON locations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================
-- 2. PRODUCTS - colunas Vendus (nao toca nos dados existentes)
-- =============================================
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendus_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS vendus_sync_status VARCHAR(20) DEFAULT 'pending'
        CHECK (vendus_sync_status IN ('pending', 'synced', 'error', 'not_applicable')),
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_vendus_id ON products(vendus_id);
CREATE INDEX IF NOT EXISTS idx_products_vendus_sync_status ON products(vendus_sync_status);
CREATE INDEX IF NOT EXISTS idx_products_location_id ON products(location_id);

-- =============================================
-- 3. CATEGORIES - colunas Vendus (047)
-- =============================================
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_categories_vendus_id ON categories(vendus_id);

-- =============================================
-- 4. TABLES - colunas Vendus
-- =============================================
ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS vendus_table_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_room_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_tables_vendus_table_id ON tables(vendus_table_id);

-- =============================================
-- 5. PAYMENT METHODS (nova tabela)
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    vendus_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO payment_methods (name, slug, sort_order) VALUES
    ('Dinheiro', 'cash', 1),
    ('Multibanco', 'card', 2),
    ('MB Way', 'mbway', 3),
    ('Transferencia', 'transfer', 4)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 6. INVOICES (nova tabela)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    vendus_id VARCHAR(50) UNIQUE,
    vendus_document_number VARCHAR(50),
    vendus_document_type VARCHAR(20) DEFAULT 'FR',
    vendus_series VARCHAR(20),
    vendus_hash VARCHAR(255),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method_id INTEGER REFERENCES payment_methods(id),
    paid_amount DECIMAL(10, 2),
    change_amount DECIMAL(10, 2) DEFAULT 0,
    customer_nif VARCHAR(20),
    customer_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'issued', 'voided', 'error')),
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES staff(id),
    void_reason TEXT,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    issued_by UUID REFERENCES staff(id),
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoices_location_id_fkey' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT invoices_location_id_fkey
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendus_id ON invoices(vendus_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_number ON invoices(vendus_document_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. VENDUS SYNC LOG (nova tabela)
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_sync_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('push', 'pull', 'both')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    vendus_id VARCHAR(100),
    location_id UUID,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'error', 'partial')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    request_data JSONB,
    response_data JSONB,
    initiated_by UUID REFERENCES staff(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_operation ON vendus_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_status ON vendus_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_entity ON vendus_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_created ON vendus_sync_log(started_at);

-- =============================================
-- 8. VENDUS RETRY QUEUE (nova tabela)
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_retry_queue (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    location_id UUID,
    payload JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_vendus_retry_queue_status_retry
    ON vendus_retry_queue(status, next_retry_at)
    WHERE status = 'pending';

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_retry_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
CREATE POLICY "Anyone can view payment methods" ON payment_methods
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage payment methods" ON payment_methods;
CREATE POLICY "Admin can manage payment methods" ON payment_methods
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff can view invoices" ON invoices;
CREATE POLICY "Staff can view invoices" ON invoices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can create invoices" ON invoices;
CREATE POLICY "Staff can create invoices" ON invoices
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage invoices" ON invoices;
CREATE POLICY "Admin can manage invoices" ON invoices
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff can view sync log" ON vendus_sync_log;
CREATE POLICY "Staff can view sync log" ON vendus_sync_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage sync log" ON vendus_sync_log;
CREATE POLICY "System can manage sync log" ON vendus_sync_log
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin can view retry queue" ON vendus_retry_queue;
CREATE POLICY "Admin can view retry queue" ON vendus_retry_queue
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage retry queue" ON vendus_retry_queue;
CREATE POLICY "System can manage retry queue" ON vendus_retry_queue
    FOR ALL USING (true);

-- =============================================
-- 10. VIEWS
-- =============================================
DROP VIEW IF EXISTS products_with_vendus_status;
CREATE VIEW products_with_vendus_status AS
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

CREATE OR REPLACE VIEW recent_sync_operations AS
SELECT
    vsl.*,
    s.name as initiated_by_name
FROM vendus_sync_log vsl
LEFT JOIN staff s ON vsl.initiated_by = s.id
ORDER BY vsl.started_at DESC
LIMIT 100;

CREATE OR REPLACE VIEW invoices_with_details AS
SELECT
    i.*,
    pm.name as payment_method_name,
    s.name as issued_by_name,
    sv.name as voided_by_name,
    sess.table_id,
    t.number as table_number,
    t.name as table_name,
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
LEFT JOIN tables t ON sess.table_id = t.id;

-- =============================================
-- 11. GRANTS
-- =============================================
GRANT ALL ON payment_methods TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON vendus_sync_log TO authenticated;
GRANT ALL ON vendus_retry_queue TO authenticated;
GRANT SELECT ON products_with_vendus_status TO authenticated;
GRANT SELECT ON recent_sync_operations TO authenticated;
GRANT SELECT ON invoices_with_details TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
