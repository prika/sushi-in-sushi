-- =============================================
-- ARQUIVO CONSOLIDADO: Diagnóstico e Fixes
-- =============================================
-- Este arquivo contém queries de diagnóstico e correção
-- NÃO executar tudo de uma vez - escolher seções conforme necessidade
-- =============================================

-- =============================================
-- SEÇÃO 1: DIAGNÓSTICO - Verificar Estado das Mesas
-- =============================================
-- Use esta query para diagnosticar o estado de qualquer mesa
-- Substitua o número da mesa conforme necessário

-- 1.1: Ver dados completos de uma mesa
SELECT
  id,
  number,
  name,
  location,
  is_active,
  current_session_id,
  created_at
FROM tables
WHERE number = 3; -- ALTERAR NÚMERO DA MESA

-- 1.2: Ver sessões recentes da mesa
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
WHERE t.number = 3 -- ALTERAR NÚMERO DA MESA
ORDER BY s.started_at DESC
LIMIT 5;

-- 1.3: Ver atribuição de waiter
SELECT
  wt.id,
  wt.staff_id,
  wt.table_id,
  s.name as waiter_name,
  t.number as table_number
FROM waiter_tables wt
JOIN staff s ON wt.staff_id = s.id
JOIN tables t ON wt.table_id = t.id
WHERE t.number = 3; -- ALTERAR NÚMERO DA MESA

-- 1.4: Ver session_customers para sessões ativas
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
WHERE t.number = 3 -- ALTERAR NÚMERO DA MESA
  AND s.status IN ('active', 'pending_payment');

-- =============================================
-- SEÇÃO 2: DIAGNÓSTICO - Verificar Inconsistências Globais
-- =============================================

-- 2.1: Encontrar mesas com sessões ativas mas sem current_session_id
SELECT
  t.number as table_number,
  t.id as table_id,
  t.current_session_id,
  s.id as active_session_id,
  s.status,
  s.started_at,
  '❌ Mesa sem current_session_id mas tem sessão ativa' as problema
FROM tables t
JOIN sessions s ON s.table_id = t.id
WHERE s.status IN ('active', 'pending_payment')
  AND (t.current_session_id IS NULL OR t.current_session_id != s.id);

-- 2.2: Encontrar mesas com current_session_id mas sessão fechada
SELECT
  t.number as table_number,
  t.id as table_id,
  t.current_session_id,
  s.status as session_status,
  s.closed_at,
  '⚠️ Mesa com current_session_id mas sessão fechada' as problema
FROM tables t
JOIN sessions s ON t.current_session_id = s.id
WHERE s.status IN ('closed', 'paid');

-- 2.3: Verificar mesas duplicadas (mesmo número e localização)
SELECT
  number,
  location,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as status,
  STRING_AGG(id::text, ', ') as table_ids
FROM tables
WHERE is_active = true
GROUP BY number, location
HAVING COUNT(*) > 1
ORDER BY location, number;

-- 2.4: Ver estado geral de todas as mesas
SELECT
  t.number as mesa,
  t.location,
  t.current_session_id,
  s.status as session_status,
  wt.staff_id as waiter_id,
  st.name as waiter_name,
  CASE
    WHEN NOT t.is_active THEN '⚫ Inativa'
    WHEN s.id IS NOT NULL AND s.status IN ('active', 'pending_payment') THEN '🔴 Com sessão ativa'
    WHEN t.current_session_id IS NOT NULL THEN '⚠️ Tem current_session_id mas sem sessão ativa'
    ELSE '🟢 Livre'
  END as estado
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
LEFT JOIN waiter_tables wt ON wt.table_id = t.id
LEFT JOIN staff st ON wt.staff_id = st.id
WHERE t.is_active = true
ORDER BY t.location, t.number;

-- =============================================
-- SEÇÃO 3: FIX - Sincronizar current_session_id com Sessões
-- =============================================
-- ⚠️ ATENÇÃO: Estes comandos MODIFICAM dados!
-- Executar apenas se houver inconsistências confirmadas

-- 3.1: Atualizar current_session_id para sessões ativas
-- (Descomente para executar)
/*
UPDATE tables t
SET current_session_id = s.id
FROM sessions s
WHERE s.table_id = t.id
  AND s.status IN ('active', 'pending_payment')
  AND (t.current_session_id IS NULL OR t.current_session_id != s.id);
*/

-- 3.2: Limpar current_session_id para sessões fechadas
-- (Descomente para executar)
/*
UPDATE tables t
SET current_session_id = NULL
FROM sessions s
WHERE t.current_session_id = s.id
  AND s.status IN ('closed', 'paid');
*/

-- 3.3: Limpar current_session_id órfãos (sem sessão correspondente)
-- (Descomente para executar)
/*
UPDATE tables t
SET current_session_id = NULL
WHERE t.current_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = t.current_session_id
      AND s.status IN ('active', 'pending_payment')
  );
*/

-- =============================================
-- SEÇÃO 4: FIX - Remover Mesas Duplicadas
-- =============================================
-- ⚠️ ATENÇÃO: Este script DELETA dados!
-- Executar apenas após confirmar duplicatas com SEÇÃO 2.3

-- 4.1: PREVIEW - Ver quais mesas serão mantidas/deletadas
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    ROW_NUMBER() OVER (
      PARTITION BY t.number, t.location
      ORDER BY
        CASE WHEN s.status IN ('active', 'pending_payment') THEN 0 ELSE 1 END,
        t.created_at DESC
    ) as priority
  FROM tables t
  LEFT JOIN sessions s ON t.current_session_id = s.id
  WHERE t.is_active = true
),
tables_to_keep AS (
  SELECT id, number, location FROM duplicates WHERE priority = 1
),
tables_to_delete AS (
  SELECT id, number, location FROM duplicates WHERE priority > 1
)
SELECT
  d.id,
  d.number,
  d.location,
  '⚠️ Será DELETADA' as acao
