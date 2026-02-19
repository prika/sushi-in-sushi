-- =============================================
-- SUSHI IN SUSHI - BASE SCHEMA
-- Migration: 000_base_schema.sql
-- =============================================
-- Creates the 5 core restaurant tables that all other migrations depend on.
-- These tables were originally created via Supabase Dashboard and never had
-- a migration file. This migration formalizes them.
--
-- Must run BEFORE migration 001_user_management.sql
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- =============================================
-- TABLES (restaurant tables/mesas)
-- =============================================
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_location ON tables(location);
CREATE INDEX IF NOT EXISTS idx_tables_number ON tables(number);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_rodizio BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

-- =============================================
-- SESSIONS (table sessions / mesas abertas)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    is_rodizio BOOLEAN DEFAULT false,
    num_people INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'ordering', 'closed', 'billing')),
    notes TEXT,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_table ON sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- =============================================
-- ORDERS (pedidos)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =============================================
-- ROW LEVEL SECURITY (base tables)
-- =============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Categories: anyone can read
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
CREATE POLICY "Admin can manage categories" ON categories
    FOR ALL USING (true);

-- Tables: anyone can read
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
CREATE POLICY "Anyone can view tables" ON tables
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage tables" ON tables;
CREATE POLICY "Admin can manage tables" ON tables
    FOR ALL USING (true);

-- Products: anyone can read
DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage products" ON products;
CREATE POLICY "Admin can manage products" ON products
    FOR ALL USING (true);

-- Sessions: staff can manage
DROP POLICY IF EXISTS "Staff can view sessions" ON sessions;
CREATE POLICY "Staff can view sessions" ON sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage sessions" ON sessions;
CREATE POLICY "Staff can manage sessions" ON sessions
    FOR ALL USING (true);

-- Orders: staff can manage
DROP POLICY IF EXISTS "Staff can view orders" ON orders;
CREATE POLICY "Staff can view orders" ON orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage orders" ON orders;
CREATE POLICY "Staff can manage orders" ON orders
    FOR ALL USING (true);

-- =============================================
-- GRANTS
-- =============================================
GRANT SELECT ON categories TO anon, authenticated;
GRANT ALL ON categories TO authenticated;
GRANT SELECT ON tables TO anon, authenticated;
GRANT ALL ON tables TO authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON sessions TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
