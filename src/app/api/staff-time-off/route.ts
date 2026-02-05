import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import type { StaffTimeOffInsert } from "@/types/database";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// GET - List staff time off entries
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const { searchParams } = new URL(request.url);

    const staffId = searchParams.get("staff_id");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    let query = extendedSupabase
      .from("staff_time_off")
      .select(`
        *,
        staff:staff_id(id, name, email),
        approver:approved_by(id, name)
      `)
      .order("start_date", { ascending: true });

    if (staffId) {
      query = query.eq("staff_id", parseInt(staffId));
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Filter by month/year if provided
    if (month && year) {
      const startOfMonth = `${year}-${month.padStart(2, "0")}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split("T")[0];

      // Get entries that overlap with the month
      query = query
        .lte("start_date", endOfMonth)
        .gte("end_date", startOfMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching staff time off:", error);
      throw error;
    }

    // Transform data to include staff name
    const transformedData = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      staff_name: (item.staff as { name: string } | null)?.name || "Unknown",
      staff_email: (item.staff as { email: string } | null)?.email || "",
      approved_by_name: (item.approver as { name: string } | null)?.name || null,
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error in GET staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao carregar ausencias" },
      { status: 500 }
    );
  }
}

// POST - Create new time off entry
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create time off entries
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir ausencias" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const body: StaffTimeOffInsert = await request.json();

    // Validate required fields
    if (!body.staff_id) {
      return NextResponse.json(
        { error: "ID do funcionario e obrigatorio" },
        { status: 400 }
      );
    }

    if (!body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "Datas de inicio e fim sao obrigatorias" },
        { status: 400 }
      );
    }

    // Validate dates
    if (new Date(body.end_date) < new Date(body.start_date)) {
      return NextResponse.json(
        { error: "Data de fim deve ser igual ou posterior a data de inicio" },
        { status: 400 }
      );
    }

    // Create with approved status and current admin as approver
    const timeOffData = {
      ...body,
      type: body.type || "vacation",
      status: "approved",
      approved_by: auth.id,
      approved_at: new Date().toISOString(),
    };

    const { data, error } = await extendedSupabase
      .from("staff_time_off")
      .insert(timeOffData)
      .select(`
        *,
        staff:staff_id(id, name, email),
        approver:approved_by(id, name)
      `)
      .single();

    if (error) {
      console.error("Error creating time off:", error);
      throw error;
    }

    const transformedData = {
      ...data,
      staff_name: (data as { staff: { name: string } | null }).staff?.name || "Unknown",
      staff_email: (data as { staff: { email: string } | null }).staff?.email || "",
      approved_by_name: (data as { approver: { name: string } | null }).approver?.name || null,
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error("Error in POST staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao criar ausencia" },
      { status: 500 }
    );
  }
}
