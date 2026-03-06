import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/repositories/SupabaseReservationRepository";
import { SupabaseRestaurantClosureRepository } from "@/infrastructure/repositories/SupabaseRestaurantClosureRepository";
import { SupabaseCustomerRepository } from "@/infrastructure/repositories/SupabaseCustomerRepository";
import {
  GetAllReservationsUseCase,
  CreateReservationUseCase,
} from "@/application/use-cases/reservations";
import type { ReservationFilter, CreateReservationData, Reservation } from "@/domain/entities/Reservation";
import type { Location, Reservation as LegacyReservation } from "@/types/database";
import { sendReservationEmails, sendReservationConfirmedEmail, sendRestaurantNotificationEmail } from "@/lib/email";

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

// GET - List reservations (for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
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
      source: reservation.source,
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

    const supabase = createAdminClient();

    // Validate location against DB
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", location)
      .eq("is_active", true)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Localização inválida" },
        { status: 400 }
      );
    }
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
      source: body.source ?? 'website',
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

    let reservation = result.data;

    // Upsert customer: create if new, update if existing
    try {
      const customerRepository = new SupabaseCustomerRepository(supabase);
      const existingCustomer = await customerRepository.findByEmail(reservationData.email);

      let customerId: string | null = null;

      if (!existingCustomer) {
        const newCustomer = await customerRepository.create({
          email: reservationData.email,
          name: `${reservationData.firstName} ${reservationData.lastName}`,
          phone: reservationData.phone,
          preferredLocation: reservationData.location as Location,
          marketingConsent: reservationData.marketingConsent,
        });
        customerId = newCustomer.id;
      } else {
        // Update phone, marketing consent, and preferred location if changed
        await customerRepository.update(existingCustomer.id, {
          phone: reservationData.phone,
          preferredLocation: reservationData.location as Location,
          ...(reservationData.marketingConsent && { marketingConsent: true }),
        });
        customerId = existingCustomer.id;
      }

      // Link customer to reservation
      if (customerId) {
        await supabase
          .from("reservations")
          .update({ customer_id: customerId })
          .eq("id", reservation.id);
      }
    } catch (customerError) {
      // Don't fail the reservation if customer upsert fails
      console.error("Customer upsert failed:", customerError);
    }

    // Auto-reservation: check if restaurant has auto-reservations enabled
    let autoAssigned = false;
    try {
      const { data: restaurantRow, error: restError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", location)
        .eq("is_active", true)
        .single();

      if (restError) {
        console.error("Auto-reservation: restaurant query failed:", restError.message);
      }

      const restaurantData = restaurantRow as Record<string, unknown> | null;
      const autoEnabled = !!restaurantData?.auto_reservations;
      const maxParty = Number(restaurantData?.auto_reservation_max_party_size) || 6;

      console.log("Auto-reservation check:", {
        location,
        autoEnabled,
        maxParty,
        partySize,
        eligible: autoEnabled && partySize <= maxParty,
      });

      if (autoEnabled && partySize <= maxParty) {
        // Find available tables at this location, ordered by capacity DESC
        const tableResult = await (supabase as any)
          .from("tables")
          .select("id, number, capacity")
          .eq("location", location)
          .eq("status", "available")
          .eq("is_active", true)
          .order("capacity", { ascending: false });
        const allAvailable = tableResult.data as { id: string; number: number; capacity: number }[] | null;
        const tableError = tableResult.error;

        if (tableError) {
          console.error("Auto-reservation: table query failed:", tableError.message);
        }

        // Select tables: try single table first, then combine if needed
        let selectedTables: { id: string; number: number; capacity: number }[] = [];
        if (allAvailable && allAvailable.length > 0) {
          // Option 1: single table that fits
          const singleTable = allAvailable.find((t) => t.capacity >= partySize);
          if (singleTable) {
            selectedTables = [singleTable];
          } else {
            // Option 2: combine tables (greedy - largest first until capacity met)
            let totalCapacity = 0;
            for (const table of allAvailable) {
              selectedTables.push(table);
              totalCapacity += table.capacity;
              if (totalCapacity >= partySize) break;
            }
            // Not enough capacity even combining all tables
            if (totalCapacity < partySize) {
              selectedTables = [];
            }
          }
        }

        const primaryTable = selectedTables[0] || null;
        console.log("Auto-reservation: selected tables:", selectedTables.map((t) => `#${t.number}(${t.capacity}p)`).join(" + ") || "none");

        // Find waiter with least active tables at this location
        const { data: waiterRole } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "waiter")
          .single();

        let bestWaiterId: string | null = null;
        if (waiterRole) {
          const { data: waiters, error: waitersError } = await supabase
            .from("staff")
            .select("id, name")
            .eq("role_id", waiterRole.id)
            .eq("location", location)
            .eq("is_active", true);

          if (waitersError) {
            console.error("Auto-reservation: waiters query failed:", waitersError.message);
          }
          console.log("Auto-reservation: waiters found:", waiters?.length ?? 0);

          if (waiters && waiters.length > 0) {
            const waiterIds = waiters.map((w: any) => w.id);
            const { data: assignments } = await supabase
              .from("waiter_tables")
              .select("staff_id")
              .in("staff_id", waiterIds);

            const countMap = new Map<string, number>();
            for (const wid of waiterIds) countMap.set(wid, 0);
            for (const a of assignments || []) {
              countMap.set(a.staff_id, (countMap.get(a.staff_id) || 0) + 1);
            }
            let minCount = Infinity;
            Array.from(countMap.entries()).forEach(([wid, count]) => {
              if (count < minCount) {
                minCount = count;
                bestWaiterId = wid;
              }
            });
            console.log("Auto-reservation: selected waiter:", bestWaiterId, "with", minCount, "tables");
          }
        } else {
          console.error("Auto-reservation: waiter role not found in roles table");
        }

        if (primaryTable && bestWaiterId) {
          // 1. Insert all tables into reservation_tables (primary + additional)
          const rtRows = selectedTables.map((t, i) => ({
            reservation_id: reservation.id,
            table_id: t.id,
            is_primary: i === 0,
            assigned_by: bestWaiterId,
          }));
          const { error: rtError } = await (supabase as any)
            .from("reservation_tables")
            .insert(rtRows);
          if (rtError) console.error("Auto-reservation: reservation_tables insert failed:", rtError.message);

          // 2. Update all selected tables status to reserved
          const allTableIds = selectedTables.map((t) => t.id);
          const { error: tsError } = await supabase
            .from("tables")
            .update({ status: "reserved" })
            .in("id", allTableIds);
          if (tsError) console.error("Auto-reservation: table status update failed:", tsError.message);

          // 3. Assign waiter to primary table if not already assigned
          const { data: existingAssignment } = await supabase
            .from("waiter_tables")
            .select("id")
            .eq("staff_id", bestWaiterId)
            .eq("table_id", primaryTable.id)
            .maybeSingle();

          if (!existingAssignment) {
            const { error: wtError } = await supabase.from("waiter_tables").insert({
              staff_id: bestWaiterId,
              table_id: primaryTable.id,
            });
            if (wtError) console.error("Auto-reservation: waiter_tables insert failed:", wtError.message);
          }

          // 4. Update reservation: confirm + assign primary table
          const now = new Date().toISOString();
          const { error: resError } = await (supabase as any)
            .from("reservations")
            .update({
              status: "confirmed",
              tables_assigned: true,
              table_id: primaryTable.id,
              confirmed_at: now,
            })
            .eq("id", reservation.id);
          if (resError) console.error("Auto-reservation: reservation update failed:", resError.message);

          // Update local reservation data for response
          reservation = {
            ...reservation,
            status: "confirmed" as const,
            tableId: primaryTable.id as any,
            confirmedAt: new Date(now),
          };
          autoAssigned = true;
          const tableDesc = selectedTables.map((t) => `#${t.number}`).join(" + ");
          console.log("Auto-reservation: SUCCESS -", tableDesc, "(", selectedTables.length, "mesa(s)) waiter", bestWaiterId);
        } else {
          console.log("Auto-reservation: skipped -", !primaryTable ? "no available tables" : "no waiter found");
        }
      }
    } catch (autoError) {
      // Auto-assignment failed — continue with manual flow (reservation stays pending)
      console.error("Auto-reservation assignment failed:", autoError);
    }

    // Send emails (don't block on this)
    const legacyReservation = mapToLegacyReservation(reservation);
    if (autoAssigned) {
      // Auto-confirmed: send "reserva confirmada" directly (skip "pending" acknowledgment)
      sendReservationConfirmedEmail(legacyReservation).catch((emailError) => {
        console.error("Error sending auto-confirmation email:", emailError);
      });
      // Notify restaurant separately
      sendRestaurantNotificationEmail(legacyReservation).catch((emailError) => {
        console.error("Error sending restaurant notification:", emailError);
      });
    } else {
      // Manual flow: send "recebemos o seu pedido" + restaurant notification
      sendReservationEmails(legacyReservation).catch((emailError) => {
        console.error("Error sending reservation emails:", emailError);
      });
    }

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
      auto_assigned: autoAssigned,
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
