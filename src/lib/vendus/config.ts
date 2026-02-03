/**
 * Vendus POS Configuration
 */

import type { VendusConfig } from "./types";

// =============================================
// API CONFIGURATION
// =============================================

export const VENDUS_API_BASE_URL = "https://www.vendus.pt/ws/v1.2";

export const VENDUS_DEFAULTS = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelayMs: 1000,
  rateLimitPerMinute: 60,
} as const;

// =============================================
// DOCUMENT TYPES
// =============================================

export const VENDUS_DOCUMENT_TYPES = {
  FATURA_RECIBO: "FR", // Fatura-Recibo (most common for retail)
  FATURA: "FT", // Fatura (requires customer NIF)
  FATURA_SIMPLIFICADA: "FS", // Fatura Simplificada (< 100 EUR)
} as const;

// =============================================
// TAX RATES (Portugal)
// =============================================

export const VENDUS_TAX_RATES = {
  NORMAL: "1", // 23% IVA - Standard rate
  INTERMEDIATE: "2", // 13% IVA - Intermediate rate
  REDUCED: "3", // 6% IVA - Reduced rate
  EXEMPT: "4", // 0% IVA - Exempt
} as const;

export const TAX_PERCENTAGES: Record<string, number> = {
  "1": 0.23,
  "2": 0.13,
  "3": 0.06,
  "4": 0,
};

// =============================================
// SYNC OPERATIONS
// =============================================

export const SYNC_OPERATIONS = {
  PRODUCT_SYNC: "product_sync",
  PRODUCT_PUSH: "product_push",
  PRODUCT_PULL: "product_pull",
  TABLE_IMPORT: "table_import",
  INVOICE_CREATE: "invoice_create",
  INVOICE_VOID: "invoice_void",
  KITCHEN_PRINT: "kitchen_print",
} as const;

// =============================================
// CONFIGURATION FUNCTIONS
// =============================================

/**
 * Get Vendus configuration for a specific location
 * Supports per-location API keys or falls back to global
 */
export function getVendusConfig(locationSlug: string): VendusConfig | null {
  // Try location-specific config first
  const locationUpper = locationSlug.toUpperCase();
  const apiKey =
    process.env[`VENDUS_API_KEY_${locationUpper}`] || process.env.VENDUS_API_KEY;
  const storeId =
    process.env[`VENDUS_STORE_ID_${locationUpper}`] || process.env.VENDUS_STORE_ID;
  const registerId =
    process.env[`VENDUS_REGISTER_ID_${locationUpper}`] || process.env.VENDUS_REGISTER_ID;

  if (!apiKey || !storeId || !registerId) {
    return null;
  }

  return {
    apiKey,
    storeId,
    registerId,
    baseUrl: VENDUS_API_BASE_URL,
    timeout: VENDUS_DEFAULTS.timeout,
    retryAttempts: VENDUS_DEFAULTS.retryAttempts,
  };
}

/**
 * Check if Vendus is enabled for a location or globally
 */
export function isVendusEnabled(locationSlug?: string): boolean {
  if (locationSlug) {
    return !!getVendusConfig(locationSlug);
  }
  return !!process.env.VENDUS_API_KEY;
}

/**
 * Get all configured location slugs
 */
export function getConfiguredLocations(): string[] {
  const locations: string[] = [];

  // Check for global config
  if (process.env.VENDUS_API_KEY) {
    // Check each known location
    if (getVendusConfig("circunvalacao")) {
      locations.push("circunvalacao");
    }
    if (getVendusConfig("boavista")) {
      locations.push("boavista");
    }
  }

  return locations;
}

/**
 * Validate environment configuration
 */
export function validateVendusConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for at least one API key
  if (!process.env.VENDUS_API_KEY) {
    if (
      !process.env.VENDUS_API_KEY_CIRCUNVALACAO &&
      !process.env.VENDUS_API_KEY_BOAVISTA
    ) {
      warnings.push("Nenhuma API key do Vendus configurada");
    }
  }

  // Check for store and register IDs
  if (process.env.VENDUS_API_KEY) {
    if (!process.env.VENDUS_STORE_ID) {
      errors.push("VENDUS_STORE_ID em falta");
    }
    if (!process.env.VENDUS_REGISTER_ID) {
      errors.push("VENDUS_REGISTER_ID em falta");
    }
  }

  // Check cron secret
  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET em falta - cron jobs nao funcionarao");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
