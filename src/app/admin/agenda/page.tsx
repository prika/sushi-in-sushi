"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Button, Modal } from "@/components/ui";
import {
  useStaffTimeOff,
  useClosures,
  useReservations,
  useStaff,
  useLocations,
  type StaffTimeOffFormData,
} from "@/presentation/hooks";
import { downloadICS, type CalendarEvent } from "@/lib/calendar/ics";
import type { StaffTimeOffType, StaffTimeOffWithStaff, Location } from "@/types/database";
import type { RestaurantClosure, CreateClosureData } from "@/domain/entities/RestaurantClosure";
import type { ReservationWithDetails } from "@/domain/entities/Reservation";

// =============================================
// CONSTANTS
// =============================================

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const DAY_LABELS: Record<number, string> = {
  0: "Domingo", 1: "Segunda-feira", 2: "Terca-feira", 3: "Quarta-feira",
  4: "Quinta-feira", 5: "Sexta-feira", 6: "Sabado",
};

const TIMEOFF_TYPE_LABELS: Record<StaffTimeOffType, string> = {
  vacation: "Ferias",
  sick: "Doenca",
  personal: "Pessoal",
  other: "Outro",
};

const TIMEOFF_COLORS: Record<StaffTimeOffType, { bg: string; text: string; border: string }> = {
  vacation: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  sick: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  personal: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  other: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
};

