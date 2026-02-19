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

-- Insert default waiter user
INSERT INTO staff (email, name, password_hash, role_id, location)
SELECT
    'empregado@sushinsushi.pt',
    'Empregado Circunvalação',
    'empregado123', -- TODO: Replace with bcrypt hash in production
    (SELECT id FROM roles WHERE name = 'waiter'),
    'circunvalacao'
WHERE NOT EXISTS (
    SELECT 1 FROM staff WHERE email = 'empregado@sushinsushi.pt'
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
-- =============================================
-- SUSHI IN SUSHI - TABLE MANAGEMENT IMPROVEMENTS
-- Migration: 002_table_management.sql
-- =============================================

-- 1. Adicionar campos de estado à tabela tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';
-- Estados: 'available', 'reserved', 'occupied', 'inactive'

ALTER TABLE tables ADD COLUMN IF NOT EXISTS status_note TEXT;
-- Nota sobre o estado (ex: "Manutenção até 15/02")

ALTER TABLE tables ADD COLUMN IF NOT EXISTS current_session_id UUID;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS current_reservation_id UUID;

-- 2. Adicionar campos de métricas à tabela sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS bill_requested_at TIMESTAMP WITH TIME ZONE;

-- Campos calculados (preenchidos ao fechar)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS time_to_first_order INTEGER;  -- segundos
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_duration INTEGER;  -- segundos
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS time_ordering INTEGER;  -- segundos entre primeiro e último pedido

-- 3. Tabela de histórico de estados das mesas (auditoria)
CREATE TABLE IF NOT EXISTS table_status_history (
  id SERIAL PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES staff(id),
  reason TEXT,
  reservation_id UUID,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_history_table ON table_status_history(table_id);
CREATE INDEX IF NOT EXISTS idx_table_history_created ON table_status_history(created_at);

-- 4. Tabela agregada de métricas diárias (para relatórios rápidos)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  location VARCHAR(20) NOT NULL,

  -- Contagens
  total_sessions INTEGER DEFAULT 0,
  rodizio_sessions INTEGER DEFAULT 0,
  carta_sessions INTEGER DEFAULT 0,
  total_covers INTEGER DEFAULT 0,  -- número de pessoas

  -- Tempos médios (em segundos)
  avg_time_to_first_order INTEGER,
  avg_session_duration INTEGER,
  avg_rodizio_duration INTEGER,
  avg_carta_duration INTEGER,

  -- Valores
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_ticket DECIMAL(10,2) DEFAULT 0,

  -- Reservas
  total_reservations INTEGER DEFAULT 0,
  confirmed_reservations INTEGER DEFAULT 0,
  cancelled_reservations INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  walk_ins INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(date, location)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_location ON daily_metrics(location, date);

-- 5. Trigger para atualizar first_order_at automaticamente
CREATE OR REPLACE FUNCTION update_session_first_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é o primeiro pedido da sessão
  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE session_id = NEW.session_id
    AND id != NEW.id
  ) THEN
    UPDATE sessions
    SET first_order_at = NEW.created_at
    WHERE id = NEW.session_id
    AND first_order_at IS NULL;
  END IF;

  -- Sempre atualiza last_order_at
  UPDATE sessions
  SET last_order_at = NEW.created_at
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_first_order ON orders;
CREATE TRIGGER trigger_update_session_first_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_session_first_order();

-- 6. Função para calcular métricas ao fechar sessão
CREATE OR REPLACE FUNCTION calculate_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Só calcula quando fecha a sessão
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, NOW());

    -- Tempo até primeiro pedido
    IF NEW.first_order_at IS NOT NULL THEN
      NEW.time_to_first_order := EXTRACT(EPOCH FROM (NEW.first_order_at - NEW.started_at))::INTEGER;
    END IF;

    -- Duração total
    NEW.total_duration := EXTRACT(EPOCH FROM (NEW.closed_at - NEW.started_at))::INTEGER;

    -- Tempo a fazer pedidos
    IF NEW.first_order_at IS NOT NULL AND NEW.last_order_at IS NOT NULL THEN
      NEW.time_ordering := EXTRACT(EPOCH FROM (NEW.last_order_at - NEW.first_order_at))::INTEGER;
    END IF;

    -- Libertar a mesa
    UPDATE tables
    SET status = 'available',
        current_session_id = NULL
    WHERE current_session_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_session_metrics ON sessions;
