"use client";

import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

// =============================================
// CONFIGURATION
// =============================================

// Get timeout from environment variable or use default (30 minutes)
const SESSION_TIMEOUT_MS = parseInt(
  process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || "30",
  10
) * 60 * 1000;

// Warning 2 minutes before timeout
const WARNING_BEFORE_MS = 2 * 60 * 1000;

// =============================================
// COMPONENT
// =============================================

interface SessionTimeoutWarningProps {
  enabled?: boolean;
}

/**
 * Component that displays a warning modal when the session is about to expire
 * Place this component in your layout to enable session timeout
 */
export function SessionTimeoutWarning({ enabled = true }: SessionTimeoutWarningProps) {
  const { isWarning, remainingMs, extendSession } = useSessionTimeout({
    timeoutMs: SESSION_TIMEOUT_MS,
    warningBeforeMs: WARNING_BEFORE_MS,
    enabled,
  });

  // Format remaining time
  const formatRemainingTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds} segundos`;
  };

  return (
    <Modal
      isOpen={isWarning}
      onClose={extendSession}
      title="Sessão a expirar"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-gray-300">
              A sua sessão vai expirar em
            </p>
            <p className="text-2xl font-bold text-amber-500">
              {formatRemainingTime(remainingMs)}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Por segurança, sessões inativas são terminadas automaticamente.
          Clique no botão abaixo para continuar a usar a aplicação.
        </p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={extendSession}
          >
            Continuar sessão
          </Button>
        </div>
      </div>
    </Modal>
  );
}
