-- =============================================
-- Fix Script: Sincronizar tables.current_session_id com sessions
-- =============================================

-- PARTE 1: Atualizar tables.current_session_id para sessões ativas
-- Sessões que estão active/pending_payment mas a mesa não tem current_session_id

UPDATE tables t
SET current_session_id = s.id
FROM sessions s
WHERE s.table_id = t.id
  AND s.status IN ('active', 'pending_payment')
  AND (t.current_session_id IS NULL OR t.current_session_id != s.id);

-- PARTE 2: Limpar tables.current_session_id para sessões fechadas
-- Mesas que têm current_session_id mas a sessão já está fechada

UPDATE tables t
SET current_session_id = NULL
FROM sessions s
WHERE t.current_session_id = s.id
  AND s.status IN ('closed', 'paid');

-- PARTE 3: Limpar current_session_id de mesas sem sessão ativa
-- Mesas com current_session_id mas sem sessão correspondente ativa

UPDATE tables t
SET current_session_id = NULL
WHERE t.current_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = t.current_session_id
      AND s.status IN ('active', 'pending_payment')
  );

-- PARTE 4: Verificar resultado
SELECT
  t.number as mesa,
  t.current_session_id,
  s.status as session_status,
  CASE
    WHEN s.id IS NULL THEN '❌ Sem sessão'
    WHEN s.status IN ('active', 'pending_payment') THEN '✅ OK - Sessão ativa'
    ELSE '⚠️ Sessão fechada mas current_session_id ainda definido'
  END as estado
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
WHERE t.is_active = true
ORDER BY t.number;
