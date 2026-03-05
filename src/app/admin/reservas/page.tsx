"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import ReservationsCalendar from "@/components/calendar/ReservationsCalendar";
import { ReservationAnalytics } from "@/components/admin/ReservationAnalytics";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Check,
  X,
  Filter,
} from "lucide-react";
import type { ReservationStatus, Location } from "@/types/database";
import { getReasonsForSource } from "@/lib/constants/cancellation-reasons";

type EmailStatus = "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";

interface AssignedTable {
  table_number: number;
  is_primary: boolean;
}

interface Reservation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: Location;
  is_rodizio: boolean;
  special_requests: string | null;
  occasion: string | null;
  status: ReservationStatus;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: 'admin' | 'customer' | null;
  cancellation_source: 'site' | 'phone' | null;
  table_id: string | null;
  table_number?: number | null;
  tables_assigned?: boolean;
  // Auto-assignment info
  assigned_tables?: AssignedTable[];
  assigned_waiter_name?: string | null;
  // Email tracking
  customer_email_id: string | null;
  customer_email_sent_at: string | null;
  customer_email_delivered_at: string | null;
  customer_email_opened_at: string | null;
  customer_email_status: EmailStatus | null;
  confirmation_email_id: string | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_delivered_at: string | null;
  confirmation_email_opened_at: string | null;
  confirmation_email_status: EmailStatus | null;
  // Reminder tracking
  day_before_reminder_id: string | null;
  day_before_reminder_sent_at: string | null;
  day_before_reminder_delivered_at: string | null;
  day_before_reminder_opened_at: string | null;
  day_before_reminder_status: EmailStatus | null;
  same_day_reminder_id: string | null;
  same_day_reminder_sent_at: string | null;
  same_day_reminder_delivered_at: string | null;
  same_day_reminder_opened_at: string | null;
  same_day_reminder_status: EmailStatus | null;
}

const emailStatusConfig: Record<string, { icon: string; label: string; color: string }> = {
  sent: { icon: "📤", label: "Enviado", color: "text-blue-600" },
  delivered: { icon: "✅", label: "Entregue", color: "text-green-600" },
  opened: { icon: "👁️", label: "Lido", color: "text-purple-600" },
  clicked: { icon: "🔗", label: "Clicado", color: "text-indigo-600" },
  bounced: { icon: "❌", label: "Rejeitado", color: "text-red-600" },
  complained: { icon: "⚠️", label: "Spam", color: "text-orange-600" },
  failed: { icon: "❌", label: "Falhou", color: "text-red-600" },
  not_sent: { icon: "⏳", label: "Não enviado", color: "text-gray-400" },
};

const statusConfig: Record<
  ReservationStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendente" },
  confirmed: { bg: "bg-green-100", text: "text-green-700", label: "Confirmada" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelada" },
  completed: { bg: "bg-blue-100", text: "text-blue-700", label: "Concluída" },
  no_show: { bg: "bg-gray-100", text: "text-gray-700", label: "Não Compareceu" },
};

const occasionLabels: Record<string, string> = {
  birthday: "Aniversário",
  anniversary: "Celebração",
  business: "Negócios",
  other: "Outro",
};

