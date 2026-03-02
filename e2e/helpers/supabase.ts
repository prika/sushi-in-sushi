/**
 * Supabase helper for E2E tests.
 * Uses the Supabase REST API directly with service_role key to bypass RLS.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function headers() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/** Base REST URL for a table */
function tableUrl(table: string) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

// ─── Generic helpers ────────────────────────────────────────

/** INSERT one or more rows. Returns the inserted rows. */
export async function insertRows<T = Record<string, unknown>>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
): Promise<T[]> {
  const res = await fetch(tableUrl(table), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT into ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** SELECT rows with optional query params (e.g. { id: "eq.xxx" }). */
export async function queryRows<T = Record<string, unknown>>(
  table: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const url = new URL(tableUrl(table));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("select", "*");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SELECT from ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** UPDATE rows matching filters. Returns updated rows. */
export async function updateRows<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>,
  filters: Record<string, string>,
): Promise<T[]> {
  const url = new URL(tableUrl(table));
  for (const [k, v] of Object.entries(filters)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPDATE ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** DELETE rows matching filters. */
export async function deleteRows(
  table: string,
  filters: Record<string, string>,
): Promise<void> {
  const url = new URL(tableUrl(table));
  for (const [k, v] of Object.entries(filters)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE from ${table} failed (${res.status}): ${text}`);
  }
}

/** Call an RPC (stored procedure). */
export async function rpc<T = unknown>(
  fn: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fn} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Domain-specific helpers ────────────────────────────────

/** Find the first available table for a location, returns { id, number } or null */
export async function findAvailableTable(
  location = "circunvalacao",
): Promise<{ id: string; number: number } | null> {
  const rows = await queryRows<{ id: string; number: number }>("tables", {
    location: `eq.${location}`,
    status: "eq.available",
    order: "number.asc",
    limit: "1",
  });
  return rows[0] ?? null;
}

/** Create a session directly in the DB (bypasses auth). */
export async function createSession(opts: {
  tableId: string;
  isRodizio?: boolean;
  numPeople?: number;
}): Promise<{ id: string; table_id: string; status: string }> {
  // Mark table as occupied
  await updateRows("tables", { status: "occupied" }, { id: `eq.${opts.tableId}` });

  const [session] = await insertRows<{ id: string; table_id: string; status: string }>(
    "sessions",
    {
      table_id: opts.tableId,
      status: "active",
      is_rodizio: opts.isRodizio ?? false,
      num_people: opts.numPeople ?? 2,
      ordering_mode: "client",
      total_amount: 0,
    },
  );
  return session;
}

/** Create a session_customer directly. */
export async function createSessionCustomer(opts: {
  sessionId: string;
  displayName: string;
  email?: string;
  phone?: string;
  allergens?: string[];
  isSessionHost?: boolean;
}): Promise<{ id: string; session_id: string; display_name: string; email: string | null }> {
  const [sc] = await insertRows<{
    id: string;
    session_id: string;
    display_name: string;
    email: string | null;
  }>("session_customers", {
    session_id: opts.sessionId,
    display_name: opts.displayName,
    email: opts.email ?? null,
    phone: opts.phone ?? null,
    allergens: opts.allergens ?? [],
    is_session_host: opts.isSessionHost ?? true,
    marketing_consent: false,
  });
  return sc;
}

/** Insert a game_session + game_answers for a session customer.
 *  Uses game_type "tinder" with product_ids to satisfy the
 *  `game_answers_question_or_product_check` constraint
 *  (requires question_id OR product_id to be non-null). */
export async function seedGameData(opts: {
  sessionId: string;
  sessionCustomerId: string;
  scores: number[];
  productIds: string[];
}): Promise<{ gameSessionId: string; totalScore: number }> {
  // Create game_sessions
  const [gs] = await insertRows<{ id: string }>("game_sessions", {
    session_id: opts.sessionId,
    status: "completed",
    round_number: 1,
    total_questions: opts.scores.length,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  // Create game_answers — use tinder type with product_id to satisfy CHECK constraint
  for (let i = 0; i < opts.scores.length; i++) {
    const productId = opts.productIds[i % opts.productIds.length];
    await insertRows("game_answers", {
      game_session_id: gs.id,
      session_customer_id: opts.sessionCustomerId,
      product_id: productId,
      game_type: "tinder",
      answer: JSON.stringify({ rating: 5 }),
      score_earned: opts.scores[i],
      answered_at: new Date().toISOString(),
    });
  }

  const totalScore = opts.scores.reduce((a, b) => a + b, 0);
  return { gameSessionId: gs.id, totalScore };
}

/** Insert product_ratings for a session customer. */
export async function seedProductRatings(opts: {
  sessionId: string;
  sessionCustomerId: string;
  ratings: { productId: string; rating: number }[];
}): Promise<number> {
  for (const r of opts.ratings) {
    await insertRows("product_ratings", {
      session_id: opts.sessionId,
      session_customer_id: opts.sessionCustomerId,
      product_id: r.productId,
      rating: r.rating,
    });
  }
  return opts.ratings.length;
}

/** Get a few product IDs from the database (UUIDs). */
export async function getProductIds(limit = 2): Promise<string[]> {
  const rows = await queryRows<{ id: string }>("products", {
    is_available: "eq.true",
    order: "id.asc",
    limit: String(limit),
  });
  return rows.map((r) => r.id);
}

/** Clean up all test data created during the E2E test. */
export async function cleanupTestData(opts: {
  sessionId?: string;
  sessionCustomerId?: string;
  gameSessionId?: string;
  customerId?: string;
  customerEmail?: string;
  tableId?: string;
}) {
  // Order matters — delete children first

  if (opts.sessionCustomerId) {
    await deleteRows("product_ratings", {
      session_customer_id: `eq.${opts.sessionCustomerId}`,
    }).catch(() => {});

    await deleteRows("game_answers", {
      session_customer_id: `eq.${opts.sessionCustomerId}`,
    }).catch(() => {});
  }

  if (opts.gameSessionId) {
    await deleteRows("game_sessions", {
      id: `eq.${opts.gameSessionId}`,
    }).catch(() => {});
  }

  if (opts.sessionId) {
    await deleteRows("session_customers", {
      session_id: `eq.${opts.sessionId}`,
    }).catch(() => {});

    await deleteRows("sessions", {
      id: `eq.${opts.sessionId}`,
    }).catch(() => {});
  }

  if (opts.customerId) {
    await deleteRows("customers", {
      id: `eq.${opts.customerId}`,
    }).catch(() => {});
  } else if (opts.customerEmail) {
    await deleteRows("customers", {
      email: `eq.${opts.customerEmail}`,
    }).catch(() => {});
  }

  // Free the table
  if (opts.tableId) {
    await updateRows(
      "tables",
      { status: "available" },
      { id: `eq.${opts.tableId}` },
    ).catch(() => {});
  }
}
