-- Script para atribuir empregados às mesas
-- Execute isto no Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql

-- PASSO 1: Ver os IDs dos empregados disponíveis
SELECT
  s.id,
  s.name,
  r.name as role,
  s.location
FROM staff s
JOIN roles r ON s.role_id = r.id
WHERE r.name IN ('waiter', 'admin')
  AND s.is_active = true
ORDER BY s.location, s.name;

-- PASSO 2: Copie um ID de empregado da query acima e cole abaixo
-- Substitua 'SEU_STAFF_ID_AQUI' pelo ID real do empregado (ex: '123e4567-e89b-12d3-a456-426614174000')

-- Para todas as mesas da Circunvalação:
INSERT INTO waiter_tables (table_id, staff_id)
SELECT t.id, 'SEU_STAFF_ID_AQUI'::uuid
FROM tables t
WHERE t.location = 'circunvalacao'
  AND t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM waiter_tables wt WHERE wt.table_id = t.id
  )
ON CONFLICT (table_id, staff_id) DO NOTHING;

-- Para todas as mesas da Boavista:
INSERT INTO waiter_tables (table_id, staff_id)
SELECT t.id, 'SEU_STAFF_ID_AQUI'::uuid
FROM tables t
WHERE t.location = 'boavista'
  AND t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM waiter_tables wt WHERE wt.table_id = t.id
  )
ON CONFLICT (table_id, staff_id) DO NOTHING;

-- PASSO 3: Verificar as atribuições criadas
SELECT
  t.number as mesa,
  t.location,
  s.name as empregado,
  r.name as role
FROM waiter_tables wt
JOIN tables t ON wt.table_id = t.id
JOIN staff s ON wt.staff_id = s.id
JOIN roles r ON s.role_id = r.id
ORDER BY t.location, t.number;
