"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useSound() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load sound preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("kitchen-sound-enabled");
    if (stored !== null) {
      setIsSoundEnabled(stored === "true");
    }

    // Initialize audio element
    audioRef.current = new Audio("/sounds/new-order.mp3");
    audioRef.current.volume = 0.7;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("kitchen-sound-enabled", String(newValue));
      return newValue;
    });
  }, []);

  // Store isSoundEnabled in a ref to avoid dependency changes
  const isSoundEnabledRef = useRef(isSoundEnabled);
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // Play new order sound - stable reference, no dependencies that change
  const playNewOrderSound = useCallback(() => {
    if (!isSoundEnabledRef.current || !audioRef.current) return;

    // Reset and play
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.log("Could not play sound:", err);
    });
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/logo.png",
        tag: "new-order",
      });
    }
  }, []);

  return {
    isSoundEnabled,
    toggleSound,
    playNewOrderSound,
    requestNotificationPermission,
    showNotification,
  };
}
