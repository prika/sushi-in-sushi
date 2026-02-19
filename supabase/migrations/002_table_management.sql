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
