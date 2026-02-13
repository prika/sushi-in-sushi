-- Query para verificar se há empregados atribuídos às mesas
-- Execute isto no Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql

-- 1. Ver todos os empregados disponíveis (com seus roles)
SELECT
  s.id,
  s.name,
  r.name as role,
  s.location,
  s.is_active
FROM staff s
JOIN roles r ON s.role_id = r.id
WHERE r.name IN ('waiter', 'admin')
  AND s.is_active = true
ORDER BY s.name;

-- 2. Ver todas as mesas
SELECT id, number, location, is_active
FROM tables
WHERE is_active = true
ORDER BY location, number;

-- 3. Ver atribuições de empregados a mesas
SELECT
  wt.id,
  t.number as mesa_numero,
  t.location as mesa_local,
  s.name as empregado_nome,
  r.name as empregado_role
FROM waiter_tables wt
JOIN tables t ON wt.table_id = t.id
JOIN staff s ON wt.staff_id = s.id
JOIN roles r ON s.role_id = r.id
ORDER BY t.location, t.number;

-- 4. Ver mesas SEM empregados atribuídos
SELECT
  t.id,
  t.number,
  t.location
FROM tables t
LEFT JOIN waiter_tables wt ON t.id = wt.table_id
WHERE t.is_active = true
  AND wt.id IS NULL
ORDER BY t.location, t.number;
