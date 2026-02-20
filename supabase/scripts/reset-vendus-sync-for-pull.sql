-- =============================================
-- RESET VENDUS SYNC STATUS FOR CLEAN PULL
-- =============================================
-- Problema: Migração 051 importou produtos do CSV com vendus_sync_status = 'synced'
-- mas SEM vendus_id (numeric API ID) nem vendus_ids JSONB.
-- O CSV só tem vendus_reference (text), não o ID numérico da API.
--
-- Solução: Reset status → 'pending' para que o pull da API preencha
-- vendus_id + vendus_ids automaticamente (matching por nome).
-- =============================================

-- 1. Ver estado atual dos produtos
SELECT
    vendus_sync_status,
    COUNT(*) as total,
    COUNT(vendus_id) as com_vendus_id,
    COUNT(CASE WHEN vendus_ids IS NOT NULL AND vendus_ids != '{}'::jsonb THEN 1 END) as com_vendus_ids
FROM products
GROUP BY vendus_sync_status
ORDER BY vendus_sync_status;

-- 2. Reset produtos que estão 'error' ou 'synced' mas SEM vendus_id real
-- (foram importados do CSV sem link à API)
UPDATE products
SET vendus_sync_status = 'pending',
    vendus_synced_at = NULL
WHERE vendus_id IS NULL
  AND (vendus_ids IS NULL OR vendus_ids = '{}'::jsonb)
  AND vendus_sync_status IN ('synced', 'error');

-- 3. Verificar resultado
SELECT
    vendus_sync_status,
    COUNT(*) as total,
    COUNT(vendus_id) as com_vendus_id,
    COUNT(CASE WHEN vendus_ids IS NOT NULL AND vendus_ids != '{}'::jsonb THEN 1 END) as com_vendus_ids
FROM products
GROUP BY vendus_sync_status
ORDER BY vendus_sync_status;

-- 4. Resumo: quantos produtos estão prontos para pull
SELECT
    COUNT(*) FILTER (WHERE vendus_sync_status = 'pending') as prontos_para_pull,
    COUNT(*) FILTER (WHERE vendus_sync_status = 'synced' AND vendus_id IS NOT NULL) as ja_sincronizados,
    COUNT(*) FILTER (WHERE vendus_sync_status = 'error') as com_erro,
    COUNT(*) as total
FROM products;
