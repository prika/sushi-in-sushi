-- =============================================
-- RESERVATION TABLE ASSIGNMENT
-- Migration: 058_reservation_table_assignment.sql
-- =============================================
-- Adds waiter alert timing setting, junction table for multi-table
-- reservations, and a flag to track assignment status.

-- 1. Setting: minutos antes da reserva para alertar waiter
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS waiter_alert_minutes INTEGER DEFAULT 60;

-- 2. Tabela junção: reserva → múltiplas mesas
CREATE TABLE IF NOT EXISTS reservation_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reservation_id, table_id)
);
CREATE INDEX IF NOT EXISTS idx_reservation_tables_reservation ON reservation_tables(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_tables_table ON reservation_tables(table_id);

-- 3. Flag na reserva para filtrar rápido as que faltam atribuir
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS tables_assigned BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_reservations_unassigned ON reservations(reservation_date, status)
  WHERE tables_assigned = false AND status = 'confirmed';

-- 4. RLS + grants
ALTER TABLE reservation_tables ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'view_reservation_tables') THEN
    CREATE POLICY "view_reservation_tables" ON reservation_tables FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'insert_reservation_tables') THEN
    CREATE POLICY "insert_reservation_tables" ON reservation_tables FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_tables' AND policyname = 'delete_reservation_tables') THEN
    CREATE POLICY "delete_reservation_tables" ON reservation_tables FOR DELETE USING (true);
  END IF;
END$$;
GRANT ALL ON reservation_tables TO anon, authenticated;
