-- =============================================
-- SUSHI IN SUSHI - TEST USERS FOR E2E TESTS
-- Migration: 017_test_users.sql
-- =============================================
--
-- Creates test users for automated E2E testing.
-- These users should only exist in development/test environments.
--
-- IMPORTANT: Do NOT run this migration in production!
-- =============================================

-- Admin test user
INSERT INTO staff (id, email, name, password_hash, role_id, location, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@sushinsushi.pt',
    'Admin Teste',
    'admin123',
    1,
    'circunvalacao',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'admin123',
    is_active = true;

-- Kitchen test user
INSERT INTO staff (id, email, name, password_hash, role_id, location, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'cozinha@sushinsushi.pt',
    'Cozinha Teste',
    'cozinha123',
    2,
    'circunvalacao',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'cozinha123',
    is_active = true;

-- Waiter test user (Circunvalação)
INSERT INTO staff (id, email, name, password_hash, role_id, location, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'empregado@sushinsushi.pt',
    'Empregado Teste',
    'empregado123',
    3,
    'circunvalacao',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'empregado123',
    is_active = true;

-- Waiter test user (Boavista)
INSERT INTO staff (id, email, name, password_hash, role_id, location, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000004',
    'empregado.boavista@sushinsushi.pt',
    'Empregado Boavista Teste',
    'empregado123',
    3,
    'boavista',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'empregado123',
    is_active = true;

-- Kitchen test user (Boavista)
INSERT INTO staff (id, email, name, password_hash, role_id, location, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000005',
    'cozinha.boavista@sushinsushi.pt',
    'Cozinha Boavista Teste',
    'cozinha123',
    2,
    'boavista',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'cozinha123',
    is_active = true;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'Test users created successfully:';
    RAISE NOTICE '  - admin@sushinsushi.pt (admin123)';
    RAISE NOTICE '  - cozinha@sushinsushi.pt (cozinha123)';
    RAISE NOTICE '  - empregado@sushinsushi.pt (empregado123)';
    RAISE NOTICE '  - empregado.boavista@sushinsushi.pt (empregado123)';
    RAISE NOTICE '  - cozinha.boavista@sushinsushi.pt (cozinha123)';
END $$;
