import { useCallback } from "react";

export function useActivityLog() {
  const logActivity = useCallback(
    async (
      action: string,
      entityType?: string,
      entityId?: string,
      details?: Record<string, unknown>
    ) => {
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, entityType, entityId, details }),
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    },
    []
  );

  return { logActivity };
}