const CLOSURE_COLOR = { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
const RESERVATION_COLOR = { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" };

// =============================================
// TYPES
// =============================================

type AgendaEventType = "closure" | "timeoff" | "reservation";

interface AgendaEvent {
  id: string;
  type: AgendaEventType;
  date: string;
  endDate?: string;
  time?: string;
  title: string;
  subtitle?: string;
  staffName?: string;
  staffPhotoUrl?: string | null;
  color: { bg: string; text: string; border: string };
  rawTimeOff?: StaffTimeOffWithStaff;
  rawClosure?: RestaurantClosure;
  rawReservation?: ReservationWithDetails;
}

type ClosureFormType = "specific" | "recurring";

// =============================================
// HELPERS
// =============================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function AgendaPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Filters
  const [filters, setFilters] = useState({
    closures: true,
    timeOff: true,
    reservations: true,
  });

  // Modals
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Time-off form
  const [timeOffForm, setTimeOffForm] = useState<StaffTimeOffFormData>({
    staff_id: "",
    start_date: formatDateISO(today),
    end_date: formatDateISO(today),
    type: "vacation" as StaffTimeOffType,
    reason: "",
  });

  // Closure form
  const [closureForm, setClosureForm] = useState({
    type: "specific" as ClosureFormType,
    closureDate: formatDateISO(today),
    location: "" as Location | "",
    reason: "",
    recurringDayOfWeek: 1,
  });

  // Hooks
  const { locations } = useLocations();
  const { staff } = useStaff({ autoLoad: true });
  const {
    isLoading: isLoadingTimeOff,
    createTimeOff,
    deleteTimeOff,
    getTimeOffsForDay,
    isWeeklyClosureDay,
    getWeeklyClosureInfo,
  } = useStaffTimeOff({ month: currentMonth, year: currentYear });

  const { closures, isLoading: isLoadingClosures, create: createClosure, remove: removeClosure } =
    useClosures({ autoLoad: true });

  // Date range for reservations query (memoized to avoid infinite re-render)
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const reservationFilter = useMemo(
    () => ({ dateFrom, dateTo }),
    [dateFrom, dateTo]
  );

  const { reservations, isLoading: isLoadingReservations } = useReservations({
    filter: reservationFilter,
    autoLoad: true,
  });

  const isLoading = isLoadingTimeOff || isLoadingClosures || isLoadingReservations;

  // Staff photo lookup
  const staffPhotoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const s of staff) {
      map[s.id] = s.photoUrl;
    }
    return map;
  }, [staff]);

  const getLocationLabel = useCallback(
    (slug: string) => locations.find((loc) => loc.slug === slug)?.name || slug,
    [locations]
  );

  // Specific-date closures for the current month
  const specificClosuresForMonth = useMemo(() => {
    return closures.filter(
      (c) => !c.isRecurring && isDateInRange(c.closureDate, dateFrom, dateTo)
    );
  }, [closures, dateFrom, dateTo]);

  // Build events for a specific day
  const getEventsForDay = useCallback(
    (day: number): AgendaEvent[] => {
      const events: AgendaEvent[] = [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Closures
      if (filters.closures) {
        // Weekly closures
        if (isWeeklyClosureDay(day)) {
          const info = getWeeklyClosureInfo(day);
          events.push({
            id: `closure-weekly-${day}`,
            type: "closure",
            date: dateStr,
            title: "Fechado",
            subtitle: info?.location ? getLocationLabel(info.location) : "Ambos",
            color: CLOSURE_COLOR,
            rawClosure: info as RestaurantClosure | undefined,
          });
        }
        // Specific closures
        for (const c of specificClosuresForMonth) {
          if (c.closureDate === dateStr) {
            events.push({
              id: `closure-${c.id}`,
              type: "closure",
              date: dateStr,
              title: "Fechado",
              subtitle: c.location ? getLocationLabel(c.location) : "Ambos",
              color: CLOSURE_COLOR,
              rawClosure: c,
            });
          }
        }
      }

      // Time-offs
      if (filters.timeOff) {
        const dayTimeOffs = getTimeOffsForDay(day);
        for (const to of dayTimeOffs) {
          events.push({
            id: `timeoff-${to.id}`,
            type: "timeoff",
            date: dateStr,
            endDate: to.end_date,
            title: to.staff_name,
            subtitle: TIMEOFF_TYPE_LABELS[to.type],
            staffName: to.staff_name,
            staffPhotoUrl: staffPhotoMap[to.staff_id] || null,
            color: TIMEOFF_COLORS[to.type],
            rawTimeOff: to,
          });
        }
      }

      // Reservations
      if (filters.reservations) {
        const dayReservations = (reservations || []).filter(
          (r) => r.reservationDate === dateStr && r.status !== "cancelled"
        );
        for (const r of dayReservations) {
          events.push({
            id: `reservation-${r.id}`,
            type: "reservation",
            date: dateStr,
            time: r.reservationTime,
            title: `${r.reservationTime?.slice(0, 5)} ${r.firstName} ${r.lastName}`,
            subtitle: `${r.partySize} pax`,
            color: RESERVATION_COLOR,
            rawReservation: r,
          });
        }
      }

      // Sort: closures first, then timeoffs, then reservations by time
      events.sort((a, b) => {
        const order: Record<AgendaEventType, number> = { closure: 0, timeoff: 1, reservation: 2 };
        if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });

      return events;
    },
    [
      currentMonth, currentYear, filters, isWeeklyClosureDay, getWeeklyClosureInfo,
      specificClosuresForMonth, getTimeOffsForDay, reservations, staffPhotoMap, getLocationLabel,
    ]
  );

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };
  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Calendar grid
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const isToday = (day: number): boolean =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Time-off form handlers
  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    const result = await createTimeOff(timeOffForm);
    if (result.success) {
      setShowTimeOffModal(false);
      setTimeOffForm({
        staff_id: "", start_date: formatDateISO(today), end_date: formatDateISO(today),
        type: "vacation", reason: "",
      });
    } else {
      setFormError(result.error || "Erro ao criar ausencia");
    }
    setIsSubmitting(false);
  };

  // Closure form handlers
  const handleClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateClosureData = {
        closureDate: closureForm.type === "recurring" ? "1970-01-01" : closureForm.closureDate,
        location: closureForm.location || null,
        reason: closureForm.reason || null,
        isRecurring: closureForm.type === "recurring",
        recurringDayOfWeek: closureForm.type === "recurring" ? closureForm.recurringDayOfWeek : null,
      };
      const result = await createClosure(payload);
      if (result) {
        setShowClosureModal(false);
        setClosureForm({ type: "specific", closureDate: formatDateISO(today), location: "", reason: "", recurringDayOfWeek: 1 });
      } else {
        setFormError("Erro ao criar fecho");
      }
    } catch {
      setFormError("Erro desconhecido");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteTimeOff = async (id: number) => {
    if (!confirm("Remover esta ausencia?")) return;
    const result = await deleteTimeOff(id);
    if (result.success) {
      setSelectedEvent(null);
    } else {
      setFormError(result.error || "Erro ao remover ausencia");
    }
  };

  const handleDeleteClosure = async (id: number) => {
    if (!confirm("Remover este fecho?")) return;
    const success = await removeClosure(id);
    if (success) {
      setSelectedEvent(null);
    } else {
      setFormError("Erro ao remover fecho");
    }
  };

  // Export
  const handleExport = (_format: "ics") => {
    setShowExportMenu(false);
    const allEvents: CalendarEvent[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const events = getEventsForDay(day);
      for (const e of events) {
        allEvents.push({
          id: e.id,
          title: e.type === "closure" ? `Fechado${e.subtitle ? ` (${e.subtitle})` : ""}` : e.title,
          description: e.subtitle || undefined,
          startDate: e.date,
          endDate: e.endDate || e.date,
          startTime: e.time || undefined,
          allDay: !e.time,
          location: "Sushi in Sushi",
        });
      }
    }

    const monthName = MONTH_NAMES[currentMonth].toLowerCase();
    downloadICS(allEvents, `agenda-${monthName}-${currentYear}.ics`);
  };

  // Day detail events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500">Fechos, ausencias e reservas num unico calendario</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowTimeOffModal(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ausencia
          </Button>
          <button
            onClick={() => setShowClosureModal(true)}
            className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors text-sm"
          >
            + Fecho
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[200px]">
                  <button
                    onClick={() => handleExport("ics")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>Apple Calendar (.ics)</span>
                  </button>
                  <button
                    onClick={() => handleExport("ics")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>Google Calendar (.ics)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters + Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-500">Filtros:</span>
          {([
            { key: "closures" as const, label: "Fechos", color: CLOSURE_COLOR },
            { key: "timeOff" as const, label: "Ausencias", color: TIMEOFF_COLORS.vacation },
            { key: "reservations" as const, label: "Reservas", color: RESERVATION_COLOR },
          ] as const).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                filters[key]
                  ? `${color.bg} ${color.text} ring-1 ring-inset ${color.border}`
                  : "bg-gray-100 text-gray-400 line-through"
              }`}
            >
              {filters[key] && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />
              Fechado
            </div>
            {(Object.keys(TIMEOFF_TYPE_LABELS) as StaffTimeOffType[]).map((type) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded ${TIMEOFF_COLORS[type].bg} ${TIMEOFF_COLORS[type].border} border`} />
                {TIMEOFF_TYPE_LABELS[type]}
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300" />
              Reserva
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-gray-900 min-w-[160px] text-center text-lg">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Hoje
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
          </div>
        ) : (
          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-28" />;
                }

                const events = getEventsForDay(day);
                const hasClosure = events.some((e) => e.type === "closure");
                const maxVisible = hasClosure ? 2 : 3;
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-28 border rounded-lg p-1.5 text-left transition-all ${
                      hasClosure
                        ? "border-red-300 bg-red-50"
                        : isToday(day)
                          ? "border-[#D4AF37] bg-yellow-50"
                          : isSelected
                            ? "border-[#D4AF37]/60 bg-amber-50/40"
                            : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        hasClosure ? "text-red-700" : isToday(day) ? "text-[#D4AF37]" : "text-gray-700"
                      }`}>
                        {day}
                      </span>
                      {events.length > 0 && (
                        <span className="text-xs text-gray-400">{events.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {events.slice(0, maxVisible).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className={`w-full text-left px-1 py-0.5 rounded text-xs truncate ${event.color.bg} ${event.color.text} hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer`}
                        >
                          {event.staffPhotoUrl && (
                            <Image
                              src={event.staffPhotoUrl}
                              alt=""
                              width={14}
                              height={14}
                              className="rounded-full shrink-0 object-cover"
                              style={{ width: 14, height: 14 }}
                            />
                          )}
                          {!event.staffPhotoUrl && event.type === "timeoff" && (
                            <span className={`w-3.5 h-3.5 rounded-full ${event.color.border} border shrink-0 flex items-center justify-center text-[8px] font-bold`}>
                              {event.staffName?.charAt(0)}
                            </span>
                          )}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {events.length > maxVisible && (
                        <div className="text-xs text-gray-500 px-1">
                          +{events.length - maxVisible} mais
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Panel */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              {selectedDay} {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {selectedDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg ${event.color.bg} ${event.color.text} hover:opacity-90 transition-opacity text-left`}
              >
                {event.staffPhotoUrl ? (
                  <Image
                    src={event.staffPhotoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full shrink-0 object-cover"
                    style={{ width: 32, height: 32 }}
                  />
                ) : event.type === "timeoff" ? (
                  <span className={`w-8 h-8 rounded-full ${event.color.border} border-2 shrink-0 flex items-center justify-center text-sm font-bold`}>
                    {event.staffName?.charAt(0)}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{event.title}</p>
                  {event.subtitle && (
                    <p className="text-xs opacity-80">{event.subtitle}</p>
                  )}
                </div>
                <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Event Detail Modal ═══ */}
      <Modal
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={
          selectedEvent?.type === "closure"
            ? "Fecho do Restaurante"
            : selectedEvent?.type === "timeoff"
              ? "Detalhes da Ausencia"
              : "Reserva"
        }
      >
        {selectedEvent?.type === "timeoff" && selectedEvent.rawTimeOff && (() => {
          const to = selectedEvent.rawTimeOff!;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedEvent.staffPhotoUrl ? (
                  <Image
                    src={selectedEvent.staffPhotoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                    style={{ width: 48, height: 48 }}
                  />
                ) : (
                  <span className={`w-12 h-12 rounded-full ${selectedEvent.color.border} border-2 flex items-center justify-center text-lg font-bold ${selectedEvent.color.text}`}>
                    {to.staff_name?.charAt(0)}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-white text-lg">{to.staff_name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIMEOFF_COLORS[to.type].bg} ${TIMEOFF_COLORS[to.type].text}`}>
                    {TIMEOFF_TYPE_LABELS[to.type]}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Periodo:</span>
                  <span className="text-white font-medium">
                    {new Date(to.start_date).toLocaleDateString("pt-PT")} — {new Date(to.end_date).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                {to.reason && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Motivo:</span>
                    <span className="text-white font-medium">{to.reason}</span>
                  </div>
                )}
                {to.approved_by_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aprovado por:</span>
                    <span className="text-white font-medium">{to.approved_by_name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-700">
                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>Fechar</Button>
                <Button variant="danger" onClick={() => handleDeleteTimeOff(to.id)}>Remover</Button>
              </div>
            </div>
          );
        })()}

        {selectedEvent?.type === "closure" && selectedEvent.rawClosure && (() => {
          const c = selectedEvent.rawClosure!;
          return (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tipo:</span>
                  <span className="text-white font-medium">{c.isRecurring ? "Semanal" : "Data especifica"}</span>
                </div>
                {c.isRecurring && c.recurringDayOfWeek !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dia:</span>
                    <span className="text-white font-medium">{DAY_LABELS[c.recurringDayOfWeek]}</span>
                  </div>
                )}
                {!c.isRecurring && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data:</span>
                    <span className="text-white font-medium">{new Date(c.closureDate).toLocaleDateString("pt-PT")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Localizacao:</span>
                  <span className="text-white font-medium">{c.location ? getLocationLabel(c.location) : "Ambas"}</span>
                </div>
                {c.reason && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Motivo:</span>
                    <span className="text-white font-medium">{c.reason}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-700">
                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>Fechar</Button>
                <Button variant="danger" onClick={() => handleDeleteClosure(c.id)}>Remover</Button>
              </div>
            </div>
          );
        })()}

        {selectedEvent?.type === "reservation" && selectedEvent.rawReservation && (() => {
          const r = selectedEvent.rawReservation!;
          return (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nome:</span>
                  <span className="text-white font-medium">{r.firstName} {r.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hora:</span>
                  <span className="text-white font-medium">{r.reservationTime?.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pessoas:</span>
                  <span className="text-white font-medium">{r.partySize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Localizacao:</span>
                  <span className="text-white font-medium">{getLocationLabel(r.location)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estado:</span>
                  <span className="text-white font-medium">{r.statusLabel}</span>
                </div>
                {r.specialRequests && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pedidos:</span>
                    <span className="text-white font-medium">{r.specialRequests}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-700">
                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>Fechar</Button>
                <a
                  href="/admin/reservas"
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Ver Reservas
                </a>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══ Nova Ausencia Modal ═══ */}
      <Modal
        isOpen={showTimeOffModal}
        onClose={() => { setShowTimeOffModal(false); setFormError(null); }}
        title="Nova Ausencia"
      >
        <form onSubmit={handleTimeOffSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label>
            <select
              value={timeOffForm.staff_id}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, staff_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
              required
            >
              <option value="">Selecionar colaborador</option>
              {staff.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data Inicio</label>
              <input
                type="date"
                value={timeOffForm.start_date}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
              <input
                type="date"
                value={timeOffForm.end_date}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                min={timeOffForm.start_date}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
            <select
              value={timeOffForm.type}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, type: e.target.value as StaffTimeOffType })}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
            >
              {(Object.keys(TIMEOFF_TYPE_LABELS) as StaffTimeOffType[]).map((type) => (
                <option key={type} value={type}>{TIMEOFF_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Motivo (opcional)</label>
            <input
              type="text"
              value={timeOffForm.reason}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
              placeholder="Ex: Ferias de verao"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white placeholder:text-gray-500 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>
          {formError && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">{formError}</div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => { setShowTimeOffModal(false); setFormError(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Adicionar</Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Novo Fecho Modal ═══ */}
      <Modal
        isOpen={showClosureModal}
        onClose={() => { setShowClosureModal(false); setFormError(null); }}
        title="Adicionar Fecho"
      >
        <form onSubmit={handleClosureSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Fecho</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClosureForm({ ...closureForm, type: "specific" })}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  closureForm.type === "specific" ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-gray-600 hover:border-gray-500"
                }`}
              >
                <p className={`font-medium ${closureForm.type === "specific" ? "text-[#D4AF37]" : "text-gray-300"}`}>Data Especifica</p>
                <p className="text-sm text-gray-500">Feriado ou evento unico</p>
              </button>
              <button
                type="button"
                onClick={() => setClosureForm({ ...closureForm, type: "recurring" })}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  closureForm.type === "recurring" ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-gray-600 hover:border-gray-500"
                }`}
              >
                <p className={`font-medium ${closureForm.type === "recurring" ? "text-[#D4AF37]" : "text-gray-300"}`}>Semanal</p>
                <p className="text-sm text-gray-500">Dia de folga recorrente</p>
              </button>
            </div>
          </div>

          {closureForm.type === "specific" ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data</label>
              <input
                type="date"
                value={closureForm.closureDate}
                onChange={(e) => setClosureForm({ ...closureForm, closureDate: e.target.value })}
                min={formatDateISO(today)}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dia da Semana</label>
              <select
                value={closureForm.recurringDayOfWeek}
                onChange={(e) => setClosureForm({ ...closureForm, recurringDayOfWeek: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
              >
                {Object.entries(DAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Localizacao</label>
            <select
              value={closureForm.location}
              onChange={(e) => setClosureForm({ ...closureForm, location: e.target.value as Location | "" })}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent [color-scheme:dark]"
            >
              <option value="">Ambas localizacoes</option>
              {locations.map((loc) => (
                <option key={loc.slug} value={loc.slug}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Motivo (opcional)</label>
            <input
              type="text"
              value={closureForm.reason}
              onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
              placeholder="Ex: Feriado de Natal, Manutencao..."
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-[#2A2A2A] text-white placeholder:text-gray-500 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">{formError}</div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => { setShowClosureModal(false); setFormError(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
