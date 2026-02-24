-- Migration 057: Add billing fields to sessions
-- Allows customer NIF to be saved during bill request for waiter to use when creating invoice

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_nif VARCHAR(20);
