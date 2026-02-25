-- ============================================================
-- SUSHI IN SUSHI — Database Schema (Consolidated)
-- Generated from migrations 000–061
-- 36 tables, all foreign keys and constraints
-- Use in: dbdiagram.io, DrawSQL, DBeaver, pgModeler, etc.
-- ============================================================

-- ========================
-- CORE TABLES
-- ========================

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- admin, kitchen, waiter, customer
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  location VARCHAR(50), -- CHECK IN ('circunvalacao','boavista')
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  auth_user_id UUID UNIQUE -- FK -> auth.users(id) ON DELETE SET NULL
);

CREATE TABLE kitchen_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  vendus_id VARCHAR(50) UNIQUE,
  vendus_synced_at TIMESTAMPTZ,
  zone_id UUID REFERENCES kitchen_zones(id) ON DELETE SET NULL
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  vendus_store_id VARCHAR(50),
  vendus_register_id VARCHAR(50),
  vendus_enabled BOOLEAN DEFAULT false
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_rodizio BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  image_urls TEXT[],
  quantity INTEGER NOT NULL DEFAULT 1,
  -- Vendus integration
  vendus_id VARCHAR(50),
  vendus_reference VARCHAR(100),
  vendus_tax_id VARCHAR(50),
  vendus_synced_at TIMESTAMPTZ,
  vendus_sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, error, not_applicable
  vendus_ids JSONB DEFAULT '{}',
  -- Location & service
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  service_modes TEXT[] DEFAULT '{}',
  service_prices JSONB DEFAULT '{}'
);

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'available', -- available, reserved, occupied, inactive
  status_note TEXT,
  current_session_id UUID,
  current_reservation_id UUID,
  -- Vendus integration
  vendus_table_id VARCHAR(50),
  vendus_room_id VARCHAR(50),
  vendus_synced_at TIMESTAMPTZ
);

-- ========================
-- SESSIONS & ORDERS
-- ========================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES tables(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  is_rodizio BOOLEAN DEFAULT false,
  num_people INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active', -- active, pending_payment, paid, closed
  notes TEXT,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  bill_requested_at TIMESTAMPTZ,
  time_to_first_order INTEGER, -- seconds
  total_duration INTEGER, -- seconds
  time_ordering INTEGER, -- seconds
  ordering_mode VARCHAR(20) DEFAULT 'client', -- client, waiter_only
  customer_nif VARCHAR(20)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  preferred_location VARCHAR(50), -- circunvalacao, boavista
  marketing_consent BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE session_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  birth_date DATE,
  marketing_consent BOOLEAN DEFAULT false,
  preferred_contact VARCHAR(20) DEFAULT 'email', -- email, phone, none
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_session_host BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Progressive registration
  device_id UUID,
  tier SMALLINT NOT NULL DEFAULT 1, -- 1=Session, 2=Basic, 3=Full, 4=Delivery
  -- Identity verification
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  verification_type VARCHAR(20) -- email, phone
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, preparing, ready, delivered, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  prepared_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  preparing_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ========================
-- WAITER MANAGEMENT
-- ========================

CREATE TABLE waiter_tables (
  id SERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, table_id)
);

CREATE TABLE waiter_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  call_type VARCHAR(50) DEFAULT 'assistance', -- assistance, bill, order, other
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, acknowledged, completed, cancelled
  acknowledged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  location VARCHAR(50) NOT NULL, -- circunvalacao, boavista
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  session_customer_id UUID
);

-- ========================
-- RESERVATIONS
-- ========================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL, -- CHECK >= 1 AND <= 20
  location VARCHAR(50) NOT NULL, -- circunvalacao, boavista
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  is_rodizio BOOLEAN DEFAULT true,
  special_requests TEXT,
  occasion VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
  confirmed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  seated_at TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Email tracking
  customer_email_id VARCHAR(255),
  customer_email_sent_at TIMESTAMPTZ,
  customer_email_delivered_at TIMESTAMPTZ,
  customer_email_opened_at TIMESTAMPTZ,
  customer_email_status VARCHAR(50),
  confirmation_email_id VARCHAR(255),
  confirmation_email_sent_at TIMESTAMPTZ,
  confirmation_email_delivered_at TIMESTAMPTZ,
  confirmation_email_opened_at TIMESTAMPTZ,
  confirmation_email_status VARCHAR(50),
  -- Reminder tracking
  day_before_reminder_id VARCHAR(255),
  day_before_reminder_sent_at TIMESTAMPTZ,
  day_before_reminder_delivered_at TIMESTAMPTZ,
  day_before_reminder_opened_at TIMESTAMPTZ,
  day_before_reminder_status VARCHAR(50),
  same_day_reminder_id VARCHAR(255),
  same_day_reminder_sent_at TIMESTAMPTZ,
  same_day_reminder_delivered_at TIMESTAMPTZ,
  same_day_reminder_opened_at TIMESTAMPTZ,
  same_day_reminder_status VARCHAR(50),
  -- Multi-table assignment
  tables_assigned BOOLEAN DEFAULT false
);

CREATE TABLE reservation_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reservation_id, table_id)
);

CREATE TABLE reservation_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton
  day_before_reminder_enabled BOOLEAN DEFAULT true,
  day_before_reminder_hours INTEGER DEFAULT 24,
  same_day_reminder_enabled BOOLEAN DEFAULT true,
  same_day_reminder_hours INTEGER DEFAULT 2,
  rodizio_waste_policy_enabled BOOLEAN DEFAULT true,
  rodizio_waste_fee_per_piece DECIMAL(10,2) DEFAULT 2.50,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id),
  waiter_alert_minutes INTEGER DEFAULT 60
);

