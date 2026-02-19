-- =============================================
-- Debug Script: Verificar estado da Mesa 3
-- =============================================

-- 1. Verificar dados da mesa
SELECT
  id,
  number,
  name,
  location,
  is_active,
  current_session_id,
  created_at
FROM tables
WHERE number = 3;

-- 2. Verificar sessões da mesa 3 (ativas e recentes)
SELECT
  s.id,
  s.table_id,
  s.status,
  s.started_at,
  s.closed_at,
  s.is_rodizio,
  s.num_people,
  s.total_amount,
  t.number as table_number
FROM sessions s
JOIN tables t ON s.table_id = t.id
WHERE t.number = 3
ORDER BY s.started_at DESC
LIMIT 5;

-- 3. Verificar atribuição de waiter
SELECT
  wt.id,
  wt.staff_id,
  wt.table_id,
  s.name as waiter_name,
  t.number as table_number
FROM waiter_tables wt
JOIN staff s ON wt.staff_id = s.id
JOIN tables t ON wt.table_id = t.id
WHERE t.number = 3;

-- 4. Verificar session_customers para sessões ativas
SELECT
  sc.id,
  sc.session_id,
  sc.display_name,
  sc.is_session_host,
  s.status as session_status,
  t.number as table_number
FROM session_customers sc
JOIN sessions s ON sc.session_id = s.id
JOIN tables t ON s.table_id = t.id
WHERE t.number = 3
  AND s.status IN ('active', 'pending_payment');

-- 5. Verificar inconsistências: sessões ativas sem current_session_id
SELECT
  t.number as table_number,
  t.current_session_id,
  s.id as active_session_id,
  s.status,
  s.started_at
FROM tables t
LEFT JOIN sessions s ON s.table_id = t.id AND s.status IN ('active', 'pending_payment')
WHERE t.number = 3
  AND (
    (s.id IS NOT NULL AND t.current_session_id IS NULL) OR
    (s.id IS NULL AND t.current_session_id IS NOT NULL) OR
    (s.id IS NOT NULL AND t.current_session_id != s.id)
  );
