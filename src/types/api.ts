/**
 * API and hook-related types
 *
 * Note: Auth types (TokenPayload, LoginResult, AuthContextType) are defined in:
 * - @/lib/auth/token (TokenPayload)
 * - @/lib/auth/login (LoginResult)
 * - @/presentation/contexts/AuthContext (AuthContextType, LoginResult with MFA)
 *
 * Note: QRCodeOptions is defined in @/lib/qrcode
 */

import type { Session, Table, OrderStatus, OrderWithProduct } from "./database";

// Re-export OrderWithProduct from database for backwards compatibility
export type { OrderWithProduct };

// =============================================================================
// CART TYPES
// =============================================================================

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface UseCartOptions {
  sessionId?: string | null;
  persist?: boolean;
}

// =============================================================================
// ORDER HOOK TYPES
// =============================================================================

// Note: OrderWithProduct is imported from ./database and re-exported

export interface UseOrdersOptions {
  sessionId: string;
  autoRefresh?: boolean;
}

export interface GroupedOrders {
  timestamp: string;
  orders: OrderWithProduct[];
}

// =============================================================================
// SESSION HOOK TYPES
// =============================================================================

export interface SessionData extends Session {
  table?: Table;
}

export interface UseSessionOptions {
  tableNumber: number;
  location: string;
}

// =============================================================================
// TABLE TYPES FOR ADMIN
// =============================================================================

export interface TableData {
  id: string;
  number: number;
  name: string;
  location: string;
  is_active: boolean;
}

// =============================================================================
// UI STATUS CONFIG
// =============================================================================

export interface StatusConfig {
  icon: string;
  label: string;
  color: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: { icon: "⏳", label: "Na fila", color: "text-yellow-500" },
  preparing: { icon: "🔥", label: "A preparar", color: "text-orange-500" },
  ready: { icon: "✅", label: "Pronto para servir", color: "text-green-500" },
  delivered: { icon: "✓", label: "Entregue", color: "text-gray-400" },
  cancelled: { icon: "✕", label: "Cancelado", color: "text-red-500" },
};
