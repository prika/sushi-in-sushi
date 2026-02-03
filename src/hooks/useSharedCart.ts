"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartItem, CartItemWithProduct, GroupedCartItems, Product } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseSharedCartProps {
  sessionId: string | null;
  deviceId: string | null;
}

export function useSharedCart({ sessionId, deviceId }: UseSharedCartProps) {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Fetch all cart items with product details
  const fetchCartItems = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabaseRef.current
      .from("cart_items")
      .select(`
        *,
        product:products(*)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching cart items:", error);
      return;
    }

    setItems((data || []) as CartItemWithProduct[]);
    setIsLoading(false);
  }, [sessionId]);

  // Add item to cart
  const addItem = useCallback(
    async (product: Product, quantity: number = 1, notes?: string) => {
      if (!sessionId || !deviceId) return;

      // Check if item already exists for this device
      const existing = items.find(
        (item) => item.product_id === product.id && item.added_by_device === deviceId
      );

      if (existing) {
        // Update quantity
        const { error } = await supabaseRef.current
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);

        if (error) {
          console.error("Error updating cart item:", error);
        }
      } else {
        // Insert new item
        const { error } = await supabaseRef.current.from("cart_items").insert({
          session_id: sessionId,
          product_id: product.id,
          quantity,
          added_by_device: deviceId,
          notes: notes || null,
        });

        if (error) {
          console.error("Error adding cart item:", error);
        }
      }
    },
    [sessionId, deviceId, items]
  );

  // Remove item from cart (decrease quantity by 1)
  const removeItem = useCallback(
    async (productId: string) => {
      if (!sessionId || !deviceId) return;

      const existing = items.find(
        (item) => item.product_id === productId && item.added_by_device === deviceId
      );

      if (!existing) return;

      if (existing.quantity <= 1) {
        // Delete item
        const { error } = await supabaseRef.current
          .from("cart_items")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Error deleting cart item:", error);
        }
      } else {
        // Decrease quantity
        const { error } = await supabaseRef.current
          .from("cart_items")
          .update({ quantity: existing.quantity - 1 })
          .eq("id", existing.id);

        if (error) {
          console.error("Error updating cart item:", error);
        }
      }
    },
    [sessionId, deviceId, items]
  );

  // Update item quantity directly
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!sessionId) return;

      if (quantity <= 0) {
        const { error } = await supabaseRef.current
          .from("cart_items")
          .delete()
          .eq("id", itemId);

        if (error) {
          console.error("Error deleting cart item:", error);
        }
      } else {
        const { error } = await supabaseRef.current
          .from("cart_items")
          .update({ quantity })
          .eq("id", itemId);

        if (error) {
          console.error("Error updating cart item:", error);
        }
      }
    },
    [sessionId]
  );

  // Delete specific item
  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!sessionId) return;

      const { error } = await supabaseRef.current
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Error deleting cart item:", error);
      }
    },
    [sessionId]
  );

  // Clear all items for current device
  const clearMyItems = useCallback(async () => {
    if (!sessionId || !deviceId) return;

    const { error } = await supabaseRef.current
      .from("cart_items")
      .delete()
      .eq("session_id", sessionId)
      .eq("added_by_device", deviceId);

    if (error) {
      console.error("Error clearing cart:", error);
    }
  }, [sessionId, deviceId]);

  // Clear all items for the session (used after order is sent)
  const clearAllItems = useCallback(async () => {
    if (!sessionId) return;

    const { error } = await supabaseRef.current
      .from("cart_items")
      .delete()
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error clearing all cart items:", error);
    }
  }, [sessionId]);

  // Get quantity of a specific product for current device
  const getQuantity = useCallback(
    (productId: string): number => {
      const item = items.find(
        (item) => item.product_id === productId && item.added_by_device === deviceId
      );
      return item?.quantity || 0;
    },
    [items, deviceId]
  );

  // Get total quantity across all devices
  const getTotalQuantity = useCallback(
    (productId: string): number => {
      return items
        .filter((item) => item.product_id === productId)
        .reduce((sum, item) => sum + item.quantity, 0);
    },
    [items]
  );

  // Setup real-time subscription
  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial items
    const supabase = supabaseRef.current;

    fetchCartItems();

    // Subscribe to changes
    channelRef.current = supabase
      .channel(`cart_items:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchCartItems();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, fetchCartItems]);

  // Group items by device
  const groupedItems: GroupedCartItems[] = items.reduce((groups, item) => {
    const existingGroup = groups.find((g) => g.deviceId === item.added_by_device);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.subtotal += item.product.price * item.quantity;
    } else {
      groups.push({
        deviceId: item.added_by_device,
        deviceName: item.added_by_device === deviceId ? "Eu" : `Participante`,
        items: [item],
        subtotal: item.product.price * item.quantity,
      });
    }

    return groups;
  }, [] as GroupedCartItems[]);

  // Calculate totals
  const myItems = items.filter((item) => item.added_by_device === deviceId);
  const myItemCount = myItems.reduce((sum, item) => sum + item.quantity, 0);
  const myTotal = myItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return {
    items,
    groupedItems,
    isLoading,
    // My items
    myItems,
    myItemCount,
    myTotal,
    // All items
    totalItemCount,
    grandTotal,
    isEmpty: items.length === 0,
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    deleteItem,
    clearMyItems,
    clearAllItems,
    getQuantity,
    getTotalQuantity,
    refetch: fetchCartItems,
  };
}
