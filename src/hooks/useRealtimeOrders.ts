"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

interface KitchenOrder {
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
  sessions?: {
    id: string;
    tables?: { number: number } | null;
  } | null;
}

interface UseRealtimeOrdersOptions {
  statuses?: OrderStatus[];
  onNewOrder?: (order: KitchenOrder) => void;
  onOrderUpdated?: (order: KitchenOrder) => void;
}

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const { statuses, onNewOrder, onOrderUpdated } = options;
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = useRef({ onNewOrder, onOrderUpdated });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onNewOrder, onOrderUpdated };
  }, [onNewOrder, onOrderUpdated]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    let query = supabase
      .from("orders")
      .select(`
        *,
        products (name, image_url),
        sessions (
          id,
          tables (number)
        )
      `)
      .order("created_at", { ascending: true });

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setIsLoading(false);
  }, [statuses]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          // Fetch the full order with relations
          const { data } = await supabase
            .from("orders")
            .select(`
              *,
              products (name, image_url),
              sessions (
                id,
                tables (number)
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            // Check if status matches filter
            if (!statuses || statuses.includes(data.status)) {
              setOrders((prev) => [...prev, data]);
              callbacksRef.current.onNewOrder?.(data);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          const newStatus = payload.new.status as OrderStatus;

          // If we have status filters
          if (statuses && statuses.length > 0) {
            const wasIncluded = statuses.includes(payload.old.status as OrderStatus);
            const isIncluded = statuses.includes(newStatus);

            if (wasIncluded && !isIncluded) {
              // Remove from list
              setOrders((prev) => prev.filter((o) => o.id !== payload.new.id));
            } else if (!wasIncluded && isIncluded) {
              // Add to list - fetch full order
              const { data } = await supabase
                .from("orders")
                .select(`
                  *,
                  products (name, image_url),
                  sessions (
                    id,
                    tables (number)
                  )
                `)
                .eq("id", payload.new.id)
                .single();

              if (data) {
                setOrders((prev) => [...prev, data]);
              }
            } else if (wasIncluded && isIncluded) {
              // Update in place
              setOrders((prev) =>
                prev.map((order) =>
                  order.id === payload.new.id
                    ? { ...order, ...payload.new }
                    : order
                )
              );
            }
          } else {
            // No filter - just update
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id
                  ? { ...order, ...payload.new }
                  : order
              )
            );
          }

          // Callback for any update
          callbacksRef.current.onOrderUpdated?.({
            ...payload.new,
            products: orders.find((o) => o.id === payload.new.id)?.products,
            sessions: orders.find((o) => o.id === payload.new.id)?.sessions,
          } as KitchenOrder);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statuses, orders]);

  // Update order status
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      return true;
    },
    []
  );

  // Group orders by status
  const ordersByStatus: Record<OrderStatus, KitchenOrder[]> = {
    pending: [],
    preparing: [],
    ready: [],
    delivered: [],
    cancelled: [],
  };

  orders.forEach((order) => {
    if (ordersByStatus[order.status]) {
      ordersByStatus[order.status].push(order);
    }
  });

  return {
    orders,
    ordersByStatus,
    isLoading,
    error,
    updateOrderStatus,
    refetch: fetchOrders,
  };
}