CREATE TRIGGER trigger_calculate_session_metrics
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_metrics();

-- 7. Função para atualizar estado da mesa quando sessão inicia
CREATE OR REPLACE FUNCTION update_table_on_session_start()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tables
  SET status = 'occupied',
      current_session_id = NEW.id
  WHERE id = NEW.table_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_on_session_start ON sessions;
CREATE TRIGGER trigger_update_table_on_session_start
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_table_on_session_start();

-- 8. View de mesas com estado completo
CREATE OR REPLACE VIEW tables_full_status AS
SELECT
  t.*,
  s.id as session_id,
  s.started_at as session_started,
  s.is_rodizio,
  s.num_people as session_people,
  s.total_amount as session_total,
  CASE
    WHEN t.status = 'inactive' THEN 'Inativa'
    WHEN t.status = 'occupied' THEN 'Ocupada'
    WHEN t.status = 'reserved' THEN 'Reservada'
    ELSE 'Livre'
  END as status_label,
  CASE
    WHEN t.status = 'occupied' AND s.started_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (NOW() - s.started_at))::INTEGER / 60
    ELSE NULL
  END as minutes_occupied
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id AND s.status = 'active';

-- 9. View de métricas agregadas
CREATE OR REPLACE VIEW session_metrics_summary AS
SELECT
  t.location,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE s.is_rodizio) as rodizio_count,
  COUNT(*) FILTER (WHERE NOT s.is_rodizio) as carta_count,
  COALESCE(SUM(s.num_people), 0) as total_covers,
  ROUND(AVG(s.time_to_first_order)) as avg_time_to_first_order,
  ROUND(AVG(s.total_duration)) as avg_duration,
  ROUND(AVG(s.total_duration) FILTER (WHERE s.is_rodizio)) as avg_rodizio_duration,
  ROUND(AVG(s.total_duration) FILTER (WHERE NOT s.is_rodizio)) as avg_carta_duration,
  COALESCE(SUM(s.total_amount), 0) as total_revenue,
  ROUND(AVG(s.total_amount), 2) as avg_ticket
FROM sessions s
JOIN tables t ON s.table_id = t.id
WHERE s.status = 'closed'
  AND s.closed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.location;

-- 10. Função para obter métricas de um período
CREATE OR REPLACE FUNCTION get_session_metrics(
  p_location VARCHAR(20) DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - 7,
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_sessions,
      COALESCE(SUM(s.num_people), 0) as total_covers,
      ROUND(AVG(s.time_to_first_order)) as avg_first_order,
      ROUND(AVG(s.total_duration)) as avg_duration,
      ROUND(AVG(s.total_duration) FILTER (WHERE s.is_rodizio)) as avg_rodizio,
      ROUND(AVG(s.total_duration) FILTER (WHERE NOT s.is_rodizio)) as avg_carta,
      ROUND(AVG(s.total_amount), 2) as avg_ticket,
      COALESCE(SUM(s.total_amount), 0) as total_revenue
    FROM sessions s
    JOIN tables t ON s.table_id = t.id
    WHERE s.status = 'closed'
      AND s.closed_at::date BETWEEN p_start_date AND p_end_date
      AND (p_location IS NULL OR t.location = p_location)
  )
  SELECT 'Total de Sessões'::TEXT, total_sessions::TEXT FROM stats
  UNION ALL
  SELECT 'Total de Pessoas'::TEXT, total_covers::TEXT FROM stats
  UNION ALL
  SELECT 'Tempo Médio até 1º Pedido'::TEXT,
    CONCAT(COALESCE(ROUND(avg_first_order/60), 0)::TEXT, ' min ', COALESCE(ROUND(avg_first_order::integer % 60), 0)::TEXT, ' seg') FROM stats
  UNION ALL
  SELECT 'Duração Média da Sessão'::TEXT,
    CONCAT(COALESCE(ROUND(avg_duration/60), 0)::TEXT, ' min') FROM stats
  UNION ALL
  SELECT 'Duração Média Rodízio'::TEXT,
    CONCAT(COALESCE(ROUND(avg_rodizio/60), 0)::TEXT, ' min') FROM stats
  UNION ALL
  SELECT 'Duração Média À Carta'::TEXT,
    CONCAT(COALESCE(ROUND(avg_carta/60), 0)::TEXT, ' min') FROM stats
  UNION ALL
  SELECT 'Ticket Médio'::TEXT, CONCAT('€', COALESCE(avg_ticket, 0)::TEXT) FROM stats
  UNION ALL
  SELECT 'Receita Total'::TEXT, CONCAT('€', COALESCE(total_revenue, 0)::TEXT) FROM stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE table_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for table_status_history
