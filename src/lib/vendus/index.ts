/**
 * Vendus POS Integration Module
 *
 * Main exports for the Vendus integration service.
 * Import from '@/lib/vendus' for all Vendus-related functionality.
 */

// Types
export * from "./types";

// Configuration
export {
  VENDUS_API_BASE_URL,
  VENDUS_DEFAULTS,
  VENDUS_DOCUMENT_TYPES,
  VENDUS_TAX_RATES,
  TAX_PERCENTAGES,
  SYNC_OPERATIONS,
  getVendusConfig,
  isVendusEnabled,
  getConfiguredLocations,
  validateVendusConfig,
} from "./config";

// Client
export {
  VendusClient,
  VendusApiError,
  getVendusClient,
  clearClientCache,
} from "./client";

// Products
export {
  syncProducts,
  getProductSyncStatus,
  markProductForSync,
  getProductsWithSyncStatus,
  getProductSyncStats,
} from "./products";

// Tables
export {
  importTablesFromVendus,
  getTableMapping,
  mapTableToVendus,
  unmapTableFromVendus,
  getVendusTables,
} from "./tables";

// Invoices
export {
  createInvoice,
  voidInvoice,
  getInvoicePdf,
  getInvoices,
  getInvoiceBySession,
  processRetryQueue,
} from "./invoices";

// Kitchen
export {
  sendOrderToKitchen,
  sendOrdersToKitchen,
  getKitchenPrinters,
} from "./kitchen";
