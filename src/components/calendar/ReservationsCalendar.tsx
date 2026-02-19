"use client";

import { useState } from "react";
import type { ReservationStatus, Location } from "@/types/database";

// =============================================
// TYPES
// =============================================

interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  status: ReservationStatus;
  location: Location;
  party_size: number;
}

interface ReservationsCalendarProps {
  reservations: Reservation[];
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

// =============================================
// CONSTANTS
// =============================================

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// =============================================
// HELPER FUNCTIONS
// =============================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateString(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ReservationsCalendar({
  reservations,
  selectedDate,
  onDateSelect,
}: ReservationsCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Get reservations for a specific day
  const getReservationsForDay = (day: number): Reservation[] => {
    const dateStr = formatDate(new Date(currentYear, currentMonth, day));
    return reservations.filter(r => r.reservation_date === dateStr);
  };

  // Check if day has pending reservations
  const hasPendingReservations = (day: number): boolean => {
    const dayReservations = getReservationsForDay(day);
    return dayReservations.some(r => r.status === 'pending');
  };

  // Get count of reservations for a day
  const getReservationCount = (day: number): number => {
    return getReservationsForDay(day).length;
  };

  // Check if date is today
  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    const dateStr = formatDate(new Date(currentYear, currentMonth, day));
    return dateStr === selectedDate;
  };

  // Render calendar
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-200 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-yellow-100 border border-yellow-300 flex items-center justify-center text-yellow-700 font-medium">1</div>
          <span className="text-gray-600">Com pendentes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-100 border border-green-300 flex items-center justify-center text-green-700 font-medium">1</div>
          <span className="text-gray-600">Todas confirmadas</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-10" />;
            }

            const count = getReservationCount(day);
            const hasPending = hasPendingReservations(day);
            const isTodayDate = isToday(day);
            const isSelectedDate = isSelected(day);

            return (
              <button
                key={day}
                onClick={() => {
                  const dateStr = formatDate(new Date(currentYear, currentMonth, day));
                  onDateSelect(dateStr);
                }}
                className={`h-10 border rounded-lg p-1 transition-all ${
                  isSelectedDate
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 ring-2 ring-[#D4AF37]/20"
                    : isTodayDate
                      ? "border-[#D4AF37] bg-yellow-50"
                      : count > 0
                        ? hasPending
                          ? "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                          : "border-green-300 bg-green-50 hover:bg-green-100"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className={`text-xs font-medium ${
                    isSelectedDate
                      ? "text-[#D4AF37]"
                      : isTodayDate
                        ? "text-[#D4AF37]"
                        : count > 0
                          ? hasPending
                            ? "text-yellow-700"
                            : "text-green-700"
                          : "text-gray-700"
                  }`}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold ${
                      hasPending ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Data selecionada:</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDateString(selectedDate)}
          </div>
          <button
            onClick={() => onDateSelect("")}
            className="mt-2 text-xs text-[#D4AF37] hover:underline"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </div>
  );
}
