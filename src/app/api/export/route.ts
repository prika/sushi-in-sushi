import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Types for export data
interface SessionOrder {
  id: string;
  quantity: number;
  unit_price: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  products: { name: string }[] | null;
}

interface SessionWithOrders {
  id: string;
  created_at: string;
  closed_at: string | null;
  status: string;
  tables: { number: number }[] | null;
  orders: SessionOrder[];
}

interface ExportRow {
  sessao_id: string;
  mesa: number | string;
  sessao_inicio: string;
  sessao_fim: string;
  sessao_estado: string;
  pedido_id: string;
  produto: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  pedido_estado: string;
  notas: string;
  pedido_hora: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing date range" },
      { status: 400 }
    );
  }

  // Create Supabase client with service role for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Build query
  let query = supabase
    .from("sessions")
    .select(`
      id,
      created_at,
      closed_at,
      status,
      tables (number),
      orders (
        id,
        quantity,
        unit_price,
        status,
        notes,
        created_at,
        products (name)
      )
    `)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: sessions, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json(
      { error: "No data found" },
      { status: 404 }
    );
  }

  // Transform data for export
  const exportData: ExportRow[] = (sessions as unknown as SessionWithOrders[]).flatMap((session) => {
    const orders = session.orders || [];
    const tableNumber = session.tables?.[0]?.number || "";

    if (orders.length === 0) {
      // Return session with no orders
      return [{
        sessao_id: session.id,
        mesa: tableNumber,
        sessao_inicio: session.created_at,
        sessao_fim: session.closed_at || "",
        sessao_estado: session.status,
        pedido_id: "",
        produto: "",
        quantidade: 0,
        preco_unitario: 0,
        preco_total: 0,
        pedido_estado: "",
        notas: "",
        pedido_hora: "",
      }];
    }

    return orders.map((order) => ({
      sessao_id: session.id,
      mesa: tableNumber,
      sessao_inicio: session.created_at,
      sessao_fim: session.closed_at || "",
      sessao_estado: session.status,
      pedido_id: order.id,
      produto: order.products?.[0]?.name || "",
      quantidade: order.quantity,
      preco_unitario: order.unit_price || 0,
      preco_total: (order.quantity * (order.unit_price || 0)),
      pedido_estado: order.status,
      notas: order.notes || "",
      pedido_hora: order.created_at,
    }));
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  }

  // CSV format
  const headers = [
    "Sessão ID",
    "Mesa",
    "Sessão Início",
    "Sessão Fim",
    "Sessão Estado",
    "Pedido ID",
    "Produto",
    "Quantidade",
    "Preço Unitário",
    "Preço Total",
    "Pedido Estado",
    "Notas",
    "Pedido Hora",
  ];

  const csvRows = [
    headers.join(";"),
    ...exportData.map((row) =>
      [
        row.sessao_id,
        row.mesa,
        formatDateTime(row.sessao_inicio),
        row.sessao_fim ? formatDateTime(row.sessao_fim) : "",
        translateStatus(row.sessao_estado),
        row.pedido_id,
        row.produto,
        row.quantidade,
        row.preco_unitario.toFixed(2).replace(".", ","),
        row.preco_total.toFixed(2).replace(".", ","),
        translateOrderStatus(row.pedido_estado),
        `"${(row.notas || "").replace(/"/g, '""')}"`,
        row.pedido_hora ? formatDateTime(row.pedido_hora) : "",
      ].join(";")
    ),
  ];

  const csv = csvRows.join("\n");

  // Add BOM for Excel compatibility with UTF-8
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    active: "Ativa",
    pending_payment: "Conta Pedida",
    paid: "Paga",
    closed: "Fechada",
  };
  return translations[status] || status;
}

function translateOrderStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: "Pendente",
    preparing: "A Preparar",
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return translations[status] || status;
}
