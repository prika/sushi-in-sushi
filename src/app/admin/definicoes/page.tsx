"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, Button, Modal, AlertModal, ConfirmDialog } from "@/components/ui";
import type {
  ReservationSettings,
  RestaurantClosure,
  Location,
  Table,
  TableStatus,
  SessionStatus,
  OrderStatus,
} from "@/types/database";
import type { TableDTO } from "@/application/use-cases/tables/GetAllTablesUseCase";
import { createClient } from "@/lib/supabase/client";
import {
  generateQRCodeToCanvas,
  buildTableOrderURLByNumber,
} from "@/lib/qrcode";
import { TableMap } from "@/components/admin/TableMap";
import { TableDetailModal } from "@/components/admin/TableDetailModal";
import {
  useTableManagement,
  useRestaurants,
  useLocations,
  useProductsOptimized,
} from "@/presentation/hooks";
import type {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
} from "@/domain/entities/Restaurant";

// =============================================
// CONSTANTS
// =============================================

const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terca-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sabado",
};

type TabId =
  | "notifications"
  | "weekly-closures"
  | "export"
  | "tables"
  | "restaurants";

// =============================================
// NOTIFICATIONS TAB COMPONENT
// =============================================

function NotificationsTab() {
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [dayBeforeEnabled, setDayBeforeEnabled] = useState(true);
  const [dayBeforeHours, setDayBeforeHours] = useState(24);
  const [sameDayEnabled, setSameDayEnabled] = useState(true);
  const [sameDayHours, setSameDayHours] = useState(2);
  const [wasteEnabled, setWasteEnabled] = useState(true);
  const [wasteFee, setWasteFee] = useState(2.5);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/reservation-settings");
      if (response.ok) {
        const data: ReservationSettings = await response.json();
        setSettings(data);
        setDayBeforeEnabled(data.day_before_reminder_enabled);
        setDayBeforeHours(data.day_before_reminder_hours);
        setSameDayEnabled(data.same_day_reminder_enabled);
        setSameDayHours(data.same_day_reminder_hours);
        setWasteEnabled(data.rodizio_waste_policy_enabled);
        setWasteFee(data.rodizio_waste_fee_per_piece);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({ type: "error", text: "Erro ao carregar definicoes" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/reservation-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_before_reminder_enabled: dayBeforeEnabled,
          day_before_reminder_hours: dayBeforeHours,
          same_day_reminder_enabled: sameDayEnabled,
          same_day_reminder_hours: sameDayHours,
          rodizio_waste_policy_enabled: wasteEnabled,
          rodizio_waste_fee_per_piece: wasteFee,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setMessage({
          type: "success",
          text: "Definicoes guardadas com sucesso!",
        });
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao guardar" });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Erro ao guardar definicoes" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">A carregar definicoes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Day Before Reminder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Lembrete Dia Anterior
              </h3>
            </div>
            <p className="mt-2 text-gray-600 text-sm">
              Envia um email de lembrete ao cliente antes da data da reserva.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dayBeforeEnabled}
              onChange={(e) => setDayBeforeEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
          </label>
        </div>

        {dayBeforeEnabled && (
          <div className="mt-6 pl-11">
            <label className="block text-sm font-medium text-gray-700">
              Horas antes da reserva
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="168"
                value={dayBeforeHours}
                onChange={(e) =>
                  setDayBeforeHours(parseInt(e.target.value) || 24)
                }
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              />
              <span className="text-gray-600">horas antes</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Exemplo: 24 horas = email enviado 1 dia antes da reserva
            </p>
          </div>
        )}
      </div>

      {/* Same Day Reminder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Lembrete No Proprio Dia
              </h3>
            </div>
            <p className="mt-2 text-gray-600 text-sm">
              Envia um email de lembrete urgente algumas horas antes da reserva.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sameDayEnabled}
              onChange={(e) => setSameDayEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
          </label>
        </div>

        {sameDayEnabled && (
          <div className="mt-6 pl-11">
            <label className="block text-sm font-medium text-gray-700">
              Horas antes da reserva
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="12"
                value={sameDayHours}
                onChange={(e) => setSameDayHours(parseInt(e.target.value) || 2)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              />
              <span className="text-gray-600">horas antes</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Exemplo: 2 horas = email enviado 2 horas antes da hora da reserva
            </p>
          </div>
        )}
      </div>

      {/* Rodizio Waste Policy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍣</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Politica Anti-Desperdicio (Rodizio)
              </h3>
            </div>
            <p className="mt-2 text-gray-600 text-sm">
              Inclui aviso sobre a politica de desperdicio nos emails de
              lembrete para reservas de rodizio.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={wasteEnabled}
              onChange={(e) => setWasteEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
          </label>
        </div>

        {wasteEnabled && (
          <div className="mt-6 pl-11">
            <label className="block text-sm font-medium text-gray-700">
              Taxa por peca nao consumida
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="0.50"
                value={wasteFee}
                onChange={(e) => setWasteFee(parseFloat(e.target.value) || 2.5)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              />
              <span className="text-gray-600">EUR por peca</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Este valor sera mostrado no email de lembrete para reservas de
              rodizio
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-3">
          <svg
            className="w-6 h-6 text-blue-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">
              Como funcionam os lembretes
            </h4>
            <p className="mt-1 text-sm text-blue-800">
              Os emails de lembrete são enviados automaticamente pelo sistema. O
              cron job executa de hora a hora (8h–21h) para verificar reservas
              que precisam de lembrete no dia.
            </p>
            <ul className="mt-3 text-sm text-blue-700 space-y-1">
              <li>
                - <strong>Lembrete dia anterior:</strong> Enviado quando faltam
                X horas para a reserva (configuravel)
              </li>
              <li>
                - <strong>Lembrete no dia:</strong> Enviado X horas antes da
                hora da reserva (configuravel)
              </li>
              <li>
                - Os emails incluem detalhes da reserva, mapa e informacoes de
                contacto
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#c9a432] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "A guardar..." : "Guardar Alteracoes"}
        </button>
      </div>

      {/* Last Updated */}
      {settings?.updated_at && (
        <p className="text-sm text-gray-500 text-right">
          Ultima atualizacao:{" "}
          {new Date(settings.updated_at).toLocaleString("pt-PT")}
        </p>
      )}
    </div>
  );
}

// =============================================
// WEEKLY CLOSURES TAB COMPONENT
// =============================================

interface ClosureFormData {
  recurring_day_of_week: number;
  location: Location | "";
  reason: string;
}

function WeeklyClosuresTab() {
  const { locations } = useLocations();
  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Get location name from slug
  const getLocationName = (slug: string) => {
    return locations.find((loc) => loc.slug === slug)?.name || slug;
  };

  const [formData, setFormData] = useState<ClosureFormData>({
    recurring_day_of_week: 1,
    location: "",
    reason: "",
  });

  useEffect(() => {
    fetchClosures();
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await fetch("/api/closures");
      if (!response.ok) throw new Error("Erro ao carregar");
      const data = await response.json();
      // Filter to only show recurring closures
      setClosures(data.filter((c: RestaurantClosure) => c.is_recurring));
    } catch (err) {
      console.error("Error fetching closures:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        closure_date: "1970-01-01", // Placeholder for recurring
        location: formData.location || null,
        reason: formData.reason || null,
        is_recurring: true,
        recurring_day_of_week: formData.recurring_day_of_week,
      };

      const response = await fetch("/api/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar");
      }

      await fetchClosures();
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja remover este dia de folga semanal?"))
      return;

    try {
      const response = await fetch(`/api/closures?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao remover");
      await fetchClosures();
    } catch (err) {
      console.error("Error deleting closure:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      recurring_day_of_week: 1,
      location: "",
      reason: "",
    });
    setError(null);
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
      {/* Add Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Adicionar Dia de Folga
        </Button>
      </div>

      {/* Closures List */}
      <Card
        variant="light"
        header={
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#D4AF37]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <h3 className="font-semibold text-gray-900">
              Dias de Folga Semanais
            </h3>
          </div>
        }
      >
        {closures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Nenhum dia de folga semanal configurado
          </div>
        ) : (
          <div className="grid gap-3">
            {closures.map((closure) => (
              <div
                key={closure.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-orange-600 font-bold">
                      {DAY_LABELS[closure.recurring_day_of_week!]?.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {DAY_LABELS[closure.recurring_day_of_week!]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {closure.location
                        ? getLocationName(closure.location)
                        : "Ambas localizacoes"}
                      {closure.reason && ` - ${closure.reason}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(closure.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-3">
          <svg
            className="w-6 h-6 text-blue-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">
              Como funcionam os dias de folga
            </h4>
            <p className="mt-1 text-sm text-blue-800">
              Os dias de folga semanais aplicam-se a todas as semanas. Nestes
              dias, o sistema de reservas estara bloqueado para a localizacao
              configurada (ou ambas).
            </p>
            <p className="mt-2 text-sm text-blue-700">
              Para feriados ou dias especificos, utilize a pagina
              &quot;Folgas&quot; no menu lateral.
            </p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Adicionar Dia de Folga Semanal"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia da Semana
            </label>
            <select
              value={formData.recurring_day_of_week}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recurring_day_of_week: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            >
              {Object.entries(DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localizacao
            </label>
            <select
              value={formData.location}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: e.target.value as Location | "",
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            >
              <option value="">Ambas localizacoes</option>
              <option value="circunvalacao">Circunvalacao</option>
              <option value="boavista">Boavista</option>
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
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Ex: Dia de descanso semanal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
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

// =============================================
// EXPORT TAB COMPONENT
// =============================================

type PeriodType = "today" | "week" | "month" | "custom";
type FormatType = "csv" | "json";
type StatusFilter = "all" | SessionStatus;

interface SessionOrder {
  id: string;
  quantity: number;
  unit_price: number | null;
  status: OrderStatus;
}

interface SessionWithOrders {
  id: string;
  orders: SessionOrder[] | null;
}

function ExportTab() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [format, setFormat] = useState<FormatType>("csv");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customDateStart, setCustomDateStart] = useState<string>("");
  const [customDateEnd, setCustomDateEnd] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<{
    sessions: number;
    orders: number;
    total: number;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const getDateRange = useCallback(() => {
    let startDate: Date;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        startDate = customDateStart ? new Date(customDateStart) : new Date();
        endDate = customDateEnd ? new Date(customDateEnd) : new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }, [period, customDateStart, customDateEnd]);

  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      const supabase = createClient();
      const { startDate, endDate } = getDateRange();

      let sessionsQuery = supabase
        .from("sessions")
        .select(
          `
          *,
          orders (*)
        `,
        )
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (statusFilter !== "all") {
        sessionsQuery = sessionsQuery.eq("status", statusFilter);
      }

      const { data: sessions } = await sessionsQuery;

      if (sessions) {
        const typedSessions = sessions as unknown as SessionWithOrders[];
        const allOrders = typedSessions.flatMap((s) => s.orders || []);
        const total = allOrders
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + o.quantity * (o.unit_price || 0), 0);

        setPreview({
          sessions: sessions.length,
          orders: allOrders.length,
          total,
        });
      }

      setIsLoadingPreview(false);
    };

    fetchPreview();
  }, [getDateRange, statusFilter]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const { startDate, endDate } = getDateRange();

      const params = new URLSearchParams({
        format,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }

    setIsExporting(false);
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "week", label: "Ultimos 7 dias" },
    { value: "month", label: "Ultimo mes" },
    { value: "custom", label: "Periodo personalizado" },
  ];

  const formatOptions: {
    value: FormatType;
    label: string;
    description: string;
  }[] = [
    { value: "csv", label: "CSV", description: "Compativel com Excel" },
    { value: "json", label: "JSON", description: "Dados estruturados" },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todas as sessoes" },
    { value: "active", label: "Apenas ativas" },
    { value: "pending_payment", label: "Conta pedida" },
    { value: "paid", label: "Pagas" },
    { value: "closed", label: "Apenas fechadas" },
  ];

  return (
    <div className="space-y-6">
      <Card
        variant="light"
        header={<h2 className="text-lg font-semibold">Periodo</h2>}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                period === option.value
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={`font-medium ${
                  period === option.value ? "text-[#D4AF37]" : "text-gray-700"
                }`}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Data inicio
              </label>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-900 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Data fim
              </label>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-900 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        )}
      </Card>

      <Card
        variant="light"
        header={<h2 className="text-lg font-semibold">Filtros</h2>}
      >
        <div>
          <label className="block text-sm text-gray-600 mb-2">
            Estado das sessoes
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#D4AF37] focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card
        variant="light"
        header={<h2 className="text-lg font-semibold">Formato</h2>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormat(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                format === option.value
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={`font-medium ${
                  format === option.value ? "text-[#D4AF37]" : "text-gray-700"
                }`}
              >
                {option.label}
              </span>
              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card
        variant="light"
        header={<h2 className="text-lg font-semibold">Pre-visualizacao</h2>}
      >
        {isLoadingPreview ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
          </div>
        ) : preview ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">
                {preview.sessions}
              </p>
              <p className="text-sm text-gray-500">Sessoes</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">
                {preview.orders}
              </p>
              <p className="text-sm text-gray-500">Pedidos</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-[#D4AF37]">
                {preview.total.toFixed(2)}€
              </p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            Nenhum dado encontrado
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={!preview || preview.sessions === 0}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Exportar {format.toUpperCase()}
        </Button>
      </div>
    </div>
  );
}

// =============================================
// TABLE MANAGEMENT TAB
// =============================================

function TableManagementTab() {
  const { locations } = useLocations();

  const [tables, setTables] = useState<
    (Table & { waiter_name?: string | null })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(
    null,
  );
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    number: 1,
    name: "",
    location: locations[0]?.slug || "circunvalacao",
    is_active: true,
  });

  const [selectedLocation, setSelectedLocation] = useState<string>(
    locations[0]?.slug || "circunvalacao",
  );
  const [selectedTableForDetail, setSelectedTableForDetail] =
    useState<TableDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Helper to get location label
  const getLocationLabel = (slug: string) => {
    return locations.find((loc) => loc.slug === slug)?.name || slug;
  };

  const {
    tables: mapTables,
    isLoading: mapIsLoading,
    refresh: refreshMap,
    startWalkInSession,
    markTableInactive,
    reactivateTable,
    requestBill,
    closeSession,
  } = useTableManagement({
    location: selectedLocation as "circunvalacao" | "boavista",
    refreshInterval: 15000,
  });

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (showQRModal && selectedTableForQR && qrCanvasRef.current) {
      const url = buildTableOrderURLByNumber(
        selectedTableForQR.number,
        selectedTableForQR.location as "circunvalacao" | "boavista",
      );
      generateQRCodeToCanvas(qrCanvasRef.current, url, { width: 250 });
    }
  }, [showQRModal, selectedTableForQR]);

  const fetchTables = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("tables").select("*").order("number");

    // Buscar atribuições de empregados com JOIN para obter o nome
    const { data: waiterData } = await supabase
      .from("waiter_tables")
      .select("table_id, staff:staff_id(name)");

    const waiterMap = new Map<string, string>(
      (waiterData || []).map((w: any) => [w.table_id, w.staff?.name || null]),
    );

    // Buscar sessões ativas para cada mesa
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select(
        `
        id,
        table_id,
        status,
        customer_name,
        session_customers (
          customer_name
        )
      `,
      )
      .in("status", ["active", "pending_payment"]);

    const sessionsMap = new Map(
      (sessionsData || []).map((s: any) => [
        s.table_id,
        {
          customerName: s.customer_name,
          sessionCustomers: s.session_customers || [],
        },
      ]),
    );

    // Buscar reservas ativas
    const { data: reservationsData } = await (supabase as any)
      .from("reservations")
      .select("id, table_id, customer_name, status")
      .eq("status", "confirmed");

    const reservationsMap = new Map(
      (reservationsData || []).map((r: any) => [r.table_id, r.customer_name]),
    );

    const tablesWithInfo = (data || []).map((table) => ({
      ...table,
      waiter_name: waiterMap.get(table.id) || null,
      session: sessionsMap.get(table.id) || null,
      reservation_name: reservationsMap.get(table.id) || null,
    }));

    setTables(tablesWithInfo);
    setIsLoading(false);
  };

  const handleOpenModal = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        number: table.number,
        name: table.name,
        location: table.location,
        is_active: table.is_active,
      });
    } else {
      setEditingTable(null);
      const nextNumber =
        tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
      setFormData({
        number: nextNumber,
        name: `Mesa ${nextNumber}`,
        location: "circunvalacao",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleOpenQRModal = (table: Table) => {
    setSelectedTableForQR(table);
    setShowQRModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingTable) {
      await supabase.from("tables").update(formData).eq("id", editingTable.id);
    } else {
      await supabase.from("tables").insert(formData);
    }

    setShowModal(false);
    fetchTables();
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`Tem certeza que deseja eliminar ${table.name}?`)) return;

    const supabase = createClient();
    await supabase.from("tables").delete().eq("id", table.id);
    fetchTables();
  };

  const handleToggleActive = async (table: Table) => {
    const supabase = createClient();
    await supabase
      .from("tables")
      .update({ is_active: !table.is_active })
      .eq("id", table.id);
    fetchTables();
  };

  const handlePrintQR = (table: Table) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !qrCanvasRef.current) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${table.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A6 portrait; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .logo { font-size: 48px; margin-bottom: 8px; }
            .restaurant-name {
              font-size: 20px;
              font-weight: 600;
              color: #333;
              margin-bottom: 24px;
              letter-spacing: 1px;
            }
            .qr-container {
              background: white;
              padding: 16px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin-bottom: 24px;
            }
            .qr-image { width: 180px; height: 180px; }
            .table-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .table-number {
              font-size: 56px;
              font-weight: 700;
              color: #D4AF37;
              line-height: 1;
            }
            .location {
              font-size: 14px;
              color: #888;
              margin-top: 8px;
            }
            .scan-text {
              font-size: 13px;
              color: #666;
              margin-top: 24px;
              padding: 8px 16px;
              background: #f5f5f5;
              border-radius: 20px;
            }
          </style>
        </head>
        <body>
          <div class="logo">🍣</div>
          <div class="restaurant-name">SUSHI IN SUSHI</div>
          <div class="qr-container">
            <img class="qr-image" src="${qrCanvasRef.current.toDataURL()}" alt="QR Code" />
          </div>
          <div class="table-label">Mesa</div>
          <div class="table-number">${table.number}</div>
          <div class="location">${getLocationLabel(table.location)}</div>
          <div class="scan-text">Escaneie para fazer o pedido</div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleTableClick = (table: TableDTO) => {
    setSelectedTableForDetail(table);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedTableForDetail(null);
  };

  const getStatusCounts = () => {
    const counts = {
      available: 0,
      reserved: 0,
      occupied: 0,
      inactive: 0,
    };
    mapTables.forEach((t) => {
      const status = (t.status as TableStatus) || "available";
      counts[status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const handlePrintAllQRs = (location?: string) => {
    const tablesToPrint = location
      ? tables.filter((t) => t.location === location && t.is_active)
      : tables.filter((t) => t.is_active);

    if (tablesToPrint.length === 0) {
      alert("Não há mesas ativas para imprimir.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tablesHtml = tablesToPrint
      .map(
        (table) => `
      <div class="qr-card">
        <div class="logo">🍣</div>
        <div class="restaurant-name">SUSHI IN SUSHI</div>
        <div class="qr-container">
          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            `${window.location.origin}/mesa/${table.number}?loc=${table.location}`,
          )}&format=png&margin=10" alt="QR Code" />
        </div>
        <div class="table-label">Mesa</div>
        <div class="table-number">${table.number}</div>
        <div class="location">${getLocationLabel(table.location)}</div>
        <div class="scan-text">Escaneie para fazer o pedido</div>
      </div>
    `,
      )
      .join("");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Mesas</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A6 portrait; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .qr-card {
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .qr-card:last-child { page-break-after: auto; }
            .logo { font-size: 48px; margin-bottom: 8px; }
            .restaurant-name {
              font-size: 20px;
              font-weight: 600;
              color: #333;
              margin-bottom: 24px;
              letter-spacing: 1px;
            }
            .qr-container {
              background: white;
              padding: 16px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin-bottom: 24px;
            }
            .qr-image { width: 180px; height: 180px; }
            .table-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .table-number {
              font-size: 56px;
              font-weight: 700;
              color: #D4AF37;
              line-height: 1;
            }
            .location {
              font-size: 14px;
              color: #888;
              margin-top: 8px;
            }
            .scan-text {
              font-size: 13px;
              color: #666;
              margin-top: 24px;
              padding: 8px 16px;
              background: #f5f5f5;
              border-radius: 20px;
            }
          </style>
        </head>
        <body>
          ${tablesHtml}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Group tables by location dynamically
  const tablesByLocation = locations.reduce(
    (acc, location) => {
      acc[location.slug] = tables.filter((t) => t.location === location.slug);
      return acc;
    },
    {} as Record<string, typeof tables>,
  );

  // Color schemes for location sections (cycle through them)
  const colorSchemes = [
    {
      bg: "bg-blue-50",
      text: "text-blue-900",
      button: "text-blue-600 hover:text-blue-800",
    },
    {
      bg: "bg-purple-50",
      text: "text-purple-900",
      button: "text-purple-600 hover:text-purple-800",
    },
    {
      bg: "bg-green-50",
      text: "text-green-900",
      button: "text-green-600 hover:text-green-800",
    },
    {
      bg: "bg-orange-50",
      text: "text-orange-900",
      button: "text-orange-600 hover:text-orange-800",
    },
    {
      bg: "bg-pink-50",
      text: "text-pink-900",
      button: "text-pink-600 hover:text-pink-800",
    },
  ];

  const TableCard = ({
    table,
  }: {
    table: Table & {
      waiter_name?: string | null;
      session?: any;
      reservation_name?: string | null;
    };
  }) => {
    // Determinar status visual
    const getStatusInfo = () => {
      if (!table.is_active) {
        return {
          label: "Inativa",
          color: "bg-gray-100 text-gray-600",
          border: "border-gray-300",
        };
      }
      if (table.status === "occupied" || table.session) {
        return {
          label: "Ocupada",
          color: "bg-red-100 text-red-700",
          border: "border-red-300",
        };
      }
      if (table.status === "reserved" || table.reservation_name) {
        return {
          label: "Reservada",
          color: "bg-yellow-100 text-yellow-700",
          border: "border-yellow-300",
        };
      }
      return {
        label: "Livre",
        color: "bg-green-100 text-green-700",
        border: "border-green-300",
      };
    };

    const statusInfo = getStatusInfo();

    return (
      <div
        className={`relative p-4 rounded-xl border-2 ${statusInfo.border} bg-white shadow-sm`}
      >
        {/* Header: Número + Status */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              Mesa #{table.number}
            </div>
            <div className="text-xs text-gray-500">{table.name}</div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Informações de Status */}
        <div className="space-y-2 mb-3 min-h-[60px]">
          {/* Reservada */}
          {table.reservation_name && (
            <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-1 text-xs text-yellow-800">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">Reserva:</span>
              </div>
              <div className="text-xs font-semibold text-yellow-900 mt-1">
                {table.reservation_name}
              </div>
            </div>
          )}

          {/* Ocupada */}
          {table.session && (
            <div className="p-2 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-1 text-xs text-red-800 mb-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="font-medium">Clientes:</span>
              </div>
              <div className="space-y-0.5">
                {table.session.customerName && (
                  <div className="text-xs font-semibold text-red-900">
                    • {table.session.customerName}
                  </div>
                )}
                {table.session.sessionCustomers?.map((c: any, i: number) => (
                  <div key={i} className="text-xs text-red-800">
                    • {c.customer_name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Livre */}
          {/* {!table.reservation_name && !table.session && table.is_active && (
            <div className="p-2 bg-green-50 rounded-lg border border-green-200 text-center">
              <div className="text-xs text-green-700 font-medium">
                Disponível
              </div>
            </div>
          )} */}
        </div>

        {/* Waiter Responsável */}
        {table.waiter_name && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center gap-1 text-xs text-blue-800">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="font-medium">Waiter:</span>
              <span className="font-semibold">{table.waiter_name}</span>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-center gap-1 pt-2 border-t border-gray-200">
          <button
            onClick={() => handleOpenQRModal(table)}
            className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
            title="Ver QR Code"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </button>
          <button
            onClick={() => handleOpenModal(table)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => handleToggleActive(table)}
            className={`p-2 transition-colors ${table.is_active ? "text-green-600 hover:text-green-700" : "text-gray-400 hover:text-gray-500"}`}
            title={table.is_active ? "Desativar" : "Ativar"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(table)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => handlePrintAllQRs()}
          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimir Todos os QRs
        </button>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed flex items-center gap-2 opacity-60"
          title="Mesas são criadas automaticamente baseado na lotação do restaurante"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nova Mesa (Automático)
        </button>
      </div>

      {/* Grid de Mesas por Localização - DINÂMICO */}
      <div className="grid md:grid-cols-2 gap-6">
        {locations.map((location, index) => {
          const locationTables = tablesByLocation[location.slug] || [];
          const colorScheme = colorSchemes[index % colorSchemes.length];

          return (
            <div
              key={location.slug}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div
                className={`${colorScheme.bg} px-6 py-4 border-b border-gray-200 flex items-center justify-between`}
              >
                <h2 className={`font-semibold ${colorScheme.text}`}>
                  {location.name}
                </h2>
                <button
                  onClick={() => handlePrintAllQRs(location.slug)}
                  className={`text-sm ${colorScheme.button} flex items-center gap-1`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Imprimir todos
                </button>
              </div>
              <div className="p-4">
                {locationTables.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma mesa neste restaurante
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {locationTables.map((table) => (
                      <TableCard key={table.id} table={table} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTable ? "Editar Mesa" : "Nova Mesa"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      number: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localizacao
                </label>
                <select
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                >
                  {locations.map((location: Restaurant) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Mesa ativa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030]"
                >
                  {editingTable ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && selectedTableForQR && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-4xl mb-2">🍣</div>
              <h3 className="text-xl font-bold mb-4">Sushi in Sushi</h3>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 inline-block">
                <canvas ref={qrCanvasRef} style={{ width: 200, height: 200 }} />
              </div>

              <div className="text-sm text-gray-500 uppercase tracking-wider">
                Mesa
              </div>
              <div className="text-5xl font-bold text-[#D4AF37] mb-1">
                {selectedTableForQR.number}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {getLocationLabel(selectedTableForQR.location)}
              </div>

              <div className="text-xs text-gray-400 mb-6 break-all px-4">
                {buildTableOrderURLByNumber(
                  selectedTableForQR.number,
                  selectedTableForQR.location as "circunvalacao" | "boavista",
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() =>
                    window.open(
                      buildTableOrderURLByNumber(
                        selectedTableForQR.number,
                        selectedTableForQR.location as
                          | "circunvalacao"
                          | "boavista",
                      ),
                      "_blank",
                    )
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Testar
                </button>
                <button
                  onClick={() => handlePrintQR(selectedTableForQR)}
                  className="flex-1 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// RESTAURANT MANAGEMENT TAB COMPONENT
// =============================================

function RestaurantManagementTab() {
  const { restaurants, isLoading, error, create, update, remove } =
    useRestaurants();
  const { products, isLoading: isLoadingProducts } = useProductsOptimized({
    availableOnly: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [creatingTables, setCreatingTables] = useState(false);
  const [recreatingTablesFor, setRecreatingTablesFor] = useState<string | null>(
    null,
  );

  // Modal states for replacing system alerts/confirms
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "success" | "error" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", variant: "info" });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "warning",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    variant: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setAlertModal({ isOpen: true, title, message, variant });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      variant?: "danger" | "warning" | "info";
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
    },
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant: options?.variant ?? "warning",
      confirmText: options?.confirmText ?? "Confirmar",
      cancelText: options?.cancelText ?? "Cancelar",
      onConfirm,
      onCancel: options?.onCancel,
    });
  };
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    address: "",
    maxCapacity: 50,
    defaultPeoplePerTable: 4,
    orderCooldownMinutes: 0,
    autoTableAssignment: false,
    autoReservations: false,
    isActive: true,
    gamesEnabled: false,
    gamesMode: "selection" as "selection" | "random",
    gamesPrizeType: "none" as
      | "none"
      | "discount_percentage"
      | "free_product"
      | "free_dinner",
    gamesPrizeValue: "",
    gamesPrizeProductId: "",
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
  });

  const toRestaurantPayload = (
    fd: typeof formData,
  ): CreateRestaurantData & UpdateRestaurantData => ({
    ...fd,
    gamesPrizeProductId: fd.gamesPrizeProductId?.trim()
      ? Number(fd.gamesPrizeProductId)
      : null,
  });

  const handleOpenModal = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address,
        maxCapacity: restaurant.maxCapacity,
        defaultPeoplePerTable: restaurant.defaultPeoplePerTable,
        orderCooldownMinutes: restaurant.orderCooldownMinutes,
        autoTableAssignment: restaurant.autoTableAssignment,
        autoReservations: restaurant.autoReservations,
        isActive: restaurant.isActive,
        gamesEnabled: restaurant.gamesEnabled,
        gamesMode: restaurant.gamesMode,
        gamesPrizeType: restaurant.gamesPrizeType,
        gamesPrizeValue: restaurant.gamesPrizeValue ?? "",
        gamesPrizeProductId:
          restaurant.gamesPrizeProductId != null
            ? String(restaurant.gamesPrizeProductId)
            : "",
        gamesMinRoundsForPrize: restaurant.gamesMinRoundsForPrize,
        gamesQuestionsPerRound: restaurant.gamesQuestionsPerRound,
      });
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: "",
        slug: "",
        address: "",
        maxCapacity: 50,
        defaultPeoplePerTable: 4,
        orderCooldownMinutes: 0,
        autoTableAssignment: false,
        autoReservations: false,
        isActive: true,
        gamesEnabled: false,
        gamesMode: "selection",
        gamesPrizeType: "none",
        gamesPrizeValue: "",
        gamesPrizeProductId: "",
        gamesMinRoundsForPrize: 3,
        gamesQuestionsPerRound: 5,
      });
    }
    setShowModal(true);
  };

  const recreateTablesViaApi = async (
    slug: string,
    forceRecreate: boolean,
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    const res = await fetch("/api/tables/recreate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantSlug: slug, forceRecreate }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Erro desconhecido" };
    }
    return { success: true, count: data.count };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: prémio "produto grátis" requer produto selecionado
    if (
      formData.gamesPrizeType === "free_product" &&
      !formData.gamesPrizeProductId?.trim()
    ) {
      showAlert(
        "Produto obrigatório",
        "Selecione o produto do prémio quando o tipo de prémio é «Produto grátis».",
        "warning",
      );
      return;
    }

    // Validação ao editar: verificar se lotação mudou
    if (
      editingRestaurant &&
      formData.maxCapacity !== editingRestaurant.maxCapacity
    ) {
      const ppt = formData.defaultPeoplePerTable;
      const totalTables = Math.ceil(formData.maxCapacity / ppt);
      const totalCapacity = totalTables * ppt;

      showConfirm(
        "Lotação alterada",
        `A lotação mudou de ${editingRestaurant.maxCapacity} para ${formData.maxCapacity} pessoas.\n\nPara refletir a nova lotação, as mesas precisam ser recriadas.\n\nNova distribuição:\n${totalTables} mesas de ${ppt} pessoas = ${totalCapacity} lugares\n\nDeseja recriar as mesas agora?`,
        async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setCreatingTables(true);
          try {
            await update(editingRestaurant.id, toRestaurantPayload(formData));

            const result = await recreateTablesViaApi(formData.slug, true);

            if (result.success) {
              showAlert(
                "Restaurante atualizado",
                `Mesas recriadas: ${totalTables} mesas de ${ppt} pessoas = ${totalCapacity} lugares`,
                "success",
              );
            } else {
              showAlert(
                "Aviso",
                `Restaurante atualizado, mas erro ao recriar mesas:\n${result.error}`,
                "warning",
              );
            }
          } catch (err) {
            showAlert(
              "Erro",
              err instanceof Error ? err.message : "Erro desconhecido",
              "error",
            );
          } finally {
            setCreatingTables(false);
          }
          setShowModal(false);
        },
        {
          variant: "warning",
          confirmText: "Recriar mesas",
          cancelText: "Guardar sem recriar",
          onCancel: async () => {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            await update(editingRestaurant.id, toRestaurantPayload(formData));
            setShowModal(false);
          },
        },
      );
      return;
    }

    setCreatingTables(true);

    try {
      if (editingRestaurant) {
        await update(editingRestaurant.id, toRestaurantPayload(formData));
      } else {
        const restaurant = await create(toRestaurantPayload(formData));

        if (restaurant) {
          const result = await recreateTablesViaApi(formData.slug, false);

          if (result.success) {
            const ppt = formData.defaultPeoplePerTable;
            const totalTables = result.count ?? 0;
            const totalCapacity = totalTables * ppt;

            showAlert(
              "Restaurante criado",
              `${totalTables} mesas criadas:\n${totalTables} x ${ppt} = ${totalCapacity} lugares`,
              "success",
            );
          } else {
            console.error("Erro ao criar mesas:", result.error);
            showAlert(
              "Aviso",
              `Restaurante criado, mas houve erro ao criar mesas:\n${result.error}`,
              "warning",
            );
          }
        }
      }

      setShowModal(false);
    } catch (error) {
      console.error("Erro ao submeter:", error);
      showAlert(
        "Erro",
        error instanceof Error ? error.message : "Erro desconhecido",
        "error",
      );
    } finally {
      setCreatingTables(false);
    }
  };

  const handleRecreateTables = (restaurant: Restaurant) => {
    const ppt = restaurant.defaultPeoplePerTable;
    const totalTables = Math.ceil(restaurant.maxCapacity / ppt);
    const totalCapacity = totalTables * ppt;

    showConfirm(
      `Recriar mesas de ${restaurant.name}?`,
      `Nova distribuição:\n${totalTables} mesas de ${ppt} pessoas = ${totalCapacity} lugares\n\nAs mesas existentes serão eliminadas e recriadas.`,
      async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setRecreatingTablesFor(restaurant.id);

        try {
          const result = await recreateTablesViaApi(restaurant.slug, true);

          if (result.success) {
            showAlert(
              "Mesas recriadas",
              `${result.count} mesas de ${ppt} pessoas = ${totalCapacity} lugares`,
              "success",
            );
          } else {
            showAlert(
              "Erro ao recriar mesas",
              result.error || "Erro desconhecido",
              "error",
            );
          }
        } catch (err) {
          showAlert(
            "Erro",
            err instanceof Error ? err.message : "Erro desconhecido",
            "error",
          );
        } finally {
          setRecreatingTablesFor(null);
        }
      },
      { variant: "danger", confirmText: "Recriar mesas" },
    );
  };

  const handleDelete = (id: string) => {
    showConfirm(
      "Eliminar restaurante",
      "Tem certeza que deseja eliminar este restaurante? Esta ação não pode ser revertida.",
      async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await remove(id);
      },
      { variant: "danger", confirmText: "Eliminar" },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Novo Restaurante
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Restaurants Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
              restaurant.isActive
                ? "border-green-200"
                : "border-gray-200 opacity-50"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {restaurant.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Código: {restaurant.slug}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  restaurant.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {restaurant.isActive ? "Ativo" : "Inativo"}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {restaurant.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Capacidade: {restaurant.maxCapacity} pessoas
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Distribuição:{" "}
                {(() => {
                  const ppt = restaurant.defaultPeoplePerTable;
                  const totalTables = Math.ceil(restaurant.maxCapacity / ppt);
                  return `${totalTables} mesas de ${ppt} pessoas`;
                })()}
              </div>
            </div>

            {/* Automation Flags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurant.gamesEnabled && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Jogos{" "}
                  {restaurant.gamesMode === "random"
                    ? "(aleatorio)"
                    : "(selecao)"}
                  {restaurant.gamesPrizeType !== "none" && " + Premio"}
                </span>
              )}
              {restaurant.autoTableAssignment && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Atribuição automática
                </span>
              )}
              {restaurant.autoReservations && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Reservas automáticas
                </span>
              )}
              {!restaurant.autoTableAssignment &&
                !restaurant.autoReservations &&
                !restaurant.gamesEnabled && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    Manual
                  </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(restaurant)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(restaurant.id)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                >
                  Eliminar
                </button>
              </div>
              <button
                onClick={() => handleRecreateTables(restaurant)}
                disabled={recreatingTablesFor === restaurant.id}
                className="w-full px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {recreatingTablesFor === restaurant.id ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    Recriando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Recriar Mesas
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {restaurants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="text-lg font-medium mb-2">
            Nenhum restaurante registado
          </p>
          <p className="text-sm mb-4">
            Comece por adicionar um novo restaurante
          </p>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => {
          if (confirmDialog.onCancel) {
            confirmDialog.onCancel();
          } else {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRestaurant ? "Editar Restaurante" : "Novo Restaurante"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Restaurante *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (Slug) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase(),
                    })
                  }
                  placeholder="ex: circunvalacao, boavista"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  pattern="[a-z0-9\-]+"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apenas letras minúsculas, números e hífens
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              {/* Max Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lotação Máxima *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxCapacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxCapacity: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Capacidade total do restaurante (todas as mesas)
                </p>

                {/* Preview da Distribuição */}
                {formData.maxCapacity > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-blue-900">
                        Preview da Distribuição
                      </span>
                    </div>
                    <div className="text-sm text-blue-800">
                      {(() => {
                        const ppt = formData.defaultPeoplePerTable || 4;
                        const totalTables = Math.ceil(
                          formData.maxCapacity / ppt,
                        );
                        const totalCapacity = totalTables * ppt;

                        return (
                          <>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-200 text-blue-900 text-xs font-medium rounded-full">
                                {totalTables} mesa{totalTables > 1 ? "s" : ""}{" "}
                                de {ppt} pessoas
                              </span>
                            </div>
                            <div className="text-xs text-blue-700 font-medium">
                              📊 Total: {totalTables} mesa
                              {totalTables > 1 ? "s" : ""} = {totalCapacity}{" "}
                              lugares
                              {totalCapacity > formData.maxCapacity && (
                                <span className="ml-2 text-yellow-700">
                                  (+{totalCapacity - formData.maxCapacity} lugar
                                  {totalCapacity - formData.maxCapacity > 1
                                    ? "es"
                                    : ""}{" "}
                                  extra)
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Default People Per Table */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pessoas por Mesa (Padrão) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.defaultPeoplePerTable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultPeoplePerTable: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Capacidade padrão ao criar novas mesas
                </p>
              </div>

              {/* Order Cooldown Minutes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cooldown entre Pedidos (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.orderCooldownMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderCooldownMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tempo mínimo de espera entre pedidos por mesa. 0 = sem limite.
                </p>
              </div>

              {/* Automation Flags */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Configurações de Automação (Funcionalidades Futuras)
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoTableAssignment"
                    checked={formData.autoTableAssignment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoTableAssignment: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                  />
                  <label
                    htmlFor="autoTableAssignment"
                    className="text-sm text-gray-700"
                  >
                    Automatizar atribuição de mesas aos funcionários
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoReservations"
                    checked={formData.autoReservations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoReservations: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                  />
                  <label
                    htmlFor="autoReservations"
                    className="text-sm text-gray-700"
                  >
                    Automatizar gestão de reservas
                  </label>
                </div>

                <p className="text-xs text-blue-600 mt-2">
                  Estas funcionalidades estarão disponíveis em futuras
                  atualizações
                </p>
              </div>

              {/* Games Configuration */}
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">
                  Jogos Interativos na Mesa
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gamesEnabled"
                    checked={formData.gamesEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gamesEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                  />
                  <label
                    htmlFor="gamesEnabled"
                    className="text-sm text-gray-700"
                  >
                    Ativar jogos para os clientes na mesa
                  </label>
                </div>

                {formData.gamesEnabled && (
                  <div className="space-y-3 pt-2">
                    {/* Games Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modo de Jogos
                      </label>
                      <select
                        value={formData.gamesMode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gamesMode: e.target.value as "selection" | "random",
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      >
                        <option value="selection">
                          Pagina de selecao de jogos
                        </option>
                        <option value="random">Jogos aleatorios</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.gamesMode === "selection"
                          ? "O cliente escolhe qual jogo quer jogar"
                          : "O sistema escolhe um jogo aleatorio para o cliente"}
                      </p>
                    </div>

                    {/* Questions Per Round */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Perguntas por ronda
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={formData.gamesQuestionsPerRound}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gamesQuestionsPerRound:
                              parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      />
                    </div>

                    {/* Prize Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Premio
                      </label>
                      <select
                        value={formData.gamesPrizeType}
                        onChange={(e) => {
                          const newType = e.target
                            .value as typeof formData.gamesPrizeType;
                          setFormData({
                            ...formData,
                            gamesPrizeType: newType,
                            gamesPrizeProductId:
                              newType === "free_product"
                                ? formData.gamesPrizeProductId
                                : "",
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      >
                        <option value="none">Sem premio</option>
                        <option value="discount_percentage">
                          Desconto (%)
                        </option>
                        <option value="free_product">Produto gratis</option>
                        <option value="free_dinner">Jantar gratis</option>
                      </select>
                    </div>

                    {/* Prize Product - shown for free_product */}
                    {formData.gamesPrizeType === "free_product" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Produto do premio
                        </label>
                        <select
                          value={formData.gamesPrizeProductId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gamesPrizeProductId: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        >
                          <option value="">Selecionar produto</option>
                          {isLoadingProducts ? (
                            <option value="" disabled>
                              A carregar produtos...
                            </option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Produto que o cliente ganha ao completar as rondas
                        </p>
                      </div>
                    )}

                    {/* Prize Value - shown for discount and free_dinner */}
                    {(formData.gamesPrizeType === "discount_percentage" ||
                      formData.gamesPrizeType === "free_dinner") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {formData.gamesPrizeType === "discount_percentage"
                            ? "Percentagem de desconto"
                            : "Descricao do premio"}
                        </label>
                        <input
                          type={
                            formData.gamesPrizeType === "discount_percentage"
                              ? "number"
                              : "text"
                          }
                          min={
                            formData.gamesPrizeType === "discount_percentage"
                              ? "1"
                              : undefined
                          }
                          max={
                            formData.gamesPrizeType === "discount_percentage"
                              ? "100"
                              : undefined
                          }
                          value={formData.gamesPrizeValue}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gamesPrizeValue: e.target.value,
                            })
                          }
                          placeholder={
                            formData.gamesPrizeType === "discount_percentage"
                              ? "10"
                              : "Proximo jantar gratis"
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        />
                        {formData.gamesPrizeType === "discount_percentage" && (
                          <p className="text-xs text-gray-500 mt-1">
                            Ex: 10 para 10% de desconto
                          </p>
                        )}
                      </div>
                    )}

                    {/* Min Rounds for Prize */}
                    {formData.gamesPrizeType !== "none" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rondas minimas para premio
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.gamesMinRoundsForPrize}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gamesMinRoundsForPrize:
                                parseInt(e.target.value) || 3,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Numero de rondas que a mesa precisa jogar para ganhar
                          premio
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Restaurante ativo
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creatingTables}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTables}
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingTables ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                      {editingRestaurant ? "Guardando..." : "Criando mesas..."}
                    </>
                  ) : (
                    <>{editingRestaurant ? "Guardar" : "Criar"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN SETTINGS PAGE
// =============================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notifications");

  const tabs: { id: TabId; label: string }[] = [
    { id: "notifications", label: "Notificacoes" },
    { id: "weekly-closures", label: "Dias de Folga Semanal" },
    { id: "export", label: "Exportar" },
    { id: "tables", label: "Gestao de Mesas" },
    { id: "restaurants", label: "Gestao de Restaurantes" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Definições</h2>
        <p className="mt-1 text-gray-600">Configure as definições do sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "border-[#D4AF37] text-[#D4AF37]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "weekly-closures" && <WeeklyClosuresTab />}
        {activeTab === "export" && <ExportTab />}
        {activeTab === "tables" && <TableManagementTab />}
        {activeTab === "restaurants" && <RestaurantManagementTab />}
      </div>
    </div>
  );
}
