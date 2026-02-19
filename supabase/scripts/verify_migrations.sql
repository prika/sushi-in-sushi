-- =============================================
-- Verificação de Migrations Aplicadas
-- =============================================
-- Execute este script para confirmar que migrations 039 e 043 foram aplicadas

-- =============================================
-- Migration 039: session_ordering_mode
-- =============================================

-- 1. Verificar se coluna ordering_mode existe
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name = 'ordering_mode';

-- Resultado esperado:
-- column_name      | data_type         | column_default | is_nullable
-- ordering_mode    | character varying | 'client'       | YES


-- 2. Verificar constraint CHECK
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'sessions'::regclass
  AND conname LIKE '%ordering_mode%';

-- Resultado esperado:
-- constraint_name           | definition
-- sessions_ordering_mode_check | CHECK ((ordering_mode)::text = ANY (ARRAY[('client'::character varying)::text, ('waiter_only'::character varying)::text]))


-- 3. Verificar index criado
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sessions'
  AND indexname = 'idx_sessions_ordering_mode';

-- Resultado esperado:
-- indexname                  | indexdef
-- idx_sessions_ordering_mode | CREATE INDEX idx_sessions_ordering_mode ON public.sessions USING btree (ordering_mode)


-- 4. Verificar RLS policy
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sessions'
  AND policyname = 'Staff can update session ordering mode';

-- Resultado esperado:
-- policyname                            | cmd    | qual
-- Staff can update session ordering mode | UPDATE | (EXISTS ( SELECT 1...


-- 5. Testar dados - Ver ordering_mode em sessões existentes
SELECT
  id,
  table_id,
  status,
  ordering_mode,
  started_at
FROM sessions
WHERE status IN ('active', 'pending_payment')
ORDER BY started_at DESC
LIMIT 5;

-- Resultado esperado: ordering_mode deve ser 'client' para todas as sessões existentes


-- =============================================
-- Migration 043: close_session_update_table
-- =============================================

-- 6. Verificar se função existe
SELECT
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'close_session_and_free_table';

-- Resultado esperado:
-- function_name                 | num_args | return_type
-- close_session_and_free_table  | 1        | void


-- 7. Ver definição completa da função
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'close_session_and_free_table';

-- Resultado esperado: SQL completo da função


-- 8. Verificar permissões da função
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'close_session_and_free_table'
  AND routine_schema = 'public';

-- Resultado esperado:
-- grantee       | privilege_type
-- authenticated | EXECUTE
-- anon          | EXECUTE


-- =============================================
-- Resumo de Verificação
-- =============================================

SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'ordering_mode') > 0
    THEN '✅ Migration 039: ordering_mode column exists'
    ELSE '❌ Migration 039: ordering_mode column NOT FOUND'
  END as migration_039_status,

  CASE
    WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'close_session_and_free_table') > 0
    THEN '✅ Migration 043: close_session_and_free_table function exists'
    ELSE '❌ Migration 043: close_session_and_free_table function NOT FOUND'
  END as migration_043_status;

-- Se ambos retornarem ✅, migrations foram aplicadas com sucesso!