FROM tables_to_delete d
UNION ALL
SELECT
  k.id,
  t.number,
  t.location,
  '✅ Será MANTIDA' as acao
FROM tables_to_keep k
JOIN tables t ON k.id = t.id
ORDER BY number, acao DESC;

-- 4.2: EXECUÇÃO - Remover duplicatas
-- ⚠️ Descomente TODO o bloco abaixo para executar
/*
-- Migrar sessões antigas para mesa correta
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    ROW_NUMBER() OVER (
      PARTITION BY t.number, t.location
      ORDER BY
        CASE WHEN s.status IN ('active', 'pending_payment') THEN 0 ELSE 1 END,
        t.created_at DESC
    ) as priority
  FROM tables t
  LEFT JOIN sessions s ON t.current_session_id = s.id
  WHERE t.is_active = true
),
tables_to_keep AS (
  SELECT id, number, location FROM duplicates WHERE priority = 1
),
tables_to_delete AS (
  SELECT id, number, location FROM duplicates WHERE priority > 1
)
UPDATE sessions s
SET table_id = k.id
FROM tables_to_delete d
JOIN tables_to_keep k ON d.number = k.number AND d.location = k.location
WHERE s.table_id = d.id;

-- Migrar atribuições de waiter
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    ROW_NUMBER() OVER (
      PARTITION BY t.number, t.location
      ORDER BY
        CASE WHEN s.status IN ('active', 'pending_payment') THEN 0 ELSE 1 END,
        t.created_at DESC
    ) as priority
  FROM tables t
  LEFT JOIN sessions s ON t.current_session_id = s.id
  WHERE t.is_active = true
),
tables_to_keep AS (
  SELECT id, number, location FROM duplicates WHERE priority = 1
),
tables_to_delete AS (
  SELECT id, number, location FROM duplicates WHERE priority > 1
)
INSERT INTO waiter_tables (staff_id, table_id)
SELECT DISTINCT wt.staff_id, k.id
FROM waiter_tables wt
JOIN tables_to_delete d ON wt.table_id = d.id
JOIN tables_to_keep k ON d.number = k.number AND d.location = k.location
WHERE NOT EXISTS (
  SELECT 1 FROM waiter_tables wt2
  WHERE wt2.staff_id = wt.staff_id AND wt2.table_id = k.id
);

-- Deletar atribuições antigas
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    ROW_NUMBER() OVER (
      PARTITION BY t.number, t.location
      ORDER BY
        CASE WHEN s.status IN ('active', 'pending_payment') THEN 0 ELSE 1 END,
        t.created_at DESC
    ) as priority
  FROM tables t
  LEFT JOIN sessions s ON t.current_session_id = s.id
  WHERE t.is_active = true
),
tables_to_delete AS (
  SELECT id FROM duplicates WHERE priority > 1
)
DELETE FROM waiter_tables wt
WHERE wt.table_id IN (SELECT id FROM tables_to_delete);

-- Deletar mesas duplicadas
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    ROW_NUMBER() OVER (
      PARTITION BY t.number, t.location
      ORDER BY
        CASE WHEN s.status IN ('active', 'pending_payment') THEN 0 ELSE 1 END,
        t.created_at DESC
    ) as priority
  FROM tables t
  LEFT JOIN sessions s ON t.current_session_id = s.id
  WHERE t.is_active = true
),
tables_to_delete AS (
  SELECT id FROM duplicates WHERE priority > 1
)
DELETE FROM tables
WHERE id IN (SELECT id FROM tables_to_delete);
*/

-- =============================================
-- SEÇÃO 5: VERIFICAÇÃO FINAL
-- =============================================

-- 5.1: Verificar se ainda há duplicatas
SELECT
  number,
  location,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) > 1 THEN '⚠️ AINDA TEM DUPLICATAS'
    ELSE '✅ OK - Sem duplicatas'
  END as status
FROM tables
WHERE is_active = true
GROUP BY number, location
HAVING COUNT(*) > 1
ORDER BY number, location;

-- 5.2: Verificar se há inconsistências
SELECT
  COUNT(*) as total_inconsistencias,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Tudo OK'
    ELSE '⚠️ Ainda há inconsistências'
  END as status
FROM (
  -- Mesas com sessão ativa mas sem current_session_id
  SELECT t.id
  FROM tables t
  JOIN sessions s ON s.table_id = t.id
  WHERE s.status IN ('active', 'pending_payment')
    AND (t.current_session_id IS NULL OR t.current_session_id != s.id)

  UNION ALL

  -- Mesas com current_session_id mas sessão fechada
  SELECT t.id
  FROM tables t
  JOIN sessions s ON t.current_session_id = s.id
  WHERE s.status IN ('closed', 'paid')
) inconsistencias;

-- =============================================
-- INSTRUÇÕES DE USO
-- =============================================
/*
1. DIAGNÓSTICO:
   - Execute as queries da SEÇÃO 1 para diagnosticar mesa específica
   - Execute as queries da SEÇÃO 2 para ver problemas globais

2. CORREÇÃO:
   - Se encontrar inconsistências simples, use SEÇÃO 3
   - Se encontrar duplicatas, use SEÇÃO 4 (com MUITO cuidado!)

3. VERIFICAÇÃO:
   - Sempre execute SEÇÃO 5 após fazer correções

4. BACKUP:
   - SEMPRE faça backup antes de executar correções
   - Use preview (4.1) antes de executar delete (4.2)
*/
