/**
 * Supabase mock for Vendus sync tests
 * Provides chainable query builder that returns configurable responses
 */

export type MockResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

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
  const callLog: { table: string; operation: string }[] = [];

  const from = (table: string) => {
    const select = () => {
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
          is: () => {
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
        order: () => ({
          limit: () => ({
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
          then: (fn: () => unknown) =>
            Promise.resolve({ data: [], error: null }).then(fn),
        }),
      };
    };

    const insert = () => {
      callLog.push({ table, operation: "insert" });
      const resp = responses.vendusSyncLogInsert ?? {
        data: { id: "log-1" },
        error: null,
      };
      return {
        select: () => ({
          single: () => Promise.resolve(resp),
        }),
      };
    };

    const update = () => {
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
