import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { getStaffById, getAllStaff } from '@/lib/auth/staff';
import { assignTableToWaiter, removeTableFromWaiter, getWaiterTables } from '@/lib/auth/waiter';

const mockStaff = {
  id: 'staff-1',
  name: 'Test Staff',
  email: 'test@test.com',
  role: { id: 1, name: 'admin' },
};

describe('getStaffById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar staff com role', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data: mockStaff, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStaffById('staff-1');
    expect(result).toBeTruthy();
    expect(result!.name).toBe('Test Staff');
    expect(result!.role).toEqual({ id: 1, name: 'admin' });
  });

  it('deve retornar null quando nao encontrado', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'not found' } }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStaffById('unknown');
    expect(result).toBeNull();
  });

  it('deve retornar null em caso de excepcao', async () => {
    mockFrom.mockImplementation(() => { throw new Error('DB crash'); });
    const result = await getStaffById('staff-1');
    expect(result).toBeNull();
  });
});

describe('getAllStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista de staff', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data: [mockStaff], error: null }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getAllStaff();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Staff');
  });

  it('deve retornar array vazio em caso de erro', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'error' } }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getAllStaff();
    expect(result).toEqual([]);
  });
});

describe('assignTableToWaiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve atribuir mesa com sucesso', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await assignTableToWaiter('waiter-1', 'table-1');
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      staff_id: 'waiter-1',
      table_id: 'table-1',
    });
  });

  it('deve retornar false em caso de erro', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'duplicate' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await assignTableToWaiter('waiter-1', 'table-1');
    expect(result).toBe(false);
  });

  it('deve retornar false em caso de excepcao', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const result = await assignTableToWaiter('waiter-1', 'table-1');
    expect(result).toBe(false);
  });
});

describe('removeTableFromWaiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve remover atribuicao com sucesso', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ error: null }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await removeTableFromWaiter('waiter-1', 'table-1');
    expect(result).toBe(true);
  });

  it('deve retornar false em caso de erro', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ error: { message: 'fail' } }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await removeTableFromWaiter('waiter-1', 'table-1');
    expect(result).toBe(false);
  });
});

describe('getWaiterTables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar mesas atribuidas', async () => {
    const data = [
      { table: { id: 't1', number: 1, name: 'Mesa 1', location: 'circunvalacao' } },
      { table: { id: 't2', number: 2, name: 'Mesa 2', location: 'circunvalacao' } },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getWaiterTables('waiter-1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 't1', number: 1, name: 'Mesa 1', location: 'circunvalacao' });
  });

  it('deve filtrar entries sem table', async () => {
    const data = [
      { table: { id: 't1', number: 1, name: 'Mesa 1', location: 'circunvalacao' } },
      { table: null },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getWaiterTables('waiter-1');
    expect(result).toHaveLength(1);
  });

  it('deve retornar array vazio em caso de erro', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (fn: (_v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'fail' } }).then(fn),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getWaiterTables('waiter-1');
    expect(result).toEqual([]);
  });
});