DROP POLICY IF EXISTS "Staff can view table history" ON table_status_history;
CREATE POLICY "Staff can view table history" ON table_status_history
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can insert table history" ON table_status_history;
CREATE POLICY "Staff can insert table history" ON table_status_history
    FOR INSERT WITH CHECK (true);

-- Policies for daily_metrics
DROP POLICY IF EXISTS "Staff can view daily metrics" ON daily_metrics;
CREATE POLICY "Staff can view daily metrics" ON daily_metrics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage daily metrics" ON daily_metrics;
CREATE POLICY "Admin can manage daily metrics" ON daily_metrics
    FOR ALL USING (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON table_status_history TO authenticated;
GRANT ALL ON daily_metrics TO authenticated;
GRANT SELECT ON tables_full_status TO authenticated;
GRANT SELECT ON session_metrics_summary TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- =============================================
-- SUSHI IN SUSHI - RESERVATIONS SYSTEM
-- Migration: 003_reservations.sql
-- =============================================

-- =============================================
-- RESERVATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Customer info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Reservation details
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),

    -- Location and table
    location VARCHAR(50) NOT NULL CHECK (location IN ('circunvalacao', 'boavista')),
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

    -- Service type preference
    is_rodizio BOOLEAN DEFAULT true,

    -- Special requests
    special_requests TEXT,
    occasion VARCHAR(50), -- 'birthday', 'anniversary', 'business', 'other'

    -- Status management
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

    -- Staff assignment
    confirmed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Cancellation info
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Linked session (when reservation is seated)
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    seated_at TIMESTAMP WITH TIME ZONE,

    -- Marketing consent
    marketing_consent BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_location ON reservations(location);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(phone);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, reservation_time);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can create a reservation (for the public form)
DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can view all reservations
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
CREATE POLICY "Staff can view reservations" ON reservations
    FOR SELECT USING (true);

-- Staff can update reservations
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
CREATE POLICY "Staff can update reservations" ON reservations
    FOR UPDATE USING (true);

-- Admin can delete reservations
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;
CREATE POLICY "Admin can delete reservations" ON reservations
    FOR DELETE USING (true);

-- =============================================
-- VIEWS
-- =============================================

-- Drop existing view first to avoid column name conflicts
DROP VIEW IF EXISTS reservations_with_details CASCADE;

-- Reservations with table info
CREATE VIEW reservations_with_details AS
SELECT
    r.*,
    t.number as table_number,
    t.name as table_name,
    s.name as confirmed_by_name,
    CONCAT(r.first_name, ' ', r.last_name) as customer_name,
    CASE
        WHEN r.status = 'pending' THEN 'Pendente'
        WHEN r.status = 'confirmed' THEN 'Confirmada'
        WHEN r.status = 'cancelled' THEN 'Cancelada'
        WHEN r.status = 'completed' THEN 'Concluída'
        WHEN r.status = 'no_show' THEN 'Não Compareceu'
        ELSE r.status
    END as status_label
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN staff s ON r.confirmed_by = s.id;

