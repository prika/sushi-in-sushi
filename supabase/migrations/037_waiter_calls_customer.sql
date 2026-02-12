-- =============================================
-- ADD SESSION_CUSTOMER_ID TO WAITER_CALLS
-- Track which customer made the waiter call
-- =============================================

-- 1. Add column
ALTER TABLE waiter_calls ADD COLUMN IF NOT EXISTS session_customer_id uuid;

-- 2. Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_waiter_calls_customer
  ON waiter_calls(session_customer_id) WHERE session_customer_id IS NOT NULL;

COMMENT ON COLUMN waiter_calls.session_customer_id IS 'Customer who initiated the call (from session_customers)';

-- 3. Recreate view with customer_name
DROP VIEW IF EXISTS waiter_calls_with_details;
CREATE VIEW waiter_calls_with_details AS
SELECT
    wc.*,
    t.number as table_number,
    t.name as table_name,
    s.name as acknowledged_by_name,
    wa.staff_name as assigned_waiter_name,
    wa.staff_id as assigned_waiter_id,
    sc.display_name as customer_name
FROM waiter_calls wc
JOIN tables t ON wc.table_id = t.id
LEFT JOIN staff s ON wc.acknowledged_by = s.id
LEFT JOIN waiter_assignments wa ON wc.table_id = wa.table_id
LEFT JOIN session_customers sc ON wc.session_customer_id = sc.id;

-- 4. Grant permissions
GRANT SELECT ON waiter_calls_with_details TO anon, authenticated;
