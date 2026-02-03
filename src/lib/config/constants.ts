/**
 * Shared constants and configuration
 */

// Application URL
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sushinsushi.pt";

// Authentication
export const AUTH_COOKIE_NAME = "sushi-auth-token";
export const TOKEN_EXPIRATION = "24h";
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds
export const AUTH_SECRET_KEY = process.env.AUTH_SECRET || "sushi-in-sushi-secret-key-change-in-production";

// Storage keys
export const STORAGE_KEYS = {
  CART: "sushi-cart",
  SESSION: "sushi-session",
  DEVICE_ID: "sushi_device_id",
  DEVICE_NAME: "sushi_device_name",
} as const;

// Locations
export const LOCATIONS = {
  CIRCUNVALACAO: "circunvalacao",
  BOAVISTA: "boavista",
} as const;

export const LOCATION_LABELS: Record<string, string> = {
  circunvalacao: "Circunvalação",
  boavista: "Boavista",
};

// Roles
export const ROLES = {
  ADMIN: "admin",
  KITCHEN: "kitchen",
  WAITER: "waiter",
  CUSTOMER: "customer",
} as const;

// Order statuses
export const ORDER_STATUS = {
  PENDING: "pending",
  PREPARING: "preparing",
  READY: "ready",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Session statuses
export const SESSION_STATUS = {
  ACTIVE: "active",
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  CLOSED: "closed",
} as const;
