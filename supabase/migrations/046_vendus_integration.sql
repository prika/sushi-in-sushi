-- =============================================
-- SUSHI IN SUSHI - VENDUS POS INTEGRATION
-- Migration: 046_vendus_integration.sql
-- =============================================

-- =============================================
-- EXTEND PRODUCTS TABLE
-- =============================================
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS vendus_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vendus_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendus_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS vendus_sync_status VARCHAR(20) DEFAULT 'pending'
        CHECK (vendus_sync_status IN ('pending', 'synced', 'error', 'not_applicable'));

-- Index for vendus lookups
CREATE INDEX IF NOT EXISTS idx_products_vendus_id ON products(vendus_id);
CREATE INDEX IF NOT EXISTS idx_products_vendus_sync_status ON products(vendus_sync_status);

-- =============================================
-- EXTEND TABLES TABLE
-- =============================================
ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS vendus_table_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_room_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_synced_at TIMESTAMP WITH TIME ZONE;

-- Index for vendus lookups
CREATE INDEX IF NOT EXISTS idx_tables_vendus_table_id ON tables(vendus_table_id);

-- =============================================
-- LOCATIONS TABLE (extend if exists or create)
-- =============================================
DO $$
BEGIN
    -- Check if locations table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
        CREATE TABLE locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL CHECK (slug IN ('circunvalacao', 'boavista')),
            address TEXT,
            phone VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insert default locations
        INSERT INTO locations (name, slug) VALUES
            ('Circunvalacao', 'circunvalacao'),
            ('Boavista', 'boavista');
    END IF;
END $$;

-- Add Vendus columns to locations
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS vendus_store_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_register_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendus_enabled BOOLEAN DEFAULT false;

-- =============================================
-- PAYMENT METHODS TABLE
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

-- Insert default payment methods
INSERT INTO payment_methods (name, slug, sort_order) VALUES
    ('Dinheiro', 'cash', 1),
    ('Multibanco', 'card', 2),
    ('MB Way', 'mbway', 3),
    ('Transferencia', 'transfer', 4)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Local references
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

    -- Vendus references
    vendus_id VARCHAR(50) UNIQUE,
    vendus_document_number VARCHAR(50),
    vendus_document_type VARCHAR(20) DEFAULT 'FR', -- FR=Fatura-Recibo, FT=Fatura, FS=Fatura Simplificada
    vendus_series VARCHAR(20),
    vendus_hash VARCHAR(255),

    -- Invoice data
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Payment info
    payment_method_id INTEGER REFERENCES payment_methods(id),
    paid_amount DECIMAL(10, 2),
    change_amount DECIMAL(10, 2) DEFAULT 0,

    -- Customer (optional, for NIF)
    customer_nif VARCHAR(20),
    customer_name VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'issued', 'voided', 'error')),
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES staff(id),
    void_reason TEXT,

    -- PDF storage
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    issued_by UUID REFERENCES staff(id),
    error_message TEXT,
    raw_response JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK for location_id if table already existed without it (e.g. from prior migration run)
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

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendus_id ON invoices(vendus_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_number ON invoices(vendus_document_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

-- =============================================
-- VENDUS SYNC LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_sync_log (
    id SERIAL PRIMARY KEY,

    -- Operation details
    operation VARCHAR(50) NOT NULL, -- 'product_sync', 'table_import', 'invoice_create', etc.
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('push', 'pull', 'both')),

    -- Entity references
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'table', 'invoice', 'category'
    entity_id VARCHAR(100),
    vendus_id VARCHAR(100),

    -- Location context
    location_id UUID,

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'error', 'partial')),

    -- Details
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,

    -- Request/Response data (for debugging)
    request_data JSONB,
    response_data JSONB,

    -- Staff and timing
    initiated_by UUID REFERENCES staff(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

-- Indexes for sync log
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_operation ON vendus_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_status ON vendus_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_entity ON vendus_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_created ON vendus_sync_log(started_at);

-- =============================================
-- VENDUS RETRY QUEUE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS vendus_retry_queue (
    id SERIAL PRIMARY KEY,

    -- Operation to retry
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    location_id UUID,

    -- Payload
    payload JSONB NOT NULL,

    -- Retry management
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_error TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_vendus_retry_queue_status_retry
    ON vendus_retry_queue(status, next_retry_at)
    WHERE status = 'pending';

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at for invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for locations (if trigger doesn't exist)
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
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendus_retry_queue ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
CREATE POLICY "Anyone can view payment methods" ON payment_methods
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage payment methods" ON payment_methods;
CREATE POLICY "Admin can manage payment methods" ON payment_methods
    FOR ALL USING (true);

-- Invoices policies
DROP POLICY IF EXISTS "Staff can view invoices" ON invoices;
CREATE POLICY "Staff can view invoices" ON invoices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can create invoices" ON invoices;
CREATE POLICY "Staff can create invoices" ON invoices
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage invoices" ON invoices;
CREATE POLICY "Admin can manage invoices" ON invoices
    FOR ALL USING (true);

-- Sync log policies
DROP POLICY IF EXISTS "Staff can view sync log" ON vendus_sync_log;
CREATE POLICY "Staff can view sync log" ON vendus_sync_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage sync log" ON vendus_sync_log;
CREATE POLICY "System can manage sync log" ON vendus_sync_log
    FOR ALL USING (true);

-- Retry queue policies
DROP POLICY IF EXISTS "Admin can view retry queue" ON vendus_retry_queue;
CREATE POLICY "Admin can view retry queue" ON vendus_retry_queue
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage retry queue" ON vendus_retry_queue;
CREATE POLICY "System can manage retry queue" ON vendus_retry_queue
    FOR ALL USING (true);

-- =============================================
-- VIEWS
-- =============================================

-- Products with Vendus sync status
CREATE OR REPLACE VIEW products_with_vendus_status AS
SELECT
    p.*,
    c.name as category_name,
    CASE
        WHEN p.vendus_sync_status = 'synced' THEN 'Sincronizado'
        WHEN p.vendus_sync_status = 'pending' THEN 'Pendente'
        WHEN p.vendus_sync_status = 'error' THEN 'Erro'
        WHEN p.vendus_sync_status = 'not_applicable' THEN 'N/A'
        ELSE 'Pendente'
    END as sync_status_label,
    p.vendus_synced_at as last_synced
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Recent sync operations
CREATE OR REPLACE VIEW recent_sync_operations AS
SELECT
    vsl.*,
    s.name as initiated_by_name
FROM vendus_sync_log vsl
LEFT JOIN staff s ON vsl.initiated_by = s.id
ORDER BY vsl.started_at DESC
LIMIT 100;

-- Invoices with details
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
-- GRANTS
-- =============================================
GRANT ALL ON payment_methods TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON vendus_sync_log TO authenticated;
GRANT ALL ON vendus_retry_queue TO authenticated;
GRANT SELECT ON products_with_vendus_status TO authenticated;
GRANT SELECT ON recent_sync_operations TO authenticated;
GRANT SELECT ON invoices_with_details TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
