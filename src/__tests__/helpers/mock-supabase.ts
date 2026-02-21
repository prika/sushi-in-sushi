/**
 * Reusable Supabase mock client for repository tests.
 *
 * Pattern: fluent API builder that behaves like SupabaseClient.
 * Supports chaining (select, insert, update, delete, eq, neq, in, is, not, or,
 * gte, lte, order, limit, single, maybeSingle, upsert, rpc, head) and resolves
 * via thenable.
 */
import { vi } from 'vitest';

export function createMockSupabaseClient() {
  const createQueryBuilder = (defaultResult: any = { data: [], error: null }) => {
    const builder: any = {};
    let result = defaultResult;

    const chainMethods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'in', 'is', 'not', 'or', 'ilike', 'like',
      'gte', 'lte', 'gt', 'lt',
      'order', 'limit', 'range',
      'single', 'maybeSingle',
    ];

    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    builder.then = (onFulfilled: (value: any) => any) =>
      Promise.resolve(result).then(onFulfilled);
    builder.catch = (onRejected: (reason: any) => any) =>
      Promise.resolve(result).catch(onRejected);

    builder.mockResolvedValue = (value: any) => {
      result = value;
      return builder;
    };

    return builder;
  };

  let currentBuilder = createQueryBuilder();

  const mockClient = {
    from: vi.fn(() => currentBuilder),
    rpc: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    _setBuilder: (builder: any) => { currentBuilder = builder; },
    _getBuilder: () => currentBuilder,
    _createBuilder: createQueryBuilder,
    _newBuilder: (defaultResult?: any) => {
      const b = createQueryBuilder(defaultResult);
      currentBuilder = b;
      return b;
    },
  };

  return mockClient;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