-- Today's reservations
CREATE OR REPLACE VIEW todays_reservations AS
SELECT * FROM reservations_with_details
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check table availability for a given time slot
CREATE OR REPLACE FUNCTION check_table_availability(
    p_location VARCHAR(50),
    p_date DATE,
    p_time TIME,
    p_party_size INTEGER,
    p_duration_minutes INTEGER DEFAULT 120
)
RETURNS TABLE (
    table_id UUID,
    table_number INTEGER,
    table_name VARCHAR(255),
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id as table_id,
        t.number as table_number,
        t.name as table_name,
        NOT EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.table_id = t.id
            AND r.reservation_date = p_date
            AND r.status IN ('pending', 'confirmed')
            AND (
                (r.reservation_time, r.reservation_time + (p_duration_minutes * INTERVAL '1 minute'))
                OVERLAPS
                (p_time, p_time + (p_duration_minutes * INTERVAL '1 minute'))
            )
        ) as is_available
    FROM tables t
    WHERE t.location = p_location
    AND t.is_active = true
    AND (t.status IS NULL OR t.status != 'inactive')
    ORDER BY t.number;
END;
$$ LANGUAGE plpgsql;

-- Get available time slots for a date
CREATE OR REPLACE FUNCTION get_available_slots(
    p_location VARCHAR(50),
    p_date DATE,
    p_party_size INTEGER
)
RETURNS TABLE (
    slot_time TIME,
    tables_available INTEGER
) AS $$
DECLARE
    v_start_time TIME := '12:00:00';
    v_end_time TIME := '22:00:00';
    v_slot_interval INTERVAL := '30 minutes';
    v_current_time TIME;
BEGIN
    v_current_time := v_start_time;

    WHILE v_current_time <= v_end_time LOOP
        RETURN QUERY
        SELECT
            v_current_time as slot_time,
            (
                SELECT COUNT(*)::INTEGER
                FROM check_table_availability(p_location, p_date, v_current_time, p_party_size)
                WHERE is_available = true
            ) as tables_available;

        v_current_time := v_current_time + v_slot_interval;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON reservations TO anon;
GRANT ALL ON reservations TO authenticated;
GRANT SELECT ON reservations_with_details TO authenticated;
GRANT SELECT ON todays_reservations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
-- =============================================
-- SUSHI IN SUSHI - EMAIL TRACKING
-- Migration: 004_email_tracking.sql
-- =============================================

-- =============================================
-- ADD EMAIL TRACKING COLUMNS TO RESERVATIONS
-- =============================================

-- Email tracking for customer confirmation email
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email_status VARCHAR(50) DEFAULT NULL;

-- Email tracking for confirmation email (when admin confirms)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_id VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR(50) DEFAULT NULL;

-- Email status values: 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'

-- =============================================
-- EMAIL EVENTS LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to reservation
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,

    -- Resend email ID
    email_id VARCHAR(255) NOT NULL,

    -- Event type: 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
    event_type VARCHAR(50) NOT NULL,

    -- Email type: 'customer_confirmation', 'reservation_confirmed', 'restaurant_notification'
    email_type VARCHAR(50),

    -- Recipient email
    recipient_email VARCHAR(255),

    -- Raw event data from Resend webhook
    raw_data JSONB,

    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_email_events_reservation ON email_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Staff can view email events
DROP POLICY IF EXISTS "Staff can view email events" ON email_events;
CREATE POLICY "Staff can view email events" ON email_events
    FOR SELECT USING (true);

-- System can insert email events (via service role)
DROP POLICY IF EXISTS "System can insert email events" ON email_events;
CREATE POLICY "System can insert email events" ON email_events
    FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATE VIEW TO INCLUDE EMAIL STATUS
-- =============================================
DROP VIEW IF EXISTS todays_reservations;
DROP VIEW IF EXISTS reservations_with_details;

CREATE OR REPLACE VIEW reservations_with_details AS
SELECT
    r.*,
    t.number as table_number,
    t.name as table_name,
    s.name as confirmed_by_name,
    CONCAT(r.first_name, ' ', r.last_name) as customer_name,
    CASE
        WHEN r.status = 'pending' THEN 'Pendente'
        WHEN r.status = 'confirmed' THEN 'Confirmada'
        WHEN r.status = 'cancelled' THEN 'Cancelada'
        WHEN r.status = 'completed' THEN 'Concluída'
        WHEN r.status = 'no_show' THEN 'Não Compareceu'
        ELSE r.status
    END as status_label,
    CASE
        WHEN r.customer_email_opened_at IS NOT NULL THEN 'opened'
        WHEN r.customer_email_delivered_at IS NOT NULL THEN 'delivered'
        WHEN r.customer_email_sent_at IS NOT NULL THEN 'sent'
        ELSE 'not_sent'
    END as email_status_label
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN staff s ON r.confirmed_by = s.id;

