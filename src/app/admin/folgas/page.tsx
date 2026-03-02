"use client";

import { useState } from "react";
import { Card, Button, Modal } from "@/components/ui";
import { useClosures, useLocations } from "@/presentation/hooks";
import type { CreateClosureData } from "@/domain/entities/RestaurantClosure";
import type { Location } from "@/types/database";

const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

type ClosureType = "specific" | "recurring";

interface FormData {
  type: ClosureType;
  closureDate: string;
  location: Location | "";
  reason: string;
  recurringDayOfWeek: number;
}

export default function FolgasPage() {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "specific" | "recurring">("all");

  // Use the closures hook
  const { closures, isLoading, error, create, remove } = useClosures({
    autoLoad: true,
  });

  // Use locations hook for dynamic dropdowns
  const { locations } = useLocations();

  // Helper to get location label
  const getLocationLabel = (slug: string) => {
    return locations.find(loc => loc.slug === slug)?.name || slug;
  };

  const [formData, setFormData] = useState<FormData>({
    type: "specific",
    closureDate: new Date().toISOString().split("T")[0],
    location: "",
    reason: "",
    recurringDayOfWeek: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateClosureData = {
        closureDate: formData.type === "recurring" ? "1970-01-01" : formData.closureDate,
        location: formData.location || null,
        reason: formData.reason || null,
        isRecurring: formData.type === "recurring",
        recurringDayOfWeek: formData.type === "recurring" ? formData.recurringDayOfWeek : null,
      };

      const result = await create(payload);

      if (result) {
        setShowModal(false);
        resetForm();
      } else {
        setFormError("Erro ao criar fecho");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja remover este dia de folga?")) return;

    try {
      await remove(id);
    } catch (err) {
      console.error("Error deleting closure:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "specific",
      closureDate: new Date().toISOString().split("T")[0],
      location: "",
      reason: "",
      recurringDayOfWeek: 1,
    });
    setFormError(null);
  };

  const filteredClosures = closures.filter((closure) => {
    if (filterType === "all") return true;
    if (filterType === "recurring") return closure.isRecurring;
    return !closure.isRecurring;
  });

  // Separate recurring and specific closures
  const recurringClosures = filteredClosures.filter((c) => c.isRecurring);
  const specificClosures = filteredClosures
    .filter((c) => !c.isRecurring)
    .sort((a, b) => new Date(a.closureDate).getTime() - new Date(b.closureDate).getTime());

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dias de Folga</h1>
          <p className="text-gray-500">Gerir dias em que o restaurante está fechado</p>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Fecho
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Todos" },
          { value: "recurring", label: "Semanais" },
          { value: "specific", label: "Datas Específicas" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value as typeof filterType)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === filter.value
                ? "bg-[#D4AF37] text-black"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Recurring Closures */}
      {(filterType === "all" || filterType === "recurring") && recurringClosures.length > 0 && (
        <Card
          variant="light"
          header={
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h3 className="font-semibold text-gray-900">Fechos Semanais</h3>
            </div>
          }
        >
          <div className="grid gap-3">
            {recurringClosures.map((closure) => (
              <div
                key={closure.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-orange-600 font-bold">
                      {DAY_LABELS[closure.recurringDayOfWeek!]?.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {DAY_LABELS[closure.recurringDayOfWeek!]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {closure.location
                        ? getLocationLabel(closure.location)
                        : "Ambas localizações"}
                      {closure.reason && ` • ${closure.reason}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(closure.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Specific Date Closures */}
      {(filterType === "all" || filterType === "specific") && (
        <Card
          variant="light"
          header={
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Datas Específicas</h3>
            </div>
          }
        >
          {specificClosures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Nenhum fecho específico agendado
            </div>
          ) : (
            <div className="grid gap-3">
              {specificClosures.map((closure) => {
                const date = new Date(closure.closureDate);
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={closure.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      isPast ? "bg-gray-100 opacity-60" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                        isPast ? "bg-gray-200" : "bg-red-100"
                      }`}>
                        <span className={`text-xs font-medium ${isPast ? "text-gray-500" : "text-red-600"}`}>
                          {date.toLocaleDateString("pt-PT", { month: "short" })}
                        </span>
                        <span className={`text-lg font-bold ${isPast ? "text-gray-600" : "text-red-700"}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {date.toLocaleDateString("pt-PT", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {closure.location
                            ? getLocationLabel(closure.location)
                            : "Ambas localizações"}
                          {closure.reason && ` • ${closure.reason}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(closure.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Add Closure Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Adicionar Fecho"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Fecho
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "specific" })}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.type === "specific"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`font-medium ${formData.type === "specific" ? "text-[#D4AF37]" : "text-gray-700"}`}>
                  Data Específica
                </p>
                <p className="text-sm text-gray-500">Feriado ou evento único</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "recurring" })}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.type === "recurring"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`font-medium ${formData.type === "recurring" ? "text-[#D4AF37]" : "text-gray-700"}`}>
                  Semanal
                </p>
                <p className="text-sm text-gray-500">Dia de folga recorrente</p>
              </button>
            </div>
          </div>

          {/* Date or Day of Week */}
          {formData.type === "specific" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.closureDate}
                onChange={(e) => setFormData({ ...formData, closureDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia da Semana
              </label>
              <select
                value={formData.recurringDayOfWeek}
                onChange={(e) => setFormData({ ...formData, recurringDayOfWeek: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                {Object.entries(DAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localização
            </label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value as Location | "" })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            >
              <option value="">Ambas localizações</option>
              {locations.map((location) => (
                <option key={location.slug} value={location.slug}>
                  {location.name}
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
              placeholder="Ex: Feriado de Natal, Manutenção..."
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
    </div>
  );
}
