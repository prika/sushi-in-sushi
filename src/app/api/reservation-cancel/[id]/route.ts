import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/repositories/SupabaseReservationRepository";
import { CustomerCancelReservationUseCase } from "@/application/use-cases/reservations/CustomerCancelReservationUseCase";
import { sendCancellationEmail } from "@/lib/email";
import type { Reservation as LegacyReservation } from "@/types/database";

/**
 * POST /api/reservation-cancel/[id]
 * Executes the cancellation after token verification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const token = (body.token || "").trim();
    const reason = (body.reason || "").trim();
    const reservationId = params.id;

    if (!email || !token || !reason) {
      return NextResponse.json(
        { error: "Email, código e motivo são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Re-verify token is valid and verified for this email
    const now = new Date().toISOString();
    const { data: tokenRow } = await (supabase as any)
      .from("reservation_cancel_tokens")
      .select("id")
      .eq("email", email)
      .eq("token", token)
      .not("verified_at", "is", null)
      .gte("expires_at", now)
      .limit(1)
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Sessão expirada. Por favor verifique novamente." },
        { status: 401 }
      );
    }

    // Execute cancellation via use case
    const repository = new SupabaseReservationRepository(supabase);
    const useCase = new CustomerCancelReservationUseCase(repository);

    const result = await useCase.execute({
      reservationId,
      verifiedEmail: email,
      reason,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        ALREADY_CANCELLED: 400,
        INVALID_STATUS: 400,
        DEADLINE_PASSED: 400,
      };
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusMap[result.code || ""] || 500 }
      );
    }

    // Release auto-assigned resources (tables + waiter)
    await releaseReservationResources(supabase, reservationId);

    // Send cancellation email
    try {
      const reservation = result.data;
      const legacyReservation: LegacyReservation = {
        id: reservation.id,
        first_name: reservation.firstName,
        last_name: reservation.lastName,
        email: reservation.email,
        phone: reservation.phone,
        reservation_date: reservation.reservationDate,
        reservation_time: reservation.reservationTime,
        party_size: reservation.partySize,
        location: reservation.location,
        table_id: reservation.tableId,
        is_rodizio: reservation.isRodizio,
        special_requests: reservation.specialRequests,
        occasion: reservation.occasion,
        status: reservation.status,
        confirmed_by: reservation.confirmedBy,
        confirmed_at: reservation.confirmedAt?.toISOString() || null,
        cancelled_at: reservation.cancelledAt?.toISOString() || null,
        cancellation_reason: reservation.cancellationReason,
        customer_id: reservation.customerId,
        session_id: reservation.sessionId,
        seated_at: reservation.seatedAt?.toISOString() || null,
        marketing_consent: reservation.marketingConsent,
        customer_email_id: null,
        customer_email_sent_at: null,
        customer_email_delivered_at: null,
        customer_email_opened_at: null,
        customer_email_status: null,
        confirmation_email_id: null,
        confirmation_email_sent_at: null,
        confirmation_email_delivered_at: null,
        confirmation_email_opened_at: null,
        confirmation_email_status: null,
        day_before_reminder_id: null,
        day_before_reminder_sent_at: null,
        day_before_reminder_delivered_at: null,
        day_before_reminder_opened_at: null,
        day_before_reminder_status: null,
        same_day_reminder_id: null,
        same_day_reminder_sent_at: null,
        same_day_reminder_delivered_at: null,
        same_day_reminder_opened_at: null,
        same_day_reminder_status: null,
        created_at: reservation.createdAt.toISOString(),
        updated_at: reservation.updatedAt.toISOString(),
      };
      sendCancellationEmail(legacyReservation, reason).catch(console.error);
    } catch (emailError) {
      console.error("Error sending cancellation email:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in cancel:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

/**
 * Release auto-assigned tables and waiter assignments for a cancelled reservation
 */
async function releaseReservationResources(
  supabase: ReturnType<typeof createAdminClient>,
  reservationId: string
) {
  try {
    // Get table assignments for this reservation
    const { data: rtRows } = await (supabase as any)
      .from("reservation_tables")
      .select("table_id, assigned_by")
      .eq("reservation_id", reservationId);

    if (!rtRows || rtRows.length === 0) return;

    const tableIds = rtRows.map((rt: any) => rt.table_id) as string[];
    const assignedBy = rtRows[0]?.assigned_by as string | null;

    // Delete reservation_tables entries
    await (supabase as any)
      .from("reservation_tables")
      .delete()
      .eq("reservation_id", reservationId);

    // For each table, check if any other reservation still references it
    for (const tableId of tableIds) {
      const { data: otherRefs } = await (supabase as any)
        .from("reservation_tables")
        .select("id")
        .eq("table_id", tableId)
        .limit(1);

      if (!otherRefs || otherRefs.length === 0) {
        // No other reservation uses this table — set back to available
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", tableId);
      }
    }

    // Clean up waiter assignment if no other reservations reference those tables
    if (assignedBy) {
      for (const tableId of tableIds) {
        const { data: otherWaiterRefs } = await (supabase as any)
          .from("reservation_tables")
          .select("id")
          .eq("table_id", tableId)
          .eq("assigned_by", assignedBy)
          .limit(1);

        if (!otherWaiterRefs || otherWaiterRefs.length === 0) {
          await supabase
            .from("waiter_tables")
            .delete()
            .eq("staff_id", assignedBy)
            .eq("table_id", tableId);
        }
      }
    }
  } catch (error) {
    console.error("Error releasing reservation resources:", error);
  }
}
