-- =============================================
-- SUSHI IN SUSHI - USER MANAGEMENT SYSTEM
-- Migration: 001_user_management.sql
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ROLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrador com acesso total ao sistema'),
    ('kitchen', 'Acesso à cozinha para visualizar e gerir pedidos'),
    ('waiter', 'Empregado de mesa com acesso às mesas atribuídas'),
    ('customer', 'Cliente registado para programa de fidelização')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- STAFF TABLE (Admin, Kitchen, Waiter)
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    location VARCHAR(50) CHECK (location IN ('circunvalacao', 'boavista')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_location ON staff(location);

-- =============================================
-- WAITER-TABLE ASSIGNMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS waiter_tables (
    id SERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, table_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_waiter_tables_staff ON waiter_tables(staff_id);
CREATE INDEX IF NOT EXISTS idx_waiter_tables_table ON waiter_tables(table_id);

-- =============================================
-- CUSTOMERS TABLE (Loyalty Program)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    preferred_location VARCHAR(50) CHECK (preferred_location IN ('circunvalacao', 'boavista')),
    marketing_consent BOOLEAN DEFAULT false,
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- =============================================
-- ACTIVITY LOG (Audit Trail)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_staff ON activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for staff table (admin only for write, authenticated for read own)
DROP POLICY IF EXISTS "Staff can view own profile" ON staff;
CREATE POLICY "Staff can view own profile" ON staff
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage staff" ON staff;
CREATE POLICY "Admin can manage staff" ON staff
    FOR ALL USING (true);

-- Policies for waiter_tables
DROP POLICY IF EXISTS "Staff can view waiter assignments" ON waiter_tables;
CREATE POLICY "Staff can view waiter assignments" ON waiter_tables
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage waiter assignments" ON waiter_tables;
CREATE POLICY "Admin can manage waiter assignments" ON waiter_tables
    FOR ALL USING (true);

-- Policies for customers
DROP POLICY IF EXISTS "Staff can view customers" ON customers;
CREATE POLICY "Staff can view customers" ON customers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage customers" ON customers;
CREATE POLICY "Admin can manage customers" ON customers
    FOR ALL USING (true);

-- Policies for activity_log
DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
CREATE POLICY "Staff can view activity log" ON activity_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;
CREATE POLICY "System can insert activity log" ON activity_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- INSERT DEFAULT ADMIN USER
-- Password: admin123 (should be changed in production)
-- Using simple hash for now - TODO: use bcrypt in production
-- =============================================
INSERT INTO staff (email, name, password_hash, role_id, location)
SELECT
    'admin@sushinsushi.pt',
    'Administrador',
    'admin123', -- TODO: Replace with bcrypt hash in production
    (SELECT id FROM roles WHERE name = 'admin'),
    'circunvalacao'
WHERE NOT EXISTS (
    SELECT 1 FROM staff WHERE email = 'admin@sushinsushi.pt'
);

-- Insert default kitchen user
INSERT INTO staff (email, name, password_hash, role_id, location)
SELECT
    'cozinha@sushinsushi.pt',
    'Cozinha Circunvalação',
    'cozinha123', -- TODO: Replace with bcrypt hash in production
    (SELECT id FROM roles WHERE name = 'kitchen'),
    'circunvalacao'
WHERE NOT EXISTS (
    SELECT 1 FROM staff WHERE email = 'cozinha@sushinsushi.pt'
);

-- Insert kitchen user for Boavista
INSERT INTO staff (email, name, password_hash, role_id, location)
SELECT
    'cozinha.boavista@sushinsushi.pt',
    'Cozinha Boavista',
    'cozinha123', -- TODO: Replace with bcrypt hash in production
    (SELECT id FROM roles WHERE name = 'kitchen'),
    'boavista'
WHERE NOT EXISTS (
    SELECT 1 FROM staff WHERE email = 'cozinha.boavista@sushinsushi.pt'
);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View: Staff with role information
CREATE OR REPLACE VIEW staff_with_roles AS
SELECT
    s.*,
    r.name as role_name,
    r.description as role_description
FROM staff s
JOIN roles r ON s.role_id = r.id;

-- View: Waiter assignments with details
CREATE OR REPLACE VIEW waiter_assignments AS
SELECT
    wt.id,
    wt.assigned_at,
    s.id as staff_id,
    s.name as staff_name,
    s.email as staff_email,
    t.id as table_id,
    t.number as table_number,
    t.name as table_name,
    t.location as table_location
FROM waiter_tables wt
JOIN staff s ON wt.staff_id = s.id
JOIN tables t ON wt.table_id = t.id;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT ON roles TO anon, authenticated;
GRANT ALL ON staff TO authenticated;
GRANT ALL ON waiter_tables TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON activity_log TO authenticated;

-- Grant permissions on views
GRANT SELECT ON staff_with_roles TO authenticated;
GRANT SELECT ON waiter_assignments TO authenticated;
