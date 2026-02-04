"use client";

import { useState, useEffect } from "react";
import type { ReservationSettings } from "@/types/database";

export default function SettingsPage() {
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Definicoes de Reservas</h2>
        <p className="mt-1 text-gray-600">
          Configure os lembretes automaticos e politicas de reserva
        </p>
      </div>

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
