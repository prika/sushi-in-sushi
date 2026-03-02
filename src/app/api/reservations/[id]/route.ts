import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseReservationRepository } from "@/infrastructure/repositories/SupabaseReservationRepository";
import {
  GetReservationByIdUseCase,
  UpdateReservationUseCase,
  ConfirmReservationUseCase,
  CancelReservationUseCase,
  MarkReservationSeatedUseCase,
  MarkReservationNoShowUseCase,
  DeleteReservationUseCase,
} from "@/application/use-cases/reservations";
import type { UpdateReservationData, Reservation } from "@/domain/entities/Reservation";
import type { Reservation as LegacyReservation } from "@/types/database";
import { sendReservationConfirmedEmail, sendCancellationEmail } from "@/lib/email";
import { SupabaseCustomerRepository } from "@/infrastructure/repositories/SupabaseCustomerRepository";
import { RecordCustomerVisitUseCase } from "@/application/use-cases/customers/RecordCustomerVisitUseCase";

export const dynamic = "force-dynamic";

// Helper to map domain entity to legacy format
function mapToLegacyReservation(reservation: Reservation): LegacyReservation {
  return {
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
    // Email tracking fields (not stored in domain entity)
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
}

// Helper to map domain entity to response format
function mapToResponse(reservation: Reservation) {
  return {
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
    created_at: reservation.createdAt.toISOString(),
    updated_at: reservation.updatedAt.toISOString(),
  };
}

// GET - Get single reservation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseReservationRepository(supabase);
    const getReservationById = new GetReservationByIdUseCase(repository);

    const result = await getReservationById.execute(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "Reserva não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapToResponse(result.data));
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Erro ao carregar reserva" },
      { status: 500 }
    );
  }
}

// PATCH - Update reservation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createAdminClient();
    const repository = new SupabaseReservationRepository(supabase);

    // Handle status changes with specialized use-cases
    const status = body.status;

    let result;

    if (status === "confirmed") {
      const confirmReservation = new ConfirmReservationUseCase(repository);
      result = await confirmReservation.execute(id, user.id);
    } else if (status === "cancelled") {
      const cancelReservation = new CancelReservationUseCase(repository);
      const reason = body.cancellation_reason || body.cancellationReason;
      const cancellationSource = body.cancellation_source || 'site';
      result = await cancelReservation.execute(id, reason, 'admin', cancellationSource);
    } else if (status === "completed" && (body.session_id || body.sessionId)) {
      const markSeated = new MarkReservationSeatedUseCase(repository);
      result = await markSeated.execute(id, body.session_id || body.sessionId);
    } else if (status === "no_show") {
      const markNoShow = new MarkReservationNoShowUseCase(repository);
      result = await markNoShow.execute(id);
    } else {
      // General update
      const updateReservation = new UpdateReservationUseCase(repository);

      const updateData: UpdateReservationData = {};

      if (body.status !== undefined) updateData.status = body.status;
      if (body.table_id !== undefined || body.tableId !== undefined) {
        updateData.tableId = body.tableId ?? body.table_id;
      }
      if (body.cancellation_reason !== undefined || body.cancellationReason !== undefined) {
        updateData.cancellationReason = body.cancellationReason ?? body.cancellation_reason;
      }
      if (body.session_id !== undefined || body.sessionId !== undefined) {
        updateData.sessionId = body.sessionId ?? body.session_id;
      }

      // Set timestamps based on status change
      if (body.status === "confirmed") {
        updateData.confirmedBy = user.id;
      }

      result = await updateReservation.execute(id, updateData);
    }

    if (!result.success) {
      if (result.error.includes("não encontrada") || result.error.includes("not found")) {
        return NextResponse.json(
          { error: "Reserva não encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const reservation = result.data;

    // Send confirmation email if status changed to confirmed
    if (status === "confirmed" && reservation) {
      const legacyReservation = mapToLegacyReservation(reservation);
      sendReservationConfirmedEmail(legacyReservation).catch((emailError) => {
        console.error("Error sending confirmation email:", emailError);
      });
    }

    // Send cancellation email if status changed to cancelled
    if (status === "cancelled" && reservation) {
      const legacyReservation = mapToLegacyReservation(reservation);
      const reason = body.cancellation_reason || body.cancellationReason || "Cancelada pelo restaurante";
      sendCancellationEmail(legacyReservation, reason).catch((emailError) => {
        console.error("Error sending cancellation email:", emailError);
      });
    }

    // Record customer visit when reservation is completed (customer showed up)
    if (status === "completed" && reservation) {
      try {
        const customerRepository = new SupabaseCustomerRepository(supabase);
        const customer = reservation.customerId
          ? await customerRepository.findById(reservation.customerId)
          : await customerRepository.findByEmail(reservation.email);
        if (customer) {
          const recordVisit = new RecordCustomerVisitUseCase(customerRepository);
          await recordVisit.execute(customer.id, 0);
        }
      } catch (visitError) {
        console.error("Customer visit recording failed:", visitError);
      }
    }

    return NextResponse.json(mapToResponse(reservation));
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar reserva" },
      { status: 500 }
    );
  }
}

// DELETE - Delete reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseReservationRepository(supabase);
    const deleteReservation = new DeleteReservationUseCase(repository);

    const result = await deleteReservation.execute(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar reserva" },
      { status: 500 }
    );
  }
}