-- Recreate today's reservations view
CREATE OR REPLACE VIEW todays_reservations AS
SELECT * FROM reservations_with_details
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON email_events TO authenticated;
GRANT SELECT ON reservations_with_details TO authenticated;
GRANT SELECT ON todays_reservations TO authenticated;
-- Migration: Restaurant Closures / Days Off
-- This table stores dates when the restaurant is closed (holidays, maintenance, etc.)

-- Create restaurant_closures table
CREATE TABLE IF NOT EXISTS restaurant_closures (
    id SERIAL PRIMARY KEY,
    closure_date DATE NOT NULL,
    location VARCHAR(50) CHECK (location IN ('circunvalacao', 'boavista', NULL)),
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_day_of_week INTEGER CHECK (recurring_day_of_week >= 0 AND recurring_day_of_week <= 6),
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one closure per date per location (NULL location = both)
    CONSTRAINT unique_closure_date_location UNIQUE (closure_date, location)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_closures_date ON restaurant_closures(closure_date);
CREATE INDEX IF NOT EXISTS idx_closures_location ON restaurant_closures(location);
CREATE INDEX IF NOT EXISTS idx_closures_recurring ON restaurant_closures(is_recurring, recurring_day_of_week);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_closures_updated_at ON restaurant_closures;
CREATE TRIGGER trigger_closures_updated_at
    BEFORE UPDATE ON restaurant_closures
    FOR EACH ROW
    EXECUTE FUNCTION update_closures_updated_at();

-- Function to check if a date is closed for a location
CREATE OR REPLACE FUNCTION is_date_closed(
    check_date DATE,
    check_location VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
    is_closed BOOLEAN := false;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date)::INTEGER;

    -- Check for specific date closure (for this location or all locations)
    SELECT EXISTS (
        SELECT 1 FROM restaurant_closures
        WHERE closure_date = check_date
        AND (location = check_location OR location IS NULL)
        AND (is_recurring = false OR is_recurring IS NULL)
    ) INTO is_closed;

    IF is_closed THEN
        RETURN true;
    END IF;

    -- Check for recurring weekly closure (for this location or all locations)
    SELECT EXISTS (
        SELECT 1 FROM restaurant_closures
        WHERE is_recurring = true
        AND recurring_day_of_week = day_of_week
        AND (location = check_location OR location IS NULL)
    ) INTO is_closed;

    RETURN is_closed;
END;
$$ LANGUAGE plpgsql;

-- Function to get closure reason for a date
CREATE OR REPLACE FUNCTION get_closure_reason(
    check_date DATE,
    check_location VARCHAR(50)
)
RETURNS TEXT AS $$
DECLARE
    closure_reason TEXT;
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date)::INTEGER;

    -- First check specific date closure
    SELECT reason INTO closure_reason
    FROM restaurant_closures
    WHERE closure_date = check_date
    AND (location = check_location OR location IS NULL)
    AND (is_recurring = false OR is_recurring IS NULL)
    LIMIT 1;

    IF closure_reason IS NOT NULL THEN
        RETURN closure_reason;
    END IF;

    -- Then check recurring closure
    SELECT reason INTO closure_reason
    FROM restaurant_closures
    WHERE is_recurring = true
    AND recurring_day_of_week = day_of_week
    AND (location = check_location OR location IS NULL)
    LIMIT 1;

    RETURN closure_reason;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE restaurant_closures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read for authenticated users"
    ON restaurant_closures FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read for anon (for reservation form)"
    ON restaurant_closures FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert/update/delete for admin"
    ON restaurant_closures FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN roles r ON s.role_id = r.id
            WHERE s.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Add some comments
COMMENT ON TABLE restaurant_closures IS 'Stores restaurant closure dates (holidays, days off, maintenance)';
COMMENT ON COLUMN restaurant_closures.location IS 'NULL means closure applies to all locations';
COMMENT ON COLUMN restaurant_closures.is_recurring IS 'If true, closure repeats every week on recurring_day_of_week';
COMMENT ON COLUMN restaurant_closures.recurring_day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
-- =============================================
-- SUSHI IN SUSHI - WAITER CALLS SYSTEM
-- Migration: 007_waiter_calls.sql
-- =============================================

