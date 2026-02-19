"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useStaffTimeOff, useLocations, type StaffTimeOffFormData } from "@/presentation/hooks";
import type { StaffTimeOffWithStaff, StaffTimeOffType, Staff } from "@/types/database";

// =============================================
// CONSTANTS
// =============================================

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const TYPE_LABELS: Record<StaffTimeOffType, string> = {
  vacation: "Ferias",
  sick: "Doenca",
  personal: "Pessoal",
  other: "Outro",
};

const TYPE_COLORS: Record<StaffTimeOffType, { bg: string; text: string; border: string }> = {
  vacation: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  sick: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  personal: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  other: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
};

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

// =============================================
// MAIN COMPONENT
// =============================================

interface StaffCalendarProps {
  staffList: Staff[];
}

export default function StaffCalendar({ staffList }: StaffCalendarProps) {
  const { locations } = useLocations();

  // Helper to get location label
  const getLocationLabel = (slug: string) => {
    return locations.find(loc => loc.slug === slug)?.name || slug;
  };

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTimeOff, setSelectedTimeOff] = useState<StaffTimeOffWithStaff | null>(null);

  const [formData, setFormData] = useState<StaffTimeOffFormData>({
    staff_id: "",
    start_date: formatDate(today),
    end_date: formatDate(today),
    type: "vacation" as StaffTimeOffType,
    reason: "",
  });

  // Use the hook for data management
  const {
    isLoading,
    createTimeOff,
    deleteTimeOff,
    getTimeOffsForDay,
    isWeeklyClosureDay,
    getWeeklyClosureInfo,
  } = useStaffTimeOff({ month: currentMonth, year: currentYear });

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

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const result = await createTimeOff(formData);

    if (result.success) {
      setShowModal(false);
      resetForm();
    } else {
      setFormError(result.error || "Erro ao criar ausencia");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja remover esta ausencia?")) return;

    const result = await deleteTimeOff(id);
    if (result.success) {
      setSelectedTimeOff(null);
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: "",
      start_date: formatDate(today),
      end_date: formatDate(today),
      type: "vacation",
      reason: "",
    });
    setFormError(null);
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

  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendario de Ausencias</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Mes anterior"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-medium text-gray-900 min-w-[150px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Proximo mes"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Ausencia
        </Button>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-200 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-gray-600">Restaurante Fechado</span>
        </div>
        {(Object.keys(TYPE_LABELS) as StaffTimeOffType[]).map((type) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].border} border`} />
            <span className="text-gray-600">{TYPE_LABELS[type]}</span>
          </div>
        ))}
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
                return <div key={`empty-${index}`} className="h-24" />;
              }

              const dayTimeOffs = getTimeOffsForDay(day);
              const isWeeklyClosure = isWeeklyClosureDay(day);
              const closureInfo = isWeeklyClosure ? getWeeklyClosureInfo(day) : null;

              return (
                <div
                  key={day}
                  className={`h-24 border rounded-lg p-1 ${
                    isWeeklyClosure
                      ? "border-red-300 bg-red-50"
                      : isToday(day)
                        ? "border-[#D4AF37] bg-yellow-50"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isWeeklyClosure
                        ? "text-red-700"
                        : isToday(day)
                          ? "text-[#D4AF37]"
                          : "text-gray-700"
                    }`}>
                      {day}
                    </span>
                    {isWeeklyClosure && (
                      <span className="text-xs text-red-600 font-medium">Fechado</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-y-auto max-h-16">
                    {isWeeklyClosure && (
                      <div className="px-1 py-0.5 text-xs text-red-700">
                        <span className="font-medium">
                          {closureInfo?.location
                            ? getLocationLabel(closureInfo.location)
                            : "Ambos"}
                        </span>
                      </div>
                    )}
                    {dayTimeOffs.slice(0, isWeeklyClosure ? 2 : 3).map((to) => (
                      <button
                        key={to.id}
                        onClick={() => setSelectedTimeOff(to)}
                        className={`w-full text-left px-1 py-0.5 rounded text-xs truncate ${TYPE_COLORS[to.type].bg} ${TYPE_COLORS[to.type].text} hover:opacity-80 transition-opacity`}
                      >
                        {to.staff_name}
                      </button>
                    ))}
                    {dayTimeOffs.length > (isWeeklyClosure ? 2 : 3) && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayTimeOffs.length - (isWeeklyClosure ? 2 : 3)} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Nova Ausencia"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funcionario
            </label>
            <select
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              required
            >
              <option value="">Selecionar funcionario</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicio
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as StaffTimeOffType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            >
              {(Object.keys(TYPE_LABELS) as StaffTimeOffType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Ex: Ferias de verao"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={selectedTimeOff !== null}
        onClose={() => setSelectedTimeOff(null)}
        title="Detalhes da Ausencia"
      >
        {selectedTimeOff && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_COLORS[selectedTimeOff.type].bg} ${TYPE_COLORS[selectedTimeOff.type].text}`}>
                {TYPE_LABELS[selectedTimeOff.type]}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Funcionario:</span>
                <span className="font-medium text-gray-900">{selectedTimeOff.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Periodo:</span>
                <span className="font-medium text-gray-900">
                  {new Date(selectedTimeOff.start_date).toLocaleDateString("pt-PT")} -{" "}
                  {new Date(selectedTimeOff.end_date).toLocaleDateString("pt-PT")}
                </span>
              </div>
              {selectedTimeOff.reason && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Motivo:</span>
                  <span className="font-medium text-gray-900">{selectedTimeOff.reason}</span>
                </div>
              )}
              {selectedTimeOff.approved_by_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Aprovado por:</span>
                  <span className="font-medium text-gray-900">{selectedTimeOff.approved_by_name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setSelectedTimeOff(null)}
              >
                Fechar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(selectedTimeOff.id)}
              >
                Remover
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
