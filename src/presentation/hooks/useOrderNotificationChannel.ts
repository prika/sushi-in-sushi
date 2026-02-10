"use client";

import { useEffect, type MutableRefObject } from "react";

/** Channel returned by supabase.channel() - minimal shape used by this hook */
export interface RealtimeChannelLike {
  on: (
    type: "broadcast",
    opts: Record<string, string>,
    callback: (payload: { payload: Record<string, unknown> }) => void
  ) => { subscribe: () => void };
}

/** Supabase client minimal shape for order notification channel */
export interface OrderNotificationSupabaseLike {
  channel: (name: string) => RealtimeChannelLike;
  removeChannel: (channel: RealtimeChannelLike) => void;
}

export interface UseOrderNotificationChannelParams {
  session: { id: string } | null;
  step: "welcome" | "active";
  supabase: OrderNotificationSupabaseLike;
  t: (key: string, opts?: { name?: string; count?: number }) => string;
  fetchSessionOrders: () => void;
  setOrderNotification: (value: string | null) => void;
  channelRef: MutableRefObject<RealtimeChannelLike | null>;
}

/**
 * Subscribes to Supabase broadcast "order-submitted" for the session,
 * shows a notification and clears it after 5s. Cleans up timer and channel on unmount.
 */
export function useOrderNotificationChannel({
  session,
  step,
  supabase,
  t,
  fetchSessionOrders,
  setOrderNotification,
  channelRef,
}: UseOrderNotificationChannelParams): void {
  useEffect(() => {
    if (!session || step !== "active") return;

    const channel = supabase.channel(`cart-review-${session.id}`);
    let notificationTimerId: number | ReturnType<typeof setTimeout> | undefined;

    channel
      .on("broadcast", { event: "order-submitted" }, (payload) => {
        const msg = payload.payload as { customerName: string; itemCount: number };
        setOrderNotification(
          t("mesa.review.reviewNotification", {
            name: msg.customerName,
            count: msg.itemCount,
          })
        );
        fetchSessionOrders();
        notificationTimerId = setTimeout(() => setOrderNotification(null), 5000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (notificationTimerId !== undefined) clearTimeout(notificationTimerId);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session, step, supabase, t, fetchSessionOrders, setOrderNotification, channelRef]);
}
