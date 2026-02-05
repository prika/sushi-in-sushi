import QRCode from "qrcode";
import type { Location } from "@/types";
import { APP_URL } from "@/lib/config/constants";

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const defaultOptions: QRCodeOptions = {
  width: 400,
  margin: 2,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
};

/**
 * Generate a QR code as a data URL (base64 PNG)
 */
export async function generateQRCodeDataURL(
  url: string,
  options: QRCodeOptions = {},
): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };

  return QRCode.toDataURL(url, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
    type: "image/png",
  });
}

/**
 * Render QR code directly to a canvas element
 */
export async function generateQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  options: QRCodeOptions = {},
): Promise<void> {
  const mergedOptions = { ...defaultOptions, ...options };

  await QRCode.toCanvas(canvas, url, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
  });
}

/**
 * Build the URL for table ordering using token
 */
export function buildTableOrderURL(
  token: string,
  location: Location,
): string {
  return `${APP_URL}/pedido/${location}/${token}`;
}

/**
 * Build the URL for table ordering using table number (legacy)
 */
export function buildTableOrderURLByNumber(
  tableNumber: number,
  location: Location,
): string {
  return `${APP_URL}/mesa/${tableNumber}?loc=${location}`;
}

/**
 * Generate a unique QR code token
 */
export function generateQRToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Format date for display
 */
export function formatQRDate(dateString: string | null): string {
  if (!dateString) return "Nunca";

  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
