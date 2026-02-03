/**
 * Vendus POS API Types
 * Documentation: https://www.vendus.pt/ws/
 */

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface VendusConfig {
  apiKey: string;
  storeId: string;
  registerId: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface VendusProduct {
  id: string;
  reference: string;
  name: string;
  description?: string;
  price: number;
  tax_id: string;
  tax_value?: number;
  category_id?: string;
  category_name?: string;
  is_active: boolean;
  stock?: number;
  unit?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface VendusProductRequest {
  reference?: string;
  name: string;
  description?: string;
  price: number;
  tax_id: string;
  category_id?: string;
  is_active?: boolean;
  unit?: string;
  barcode?: string;
}

export interface VendusRoom {
  id: string;
  name: string;
  store_id: string;
  is_active: boolean;
}

export interface VendusTable {
  id: string;
  name: string;
  number: number;
  room_id: string;
  capacity?: number;
  is_active: boolean;
}

export interface VendusInvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  discount_type?: "percentage" | "fixed";
  tax_id: string;
  description?: string;
  notes?: string;
}

export interface VendusPayment {
  method_id: string;
  amount: number;
  reference?: string;
}

export interface VendusCustomer {
  nif?: string;
  name?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface VendusInvoiceRequest {
  document_type: "FR" | "FT" | "FS"; // Fatura-Recibo, Fatura, Fatura Simplificada
  register_id?: string;
  items: VendusInvoiceItem[];
  payments: VendusPayment[];
  customer?: VendusCustomer;
  table_id?: string;
  notes?: string;
  internal_notes?: string;
}

export interface VendusInvoiceResponse {
  id: string;
  document_number: string;
  document_type: string;
  series: string;
  hash: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  status: string;
  pdf_url?: string;
  created_at: string;
}

export interface VendusVoidRequest {
  reason: string;
}

export interface VendusKitchenOrder {
  table_name: string;
  table_number?: number;
  items: VendusKitchenItem[];
  printer_id?: string;
  notes?: string;
}

export interface VendusKitchenItem {
  product_name: string;
  quantity: number;
  notes?: string;
  modifiers?: string[];
}

export interface VendusTaxRate {
  id: string;
  name: string;
  value: number;
  is_default: boolean;
}

export interface VendusPaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

// =============================================
// API LIST RESPONSES
// =============================================

export interface VendusListResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface VendusProductsResponse {
  products: VendusProduct[];
}

export interface VendusRoomsResponse {
  rooms: VendusRoom[];
}

export interface VendusTablesResponse {
  tables: VendusTable[];
}

export interface VendusTaxRatesResponse {
  tax_rates: VendusTaxRate[];
}

export interface VendusPaymentMethodsResponse {
  payment_methods: VendusPaymentMethod[];
}

// =============================================
// ERROR TYPES
// =============================================

export interface VendusApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

// =============================================
// SYNC TYPES
// =============================================

export type VendusSyncOperation =
  | "product_sync"
  | "product_push"
  | "product_pull"
  | "table_import"
  | "invoice_create"
  | "invoice_void"
  | "kitchen_print"
  | "payment_methods_sync";

export interface SyncResult {
  success: boolean;
  operation: VendusSyncOperation;
  direction: "push" | "pull" | "both";
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  id: string;
  error: string;
  details?: Record<string, unknown>;
}

// =============================================
// INVOICE CREATION TYPES
// =============================================

export interface CreateInvoiceOptions {
  sessionId: string;
  locationSlug: string;
  paymentMethodId: number;
  paidAmount: number;
  customerNif?: string;
  customerName?: string;
  issuedBy: string;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  vendusId?: string;
  documentNumber?: string;
  pdfUrl?: string;
  error?: string;
}

export interface VoidInvoiceResult {
  success: boolean;
  error?: string;
}

export interface GetPdfResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

// =============================================
// KITCHEN TYPES
// =============================================

export interface SendToKitchenOptions {
  sessionId: string;
  orderIds: string[];
  locationSlug: string;
  printerId?: string;
}

export interface SendToKitchenResult {
  success: boolean;
  error?: string;
}

// =============================================
// TABLE SYNC TYPES
// =============================================

export interface TableImportOptions {
  locationSlug: string;
  initiatedBy?: string;
}

export interface TableMapping {
  id: string;
  number: number;
  name: string;
  vendus_table_id: string | null;
  vendus_room_id: string | null;
  vendus_synced_at: string | null;
}

// =============================================
// PRODUCT SYNC TYPES
// =============================================

export interface ProductSyncOptions {
  locationSlug: string;
  direction: "push" | "pull" | "both";
  productIds?: string[];
  initiatedBy?: string;
}
