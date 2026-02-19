import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/repositories/SupabaseReservationRepository";
import { SupabaseRestaurantClosureRepository } from "@/infrastructure/repositories/SupabaseRestaurantClosureRepository";
import {
  GetAllReservationsUseCase,
  CreateReservationUseCase,
} from "@/application/use-cases/reservations";
import type { ReservationFilter, CreateReservationData, Reservation } from "@/domain/entities/Reservation";
import type { Location } from "@/types/database";
import { sendReservationEmails } from "@/lib/email";
import type { Reservation as LegacyReservation } from "@/types/database";

// Helper to map domain entity to legacy format for emails
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

// GET - List reservations (for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const repository = new SupabaseReservationRepository(supabase);
    const getAllReservations = new GetAllReservationsUseCase(repository);

    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const location = searchParams.get("location") as Location | null;
    const status = searchParams.get("status");

    const filter: ReservationFilter = {};

    if (date) {
      filter.date = date;
    }
    if (location) {
      filter.location = location;
    }
    if (status) {
      filter.status = status as ReservationFilter["status"];
    }

    const result = await getAllReservations.execute(filter);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Map to database format for backwards compatibility
    const data = result.data.map((reservation) => ({
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
      session_id: reservation.sessionId,
      seated_at: reservation.seatedAt?.toISOString() || null,
      marketing_consent: reservation.marketingConsent,
      created_at: reservation.createdAt.toISOString(),
      updated_at: reservation.updatedAt.toISOString(),
      // Additional fields from details view
      table_number: reservation.tableNumber,
      table_name: reservation.tableName,
      confirmed_by_name: reservation.confirmedByName,
      customer_name: reservation.customerName,
      status_label: reservation.statusLabel,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Erro ao carregar reservas" },
      { status: 500 }
    );
  }
}

// POST - Create new reservation (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields (support both camelCase and snake_case)
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    const email = body.email;
    const phone = body.phone;
    const reservationDate = body.reservationDate || body.reservation_date;
    const reservationTime = body.reservationTime || body.reservation_time;
    const partySize = body.partySize || body.party_size;
    const location = body.location as Location;

    if (!firstName || !lastName || !email || !phone || !reservationDate || !reservationTime || !partySize || !location) {
      return NextResponse.json(
        { error: "Campos obrigatórios em falta" },
        { status: 400 }
      );
    }

    // Validate party size
    if (partySize < 1 || partySize > 20) {
      return NextResponse.json(
        { error: "Número de pessoas deve ser entre 1 e 20" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const parsedDate = new Date(reservationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
      return NextResponse.json(
        { error: "Não é possível reservar para datas passadas" },
        { status: 400 }
      );
    }

    // Validate time is not in the past (for same-day reservations)
    if (parsedDate.getTime() === today.getTime()) {
      const now = new Date();
      const [hours, minutes] = reservationTime.split(":").map(Number);
      const reservationDateTime = new Date();
      reservationDateTime.setHours(hours, minutes, 0, 0);

      // Add 30 minutes buffer - don't allow reservations within 30 minutes
      const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);

      if (reservationDateTime < bufferTime) {
        return NextResponse.json(
          { error: "Não é possível reservar para horários que já passaram. Por favor escolha um horário futuro." },
          { status: 400 }
        );
      }
    }

    // Validate location
    if (!["circunvalacao", "boavista"].includes(location)) {
      return NextResponse.json(
        { error: "Localização inválida" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const reservationRepository = new SupabaseReservationRepository(supabase);
    const closureRepository = new SupabaseRestaurantClosureRepository(supabase);
    const createReservation = new CreateReservationUseCase(reservationRepository, closureRepository);

    // Build CreateReservationData
    const reservationData: CreateReservationData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      reservationDate,
      reservationTime,
      partySize,
      location,
      isRodizio: body.isRodizio ?? body.is_rodizio ?? true,
      specialRequests: (body.specialRequests || body.special_requests)?.trim() || null,
      occasion: body.occasion || null,
      marketingConsent: body.marketingConsent ?? body.marketing_consent ?? false,
    };

    const result = await createReservation.execute(reservationData);

    if (!result.success) {
      if (result.code === "RESTAURANT_CLOSED") {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const reservation = result.data;

    // Send confirmation emails (don't block on this)
    const legacyReservation = mapToLegacyReservation(reservation);
    sendReservationEmails(legacyReservation).catch((emailError) => {
      console.error("Error sending reservation emails:", emailError);
    });

    // Return in database format for backwards compatibility
    return NextResponse.json({
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
      session_id: reservation.sessionId,
      seated_at: reservation.seatedAt?.toISOString() || null,
      marketing_consent: reservation.marketingConsent,
      created_at: reservation.createdAt.toISOString(),
      updated_at: reservation.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Erro ao criar reserva. Por favor tente novamente." },
      { status: 500 }
    );
  }
}
