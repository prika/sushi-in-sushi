"use client";

import { useState } from "react";
import Link from "next/link";
import type { TableFullStatus, TableStatus } from "@/types/database";

interface TableDetailModalProps {
  table: TableFullStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  onStartSession: (
    tableId: string,
    isRodizio: boolean,
    numPeople: number
  ) => Promise<{ success: boolean; error?: string }>;
  onMarkInactive: (
    tableId: string,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;
  onReactivate: (
    tableId: string
  ) => Promise<{ success: boolean; error?: string }>;
  onRequestBill: (
    sessionId: string
  ) => Promise<{ success: boolean; error?: string }>;
  onCloseSession: (
    sessionId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function TableDetailModal({
  table,
  isOpen,
  onClose,
  onStatusChange,
  onStartSession,
  onMarkInactive,
  onReactivate,
  onRequestBill,
  onCloseSession,
}: TableDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Walk-in form
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInData, setWalkInData] = useState({
    isRodizio: true,
    numPeople: 2,
  });

  // Inactive form
  const [showInactiveForm, setShowInactiveForm] = useState(false);
  const [inactiveReason, setInactiveReason] = useState("");

  if (!isOpen || !table) return null;

  const status = (table.status as TableStatus) || "available";

  const handleStartWalkIn = async () => {
    setIsLoading(true);
    setError(null);

    const result = await onStartSession(
      table.id,
      walkInData.isRodizio,
      walkInData.numPeople
    );

    setIsLoading(false);

    if (result.success) {
      setShowWalkInForm(false);
      onStatusChange();
      onClose();
    } else {
      setError(result.error || "Erro ao iniciar sessão");
    }
  };

  const handleMarkInactive = async () => {
    if (!inactiveReason.trim()) {
      setError("Por favor, indique o motivo");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await onMarkInactive(table.id, inactiveReason);

    setIsLoading(false);

    if (result.success) {
      setShowInactiveForm(false);
      setInactiveReason("");
      onStatusChange();
      onClose();
    } else {
      setError(result.error || "Erro ao desativar mesa");
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    setError(null);

    const result = await onReactivate(table.id);

    setIsLoading(false);

    if (result.success) {
      onStatusChange();
      onClose();
    } else {
      setError(result.error || "Erro ao reativar mesa");
    }
  };

  const handleRequestBill = async () => {
    if (!table.session_id) return;

    setIsLoading(true);
    setError(null);

    const result = await onRequestBill(table.session_id);

    setIsLoading(false);

    if (result.success) {
      onStatusChange();
    } else {
      setError(result.error || "Erro ao pedir conta");
    }
  };

  const handleCloseSession = async () => {
    if (!table.session_id) return;

    if (!confirm("Tem certeza que deseja fechar esta sessão?")) return;

    setIsLoading(true);
    setError(null);

    const result = await onCloseSession(table.session_id);

    setIsLoading(false);

    if (result.success) {
      onStatusChange();
      onClose();
    } else {
      setError(result.error || "Erro ao fechar sessão");
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Mesa {table.number} - {table.name}
            </h2>
            <span
              className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                status === "available"
                  ? "bg-green-100 text-green-700"
                  : status === "reserved"
                    ? "bg-yellow-100 text-yellow-700"
                    : status === "occupied"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
              }`}
            >
              {table.status_label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Assigned Waiter */}
          {table.waiter_name && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Empregado Atribuído</p>
                <p className="text-sm font-semibold text-blue-900">{table.waiter_name}</p>
              </div>
            </div>
          )}

          {/* Occupied - Session Info */}
          {status === "occupied" && table.session_id && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-3">
                  Sessão em Curso
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">
                      {table.is_rodizio ? "Rodízio" : "À Carta"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pessoas:</span>
                    <span className="font-medium">{table.session_people}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duração:</span>
                    <span className="font-medium">
                      {formatDuration(table.minutes_occupied)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total atual:</span>
                    <span className="font-medium text-green-600">
                      €{(table.session_total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href={`/waiter/mesa/${table.id}`}
                  className="w-full px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors text-center"
                >
                  Ver Pedidos
                </Link>
                <button
                  onClick={handleRequestBill}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-[#D4AF37] text-[#D4AF37] font-semibold rounded-lg hover:bg-[#D4AF37]/10 transition-colors disabled:opacity-50"
                >
                  Pedir Conta
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-red-500 text-red-500 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Fechar Sessão
                </button>
              </div>
            </div>
          )}

          {/* Reserved - Reservation Info */}
          {status === "reserved" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-800 mb-3">Reserva</h3>
                <div className="space-y-2 text-sm">
                  {table.reservation_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hora:</span>
                      <span className="font-medium">
                        {table.reservation_time}
                      </span>
                    </div>
                  )}
                  {table.reservation_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nome:</span>
                      <span className="font-medium">
                        {table.reservation_name}
                      </span>
                    </div>
                  )}
                  {table.reservation_people && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pessoas:</span>
                      <span className="font-medium">
                        {table.reservation_people}
                      </span>
                    </div>
                  )}
                  {table.reservation_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Telefone:</span>
                      <span className="font-medium">
                        {table.reservation_phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowWalkInForm(true)}
                  className="w-full px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors"
                >
                  Iniciar Sessão
                </button>
                {table.reservation_phone && (
                  <a
                    href={`tel:${table.reservation_phone}`}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    Contactar Cliente
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Available - Actions */}
          {status === "available" && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  Mesa Disponível
                </h3>
                <p className="text-sm text-green-700">
                  Esta mesa está pronta para receber clientes.
                </p>
              </div>

              {!showWalkInForm && !showInactiveForm && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowWalkInForm(true)}
                    className="w-full px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors"
                  >
                    Iniciar Sessão (Walk-in)
                  </button>
                  <button
                    onClick={() => setShowInactiveForm(true)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Marcar como Inativa
                  </button>
                </div>
              )}

              {/* Walk-in Form */}
              {showWalkInForm && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Nova Sessão</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Serviço
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setWalkInData({ ...walkInData, isRodizio: true })
                        }
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          walkInData.isRodizio
                            ? "bg-[#D4AF37] text-black"
                            : "bg-white border border-gray-300 text-gray-700"
                        }`}
                      >
                        Rodízio
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setWalkInData({ ...walkInData, isRodizio: false })
                        }
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          !walkInData.isRodizio
                            ? "bg-[#D4AF37] text-black"
                            : "bg-white border border-gray-300 text-gray-700"
                        }`}
                      >
                        À Carta
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Pessoas
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setWalkInData({
                            ...walkInData,
                            numPeople: Math.max(1, walkInData.numPeople - 1),
                          })
                        }
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-xl font-bold"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={walkInData.numPeople}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setWalkInData({
                            ...walkInData,
                            numPeople: Math.min(20, Math.max(1, val)),
                          });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-center text-lg font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setWalkInData({
                            ...walkInData,
                            numPeople: Math.min(20, walkInData.numPeople + 1),
                          })
                        }
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowWalkInForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartWalkIn}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "A iniciar..." : "Iniciar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Inactive Form */}
              {showInactiveForm && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Marcar como Inativa
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo
                    </label>
                    <textarea
                      value={inactiveReason}
                      onChange={(e) => setInactiveReason(e.target.value)}
                      placeholder="Ex: Manutenção, limpeza, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowInactiveForm(false);
                        setInactiveReason("");
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleMarkInactive}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "A desativar..." : "Desativar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inactive */}
          {status === "inactive" && (
            <div className="space-y-4">
              <div className="bg-gray-100 border border-gray-300 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Mesa Inativa
                </h3>
                {table.status_note && (
                  <p className="text-sm text-gray-600">
                    Motivo: {table.status_note}
                  </p>
                )}
              </div>

              <button
                onClick={handleReactivate}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "A reativar..." : "Reativar Mesa"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
