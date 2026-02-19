-- Script RÁPIDO para atribuir um empregado a TODAS as mesas
-- Execute no Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql

-- OPÇÃO 1: Usar o PRIMEIRO empregado com role 'waiter' ou 'admin'
-- (Automaticamente pega o primeiro empregado disponível)

WITH first_waiter AS (
  SELECT s.id
  FROM staff s
  JOIN roles r ON s.role_id = r.id
  WHERE r.name IN ('waiter', 'admin')
    AND s.is_active = true
  ORDER BY s.created_at
  LIMIT 1
)
INSERT INTO waiter_tables (table_id, staff_id)
SELECT
  t.id,
  fw.id
FROM tables t
CROSS JOIN first_waiter fw
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM waiter_tables wt WHERE wt.table_id = t.id
  )
ON CONFLICT (table_id, staff_id) DO NOTHING;

-- Verificar as atribuições criadas:
SELECT
  t.number as mesa,
  t.location,
  s.name as empregado,
  s.email
FROM waiter_tables wt
JOIN tables t ON wt.table_id = t.id
JOIN staff s ON wt.staff_id = s.id
ORDER BY t.location, t.number;
