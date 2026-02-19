'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

export interface UseOrderCooldownOptions {
  sessionOrders: Array<{ created_at: string }>;
  cooldownMinutes: number;
}

export interface UseOrderCooldownResult {
  isCooldownActive: boolean;
  remainingSeconds: number;
  remainingFormatted: string;
  progress: number; // 1.0 (just started) → 0.0 (expired)
}

export function useOrderCooldown({
  sessionOrders,
  cooldownMinutes,
}: UseOrderCooldownOptions): UseOrderCooldownResult {
  const mostRecentOrderTime = useMemo(() => {
    if (!sessionOrders || sessionOrders.length === 0) return null;

    let latest: Date | null = null;
    for (const order of sessionOrders) {
      const date = new Date(order.created_at);
      if (!latest || date.getTime() > latest.getTime()) {
        latest = date;
      }
    }
    return latest;
  }, [sessionOrders]);

  const calculateRemaining = useCallback((): number => {
    if (cooldownMinutes <= 0 || !mostRecentOrderTime) return 0;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const expiresAt = mostRecentOrderTime.getTime() + cooldownMs;
    const now = Date.now();
    const remainingMs = expiresAt - now;

    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }, [cooldownMinutes, mostRecentOrderTime]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calculateRemaining()
  );

  // Recalculate when inputs change
  useEffect(() => {
    setRemainingSeconds(calculateRemaining());
  }, [calculateRemaining]);

  // Countdown interval
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCooldownActive = remainingSeconds > 0;

  const remainingFormatted = useMemo(() => {
    if (remainingSeconds <= 0) return '0:00';

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const progress = useMemo(() => {
    if (!isCooldownActive || cooldownMinutes <= 0) return 0;

    return remainingSeconds / (cooldownMinutes * 60);
  }, [remainingSeconds, cooldownMinutes, isCooldownActive]);

  return {
    isCooldownActive,
    remainingSeconds,
    remainingFormatted,
    progress,
  };
}
