-- Migration 056: Fix session status constraint
-- The CHECK constraint uses old values ('active','ordering','closed','billing')
-- but the application domain uses ('active','pending_payment','paid','closed')
-- This migration aligns the database with the domain model.

-- First update any rows that use old status values
UPDATE sessions SET status = 'pending_payment' WHERE status = 'billing';
UPDATE sessions SET status = 'active' WHERE status = 'ordering';

-- Drop the old constraint (try both possible names)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
-- PostgreSQL inline CHECK without explicit name: tablename_columnname_check
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_check;

-- Add the correct constraint matching the domain model
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('active', 'pending_payment', 'paid', 'closed'));
