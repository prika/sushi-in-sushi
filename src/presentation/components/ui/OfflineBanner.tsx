"use client";

import { useOfflineQueue } from "@/presentation/hooks/useOfflineQueue";

/**
 * OfflineBanner — Shows a banner when the user is offline or has queued requests.
 *
 * Renders at the top of the page. Automatically hides when online with no queue.
 * Uses useSyncExternalStore under the hood (no useEffect for state).
 */
export function OfflineBanner() {
  const { isOnline, queueCount, hasPendingRequests, processQueue } =
    useOfflineQueue();

  // Online and no pending requests — hide completely
  if (isOnline && !hasPendingRequests) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOnline
          ? "bg-amber-900/90 text-amber-100"
          : "bg-red-900/90 text-red-100"
      }`}
    >
      {!isOnline ? (
        <span>
          Sem ligacao a internet
          {queueCount > 0 && (
            <span className="ml-2 opacity-80">
              ({queueCount} pedido{queueCount !== 1 ? "s" : ""} em fila)
            </span>
          )}
        </span>
      ) : (
        <span>
          {queueCount} pedido{queueCount !== 1 ? "s" : ""} pendente
          {queueCount !== 1 ? "s" : ""} —{" "}
          <button
            onClick={() => processQueue()}
            className="underline cursor-pointer hover:opacity-80"
          >
            enviar agora
          </button>
        </span>
      )}
    </div>
  );
}
