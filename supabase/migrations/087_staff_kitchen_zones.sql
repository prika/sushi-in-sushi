-- Migration 087: Staff kitchen zone assignments + restaurant print configuration
-- Allows assigning kitchen staff to specific zones and configuring zone-based printing

-- ─── staff_kitchen_zones junction table ──────────────────────────────────────
-- Follows the same pattern as waiter_tables

CREATE TABLE IF NOT EXISTS staff_kitchen_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES kitchen_zones(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_skz_staff ON staff_kitchen_zones(staff_id);
CREATE INDEX IF NOT EXISTS idx_skz_zone ON staff_kitchen_zones(zone_id);

-- RLS
ALTER TABLE staff_kitchen_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skz_read" ON staff_kitchen_zones;
CREATE POLICY "skz_read" ON staff_kitchen_zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "skz_write" ON staff_kitchen_zones;
CREATE POLICY "skz_write" ON staff_kitchen_zones FOR ALL USING (true);

-- ─── Restaurant print configuration ──────────────────────────────────────────
-- kitchen_print_mode: 'none' | 'vendus' | 'browser'
-- zone_split_printing: when true, 1 ticket per zone; when false, 1 combined ticket
-- auto_print_on_order: when true, auto-print when order is placed

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_print_mode VARCHAR(20) DEFAULT 'none';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS zone_split_printing BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS auto_print_on_order BOOLEAN DEFAULT false;