-- =============================================
-- WAITER CALLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS waiter_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which table is calling
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

    -- Call details
    call_type VARCHAR(50) DEFAULT 'assistance' CHECK (call_type IN ('assistance', 'bill', 'order', 'other')),
    message TEXT,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),

    -- Who responded
    acknowledged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Location for filtering
    location VARCHAR(50) NOT NULL CHECK (location IN ('circunvalacao', 'boavista')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_waiter_calls_table ON waiter_calls(table_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_session ON waiter_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_location ON waiter_calls(location);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_created ON waiter_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_pending ON waiter_calls(location, status) WHERE status = 'pending';

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_waiter_calls_updated_at ON waiter_calls;
CREATE TRIGGER update_waiter_calls_updated_at
    BEFORE UPDATE ON waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;

-- Anyone can create a waiter call (from the public table ordering page)
DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Anyone can view waiter calls (needed for real-time updates on customer side)
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
CREATE POLICY "Anyone can view waiter calls" ON waiter_calls
    FOR SELECT USING (true);

-- Staff can update waiter calls (acknowledge, complete)
DROP POLICY IF EXISTS "Staff can update waiter calls" ON waiter_calls;
CREATE POLICY "Staff can update waiter calls" ON waiter_calls
    FOR UPDATE USING (true);

-- =============================================
-- VIEW: WAITER CALLS WITH DETAILS
-- =============================================
CREATE OR REPLACE VIEW waiter_calls_with_details AS
SELECT
    wc.*,
    t.number as table_number,
    t.name as table_name,
    s.name as acknowledged_by_name,
    wa.staff_name as assigned_waiter_name,
    wa.staff_id as assigned_waiter_id
FROM waiter_calls wc
JOIN tables t ON wc.table_id = t.id
LEFT JOIN staff s ON wc.acknowledged_by = s.id
LEFT JOIN waiter_assignments wa ON wc.table_id = wa.table_id;

-- =============================================
-- VIEW: TABLES WITH ASSIGNED WAITER
-- =============================================
CREATE OR REPLACE VIEW tables_with_waiter AS
SELECT
    t.*,
    wa.staff_id as waiter_id,
    wa.staff_name as waiter_name,
    wa.staff_email as waiter_email,
    wa.assigned_at as waiter_assigned_at
FROM tables t
LEFT JOIN waiter_assignments wa ON t.id = wa.table_id;

-- =============================================
-- FIX: RLS POLICIES FOR PUBLIC ORDERING
-- Sessions and orders need to allow anonymous access for the QR code ordering page
-- =============================================

-- Sessions policies (for public ordering)
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
CREATE POLICY "Anyone can view sessions" ON sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
CREATE POLICY "Anyone can update sessions" ON sessions
    FOR UPDATE USING (true);

-- Orders policies (for public ordering)
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders
    FOR SELECT USING (true);

-- Tables policies (for public ordering - need to read table info)
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
CREATE POLICY "Anyone can view tables" ON tables
    FOR SELECT USING (true);

-- Products/Categories policies (for public ordering - need to read menu)
DROP POLICY IF EXISTS "Anyone can view products" ON products;
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON waiter_calls TO anon, authenticated;
GRANT SELECT ON waiter_calls_with_details TO anon, authenticated;
GRANT SELECT ON tables_with_waiter TO anon, authenticated;

-- Enable realtime for waiter_calls (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'waiter_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
    END IF;
END $$;
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
-- =============================================
-- ADD ORDER_ID TO WAITER_CALLS
-- Links kitchen notifications to specific orders
-- =============================================

-- Add order_id column to waiter_calls
-- Note: orders.id is INTEGER in this database
ALTER TABLE waiter_calls
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Create index for order lookups
CREATE INDEX IF NOT EXISTS idx_waiter_calls_order ON waiter_calls(order_id) WHERE order_id IS NOT NULL;

-- =============================================
-- UPDATE VIEW
-- =============================================
DROP VIEW IF EXISTS waiter_calls_with_details;
CREATE VIEW waiter_calls_with_details AS
SELECT
    wc.*,
    t.number as table_number,
    t.name as table_name,
    s.id as waiter_id,
    s.name as waiter_name,
    o.status as order_status,
    o.product_id,
    p.name as product_name
FROM waiter_calls wc
LEFT JOIN tables t ON wc.table_id = t.id
LEFT JOIN staff s ON wc.acknowledged_by = s.id
LEFT JOIN orders o ON wc.order_id = o.id
LEFT JOIN products p ON o.product_id = p.id;

-- Grant permissions
GRANT SELECT ON waiter_calls_with_details TO anon, authenticated;
-- =============================================
-- FIX: ADD UPDATE POLICY FOR ORDERS
-- Without this policy, order status updates are blocked by RLS
-- =============================================

-- Allow anyone to update orders (for kitchen and waiter panels)
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
CREATE POLICY "Anyone can update orders" ON orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- Also add DELETE policy for order cancellation
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;
CREATE POLICY "Anyone can delete orders" ON orders
    FOR DELETE USING (true);
-- =============================================
-- SUPABASE AUTH INTEGRATION FOR STAFF
-- Migration: 011_supabase_auth_integration.sql
-- =============================================

-- 0. Drop views that depend on staff table (they use SELECT *)
-- These will be recreated after the column is added
DROP VIEW IF EXISTS staff_with_roles CASCADE;
DROP VIEW IF EXISTS waiter_assignments CASCADE;

-- 1. Add auth_user_id column to link staff to auth.users
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);

-- 3. Function to get current staff record by auth.uid()
CREATE OR REPLACE FUNCTION get_current_staff()
RETURNS SETOF staff AS $$
  SELECT * FROM staff
  WHERE auth_user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Function to get current staff role name
CREATE OR REPLACE FUNCTION get_current_staff_role()
RETURNS VARCHAR AS $$
  SELECT r.name
  FROM staff s
  JOIN roles r ON s.role_id = r.id
  WHERE s.auth_user_id = auth.uid()
  AND s.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Function to get current staff location
CREATE OR REPLACE FUNCTION get_current_staff_location()
RETURNS VARCHAR AS $$
  SELECT s.location
  FROM staff s
  WHERE s.auth_user_id = auth.uid()
  AND s.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_current_staff_role() = 'admin', false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Function to check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION current_user_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_current_staff_role() = ANY(allowed_roles), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. Function to check if current user is staff (any role)
CREATE OR REPLACE FUNCTION is_current_user_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- RECREATE VIEWS
-- =============================================

-- Recreate staff_with_roles view (from 001_user_management.sql)
CREATE OR REPLACE VIEW staff_with_roles AS
SELECT
    s.*,
    r.name as role_name,
    r.description as role_description
FROM staff s
JOIN roles r ON s.role_id = r.id;

-- Recreate waiter_assignments view (from 001_user_management.sql)
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

-- Grant permissions on recreated views
GRANT SELECT ON staff_with_roles TO authenticated;
GRANT SELECT ON waiter_assignments TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN staff.auth_user_id IS 'Link to Supabase Auth user (auth.users table)';
COMMENT ON FUNCTION get_current_staff() IS 'Returns the staff record for the currently authenticated user';
COMMENT ON FUNCTION get_current_staff_role() IS 'Returns the role name (admin/kitchen/waiter) for the current user';
COMMENT ON FUNCTION is_current_user_admin() IS 'Returns true if the current user is an admin';
COMMENT ON FUNCTION current_user_has_role(TEXT[]) IS 'Returns true if the current user has any of the specified roles';
COMMENT ON FUNCTION is_current_user_staff() IS 'Returns true if the current user is an active staff member';
-- =============================================
-- UPDATE RLS POLICIES FOR SUPABASE AUTH
-- Migration: 012_update_rls_policies_supabase_auth.sql
-- =============================================
--
-- This migration updates RLS policies to use the Supabase Auth helper
-- functions created in migration 011.
--
-- IMPORTANT: Only apply this migration AFTER:
-- 1. All staff users have been migrated to Supabase Auth (auth_user_id set)
-- 2. The feature flag NEXT_PUBLIC_USE_SUPABASE_AUTH is set to true
--
-- The policies are designed to:
-- - Allow read access for most tables (needed for customer-facing features)
-- - Restrict write access to authenticated staff
-- - Restrict sensitive operations to admins
-- =============================================

-- =============================================
-- STAFF TABLE POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view own profile" ON staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON staff;

-- New policies using auth functions
CREATE POLICY "Authenticated staff can view staff" ON staff
    FOR SELECT USING (
        is_current_user_staff() OR auth.role() = 'anon'
    );

CREATE POLICY "Admin can manage staff" ON staff
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- WAITER_TABLES POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view waiter assignments" ON waiter_tables;
DROP POLICY IF EXISTS "Admin can manage waiter assignments" ON waiter_tables;

CREATE POLICY "Staff can view waiter assignments" ON waiter_tables
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage waiter assignments" ON waiter_tables
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- ACTIVITY_LOG POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;

CREATE POLICY "Staff can view activity log" ON activity_log
    FOR SELECT USING (is_current_user_staff());

CREATE POLICY "Anyone can insert activity log" ON activity_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- RESERVATIONS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can create reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;

-- Anyone can create reservations (public form)
CREATE POLICY "Anyone can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Staff can view and update reservations
CREATE POLICY "Staff can view reservations" ON reservations
    FOR SELECT USING (is_current_user_staff() OR auth.role() = 'anon');

CREATE POLICY "Staff can update reservations" ON reservations
    FOR UPDATE USING (is_current_user_staff());

-- Admin can delete reservations
CREATE POLICY "Admin can delete reservations" ON reservations
    FOR DELETE USING (is_current_user_admin());

-- =============================================
-- RESTAURANT_CLOSURES POLICIES
-- =============================================

DROP POLICY IF EXISTS "Allow read for authenticated users" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow read for anon (for reservation form)" ON restaurant_closures;
DROP POLICY IF EXISTS "Allow insert/update/delete for admin" ON restaurant_closures;

-- Anyone can read closures (needed for reservation form)
CREATE POLICY "Anyone can read closures" ON restaurant_closures
    FOR SELECT USING (true);

-- Admin can manage closures
CREATE POLICY "Admin can manage closures" ON restaurant_closures
    FOR ALL USING (is_current_user_admin());

-- =============================================
-- WAITER_CALLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can create waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Anyone can view waiter calls" ON waiter_calls;
DROP POLICY IF EXISTS "Staff can update waiter calls" ON waiter_calls;

-- Customers can create waiter calls
CREATE POLICY "Anyone can create waiter calls" ON waiter_calls
    FOR INSERT WITH CHECK (true);

-- Anyone can view waiter calls
CREATE POLICY "Anyone can view waiter calls" ON waiter_calls
    FOR SELECT USING (true);

-- Staff can update waiter calls
CREATE POLICY "Staff can update waiter calls" ON waiter_calls
    FOR UPDATE USING (is_current_user_staff() OR true);

-- Staff can delete waiter calls
CREATE POLICY "Staff can delete waiter calls" ON waiter_calls
    FOR DELETE USING (is_current_user_staff() OR true);

-- =============================================
-- EMAIL_EVENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Staff can view email events" ON email_events;
DROP POLICY IF EXISTS "System can insert email events" ON email_events;

CREATE POLICY "Staff can view email events" ON email_events
    FOR SELECT USING (is_current_user_staff());

CREATE POLICY "System can insert email events" ON email_events
    FOR INSERT WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Authenticated staff can view staff" ON staff IS
    'Staff members can view other staff records, anon can also view for public data';

COMMENT ON POLICY "Admin can manage staff" ON staff IS
    'Only admins can create, update, or delete staff records';

COMMENT ON POLICY "Staff can view activity log" ON activity_log IS
    'Only authenticated staff can view the activity log';

-- =============================================
-- NOTE: The following tables keep their current permissive policies
-- because they need to be accessible from the customer-facing app:
-- - tables (view only)
-- - products (view only)
-- - categories (view only)
-- - orders (view, create, update)
-- - sessions (view, create, update)
-- - session_customers (all operations)
-- =============================================
