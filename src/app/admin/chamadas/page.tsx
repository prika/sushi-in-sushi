"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WaiterCallWithDetails, Location } from "@/types/database";

const CALL_TYPE_CONFIG = {
  assistance: { icon: "🙋", label: "Ajuda", color: "bg-blue-500" },
  bill: { icon: "💳", label: "Conta", color: "bg-green-500" },
  order: { icon: "📝", label: "Pedido", color: "bg-orange-500" },
  other: { icon: "❓", label: "Outro", color: "bg-gray-500" },
};

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  acknowledged: { label: "A caminho", color: "text-blue-500", bg: "bg-blue-500/10" },
  completed: { label: "Concluído", color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { label: "Cancelado", color: "text-gray-500", bg: "bg-gray-500/10" },
};

const LOCATION_LABELS: Record<string, string> = {
  circunvalacao: "Circunvalação",
  boavista: "Boavista",
};

// Helper to bypass Supabase type checking
function getExtendedSupabase(supabase: ReturnType<typeof createClient>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

export default function ChamadasPage() {
  const [calls, setCalls] = useState<WaiterCallWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supabase = createClient();

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    const extendedSupabase = getExtendedSupabase(supabase);

    let query = extendedSupabase
      .from("waiter_calls_with_details")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedLocation !== "all") {
      query = query.eq("location", selectedLocation);
    }

    if (!showCompleted) {
      query = query.in("status", ["pending", "acknowledged"]);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching calls:", error);
      return;
    }

    setCalls(data as WaiterCallWithDetails[]);
    setIsLoading(false);
  }, [supabase, selectedLocation, showCompleted]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Real-time subscription for new calls
  useEffect(() => {
    const channel = supabase
      .channel("waiter-calls-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiter_calls",
        },
        (payload) => {
          console.log("Waiter call update:", payload);

          // Play sound for new pending calls
          if (payload.eventType === "INSERT" && payload.new.status === "pending") {
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(console.error);
            }

            // Show browser notification
            if (Notification.permission === "granted") {
              new Notification("Nova chamada!", {
                body: `Mesa ${payload.new.table_id} precisa de assistência`,
                icon: "/logo.png",
              });
            }
          }

          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, soundEnabled, fetchCalls]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Acknowledge call
  const acknowledgeCall = async (callId: string) => {
    const extendedSupabase = getExtendedSupabase(supabase);

    const { error } = await extendedSupabase
      .from("waiter_calls")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", callId);

    if (error) {
      console.error("Error acknowledging call:", error);
      return;
    }

    fetchCalls();
  };

  // Complete call
  const completeCall = async (callId: string) => {
    const extendedSupabase = getExtendedSupabase(supabase);

    const { error } = await extendedSupabase
      .from("waiter_calls")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", callId);

    if (error) {
      console.error("Error completing call:", error);
      return;
    }

    fetchCalls();
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Agora mesmo";
    if (seconds < 120) return "1 min";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 7200) return "1 hora";
    return `${Math.floor(seconds / 3600)} horas`;
  };

  const pendingCalls = calls.filter(c => c.status === "pending");
  const acknowledgedCalls = calls.filter(c => c.status === "acknowledged");
  const completedCalls = calls.filter(c => c.status === "completed" || c.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Audio for notifications */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamadas de Mesas</h1>
          <p className="text-gray-500">Notificações em tempo real dos clientes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-gray-100 text-gray-400"
            }`}
            title={soundEnabled ? "Som ativado" : "Som desativado"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {soundEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              )}
            </svg>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchCalls}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Atualizar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Location filter */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedLocation("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedLocation === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedLocation("circunvalacao")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedLocation === "circunvalacao"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Circunvalação
          </button>
          <button
            onClick={() => setSelectedLocation("boavista")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedLocation === "boavista"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Boavista
          </button>
        </div>

        {/* Show completed toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
          />
          <span className="text-sm text-gray-600">Mostrar concluídas</span>
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600 font-medium">Pendentes</p>
          <p className="text-3xl font-bold text-yellow-700">{pendingCalls.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">A caminho</p>
          <p className="text-3xl font-bold text-blue-700">{acknowledgedCalls.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Concluídas hoje</p>
          <p className="text-3xl font-bold text-green-700">{completedCalls.length}</p>
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-gray-500 text-lg">Nenhuma chamada no momento</p>
          <p className="text-gray-400 text-sm mt-2">As chamadas aparecerão aqui em tempo real</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending calls - highlight these */}
          {pendingCalls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Pendentes
              </h2>
              {pendingCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onAcknowledge={() => acknowledgeCall(call.id)}
                  onComplete={() => completeCall(call.id)}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}

          {/* Acknowledged calls */}
          {acknowledgedCalls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">A caminho</h2>
              {acknowledgedCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onComplete={() => completeCall(call.id)}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}

          {/* Completed calls */}
          {showCompleted && completedCalls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-500">Concluídas</h2>
              {completedCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Call Card Component
function CallCard({
  call,
  onAcknowledge,
  onComplete,
  formatTimeAgo,
}: {
  call: WaiterCallWithDetails;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  formatTimeAgo: (date: string) => string;
}) {
  const typeConfig = CALL_TYPE_CONFIG[call.call_type] || CALL_TYPE_CONFIG.other;
  const statusConfig = STATUS_CONFIG[call.status];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 p-4 transition-all ${
        call.status === "pending"
          ? "border-yellow-300 animate-pulse-border"
          : call.status === "acknowledged"
            ? "border-blue-200"
            : "border-gray-200 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Call type icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${typeConfig.color}/10`}>
            {typeConfig.icon}
          </div>

          <div>
            {/* Table info */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-gray-900">
                Mesa {call.table_number}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Call type and location */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{typeConfig.label}</span>
              <span>•</span>
              <span>{LOCATION_LABELS[call.location]}</span>
            </div>

            {/* Waiter info */}
            {call.assigned_waiter_name && (
              <p className="text-sm text-blue-600 mt-1">
                Empregado: {call.assigned_waiter_name}
              </p>
            )}

            {/* Message if any */}
            {call.message && (
              <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                {call.message}
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500 mb-2">{formatTimeAgo(call.created_at)}</p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {call.status === "pending" && onAcknowledge && (
              <button
                onClick={onAcknowledge}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                A caminho
              </button>
            )}
            {(call.status === "pending" || call.status === "acknowledged") && onComplete && (
              <button
                onClick={onComplete}
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(253 224 71); }
          50% { border-color: rgb(250 204 21); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
