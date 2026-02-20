-- Script para verificar e corrigir timestamps de pedidos
-- Execute no Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql

-- PASSO 1: Verificar pedidos sem timestamps
SELECT
  id,
  status,
  created_at,
  preparing_started_at,
  ready_at,
  delivered_at,
  updated_at
FROM orders
WHERE status IN ('preparing', 'ready', 'delivered')
ORDER BY created_at DESC
LIMIT 20;

-- PASSO 2: Ver quantos pedidos têm timestamps missing
SELECT
  status,
  COUNT(*) as total,
  COUNT(preparing_started_at) as with_preparing_started,
  COUNT(ready_at) as with_ready,
  COUNT(delivered_at) as with_delivered
FROM orders
WHERE status IN ('preparing', 'ready', 'delivered')
GROUP BY status;

-- PASSO 3: Corrigir pedidos sem timestamps (OPCIONAL - só para testar)
-- Este script adiciona timestamps estimados baseados em created_at
-- CUIDADO: Isto é apenas para corrigir dados históricos para teste

-- Para pedidos 'preparing' sem preparing_started_at:
UPDATE orders
SET preparing_started_at = created_at
WHERE status = 'preparing'
  AND preparing_started_at IS NULL;

-- Para pedidos 'ready' sem ready_at:
UPDATE orders
SET
  preparing_started_at = COALESCE(preparing_started_at, created_at),
  ready_at = COALESCE(ready_at, created_at + INTERVAL '10 minutes')
WHERE status = 'ready'
  AND (preparing_started_at IS NULL OR ready_at IS NULL);

-- Para pedidos 'delivered' sem timestamps:
UPDATE orders
SET
  preparing_started_at = COALESCE(preparing_started_at, created_at),
  ready_at = COALESCE(ready_at, created_at + INTERVAL '10 minutes'),
  delivered_at = COALESCE(delivered_at, created_at + INTERVAL '15 minutes')
WHERE status = 'delivered'
  AND (preparing_started_at IS NULL OR ready_at IS NULL OR delivered_at IS NULL);

-- PASSO 4: Verificar após correção
SELECT
  status,
  COUNT(*) as total,
  COUNT(preparing_started_at) as with_preparing_started,
  COUNT(ready_at) as with_ready,
  COUNT(delivered_at) as with_delivered
FROM orders
WHERE status IN ('preparing', 'ready', 'delivered')
GROUP BY status;
