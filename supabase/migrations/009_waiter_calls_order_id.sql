-- =============================================
-- ADD ORDER_ID TO WAITER_CALLS
-- Links kitchen notifications to specific orders
-- =============================================

-- Add order_id column to waiter_calls
-- Note: orders.id is INTEGER in this database
ALTER TABLE waiter_calls
ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL;

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
