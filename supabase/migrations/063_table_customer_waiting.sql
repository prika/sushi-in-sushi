-- Migration 063: Add customer_waiting_since to tables
-- When not null, indicates a customer scanned the QR and is waiting for the waiter to open the table.

ALTER TABLE tables ADD COLUMN IF NOT EXISTS customer_waiting_since TIMESTAMPTZ DEFAULT NULL;
