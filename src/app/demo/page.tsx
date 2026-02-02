"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ViewMode = "split" | "cliente" | "cozinha";

export default function DemoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isResetting, setIsResetting] = useState(false);
  const [lastOrderTime, setLastOrderTime] = useState<Date | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  // Track real-time latency
  useEffect(() => {
    const supabase = createClient();
    let orderCreatedTime: number | null = null;

    const channel = supabase
      .channel("demo-latency")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          if (orderCreatedTime) {
            const latencyMs = Date.now() - orderCreatedTime;
            setLatency(latencyMs);
            orderCreatedTime = null;
          }
          setLastOrderTime(new Date());
        }
      )
      .subscribe();

    // Listen for order creation from client iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "order-created") {
        orderCreatedTime = Date.now();
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Reset demo data
  const handleReset = async () => {
    if (!confirm("Tem a certeza que deseja limpar todos os dados de demonstração?")) {
      return;
    }

    setIsResetting(true);

    try {
      const supabase = createClient();

      // Delete all orders from demo sessions
      await supabase
        .from("orders")
        .delete()
        .not("id", "is", null); // Delete all - in production you'd filter by demo location

      // Delete demo sessions
      await supabase
        .from("sessions")
        .delete()
        .not("id", "is", null); // Delete all - in production you'd filter by demo location

      // Refresh iframes
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        if (iframe.contentWindow) {
          iframe.contentWindow.location.reload();
        }
      });

      setLatency(null);
      setLastOrderTime(null);
    } catch (error) {
      console.error("Error resetting demo:", error);
    }

    setIsResetting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🍣</span>
            <div>
              <h1 className="font-bold">Sushi in Sushi - Demo</h1>
              <p className="text-xs text-gray-400">Sistema de Pedidos em Tempo Real</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Latency indicator */}
            {latency !== null && (
              <div className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                Latência: {latency}ms
              </div>
            )}

            {/* Last order */}
            {lastOrderTime && (
              <div className="text-xs text-gray-400">
                Último pedido: {lastOrderTime.toLocaleTimeString("pt-PT")}
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === "split"
                    ? "bg-[#D4AF37] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode("cliente")}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === "cliente"
                    ? "bg-[#D4AF37] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Cliente
              </button>
              <button
                onClick={() => setViewMode("cozinha")}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === "cozinha"
                    ? "bg-[#D4AF37] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Cozinha
              </button>
            </div>

            {/* Reset button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
            >
              {isResetting ? "A limpar..." : "Reset Demo"}
            </button>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-bold">1</span>
            <span>Faça um pedido no lado do <strong>Cliente</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-bold">2</span>
            <span>Veja aparecer na <strong>Cozinha</strong> em tempo real</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-bold">3</span>
            <span>Mude o status e veja atualizar no <strong>Cliente</strong></span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex">
        {/* Client View */}
        {(viewMode === "split" || viewMode === "cliente") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2 border-r border-gray-300" : "w-full"}`}>
            <div className="bg-gray-200 px-4 py-2 flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span className="font-medium text-gray-700">Vista do Cliente</span>
              <span className="text-xs text-gray-500">(Mesa 1)</span>
            </div>
            <div className="flex-1 bg-black">
              <iframe
                src="/mesa/1"
                className="w-full h-full border-0"
                title="Vista do Cliente"
              />
            </div>
          </div>
        )}

        {/* Kitchen View */}
        {(viewMode === "split" || viewMode === "cozinha") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
            <div className="bg-gray-200 px-4 py-2 flex items-center gap-2">
              <span className="text-lg">👨‍🍳</span>
              <span className="font-medium text-gray-700">Vista da Cozinha</span>
            </div>
            <div className="flex-1 bg-[#111]">
              <iframe
                src="/cozinha"
                className="w-full h-full border-0"
                title="Vista da Cozinha"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-gray-400 text-center py-2 text-xs">
        Sistema de Pedidos em Tempo Real • Powered by Supabase Realtime
      </footer>
    </div>
  );
}
