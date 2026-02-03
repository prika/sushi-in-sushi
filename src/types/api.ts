/**
 * API and hook-related types
 */

import type { Product, Order as DbOrder, Session, Table, OrderStatus } from "./database";

// Cart types
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

// Order types for hooks
export interface OrderWithProduct extends DbOrder {
  product: Product;
}

export interface UseOrdersOptions {
  sessionId: string;
  autoRefresh?: boolean;
}

export interface GroupedOrders {
  timestamp: string;
  orders: OrderWithProduct[];
}

// Session types for hooks
export interface SessionData extends Session {
  table?: Table;
}

export interface UseSessionOptions {
  tableNumber: number;
  location: string;
}

// Auth types
export interface TokenPayload {
  staffId: string;
  email: string;
  role: string;
  name: string;
  location: string | null;
  exp?: number;
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    location: string | null;
  };
  error?: string;
}

export interface AuthContextType {
  user: LoginResult["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// QR Code types
export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

// Table types for admin
export interface TableData {
  id: string;
  number: number;
  name: string;
  location: string;
  is_active: boolean;
}

// Status config for UI
export interface StatusConfig {
  icon: string;
  label: string;
  color: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: { icon: "⏳", label: "Na fila", color: "text-yellow-500" },
  preparing: { icon: "🔥", label: "A preparar", color: "text-orange-500" },
  ready: { icon: "✅", label: "Pronto", color: "text-green-500" },
  delivered: { icon: "✓", label: "Entregue", color: "text-gray-400" },
  cancelled: { icon: "✕", label: "Cancelado", color: "text-red-500" },
};
