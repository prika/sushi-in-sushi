import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateICS, type CalendarEvent } from "@/lib/calendar/ics";

const TIME_OFF_TYPE_LABELS: Record<string, string> = {
  vacation: "Férias",
  sick: "Doença",
  personal: "Pessoal",
  other: "Outro",
};

interface TimeOffRow {
  id: number;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: timeOff, error: toError } = await (supabase as any)
      .from("staff_time_off")
      .select("*")
      .eq("id", numericId)
      .single() as { data: TimeOffRow | null; error: unknown };

    if (toError || !timeOff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch staff name
    const { data: staffData } = await supabase
      .from("staff")
      .select("name")
      .eq("id", timeOff.staff_id)
      .single();

    const staffName = (staffData as { name: string } | null)?.name || "Colaborador";
    const typeLabel = TIME_OFF_TYPE_LABELS[timeOff.type] || timeOff.type;

    const event: CalendarEvent = {
      id: `timeoff-${timeOff.id}`,
      title: `${typeLabel} — ${staffName}`,
      description: timeOff.reason
        ? `Tipo: ${typeLabel}\nMotivo: ${timeOff.reason}`
        : `Tipo: ${typeLabel}`,
      startDate: timeOff.start_date,
      endDate: timeOff.end_date,
      allDay: true,
      location: "Sushi in Sushi",
    };

    const icsContent = generateICS([event]);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ausencia-${timeOff.id}.ics"`,
      },
    });
  } catch (error) {
    console.error("Error generating ICS:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
