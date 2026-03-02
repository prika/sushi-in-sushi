-- Migration 075: Link reservations to customers
--
-- Adiciona FK customer_id à tabela reservations para:
--   1. Associar cada reserva ao registo do cliente na tabela customers
--   2. Permitir registar visita (visitCount++) quando a reserva é concluída
--   3. Possibilitar a progressão automática de tier:
--      Tier 2 (Identificado) → Tier 3 (Cliente) após primeira visita efetivada
--
-- Fluxo:
--   POST /api/reservations  → upsert customer + guarda customer_id na reserva
--   PATCH /api/reservations → ao marcar "completed", incrementa visitCount via RecordCustomerVisitUseCase
--
-- Idempotente: seguro re-executar (IF NOT EXISTS)

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
