import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthUser } from '@/types/database';

// Mock supabase server
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

// Mock staff module
const mockGetStaffById = vi.fn();
vi.mock('@/lib/auth/staff', () => ({
  getStaffById: (...args: unknown[]) => mockGetStaffById(...args),
}));

import {
  hasRole,
  isAdmin,
  isKitchen,
  isWaiter,
  getAccessibleTables,
  canAccessTable,
  canEditOrder,
} from '@/lib/auth/permissions';

const adminUser: AuthUser = {
  id: 'admin-id',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  location: 'circunvalacao',
};

const kitchenUser: AuthUser = {
  id: 'kitchen-id',
  email: 'kitchen@test.com',
  name: 'Kitchen',
  role: 'kitchen',
  location: 'circunvalacao',
};

const waiterUser: AuthUser = {
  id: 'waiter-id',
  email: 'waiter@test.com',
  name: 'Waiter',
  role: 'waiter',
  location: 'circunvalacao',
};

describe('hasRole', () => {
  it('deve retornar true se user tem role', () => {
    expect(hasRole(adminUser, ['admin'])).toBe(true);
  });

  it('deve retornar true se role esta na lista', () => {
    expect(hasRole(adminUser, ['admin', 'kitchen'])).toBe(true);
  });

  it('deve retornar false se role nao esta na lista', () => {
    expect(hasRole(waiterUser, ['admin', 'kitchen'])).toBe(false);
  });

  it('deve retornar false para user null', () => {
    expect(hasRole(null, ['admin'])).toBe(false);
  });
});

describe('isAdmin', () => {
  it('deve retornar true para admin', () => {
    expect(isAdmin(adminUser)).toBe(true);
  });

  it('deve retornar false para waiter', () => {
    expect(isAdmin(waiterUser)).toBe(false);
  });

  it('deve retornar false para null', () => {
    expect(isAdmin(null)).toBe(false);
  });
});

describe('isKitchen', () => {
  it('deve retornar true para kitchen', () => {
    expect(isKitchen(kitchenUser)).toBe(true);
  });

  it('deve retornar false para admin', () => {
    expect(isKitchen(adminUser)).toBe(false);
  });
});

describe('isWaiter', () => {
  it('deve retornar true para waiter', () => {
    expect(isWaiter(waiterUser)).toBe(true);
  });

  it('deve retornar false para kitchen', () => {
    expect(isWaiter(kitchenUser)).toBe(false);
  });
});

describe('getAccessibleTables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar array vazio se staff nao encontrado', async () => {
    mockGetStaffById.mockResolvedValue(null);
    const result = await getAccessibleTables('unknown-id');
    expect(result).toEqual([]);
  });

  it('deve retornar todas as mesas para admin', async () => {
    const tables = [{ id: 't1', number: 1, name: 'Mesa 1' }];
    mockGetStaffById.mockResolvedValue({ role: { name: 'admin' }, location: 'circunvalacao' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: tables, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(mockQuery);

    const result = await getAccessibleTables('admin-id');
    expect(result).toEqual(tables);
  });

  it('deve retornar mesas atribuidas para waiter', async () => {
    const waiterTables = [{ table: { id: 't1', number: 1, name: 'Mesa 1' } }];
    mockGetStaffById.mockResolvedValue({ role: { name: 'waiter' }, location: 'circunvalacao' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: waiterTables, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(mockQuery);

    const result = await getAccessibleTables('waiter-id');
    expect(result).toEqual([{ id: 't1', number: 1, name: 'Mesa 1' }]);
  });

  it('deve retornar array vazio para role desconhecido', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'customer' }, location: null });
    const result = await getAccessibleTables('customer-id');
    expect(result).toEqual([]);
  });
});

describe('canAccessTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar false se staff nao encontrado', async () => {
    mockGetStaffById.mockResolvedValue(null);
    expect(await canAccessTable('unknown', 't1')).toBe(false);
  });

  it('deve retornar true para admin', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'admin' } });
    expect(await canAccessTable('admin-id', 't1')).toBe(true);
  });

  it('deve retornar true para kitchen', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'kitchen' } });
    expect(await canAccessTable('kitchen-id', 't1')).toBe(true);
  });

  it('deve verificar atribuicao para waiter', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'waiter' } });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: { id: 'wt1' }, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(mockQuery);

    expect(await canAccessTable('waiter-id', 't1')).toBe(true);
  });
});

describe('canEditOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar false se staff nao encontrado', async () => {
    mockGetStaffById.mockResolvedValue(null);
    expect(await canEditOrder('unknown', 'order1')).toBe(false);
  });

  it('deve retornar true para admin', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'admin' } });
    expect(await canEditOrder('admin-id', 'order1')).toBe(true);
  });

  it('deve retornar true para kitchen', async () => {
    mockGetStaffById.mockResolvedValue({ role: { name: 'kitchen' } });
    expect(await canEditOrder('kitchen-id', 'order1')).toBe(true);
  });
});
