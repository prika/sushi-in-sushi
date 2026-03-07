/**
 * offlineFetch — Drop-in replacement for fetch() that queues on network failure.
 *
 * Usage:
 *   // Instead of: await fetch("/api/orders", { method: "POST", body })
 *   await offlineFetch("/api/orders", {
 *     method: "POST",
 *     body: JSON.stringify(orderData),
 *     offlineLabel: "Pedido: 3x Salmão",
 *   });
 *
 * Behavior:
 *   - Online + server OK: returns Response normally
 *   - Online + server error (5xx): returns Response (caller handles)
 *   - Offline / network error: queues in IndexedDB, returns synthetic Response
 */

import { getOfflineQueue } from "./OfflineQueue";

interface OfflineFetchOptions extends RequestInit {
  /** Human-readable label for the queued request (shown in UI) */
  offlineLabel?: string;
  /** Priority (lower = higher). Default: 10 */
  offlinePriority?: number;
  /** Max retries. Default: 5 */
  offlineMaxRetries?: number;
}

export async function offlineFetch(
  url: string,
  options: OfflineFetchOptions = {},
): Promise<Response> {
  const {
    offlineLabel,
    offlinePriority,
    offlineMaxRetries,
    ...fetchOptions
  } = options;

  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    // Network error — queue for later
    if (!isQueueableMethod(fetchOptions.method)) {
      throw error; // Only queue mutations, not GETs
    }

    const queue = getOfflineQueue();
    const id = await queue.enqueue({
      url,
      method: fetchOptions.method as "POST" | "PUT" | "PATCH" | "DELETE",
      headers: extractHeaders(fetchOptions.headers),
      body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
      label: offlineLabel || `${fetchOptions.method} ${url}`,
      priority: offlinePriority,
      maxRetries: offlineMaxRetries,
    });

    // Return a synthetic "queued" response so callers can handle gracefully
    return new Response(
      JSON.stringify({ queued: true, queueId: id }),
      {
        status: 202, // Accepted
        headers: { "Content-Type": "application/json", "X-Offline-Queued": "true" },
      },
    );
  }
}

/**
 * Check if a Response was served from the offline queue.
 */
export function isOfflineResponse(response: Response): boolean {
  return response.headers.get("X-Offline-Queued") === "true";
}

function isQueueableMethod(method?: string): boolean {
  if (!method) return false;
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function extractHeaders(
  headers?: HeadersInit,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
}
