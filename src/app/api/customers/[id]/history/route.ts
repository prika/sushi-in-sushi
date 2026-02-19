import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function mapCustomer(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    birthDate: row.birth_date,
    preferredLocation: row.preferred_location,
    marketingConsent: row.marketing_consent,
    points: row.points,
    totalSpent: row.total_spent,
    visitCount: row.visit_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CustomerHistoryReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  location: string;
  status: string;
  tableNumber: number | null;
  tableName: string | null;
  isRodizio: boolean;
  specialRequests: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  sessionId: string | null;
  seatedAt: string | null;
  createdAt: string;
};

export type CustomerHistoryVisit = {
  sessionId: string;
  startedAt: string;
  closedAt: string | null;
  totalAmount: number;
  status: string;
  tableNumber: number;
  tableName: string;
  location: string;
  isRodizio: boolean;
  numPeople: number;
};

export type CustomerHistoryOrder = {
  id: string;
  sessionId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  createdAt: string;
};

/**
 * GET /api/customers/[id]/history
 * Returns full customer details plus all reservations, visits (sessions), and orders.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    type FromReturn = ReturnType<(typeof supabase)["from"]>;
    const db = supabase as unknown as { from: (table: string) => FromReturn };

    const { data: customerRow, error: customerError } = await db
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (customerError || !customerRow) {
      if (customerError?.code === "PGRST116") {
        return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
      }
      return NextResponse.json(
        { error: customerError?.message ?? "Erro ao carregar cliente" },
        { status: 500 }
      );
    }

    const customer = mapCustomer(customerRow as Record<string, unknown>);
    const email = (customerRow as { email: string }).email;

    const [reservationsRes, sessionCustomersRes] = await Promise.all([
      db
        .from("reservations")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          phone,
          reservation_date,
          reservation_time,
          party_size,
          location,
          status,
          is_rodizio,
          special_requests,
          confirmed_at,
          cancelled_at,
          session_id,
          seated_at,
          created_at,
          table_id
        `
        )
        .eq("email", email)
        .order("reservation_date", { ascending: false })
        .order("reservation_time", { ascending: false }),
      db
        .from("session_customers")
        .select("id, session_id")
        .eq("customer_id", id),
    ]);

    const scData = (sessionCustomersRes.data ?? []) as { id: string; session_id: string }[];
    const sessionCustomerIds: string[] = scData.map((sc) => sc.id);
    const sessionIds: string[] = Array.from(
      new Set(scData.map((sc) => sc.session_id))
    );

    let reservations: CustomerHistoryReservation[] = [];
    if (reservationsRes.data?.length) {
      const resData = reservationsRes.data as { table_id: string | null }[];
      const tableIds = Array.from(
        new Set(resData.map((r) => r.table_id).filter(Boolean) as string[])
      );
      let tableMap: Record<string, { number: number; name: string }> = {};
      if (tableIds.length > 0) {
        const { data: tables } = await db
          .from("tables")
          .select("id, number, name")
          .in("id", tableIds);
        tableMap = (tables ?? []).reduce(
          (acc: Record<string, { number: number; name: string }>, t: { id: string; number: number; name: string }) => {
            acc[t.id] = { number: t.number, name: t.name };
            return acc;
          },
          {} as Record<string, { number: number; name: string }>
        );
      }
      reservations = (reservationsRes.data as unknown as Record<string, unknown>[]).map((r) => {
        const tid = r.table_id as string | null;
        const t = tid ? tableMap[tid] : null;
        return {
          id: r.id as string,
          firstName: r.first_name as string,
          lastName: r.last_name as string,
          email: r.email as string,
          phone: r.phone as string,
          reservationDate: r.reservation_date as string,
          reservationTime: r.reservation_time as string,
          partySize: r.party_size as number,
          location: r.location as string,
          status: r.status as string,
          tableNumber: t?.number ?? null,
          tableName: t?.name ?? null,
          isRodizio: Boolean(r.is_rodizio),
          specialRequests: r.special_requests as string | null,
          confirmedAt: r.confirmed_at as string | null,
          cancelledAt: r.cancelled_at as string | null,
          sessionId: r.session_id as string | null,
          seatedAt: r.seated_at as string | null,
          createdAt: r.created_at as string,
        };
      });
    }

    let visits: CustomerHistoryVisit[] = [];
    if (sessionIds.length > 0) {
      const { data: sessionsData } = await db
        .from("sessions")
        .select(
          `
          id,
          started_at,
          closed_at,
          total_amount,
          status,
          is_rodizio,
          num_people,
          table_id
        `
        )
        .in("id", sessionIds)
        .order("started_at", { ascending: false });

      if (sessionsData?.length) {
        const sessData = sessionsData as { table_id: string }[];
        const tids = Array.from(new Set(sessData.map((s) => s.table_id)));
        const { data: tables } = await db
          .from("tables")
          .select("id, number, name, location")
          .in("id", tids);
        const tableMap = (tables ?? []).reduce(
          (acc: Record<string, { number: number; name: string; location: string }>, t: { id: string; number: number; name: string; location: string }) => {
            acc[t.id] = { number: t.number, name: t.name, location: t.location };
            return acc;
          },
          {} as Record<string, { number: number; name: string; location: string }>
        );
        visits = (sessionsData as Record<string, unknown>[]).map((s) => {
          const t = tableMap[(s.table_id as string) ?? ""] ?? {
            number: 0,
            name: "—",
            location: "—",
          };
          return {
            sessionId: s.id as string,
            startedAt: s.started_at as string,
            closedAt: s.closed_at as string | null,
            totalAmount: Number(s.total_amount),
            status: s.status as string,
            tableNumber: t.number,
            tableName: t.name,
            location: t.location,
            isRodizio: Boolean(s.is_rodizio),
            numPeople: Number(s.num_people ?? 0),
          };
        });
      }
    }

    let orders: CustomerHistoryOrder[] = [];
    if (sessionCustomerIds.length > 0) {
      const { data: ordersData } = await db
        .from("orders")
        .select("id, session_id, product_id, quantity, unit_price, status, created_at")
        .in("session_customer_id", sessionCustomerIds)
        .order("created_at", { ascending: false });

      if (ordersData?.length) {
        const ordData = ordersData as { product_id: string }[];
        const productIds = Array.from(new Set(ordData.map((o) => o.product_id)));
        const { data: products } = await db
          .from("products")
          .select("id, name")
          .in("id", productIds);
        const productMap = (products ?? []).reduce(
          (acc: Record<string, string>, p: { id: string; name: string }) => {
            acc[p.id] = p.name;
            return acc;
          },
          {}
        );
        orders = (ordersData as unknown as Record<string, unknown>[]).map((o) => {
          const q = Number(o.quantity);
          const up = Number(o.unit_price);
          return {
            id: o.id as string,
            sessionId: o.session_id as string,
            productName: productMap[(o.product_id as string) ?? ""] ?? "—",
            quantity: q,
            unitPrice: up,
            total: q * up,
            status: o.status as string,
            createdAt: o.created_at as string,
          };
        });
      }
    }

    return NextResponse.json({
      customer,
      reservations,
      visits,
      orders,
    });
  } catch (err) {
    console.error("[customers/history] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar histórico" },
      { status: 500 }
    );
  }
}
