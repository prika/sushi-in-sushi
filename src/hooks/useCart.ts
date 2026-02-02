"use client";

import { useState, useEffect, useCallback } from "react";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface UseCartOptions {
  sessionId?: string | null;
  persist?: boolean;
}

const CART_STORAGE_KEY = "sushi-cart";

export function useCart(options: UseCartOptions = {}) {
  const { sessionId, persist = true } = options;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get storage key (include sessionId if available)
  const storageKey = sessionId ? `${CART_STORAGE_KEY}-${sessionId}` : CART_STORAGE_KEY;

  // Load cart from localStorage
  useEffect(() => {
    if (!persist) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading cart:", e);
    }

    setIsLoading(false);
  }, [storageKey, persist]);

  // Save cart to localStorage
  useEffect(() => {
    if (!persist || isLoading) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }, [items, storageKey, persist, isLoading]);

  const addItem = useCallback(
    (product: { id: string; name: string; price: number }, quantity: number = 1) => {
      setItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.productId === product.id);

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }

        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);

      if (existingIndex < 0) return prev;

      const existing = prev[existingIndex];
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.productId !== productId);
      }

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity - 1,
      };
      return updated;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      if (existingIndex < 0) return prev;

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity,
      };
      return updated;
    });
  }, []);

  const updateNotes = useCallback((productId: string, notes: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      if (existingIndex < 0) return prev;

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        notes,
      };
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    if (persist) {
      localStorage.removeItem(storageKey);
    }
  }, [persist, storageKey]);

  const getQuantity = useCallback(
    (productId: string) => {
      return items.find((item) => item.productId === productId)?.quantity || 0;
    },
    [items]
  );

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    isLoading,
    itemCount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clear,
    getQuantity,
    isEmpty: items.length === 0,
  };
}