export default function ReservationsPage() {
  const [pageView, setPageView] = useState<"reservas" | "analytics">("reservas");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"future" | "date">("future");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<Location | "">("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dynamic restaurant locations
  const [restaurantLocations, setRestaurantLocations] = useState<{ slug: string; name: string }[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("restaurants")
      .select("slug, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data?.length) setRestaurantLocations(data);
      });
  }, []);

  const fetchReservations = useCallback(async () => {
    setFetchError(null);
    const supabase = createClient();

    let query = supabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    // Apply date filter based on view mode
    if (viewMode === "future") {
      // Show today onwards
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("reservation_date", today);
    } else if (selectedDate) {
      // Show specific date (from calendar click)
      query = query.eq("reservation_date", selectedDate);
    }

    if (locationFilter) {
      query = query.eq("location", locationFilter);
    }
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reservations:", error);
      setFetchError(error.message);
      setIsLoading(false);
      return;
    }

    // Fetch assigned tables and waiter info for reservations
    // Cast needed: new columns (cancelled_by, cancellation_source) may not be in generated Supabase types yet
    let enrichedReservations: Reservation[] = (data || []) as unknown as Reservation[];

    if (enrichedReservations.length > 0) {
      const reservationIds = enrichedReservations.map(r => r.id);

      // Fetch reservation_tables with table numbers
      const { data: rtData } = await (supabase as any)
        .from("reservation_tables")
        .select("reservation_id, table_id, is_primary, assigned_by")
        .in("reservation_id", reservationIds);

      if (rtData && rtData.length > 0) {
        // Get unique table IDs and fetch their numbers
        const tableIds = Array.from(new Set(rtData.map((rt: any) => rt.table_id))) as string[];
        const { data: tablesData } = await supabase
          .from("tables")
          .select("id, number")
          .in("id", tableIds);

        const tableNumberMap = new Map<string, number>();
        if (tablesData) {
          tablesData.forEach((t: any) => tableNumberMap.set(t.id, t.number));
        }

        // Get unique waiter IDs and fetch their names
        const waiterIds = Array.from(new Set(rtData.map((rt: any) => rt.assigned_by).filter(Boolean))) as string[];
        const waiterNameMap = new Map<string, string>();
        if (waiterIds.length > 0) {
          const { data: staffData } = await supabase
            .from("staff")
            .select("id, name")
            .in("id", waiterIds);
          if (staffData) {
            staffData.forEach((s: any) => waiterNameMap.set(s.id, s.name));
          }
        }

        // Group tables by reservation
        const assignmentMap = new Map<string, { tables: AssignedTable[]; waiterName: string | null }>();
        rtData.forEach((rt: any) => {
          const existing = assignmentMap.get(rt.reservation_id) || { tables: [], waiterName: null };
          const tableNumber = tableNumberMap.get(rt.table_id);
          if (tableNumber !== undefined) {
            existing.tables.push({ table_number: tableNumber, is_primary: rt.is_primary });
          }
          if (rt.assigned_by && waiterNameMap.has(rt.assigned_by)) {
            existing.waiterName = waiterNameMap.get(rt.assigned_by) || null;
          }
          assignmentMap.set(rt.reservation_id, existing);
        });

        // Enrich reservations with assignment data
        enrichedReservations = enrichedReservations.map(r => {
          const assignment = assignmentMap.get(r.id);
          if (assignment) {
            return {
              ...r,
              assigned_tables: assignment.tables.sort((a, b) =>
                a.is_primary === b.is_primary ? a.table_number - b.table_number : a.is_primary ? -1 : 1
              ),
              assigned_waiter_name: assignment.waiterName,
            };
          }
          return r;
        });
      }
    }

    setReservations(enrichedReservations);
    setIsLoading(false);
  }, [viewMode, selectedDate, locationFilter, statusFilter]);

  useEffect(() => {
    fetchReservations();

    const supabase = createClient();
    const channel = supabase
      .channel("reservations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservations]);

  const updateReservationStatus = async (
    id: string,
    status: ReservationStatus,
    cancellationReason?: string,
    cancellationSource?: string
  ) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cancellation_reason: cancellationReason,
          cancellation_source: cancellationSource,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reservation");
      }

      setSelectedReservation(null);
      fetchReservations();
    } catch (error) {
      console.error("Error updating reservation:", error);
      alert("Erro ao atualizar reserva");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const [showCancelled, setShowCancelled] = useState(false);

  // Separate pending, active, and cancelled
  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const activeReservations = reservations.filter(r => r.status !== 'pending' && r.status !== 'cancelled');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

  // Group active reservations by date and time
  const groupedReservations = activeReservations.reduce(
    (acc, reservation) => {
      const dateKey = reservation.reservation_date;
      const timeKey = reservation.reservation_time;
      const key = `${dateKey}|${timeKey}`;

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(reservation);
      return acc;
    },
    {} as Record<string, Reservation[]>
  );

  // Sort time slots chronologically
  const timeSlots = Object.keys(groupedReservations).sort((a, b) => {
    const [dateA, timeA] = a.split("|");
    const [dateB, timeB] = b.split("|");
    return dateA === dateB
      ? timeA.localeCompare(timeB)
      : dateA.localeCompare(dateB);
  });

  // Stats
  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
    totalGuests: reservations
      .filter((r) => r.status !== "cancelled")
      .reduce((sum, r) => sum + r.party_size, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page-level Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-0">
        <button
          onClick={() => setPageView("reservas")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            pageView === "reservas"
              ? "border-[#D4AF37] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Reservas
        </button>
        <button
          onClick={() => setPageView("analytics")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            pageView === "analytics"
              ? "border-[#D4AF37] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Analytics View */}
      {pageView === "analytics" && <ReservationAnalytics />}

      {/* Reservations View */}
      {pageView === "reservas" && <>
      {/* Error Message */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Erro ao carregar reservas</p>
          <p className="text-sm mt-1">{fetchError}</p>
          <p className="text-xs mt-2 text-red-500">
            Verifique se a migração SQL foi executada no Supabase.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            {stats.pending > 0 && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />}
            Pendentes
          </p>
          <p className="text-xl font-bold text-yellow-700 mt-0.5">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <p className="text-xs text-green-600">Confirmadas</p>
          <p className="text-xl font-bold text-green-700 mt-0.5">{stats.confirmed}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
          <p className="text-xs text-red-600">Canceladas</p>
          <p className="text-xl font-bold text-red-700 mt-0.5">{stats.cancelled}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-600">Total Pessoas</p>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.totalGuests}</p>
        </div>
      </div>

      {/* Filters */}
      <Card variant="light">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as Location | "")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            <option value="">Todos os restaurantes</option>
            {restaurantLocations.map((loc) => (
              <option key={loc.slug} value={loc.slug}>{loc.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ReservationStatus | "")
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            <option value="">Todos os estados</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
            <option value="completed">Concluída</option>
            <option value="no_show">Não Compareceu</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => {
                setViewMode("future");
                setSelectedDate(null);
              }}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                viewMode === "future"
                  ? "bg-[#D4AF37] text-white"
                  : "text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/20"
              }`}
            >
              Próximas
            </button>
            <button
              onClick={() => setViewMode("date")}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                viewMode === "date"
                  ? "bg-[#D4AF37] text-white"
                  : "text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/20"
              }`}
            >
              Por Data
            </button>
          </div>
        </div>
      </Card>

      {/* Main Content: 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Reservations List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Section (Always Visible) */}
          {pendingReservations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <h2 className="text-lg font-semibold text-yellow-700">
                  Pendentes de Confirmação ({pendingReservations.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    isPending={true}
                    onClick={() => setSelectedReservation(reservation)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Reservations (confirmed, completed, no_show) */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {viewMode === "future"
                ? "Próximas Reservas"
                : selectedDate
                  ? `Reservas - ${formatDate(selectedDate)}`
                  : "Selecione uma data no calendário"
              }
            </h2>

            {timeSlots.length === 0 ? (
              <Card variant="light">
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {viewMode === "future"
                      ? "Nenhuma reserva próxima (apenas pendentes acima)"
                      : selectedDate
                        ? "Nenhuma reserva para esta data (ver pendentes acima)"
                        : "Selecione uma data no calendário"}
                  </p>
                  {!fetchError && !selectedDate && (
                    <p className="text-xs text-gray-400 mt-2">
                      Use o calendário à direita para ver reservas de datas específicas
                    </p>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {timeSlots.map((slot) => {
                  const [date, time] = slot.split("|");
                  return (
                    <div key={slot}>
                      <div className="flex items-center gap-2 mb-3">
                        {viewMode === "future" && (
                          <>
                            <Calendar size={18} className="text-[#D4AF37]" />
                            <span className="text-sm font-medium text-gray-600">
                              {formatDate(date)}
                            </span>
                            <span className="text-gray-300">|</span>
                          </>
                        )}
                        <Clock size={18} className="text-[#D4AF37]" />
                        <h3 className="text-lg font-semibold text-gray-800">{time}</h3>
                        <span className="text-sm text-gray-400">
                          ({groupedReservations[slot].length} reserva
                          {groupedReservations[slot].length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupedReservations[slot].map((reservation) => (
                          <ReservationCard
                            key={reservation.id}
                            reservation={reservation}
                            isPending={false}
                            onClick={() => setSelectedReservation(reservation)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cancelled Reservations (collapsible) */}
          {cancelledReservations.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowCancelled(!showCancelled)}
                className="flex items-center gap-2 w-full text-left"
              >
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                <h2 className="text-lg font-semibold text-red-600">
                  Canceladas ({cancelledReservations.length})
                </h2>
                <svg
                  className={`w-4 h-4 text-red-400 transition-transform ${showCancelled ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCancelled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cancelledReservations.map((reservation) => (
                    <CancelledReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onClick={() => setSelectedReservation(reservation)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Calendar (1/3 width on large screens) */}
        <div className="lg:col-span-1">
          <ReservationsCalendar
            reservations={reservations.filter(r => r.status !== 'cancelled')}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setViewMode("date");
            }}
          />
        </div>
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdateStatus={updateReservationStatus}
          isUpdating={isUpdating}
        />
      )}
      </>}
    </div>
  );
}

function ReservationCard({
  reservation,
  isPending = false,
  onClick,
}: {
  reservation: Reservation;
  isPending?: boolean;
  onClick: () => void;
}) {
  const config = statusConfig[reservation.status];

  return (
    <>
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(253 224 71); }
          50% { border-color: rgb(250 204 21); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
      <div
        className={`cursor-pointer hover:shadow-md transition-all ${
          isPending ? "animate-pulse-border" : ""
        }`}
        onClick={onClick}
      >
      <Card
        variant="light"
        className={isPending ? "border-2 border-yellow-300" : ""}
      >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            {reservation.first_name} {reservation.last_name}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users size={14} />
            <span>{reservation.party_size} pessoas</span>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={14} />
          <span className="capitalize">{reservation.location}</span>
          <span className="text-gray-400">•</span>
          <span>{reservation.is_rodizio ? "Rodízio" : "À Carta"}</span>
        </div>
        {/* Assigned Tables & Waiter */}
        {reservation.assigned_tables && reservation.assigned_tables.length > 0 && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-xs">🪑</span>
            <span className="font-medium">
              {reservation.assigned_tables.length === 1
                ? `Mesa ${reservation.assigned_tables[0].table_number}`
                : `Mesas ${reservation.assigned_tables.map(t => t.table_number).join(" + ")}`}
            </span>
            {reservation.assigned_waiter_name && (
              <>
                <span className="text-gray-400">•</span>
                <span>👤 {reservation.assigned_waiter_name}</span>
              </>
            )}
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Auto</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600">
          <Phone size={14} />
          <span>{reservation.phone}</span>
        </div>
        {/* Email Status Indicator */}
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-gray-400" />
          {reservation.customer_email_status ? (
            <span className={`text-xs ${emailStatusConfig[reservation.customer_email_status]?.color || "text-gray-400"}`}>
              {emailStatusConfig[reservation.customer_email_status]?.icon}{" "}
              {emailStatusConfig[reservation.customer_email_status]?.label}
              {reservation.customer_email_opened_at && (
                <span className="text-gray-400 ml-1">
                  ({new Date(reservation.customer_email_opened_at).toLocaleDateString("pt-PT")})
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              {emailStatusConfig.not_sent.icon} {emailStatusConfig.not_sent.label}
            </span>
          )}
        </div>
        {reservation.occasion && (
          <div className="text-gray-500">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {occasionLabels[reservation.occasion] || reservation.occasion}
            </span>
          </div>
        )}
        {reservation.special_requests && (
          <p className="text-gray-500 text-xs line-clamp-2 mt-2 italic">
            &ldquo;{reservation.special_requests}&rdquo;
          </p>
        )}
      </div>
    </Card>
    </div>
    </>
  );
}

function ReservationModal({
  reservation,
  onClose,
  onUpdateStatus,
  isUpdating,
}: {
  reservation: Reservation;
  onClose: () => void;
  onUpdateStatus: (
    _id: string,
    _status: ReservationStatus,
    _reason?: string,
    _source?: string
  ) => Promise<void>;
  isUpdating: boolean;
}) {
  const [cancelReasonId, setCancelReasonId] = useState("");
  const [cancelCustomText, setCancelCustomText] = useState("");
  const [cancelSource, setCancelSource] = useState<"site" | "phone">("site");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const config = statusConfig[reservation.status];
  const adminReasons = getReasonsForSource("admin");
  const selectedAdminReason = adminReasons.find((r) => r.id === cancelReasonId);

  const handleConfirm = () => {
    onUpdateStatus(reservation.id, "confirmed");
  };

  const handleCancel = () => {
    const reason = selectedAdminReason?.isCustom
      ? cancelCustomText.trim()
      : selectedAdminReason?.label || "";
    if (!reason) {
      alert("Por favor, selecione o motivo do cancelamento");
      return;
    }
    onUpdateStatus(reservation.id, "cancelled", reason, cancelSource);
  };

  const handleComplete = () => {
    onUpdateStatus(reservation.id, "completed");
  };

  const handleNoShow = () => {
    onUpdateStatus(reservation.id, "no_show");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100 z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {reservation.first_name} {reservation.last_name}
            </h2>
            <span
              className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
            >
              {config.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-[#D4AF37]" size={20} />
              <div>
                <p className="text-xs text-gray-500">Data</p>
                <p className="font-medium text-gray-900">
                  {new Date(reservation.reservation_date).toLocaleDateString(
                    "pt-PT"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="text-[#D4AF37]" size={20} />
              <div>
                <p className="text-xs text-gray-500">Hora</p>
                <p className="font-medium text-gray-900">
                  {reservation.reservation_time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Users className="text-[#D4AF37]" size={20} />
              <div>
                <p className="text-xs text-gray-500">Pessoas</p>
                <p className="font-medium text-gray-900">
                  {reservation.party_size}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="text-[#D4AF37]" size={20} />
              <div>
                <p className="text-xs text-gray-500">Local</p>
                <p className="font-medium text-gray-900 capitalize">
                  {reservation.location}
                </p>
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div className="p-3 bg-[#D4AF37]/10 rounded-lg">
            <p className="text-sm font-medium text-[#D4AF37]">
              {reservation.is_rodizio ? "Rodízio" : "À Carta"}
            </p>
          </div>

          {/* Assigned Tables & Waiter */}
          {reservation.assigned_tables && reservation.assigned_tables.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Reserva Automática</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🪑</span>
                <div>
                  <p className="text-xs text-gray-500">Mesa(s) Atribuída(s)</p>
                  <p className="font-medium text-gray-900">
                    {reservation.assigned_tables.map((t, i) => (
                      <span key={t.table_number}>
                        {i > 0 && " + "}
                        <span className={t.is_primary ? "text-[#D4AF37] font-bold" : ""}>
                          Mesa {t.table_number}
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              {reservation.assigned_waiter_name && (
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-xs text-gray-500">Empregado Atribuído</p>
                    <p className="font-medium text-gray-900">{reservation.assigned_waiter_name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Contacto</h3>
            <a
              href={`mailto:${reservation.email}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Mail className="text-gray-400" size={18} />
              <span className="text-gray-700">{reservation.email}</span>
            </a>
            <a
              href={`tel:${reservation.phone}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Phone className="text-gray-400" size={18} />
              <span className="text-gray-700">{reservation.phone}</span>
            </a>
          </div>

          {/* Occasion */}
          {reservation.occasion && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Ocasião</h3>
              <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm text-gray-700">
                {occasionLabels[reservation.occasion] || reservation.occasion}
              </span>
            </div>
          )}

          {/* Special Requests */}
          {reservation.special_requests && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Pedidos Especiais / Alergias
              </h3>
              <p className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700">
                {reservation.special_requests}
              </p>
            </div>
          )}

          {/* Cancellation Details */}
          {reservation.status === "cancelled" && (
            <div className="space-y-3">
              <h3 className="font-medium text-red-600">Detalhes do Cancelamento</h3>
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-2">
                {reservation.cancellation_reason && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">Motivo:</span> {reservation.cancellation_reason}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {reservation.cancelled_by && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      reservation.cancelled_by === 'customer'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {reservation.cancelled_by === 'customer' ? 'Cancelado pelo cliente' : 'Cancelado pelo admin'}
                    </span>
                  )}
                  {reservation.cancellation_source && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {reservation.cancellation_source === 'site' ? 'Via site' : 'Por telefone'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Email Status */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Estado dos Emails</h3>
            <div className="space-y-2">
              {/* Auto-confirmed: show single "Confirmação automática" email */}
              {/* Manual: show "Receção do pedido" + "Reserva confirmada" separately */}
              {(() => {
                const isAutoConfirmed = reservation.tables_assigned && reservation.confirmed_at && !reservation.customer_email_status && reservation.confirmation_email_status;
                const hasCustomerEmail = !!reservation.customer_email_status;
                const hasConfirmationEmail = !!reservation.confirmation_email_status;

                // Helper to render an email row
                const renderEmailRow = (
                  label: string,
                  status: EmailStatus | null,
                  sentAt: string | null,
                  deliveredAt: string | null,
                  openedAt: string | null,
                  bgColor: string,
                  badge?: string,
                ) => (
                  <div className={`p-3 ${bgColor} rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{label}</span>
                        {badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">{badge}</span>
                        )}
                      </div>
                      {status ? (
                        <span className={`text-sm font-medium ${emailStatusConfig[status]?.color || "text-gray-400"}`}>
                          {emailStatusConfig[status]?.icon}{" "}
                          {emailStatusConfig[status]?.label}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {emailStatusConfig.not_sent.icon} {emailStatusConfig.not_sent.label}
                        </span>
                      )}
                    </div>
                    {sentAt && (
                      <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                        <p>Enviado: {new Date(sentAt).toLocaleString("pt-PT")}</p>
                        {deliveredAt && (
                          <p>Entregue: {new Date(deliveredAt).toLocaleString("pt-PT")}</p>
                        )}
                        {openedAt && (
                          <p className="text-purple-600 font-medium">
                            👁️ Lido: {new Date(openedAt).toLocaleString("pt-PT")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );

                return (
                  <>
                    {/* 1. Receção do pedido (only for manual flow) */}
                    {hasCustomerEmail && renderEmailRow(
                      "Receção do pedido",
                      reservation.customer_email_status,
                      reservation.customer_email_sent_at,
                      reservation.customer_email_delivered_at,
                      reservation.customer_email_opened_at,
                      "bg-gray-50",
                    )}

                    {/* 2. Confirmação (auto or manual) */}
                    {(reservation.status === "confirmed" || reservation.status === "completed" || reservation.status === "no_show") && renderEmailRow(
                      isAutoConfirmed ? "Confirmação automática" : "Reserva confirmada",
                      reservation.confirmation_email_status,
                      reservation.confirmation_email_sent_at,
                      reservation.confirmation_email_delivered_at,
                      reservation.confirmation_email_opened_at,
                      "bg-green-50",
                      isAutoConfirmed ? "Auto" : undefined,
                    )}

                    {/* Show "pending" state if not confirmed yet and no customer email */}
                    {!hasCustomerEmail && !hasConfirmationEmail && reservation.status === "pending" && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Aguarda confirmação</span>
                          <span className="text-sm text-yellow-600">⏳ Pendente</span>
                        </div>
                      </div>
                    )}

                    {/* 3. Lembrete 1 dia antes */}
                    {renderEmailRow(
                      "Lembrete 24h antes",
                      reservation.day_before_reminder_status,
                      reservation.day_before_reminder_sent_at,
                      reservation.day_before_reminder_delivered_at,
                      reservation.day_before_reminder_opened_at,
                      "bg-blue-50",
                    )}

                    {/* 4. Lembrete 2h antes */}
                    {renderEmailRow(
                      "Lembrete 2h antes",
                      reservation.same_day_reminder_status,
                      reservation.same_day_reminder_sent_at,
                      reservation.same_day_reminder_delivered_at,
                      reservation.same_day_reminder_opened_at,
                      "bg-blue-50",
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              Criada:{" "}
              {new Date(reservation.created_at).toLocaleString("pt-PT")}
            </p>
            {reservation.confirmed_at && (
              <p>
                Confirmada:{" "}
                {new Date(reservation.confirmed_at).toLocaleString("pt-PT")}
              </p>
            )}
            {reservation.cancelled_at && (
              <p>
                Cancelada:{" "}
                {new Date(reservation.cancelled_at).toLocaleString("pt-PT")}
              </p>
            )}
          </div>

          {/* Cancel Form */}
          {showCancelForm && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">
                Motivo do Cancelamento
              </h3>
              <select
                value={cancelReasonId}
                onChange={(e) => setCancelReasonId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="">Selecionar motivo...</option>
                {adminReasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {selectedAdminReason?.isCustom && (
                <textarea
                  value={cancelCustomText}
                  onChange={(e) => setCancelCustomText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Descreva o motivo..."
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de cancelamento</label>
                <select
                  value={cancelSource}
                  onChange={(e) => setCancelSource(e.target.value as "site" | "phone")}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="site">Pelo site</option>
                  <option value="phone">Por telefone</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Confirmar Cancelamento
                </button>
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showCancelForm && reservation.status === "pending" && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Check size={18} />
                <span>Confirmar</span>
              </button>
              <button
                onClick={() => setShowCancelForm(true)}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X size={18} />
                <span>Cancelar</span>
              </button>
            </div>
          )}

          {!showCancelForm && reservation.status === "confirmed" && (
            <div className="flex gap-3">
              <button
                onClick={handleComplete}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Check size={18} />
                <span>Marcar como Concluída</span>
              </button>
              <button
                onClick={handleNoShow}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <X size={18} />
                <span>Não Compareceu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelledReservationCard({
  reservation,
  onClick,
}: {
  reservation: Reservation;
  onClick: () => void;
}) {
  return (
    <div className="cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
      <Card variant="light" className="border border-red-200 bg-red-50/30">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-gray-900">
              {reservation.first_name} {reservation.last_name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={14} />
              <span>{reservation.party_size} pessoas</span>
              <span className="text-gray-300">|</span>
              <span>{new Date(reservation.reservation_date).toLocaleDateString("pt-PT")} {reservation.reservation_time}</span>
            </div>
          </div>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Cancelada
          </span>
        </div>
        <div className="space-y-1.5 text-sm">
          {reservation.cancellation_reason && (
            <p className="text-gray-600 text-xs italic line-clamp-2">
              &ldquo;{reservation.cancellation_reason}&rdquo;
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {reservation.cancelled_by && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                reservation.cancelled_by === 'customer'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {reservation.cancelled_by === 'customer' ? 'Cliente' : 'Admin'}
              </span>
            )}
            {reservation.cancellation_source && (
              <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-600">
                {reservation.cancellation_source === 'site' ? 'Via site' : 'Por telefone'}
              </span>
            )}
            {reservation.cancelled_at && (
              <span className="text-xs text-gray-400">
                {new Date(reservation.cancelled_at).toLocaleString("pt-PT")}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
