-- =============================================
-- Fix Script: Remover Mesas Duplicadas
-- =============================================
-- Remove mesas com o mesmo número na mesma localização,
-- mantendo apenas a mesa mais relevante (com sessão ativa ou mais recente)
-- =============================================

-- PASSO 1: Identificar duplicatas e marcar qual manter
-- =============================================
WITH duplicates AS (
  SELECT
    t.id,
    t.number,
    t.location,
    t.created_at,
    t.current_session_id,
    s.status as session_status,
    -- Ordenar por prioridade: 1) tem sessão ativa, 2) mais recente
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
  SELECT id FROM duplicates WHERE priority = 1
),
tables_to_delete AS (
  SELECT id, number, location FROM duplicates WHERE priority > 1
)

-- Ver quais mesas vão ser deletadas (PREVIEW - comentar este SELECT para executar as operações)
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

-- =============================================
-- PASSO 2: Migrar dados das mesas duplicadas para a mesa principal
-- =============================================
-- IMPORTANTE: Comente o SELECT acima e descomente os comandos abaixo para executar


-- 2.1: Atualizar sessões antigas para apontar para a mesa correta
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

-- 2.2: Migrar atribuições de waiter
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

-- 2.3: Deletar atribuições antigas
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

-- =============================================
-- PASSO 3: Deletar mesas duplicadas
-- =============================================
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

-- =============================================
-- PASSO 4: Verificar resultado final
-- =============================================
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

