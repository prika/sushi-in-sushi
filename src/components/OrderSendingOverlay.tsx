"use client";

import type { SessionParticipant } from "@/types/database";

interface OrderSendingOverlayProps {
  isVisible: boolean;
  sendingParticipant: SessionParticipant | null;
}

export function OrderSendingOverlay({
  isVisible,
  sendingParticipant,
}: OrderSendingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-[#D4AF37]/30 border-b-transparent rounded-full animate-spin animate-reverse" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          A enviar pedido...
        </h2>

        <p className="text-gray-600 mb-4">
          {sendingParticipant?.device_name || "Outro participante"} está a
          enviar o pedido para a cozinha.
        </p>

        <p className="text-sm text-gray-500">
          Por favor aguarde um momento.
        </p>
      </div>
    </div>
  );
}
