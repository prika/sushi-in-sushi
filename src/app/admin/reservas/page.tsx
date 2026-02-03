"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ReservationStatus, Location } from "@/types/database";

type EmailStatus = "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";

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
  table_id: string | null;
  table_number?: number | null;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | "all">(
    new Date().toISOString().split("T")[0]
  );
  const [locationFilter, setLocationFilter] = useState<Location | "">("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setFetchError(null);
    const supabase = createClient();

    // Use type assertion for tables not yet in generated types
    const extendedSupabase = supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    };

    let query = extendedSupabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    if (selectedDate && selectedDate !== "all") {
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

    setReservations((data as Reservation[]) || []);
    setIsLoading(false);
  }, [selectedDate, locationFilter, statusFilter]);

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
    cancellationReason?: string
  ) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cancellation_reason: cancellationReason,
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

  const changeDate = (days: number) => {
    if (selectedDate === "all") return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // Group reservations by date and time when viewing all, or just by time for single date
  const groupedReservations = reservations.reduce(
    (acc, reservation) => {
      const key = selectedDate === "all"
        ? `${reservation.reservation_date}|${reservation.reservation_time}`
        : reservation.reservation_time;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(reservation);
      return acc;
    },
    {} as Record<string, Reservation[]>
  );

  const timeSlots = Object.keys(groupedReservations).sort();

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            disabled={selectedDate === "all"}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <input
            type="date"
            value={selectedDate === "all" ? "" : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || "all")}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
          <button
            onClick={() => changeDate(1)}
            disabled={selectedDate === "all"}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedDate !== "all" && selectedDate === new Date().toISOString().split("T")[0]
                ? "bg-[#D4AF37] text-white"
                : "text-[#D4AF37] hover:bg-[#D4AF37]/10"
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setSelectedDate("all")}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedDate === "all"
                ? "bg-[#D4AF37] text-white"
                : "text-[#D4AF37] hover:bg-[#D4AF37]/10"
            }`}
          >
            Todas
          </button>
        </div>
      </div>

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
          <p className="text-sm text-yellow-600">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-sm text-green-600">Confirmadas</p>
          <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-sm text-red-600">Canceladas</p>
          <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-600">Total Pessoas</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalGuests}</p>
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
            <option value="circunvalacao">Circunvalação</option>
            <option value="boavista">Boavista</option>
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
        </div>
      </Card>

      {/* Date Title */}
      <h2 className="text-lg font-semibold text-gray-800 capitalize">
        {selectedDate === "all" ? "Todas as Reservas" : formatDate(selectedDate)}
      </h2>

      {/* Reservations List */}
      {timeSlots.length === 0 ? (
        <Card variant="light">
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedDate === "all"
                ? "Nenhuma reserva encontrada"
                : "Nenhuma reserva para esta data"}
            </p>
            {!fetchError && (
              <p className="text-xs text-gray-400 mt-2">
                Se acabou de executar a migração, faça refresh à página.
              </p>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {timeSlots.map((slot) => {
            const [date, time] = selectedDate === "all" ? slot.split("|") : [null, slot];
            return (
              <div key={slot}>
                <div className="flex items-center gap-2 mb-3">
                  {selectedDate === "all" && date && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedReservations[slot].map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onClick={() => setSelectedReservation(reservation)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdateStatus={updateReservationStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}

function ReservationCard({
  reservation,
  onClick,
}: {
  reservation: Reservation;
  onClick: () => void;
}) {
  const config = statusConfig[reservation.status];

  return (
    <div
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
    <Card variant="light">
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
    id: string,
    status: ReservationStatus,
    reason?: string
  ) => Promise<void>;
  isUpdating: boolean;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const config = statusConfig[reservation.status];

  const handleConfirm = () => {
    onUpdateStatus(reservation.id, "confirmed");
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      alert("Por favor, indique o motivo do cancelamento");
      return;
    }
    onUpdateStatus(reservation.id, "cancelled", cancelReason);
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

          {/* Cancellation Reason */}
          {reservation.status === "cancelled" &&
            reservation.cancellation_reason && (
              <div>
                <h3 className="font-medium text-red-600 mb-2">
                  Motivo do Cancelamento
                </h3>
                <p className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-gray-700">
                  {reservation.cancellation_reason}
                </p>
              </div>
            )}

          {/* Email Status */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Estado dos Emails</h3>
            <div className="space-y-3">
              {/* Customer Confirmation Email */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email de Confirmação</span>
                  {reservation.customer_email_status ? (
                    <span className={`text-sm font-medium ${emailStatusConfig[reservation.customer_email_status]?.color || "text-gray-400"}`}>
                      {emailStatusConfig[reservation.customer_email_status]?.icon}{" "}
                      {emailStatusConfig[reservation.customer_email_status]?.label}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {emailStatusConfig.not_sent.icon} {emailStatusConfig.not_sent.label}
                    </span>
                  )}
                </div>
                {reservation.customer_email_sent_at && (
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <p>Enviado: {new Date(reservation.customer_email_sent_at).toLocaleString("pt-PT")}</p>
                    {reservation.customer_email_delivered_at && (
                      <p>Entregue: {new Date(reservation.customer_email_delivered_at).toLocaleString("pt-PT")}</p>
                    )}
                    {reservation.customer_email_opened_at && (
                      <p className="text-purple-600 font-medium">
                        👁️ Lido: {new Date(reservation.customer_email_opened_at).toLocaleString("pt-PT")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Reservation Confirmed Email (only shown if reservation is confirmed) */}
              {reservation.status === "confirmed" && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email de Reserva Confirmada</span>
                    {reservation.confirmation_email_status ? (
                      <span className={`text-sm font-medium ${emailStatusConfig[reservation.confirmation_email_status]?.color || "text-gray-400"}`}>
                        {emailStatusConfig[reservation.confirmation_email_status]?.icon}{" "}
                        {emailStatusConfig[reservation.confirmation_email_status]?.label}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        {emailStatusConfig.not_sent.icon} {emailStatusConfig.not_sent.label}
                      </span>
                    )}
                  </div>
                  {reservation.confirmation_email_sent_at && (
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      <p>Enviado: {new Date(reservation.confirmation_email_sent_at).toLocaleString("pt-PT")}</p>
                      {reservation.confirmation_email_delivered_at && (
                        <p>Entregue: {new Date(reservation.confirmation_email_delivered_at).toLocaleString("pt-PT")}</p>
                      )}
                      {reservation.confirmation_email_opened_at && (
                        <p className="text-purple-600 font-medium">
                          👁️ Lido: {new Date(reservation.confirmation_email_opened_at).toLocaleString("pt-PT")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none"
                rows={3}
                placeholder="Ex: Cliente pediu cancelamento por telefone"
              />
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
