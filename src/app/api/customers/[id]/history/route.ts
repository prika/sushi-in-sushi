import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

function mapCustomer(row: CustomerRow) {
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

    const { data: customerRow, error: customerError } = await supabase
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

    const customer = mapCustomer(customerRow);
    const email = customerRow.email;

    const [reservationsRes, sessionCustomersRes] = await Promise.all([
      supabase
        .from("reservations")
        .select(
          "id, first_name, last_name, email, phone, reservation_date, reservation_time, party_size, location, status, is_rodizio, special_requests, confirmed_at, cancelled_at, session_id, seated_at, created_at, table_id"
        )
        .eq("email", email)
        .order("reservation_date", { ascending: false })
        .order("reservation_time", { ascending: false }),
      supabase
        .from("session_customers")
        .select("id, session_id")
        .eq("customer_id", id),
    ]);

    const scData = sessionCustomersRes.data ?? [];
    const sessionCustomerIds: string[] = scData.map((sc) => sc.id);
    const sessionIds: string[] = Array.from(
      new Set(scData.map((sc) => sc.session_id))
    );

    let reservations: CustomerHistoryReservation[] = [];
    if (reservationsRes.data?.length) {
      const tableIds = Array.from(
        new Set(
          reservationsRes.data
            .map((r) => r.table_id)
            .filter((tid): tid is string => tid !== null)
        )
      );
      let tableMap: Record<string, { number: number; name: string }> = {};
      if (tableIds.length > 0) {
        const { data: tables } = await supabase
          .from("tables")
          .select("id, number, name")
          .in("id", tableIds);
        tableMap = (tables ?? []).reduce(
          (acc: Record<string, { number: number; name: string }>, t) => {
            acc[t.id] = { number: t.number, name: t.name };
            return acc;
          },
          {}
        );
      }
      reservations = reservationsRes.data.map((r) => {
        const t = r.table_id ? tableMap[r.table_id] : null;
        return {
          id: r.id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone,
          reservationDate: r.reservation_date,
          reservationTime: r.reservation_time,
          partySize: r.party_size,
          location: r.location,
          status: r.status,
          tableNumber: t?.number ?? null,
          tableName: t?.name ?? null,
          isRodizio: r.is_rodizio,
          specialRequests: r.special_requests,
          confirmedAt: r.confirmed_at,
          cancelledAt: r.cancelled_at,
          sessionId: r.session_id,
          seatedAt: r.seated_at,
          createdAt: r.created_at,
        };
      });
    }

    let visits: CustomerHistoryVisit[] = [];
    if (sessionIds.length > 0) {
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id, started_at, closed_at, total_amount, status, is_rodizio, num_people, table_id")
        .in("id", sessionIds)
        .order("started_at", { ascending: false });

      if (sessionsData?.length) {
        const tids = Array.from(new Set(sessionsData.map((s) => s.table_id)));
        const { data: tables } = await supabase
          .from("tables")
          .select("id, number, name, location")
          .in("id", tids);
        const tableMap = (tables ?? []).reduce(
          (acc: Record<string, { number: number; name: string; location: string }>, t) => {
            acc[t.id] = { number: t.number, name: t.name, location: t.location };
            return acc;
          },
          {} as Record<string, { number: number; name: string; location: string }>
        );
        visits = sessionsData.map((s) => {
          const t = tableMap[s.table_id] ?? {
            number: 0,
            name: "—",
            location: "—",
          };
          return {
            sessionId: s.id,
            startedAt: s.started_at,
            closedAt: s.closed_at,
            totalAmount: s.total_amount,
            status: s.status,
            tableNumber: t.number,
            tableName: t.name,
            location: t.location,
            isRodizio: s.is_rodizio,
            numPeople: s.num_people,
          };
        });
      }
    }

    let orders: CustomerHistoryOrder[] = [];
    if (sessionCustomerIds.length > 0) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, session_id, product_id, quantity, unit_price, status, created_at")
        .in("session_customer_id", sessionCustomerIds)
        .order("created_at", { ascending: false });

      if (ordersData?.length) {
        const productIds = Array.from(new Set(ordersData.map((o) => o.product_id)));
        const { data: products } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);
        const productMap = (products ?? []).reduce(
          (acc: Record<string, string>, p) => {
            acc[p.id] = p.name;
            return acc;
          },
          {}
        );
        orders = ordersData.map((o) => {
          return {
            id: o.id,
            sessionId: o.session_id,
            productName: productMap[o.product_id] ?? "—",
            quantity: o.quantity,
            unitPrice: o.unit_price,
            total: o.quantity * o.unit_price,
            status: o.status,
            createdAt: o.created_at,
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
