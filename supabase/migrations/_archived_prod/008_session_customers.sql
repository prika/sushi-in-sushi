-- =============================================
-- SUSHI IN SUSHI - SESSION CUSTOMERS SYSTEM
-- Migration: 008_session_customers.sql
-- Allows multiple customers per session to register and track their orders
-- =============================================

-- =============================================
-- SESSION CUSTOMERS TABLE
-- Tracks individual customers within a session
-- =============================================
CREATE TABLE IF NOT EXISTS session_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which session this customer belongs to
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    -- Display name (required - how they want to be called)
    display_name VARCHAR(100) NOT NULL,

    -- Optional profile information
    full_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,

    -- Marketing preferences
    marketing_consent BOOLEAN DEFAULT false,
    preferred_contact VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact IN ('email', 'phone', 'none')),

    -- Link to registered customer (if they have an account)
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Order tracking
    is_session_host BOOLEAN DEFAULT false, -- First person to join is the host

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ADD CUSTOMER REFERENCE TO ORDERS
-- =============================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_session_customers_session ON session_customers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_customers_email ON session_customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_customers_customer ON session_customers(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session_customer ON orders(session_customer_id) WHERE session_customer_id IS NOT NULL;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_session_customers_updated_at ON session_customers;
CREATE TRIGGER update_session_customers_updated_at
    BEFORE UPDATE ON session_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE session_customers ENABLE ROW LEVEL SECURITY;

-- Anyone can create session customers (from the public table ordering page)
DROP POLICY IF EXISTS "Anyone can create session customers" ON session_customers;
CREATE POLICY "Anyone can create session customers" ON session_customers
    FOR INSERT WITH CHECK (true);

-- Anyone can view session customers (needed for showing names)
DROP POLICY IF EXISTS "Anyone can view session customers" ON session_customers;
CREATE POLICY "Anyone can view session customers" ON session_customers
    FOR SELECT USING (true);

-- Anyone can update session customers (for editing their own info)
DROP POLICY IF EXISTS "Anyone can update session customers" ON session_customers;
CREATE POLICY "Anyone can update session customers" ON session_customers
    FOR UPDATE USING (true);

-- =============================================
-- VIEW: SESSION WITH CUSTOMERS
-- =============================================
CREATE OR REPLACE VIEW session_with_customers AS
SELECT
    s.*,
    t.number as table_number,
    t.name as table_name,
    t.location as table_location,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', sc.id,
            'display_name', sc.display_name,
            'is_host', sc.is_session_host,
            'created_at', sc.created_at
        ) ORDER BY sc.created_at)
        FROM session_customers sc
        WHERE sc.session_id = s.id),
        '[]'::json
    ) as customers,
    (SELECT COUNT(*) FROM session_customers sc WHERE sc.session_id = s.id) as customer_count
FROM sessions s
JOIN tables t ON s.table_id = t.id;

-- =============================================
-- VIEW: ORDERS WITH CUSTOMER INFO
-- =============================================
CREATE OR REPLACE VIEW orders_with_customer AS
SELECT
    o.*,
    p.name as product_name,
    p.price as product_price,
    sc.display_name as customer_name,
    sc.id as customer_id
FROM orders o
JOIN products p ON o.product_id = p.id
LEFT JOIN session_customers sc ON o.session_customer_id = sc.id;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON session_customers TO anon, authenticated;
GRANT SELECT ON session_with_customers TO anon, authenticated;
GRANT SELECT ON orders_with_customer TO anon, authenticated;

-- =============================================
-- ENABLE REALTIME
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'session_customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE session_customers;
    END IF;
END $$;
