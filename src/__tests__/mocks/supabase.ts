/**
 * Supabase mock for Vendus sync tests
 * Provides chainable query builder that returns configurable responses
 */

export type MockResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

function createChain(
  value: unknown,
  resolve: () => Promise<unknown> = async () => value,
) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    in: () => chain,
    ilike: () => chain,
    is: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => ({
      ...chain,
      then: (fn: (v: unknown) => unknown) => resolve().then(fn),
    }),
    maybeSingle: () => ({
      ...chain,
      then: (fn: (v: unknown) => unknown) => resolve().then(fn),
    }),
    then: (fn: (v: unknown) => unknown) => resolve().then(fn),
  };
  return chain;
}

export function createMockSupabase(responses: {
  vendusSyncLogInsert?: MockResponse<{ id: string }>;
  vendusSyncLogUpdate?: MockResponse<unknown>;
  categoriesSelect?: MockResponse<{ id: string }>;
  productsSelectByVendusId?: Record<
    string,
    MockResponse<Record<string, unknown> | null>
  >;
  productsSelectByName?: Record<
    string,
    MockResponse<Record<string, unknown> | null>
  >;
  productsUpdate?: MockResponse<unknown>;
  productsInsert?: MockResponse<unknown>;
}) {
  let fromCallCount = 0;
  const callLog: { table: string; operation: string }[] = [];

  const from = (table: string) => {
    fromCallCount++;
    const select = (cols?: string) => {
      callLog.push({ table, operation: "select" });
      return {
        eq: (col: string, val: unknown) => {
          if (table === "products" && col === "vendus_id") {
            const vendusId = String(val);
            const resp = responses.productsSelectByVendusId?.[vendusId] ?? {
              data: null,
              error: null,
            };
            return {
              single: () => Promise.resolve(resp),
            };
          }
          return { single: () => Promise.resolve({ data: null, error: null }) };
        },
        ilike: (col: string, val: string) => ({
          is: (col2: string) => {
            if (table === "products" && col === "name") {
              const resp = responses.productsSelectByName?.[val] ??
                responses.productsSelectByName?.["*"] ?? {
                  data: null,
                  error: null,
                };
              return { maybeSingle: () => Promise.resolve(resp) };
            }
            return {
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            };
          },
        }),
        order: (col: string) => ({
          limit: (n: number) => ({
            single: () =>
              Promise.resolve(
                responses.categoriesSelect ?? {
                  data: { id: "cat-default" },
                  error: null,
                },
              ),
          }),
        }),
        in: () => ({
          then: (fn: (v: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(fn),
        }),
      };
    };

    const insert = (data: unknown) => {
      callLog.push({ table, operation: "insert" });
      const resp = responses.vendusSyncLogInsert ?? {
        data: { id: "log-1" },
        error: null,
      };
      return {
        select: (cols: string) => ({
          single: () => Promise.resolve(resp),
        }),
      };
    };

    const update = (data: unknown) => {
      callLog.push({ table, operation: "update" });
      const resp = responses.productsUpdate ??
        responses.vendusSyncLogUpdate ?? { data: null, error: null };
      return {
        eq: () => Promise.resolve(resp),
      };
    };

    return {
      select,
      insert,
      update,
      from,
    };
  };

  return {
    from: Object.assign(from, { _callLog: () => callLog }),
  };
}
