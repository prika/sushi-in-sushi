"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

interface Order {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  products?: { name: string; image_url?: string | null } | null;
}

interface UseOrdersOptions {
  sessionId?: string | null;
  realtime?: boolean;
}

type GroupedOrders = Record<OrderStatus, Order[]>;

export function useOrders(options: UseOrdersOptions = {}) {
  const { sessionId, realtime = true } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!sessionId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("*, products(name, image_url)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setIsLoading(false);
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!sessionId || !realtime) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`orders-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the full order with product info
            fetchOrders();
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id
                  ? { ...order, ...payload.new }
                  : order
              )
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) =>
              prev.filter((order) => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, realtime, fetchOrders]);

  // Group orders by status
  const groupedOrders: GroupedOrders = {
    pending: [],
    preparing: [],
    ready: [],
    delivered: [],
    cancelled: [],
  };

  orders.forEach((order) => {
    if (groupedOrders[order.status]) {
      groupedOrders[order.status].push(order);
    }
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: groupedOrders.pending.length,
    preparing: groupedOrders.preparing.length,
    ready: groupedOrders.ready.length,
    delivered: groupedOrders.delivered.length,
    cancelled: groupedOrders.cancelled.length,
    totalValue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.quantity * (o.unit_price || 0), 0),
  };

  return {
    orders,
    groupedOrders,
    stats,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}
