-- =============================================
-- Investigar Mesas Duplicadas (Número 3)
-- =============================================

-- Ver TODAS as mesas com número 3 (incluindo detalhes)
SELECT
  t.id as table_id,
  t.number as mesa_numero,
  t.name as mesa_nome,
  t.location,
  t.is_active,
  t.current_session_id,
  s.id as session_id,
  s.status as session_status,
  s.started_at,
  CASE
    WHEN NOT t.is_active THEN '⚫ Inativa'
    WHEN s.id IS NOT NULL AND s.status IN ('active', 'pending_payment') THEN '🔴 Com sessão ativa'
    ELSE '🟢 Livre (sem sessão)'
  END as estado
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
WHERE t.number = 3
ORDER BY t.location, t.created_at;

-- =============================================
-- Verificar se há duplicatas de número por localização
-- =============================================
SELECT
  number,
  location,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as status
FROM tables
WHERE number = 3
GROUP BY number, location
ORDER BY location;

-- =============================================
-- Ver todas as sessões para mesas com número 3
-- =============================================
SELECT
  t.id as table_id,
  t.number,
  t.location,
  s.id as session_id,
  s.status,
  s.started_at,
  s.closed_at
FROM tables t
LEFT JOIN sessions s ON s.table_id = t.id
WHERE t.number = 3
ORDER BY t.location, s.started_at DESC;
