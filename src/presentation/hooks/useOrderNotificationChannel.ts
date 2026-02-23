"use client";

import { useEffect, type MutableRefObject } from "react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface UseOrderNotificationChannelParams {
  session: { id: string } | null;
  step: "welcome" | "active";
  supabase: SupabaseClient<Database>;
  t: (_key: string, _opts?: { name?: string; count?: number }) => string;
  fetchSessionOrders: () => void;
  setOrderNotification: (_value: string | null) => void;
  channelRef: MutableRefObject<RealtimeChannel | null>;
  deviceId: string; // Current device ID to ignore own broadcasts
}

/**
 * Subscribes to Supabase broadcast "order-submitted" for the session,
 * shows a notification and clears it after 5s. Cleans up timer and channel on unmount.
 *
 * Ignores broadcasts from the same device to prevent duplicate orders from appearing
 * (real-time INSERT events already handle adding orders for the submitting device).
 */
export function useOrderNotificationChannel({
  session,
  step,
  supabase,
  t,
  fetchSessionOrders,
  setOrderNotification,
  channelRef,
  deviceId,
}: UseOrderNotificationChannelParams): void {
  useEffect(() => {
    if (!session || step !== "active") return;

    const channel = supabase.channel(`cart-review-${session.id}`);
    let notificationTimerId: number | ReturnType<typeof setTimeout> | undefined;

    channel
      .on("broadcast", { event: "order-submitted" }, (payload) => {
        const msg = payload.payload as {
          customerName: string;
          itemCount: number;
          deviceId?: string;
        };

        // Ignore broadcasts from this device (prevent duplicates)
        // Real-time INSERT events already handle adding orders for the submitting device
        if (msg.deviceId === deviceId) {
          return;
        }

        setOrderNotification(
          t("mesa.review.reviewNotification", {
            name: msg.customerName,
            count: msg.itemCount,
          }),
        );
        fetchSessionOrders();
        notificationTimerId = setTimeout(
          () => setOrderNotification(null),
          5000,
        );
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (notificationTimerId !== undefined) clearTimeout(notificationTimerId);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    session,
    step,
    supabase,
    t,
    fetchSessionOrders,
    setOrderNotification,
    channelRef,
    deviceId,
  ]);
}