-- ========================
-- RESTAURANTS & CONFIG
-- ========================

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  max_capacity INTEGER NOT NULL, -- CHECK > 0
  default_people_per_table INTEGER NOT NULL DEFAULT 4, -- CHECK > 0
  auto_table_assignment BOOLEAN NOT NULL DEFAULT false,
  auto_reservations BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Order cooldown
  order_cooldown_minutes INTEGER NOT NULL DEFAULT 0,
  -- Progressive registration
  show_upgrade_after_order BOOLEAN NOT NULL DEFAULT false,
  show_upgrade_at_bill BOOLEAN NOT NULL DEFAULT false,
  -- Games
  games_enabled BOOLEAN NOT NULL DEFAULT false,
  games_mode VARCHAR(20) DEFAULT 'selection', -- selection, random
  games_prize_type VARCHAR(30) DEFAULT 'none', -- none, discount_percentage, free_product, free_dinner
  games_prize_value TEXT,
  games_prize_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  games_min_rounds_for_prize INTEGER NOT NULL DEFAULT 1,
  games_questions_per_round INTEGER NOT NULL DEFAULT 6
);

-- ========================
-- STAFF MANAGEMENT
-- ========================

CREATE TABLE staff_time_off (
  id SERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'vacation', -- vacation, sick, personal, other
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'approved', -- pending, approved, rejected
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE TABLE restaurant_closures (
  id SERIAL PRIMARY KEY,
  closure_date DATE NOT NULL,
  location VARCHAR(50), -- circunvalacao, boavista, NULL=all
  reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (closure_date, location)
);

-- ========================
-- ACTIVITY & METRICS
-- ========================

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE table_status_history (
  id SERIAL PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES staff(id),
  reason TEXT,
  reservation_id UUID,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  location VARCHAR(20) NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  rodizio_sessions INTEGER DEFAULT 0,
  carta_sessions INTEGER DEFAULT 0,
  total_covers INTEGER DEFAULT 0,
  avg_time_to_first_order INTEGER,
  avg_session_duration INTEGER,
  avg_rodizio_duration INTEGER,
  avg_carta_duration INTEGER,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_ticket DECIMAL(10,2) DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  confirmed_reservations INTEGER DEFAULT 0,
  cancelled_reservations INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  walk_ins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, location)
);

-- ========================
-- EMAIL TRACKING
-- ========================

CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  email_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  email_type VARCHAR(50),
  recipient_email VARCHAR(255),
  raw_data JSONB,
  event_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- PRODUCT RATINGS
-- ========================

CREATE TABLE product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL, -- CHECK >= 1 AND <= 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  UNIQUE (session_id, session_customer_id, product_id)
);

-- ========================
-- INGREDIENTS
-- ========================

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- UNIQUE on LOWER(name)
  unit TEXT NOT NULL, -- g, kg, ml, L, un
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,3) NOT NULL, -- CHECK > 0
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, ingredient_id)
);

-- ========================
-- GAMES
-- ========================

CREATE TABLE game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(20) NOT NULL, -- tinder, quiz, preference
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer_index SMALLINT,
  option_a JSONB,
  option_b JSONB,
  category VARCHAR(50),
  difficulty SMALLINT DEFAULT 1, -- 1-3
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
  round_number INTEGER DEFAULT 1,
  total_questions INTEGER DEFAULT 6,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_type VARCHAR(20)
);

CREATE TABLE game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  question_id UUID REFERENCES game_questions(id),
  game_type VARCHAR(20) NOT NULL,
  answer JSONB NOT NULL,
  score_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL
  -- CHECK (question_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE TABLE game_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE SET NULL,
  display_name VARCHAR(100) NOT NULL,
  prize_type VARCHAR(30) NOT NULL, -- discount_percentage, free_product, free_dinner
  prize_value TEXT NOT NULL,
  prize_description TEXT,
  total_score INTEGER DEFAULT 0,
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- DEVICE PROFILES (Progressive Registration)
-- ========================

CREATE TABLE device_profiles (
  device_id UUID PRIMARY KEY,
  last_display_name VARCHAR(100),
  last_full_name VARCHAR(200),
  last_email VARCHAR(255),
  last_phone VARCHAR(50),
  last_birth_date DATE,
  last_preferred_contact VARCHAR(20) DEFAULT 'email', -- email, phone, none
  highest_tier SMALLINT NOT NULL DEFAULT 1, -- 1-4
  linked_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  visit_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- IDENTITY VERIFICATION
-- ========================

CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_customer_id UUID REFERENCES session_customers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  verification_type VARCHAR(20) NOT NULL, -- email, phone
  contact_value TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent, verified, expired, failed
  verified_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- VENDUS POS INTEGRATION
-- ========================

CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  vendus_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  vendus_id VARCHAR(50) UNIQUE,
  vendus_document_number VARCHAR(50),
  vendus_document_type VARCHAR(20) DEFAULT 'FR', -- FR, FT, FS
  vendus_series VARCHAR(20),
  vendus_hash VARCHAR(255),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_method_id INTEGER REFERENCES payment_methods(id),
  paid_amount DECIMAL(10,2),
  change_amount DECIMAL(10,2) DEFAULT 0,
  customer_nif VARCHAR(20),
  customer_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, issued, voided, error
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES staff(id),
  void_reason TEXT,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  issued_by UUID REFERENCES staff(id),
  error_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendus_sync_log (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL, -- push, pull, both
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  vendus_id VARCHAR(100),
  location_id UUID,
  status VARCHAR(20) NOT NULL, -- started, success, error, partial
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  request_data JSONB,
  response_data JSONB,
  initiated_by UUID REFERENCES staff(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE TABLE vendus_retry_queue (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  location_id UUID,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
