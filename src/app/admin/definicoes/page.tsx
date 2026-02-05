"use client";

import { useState, useEffect } from "react";
import { Card, Button, Modal } from "@/components/ui";
import type { ReservationSettings, RestaurantClosure, Location } from "@/types/database";

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

const LOCATION_LABELS: Record<string, string> = {
  circunvalacao: "Circunvalacao",
  boavista: "Boavista",
};

type TabId = "notifications" | "weekly-closures";

// =============================================
// NOTIFICATIONS TAB COMPONENT
// =============================================

function NotificationsTab() {
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        setMessage({ type: "success", text: "Definicoes guardadas com sucesso!" });
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
              <h3 className="text-lg font-semibold text-gray-900">Lembrete Dia Anterior</h3>
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
                onChange={(e) => setDayBeforeHours(parseInt(e.target.value) || 24)}
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
              <h3 className="text-lg font-semibold text-gray-900">Lembrete No Proprio Dia</h3>
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
              <h3 className="text-lg font-semibold text-gray-900">Politica Anti-Desperdicio (Rodizio)</h3>
            </div>
            <p className="mt-2 text-gray-600 text-sm">
              Inclui aviso sobre a politica de desperdicio nos emails de lembrete para reservas de rodizio.
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
              Este valor sera mostrado no email de lembrete para reservas de rodizio
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">Como funcionam os lembretes</h4>
            <p className="mt-1 text-sm text-blue-800">
              Os emails de lembrete sao enviados automaticamente pelo sistema. O cron job executa varias vezes por dia
              (9h, 11h, 13h, 15h, 17h, 19h, 21h) para verificar reservas que precisam de lembrete.
            </p>
            <ul className="mt-3 text-sm text-blue-700 space-y-1">
              <li>- <strong>Lembrete dia anterior:</strong> Enviado quando faltam X horas para a reserva (configuravel)</li>
              <li>- <strong>Lembrete no dia:</strong> Enviado X horas antes da hora da reserva (configuravel)</li>
              <li>- Os emails incluem detalhes da reserva, mapa e informacoes de contacto</li>
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
          Ultima atualizacao: {new Date(settings.updated_at).toLocaleString("pt-PT")}
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
  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!confirm("Tem a certeza que deseja remover este dia de folga semanal?")) return;

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
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Dia de Folga
        </Button>
      </div>

      {/* Closures List */}
      <Card
        variant="light"
        header={
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h3 className="font-semibold text-gray-900">Dias de Folga Semanais</h3>
          </div>
        }
      >
        {closures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                        ? LOCATION_LABELS[closure.location]
                        : "Ambas localizacoes"}
                      {closure.reason && ` - ${closure.reason}`}
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
        )}
      </Card>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">Como funcionam os dias de folga</h4>
            <p className="mt-1 text-sm text-blue-800">
              Os dias de folga semanais aplicam-se a todas as semanas. Nestes dias, o sistema de reservas
              estara bloqueado para a localizacao configurada (ou ambas).
            </p>
            <p className="mt-2 text-sm text-blue-700">
              Para feriados ou dias especificos, utilize a pagina &quot;Folgas&quot; no menu lateral.
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
              onChange={(e) => setFormData({ ...formData, recurring_day_of_week: parseInt(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, location: e.target.value as Location | "" })}
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
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
// MAIN SETTINGS PAGE
// =============================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notifications");

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "notifications", label: "Notificacoes", icon: "🔔" },
    { id: "weekly-closures", label: "Dias de Folga Semanal", icon: "📅" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Definicoes</h2>
        <p className="mt-1 text-gray-600">
          Configure as definicoes do sistema de reservas
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "weekly-closures" && <WeeklyClosuresTab />}
      </div>
    </div>
  );
}
