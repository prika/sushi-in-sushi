"use client";

import { useState, useEffect } from "react";

const DEVICE_ID_KEY = "sushi_device_id";
const DEVICE_NAME_KEY = "sushi_device_name";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateDefaultDeviceName(): string {
  const adjectives = ["Feliz", "Faminto", "Alegre", "Tranquilo", "Curioso"];
  const nouns = ["Salmão", "Atum", "Camarão", "Polvo", "Caranguejo"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get or create device ID
    let storedId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedId) {
      storedId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, storedId);
    }
    setDeviceId(storedId);

    // Get or create device name
    let storedName = localStorage.getItem(DEVICE_NAME_KEY);
    if (!storedName) {
      storedName = generateDefaultDeviceName();
      localStorage.setItem(DEVICE_NAME_KEY, storedName);
    }
    setDeviceName(storedName);

    setIsReady(true);
  }, []);

  const updateDeviceName = (newName: string) => {
    localStorage.setItem(DEVICE_NAME_KEY, newName);
    setDeviceName(newName);
  };

  return {
    deviceId,
    deviceName,
    updateDeviceName,
    isReady,
  };
}
