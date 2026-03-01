/**
 * Vendus POS Configuration
 *
 * Configuração vem da tabela locations (admin) + API key em env.
 * Store ID e Register ID são configurados por localização no admin.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { VendusConfig } from "./types";

// Tabela locations não está nos tipos gerados; usar cast para query dinâmica
function fromLocations(supabase: ReturnType<typeof createAdminClient>) {
  type LocationsQuery = {
    select: (_c: string) => {
      eq: (
        _col: string,
        _val: unknown,
      ) => {
        single: () => Promise<{
          data: {
            vendus_store_id: string | null;
            vendus_register_id: string | null;
            vendus_enabled: boolean | null;
          } | null;
        }>;
        not: (
          _col: string,
          _op: string,
          _val: unknown,
        ) => {
          not: (
            _col: string,
            _op: string,
            _val: unknown,
          ) => {
            order: (_col: string) => Promise<{ data: { slug: string }[] }>;
          };
        };
      };
    };
  };
  return (supabase as unknown as { from: (_: string) => LocationsQuery }).from(
    "locations",
  );
}

// =============================================
// API CONFIGURATION
// =============================================

export const VENDUS_API_BASE_URL = "https://www.vendus.pt/ws/v1.1";

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
 * Obtém configuração Vendus para uma localização.
 * Store ID e Register ID vêm da tabela locations (configurado no admin).
 * API key vem de VENDUS_API_KEY (env).
 */
export async function getVendusConfig(
  locationSlug: string,
): Promise<VendusConfig | null> {
  const apiKey = process.env.VENDUS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const supabase = createAdminClient();
  const { data: location } = await fromLocations(supabase)
    .select("vendus_store_id, vendus_register_id, vendus_enabled")
    .eq("slug", locationSlug)
    .single();

  if (
    !location?.vendus_enabled ||
    !location?.vendus_store_id ||
    !location?.vendus_register_id
  ) {
    return null;
  }

  return {
    apiKey,
    storeId: location.vendus_store_id,
    registerId: location.vendus_register_id,
    baseUrl: VENDUS_API_BASE_URL,
    timeout: VENDUS_DEFAULTS.timeout,
    retryAttempts: VENDUS_DEFAULTS.retryAttempts,
  };
}

/**
 * Verifica se Vendus está configurado (API key em env).
 */
export function isVendusEnabled(): boolean {
  return !!process.env.VENDUS_API_KEY;
}

/**
 * Verifica se o Vendus esta em modo de somente-leitura.
 * Quando true, operacoes de escrita (push/export) sao bloqueadas.
 * Util durante desenvolvimento/testes para proteger dados no Vendus.
 */
export function isVendusReadOnly(): boolean {
  return process.env.VENDUS_READONLY === "true";
}

/**
 * Obtém slugs das localizações com Vendus configurado (da tabela locations).
 */
export async function getConfiguredLocations(): Promise<string[]> {
  if (!process.env.VENDUS_API_KEY) {
    return [];
  }

  const supabase = createAdminClient();
  const { data: locations } = await fromLocations(supabase)
    .select("slug")
    .eq("vendus_enabled", true)
    .not("vendus_store_id", "is", null)
    .not("vendus_register_id", "is", null)
    .order("name");

  return (locations || []).map((l: { slug: string }) => l.slug);
}

/**
 * Valida configuração (API key obrigatória; store/register configurados no admin)
 */
export function validateVendusConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.VENDUS_API_KEY) {
    errors.push("VENDUS_API_KEY em falta - configure no .env");
  }

  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET em falta - cron jobs nao funcionarao");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
