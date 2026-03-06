/**
 * Types - Centralized export point
 *
 * This file provides a single entry point for all types in the application.
 * Types are organized into namespaces:
 *
 * - Domain types (enums, value objects with helpers)
 * - Database types (Supabase Row/Insert/Update)
 * - API types (Cart, hooks, auth)
 *
 * Usage:
 *   import { Location, OrderStatus } from '@/types'
 *   import type { Product, Session, AuthUser } from '@/types'
 */

// =============================================================================
// DOMAIN TYPES (Value Objects with helpers)
// =============================================================================

// Location - Now dynamic, use useLocations() hook
export type { Location } from "./database";

// Order Status
export {
  type OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_TRANSITIONS,
  canOrderTransitionTo,
  getNextOrderStatus,
  isFinalStatus,
  isActiveStatus,
} from "@/domain/value-objects/OrderStatus";

// Session Status
export {
  type SessionStatus,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_COLORS,
  SESSION_STATUS_TRANSITIONS,
  canSessionTransitionTo,
  isSessionActive,
  isSessionClosed,
} from "@/domain/value-objects/SessionStatus";

// Table Status
export {
  type TableStatus,
  TABLE_STATUS_LABELS,
  TABLE_STATUS_COLORS,
  canAcceptCustomers,
  isTableActive,
} from "@/domain/value-objects/TableStatus";

// =============================================================================
// DATABASE TYPES (Supabase Row/Insert/Update)
// =============================================================================

export type {
  // Core Supabase types
  Json,
  Database,
  Tables,

  // Categories
  Category,
  CategoryInsert,
  CategoryUpdate,

  // Products
  Product,
  ProductInsert,
  ProductUpdate,
  ProductWithCategory,

  // Tables
  Table,
  TableBase,
  TableInsert,
  TableUpdate,
  TableFullStatus,
  TableStatusHistory,
  TableStatusHistoryInsert,
  TableWithWaiter,

  // Sessions
  Session,
  SessionBase,
  SessionInsert,
  SessionUpdate,
  SessionWithOrders,
  SessionWithCustomers,
  SessionMetricsSummary,

  // Orders
  Order,
  OrderInsert,
  OrderUpdate,
  OrderWithProduct,
  OrderWithCustomer,
  OrderWithProductAndCustomer,

  // User Management
  RoleName,
  Role,
  Staff,
  StaffInsert,
  StaffUpdate,
  StaffWithRole,
  AuthUser,
  AuthSession,

  // Waiters
  WaiterTable,
  WaiterTableInsert,
  WaiterTableUpdate,
  WaiterTableWithDetails,
  WaiterCall,
  WaiterCallInsert,
  WaiterCallUpdate,
  WaiterCallWithDetails,
  WaiterCallType,
  WaiterCallStatus,

  // Customers
  Customer,
  CustomerInsert,
  CustomerUpdate,
  SessionCustomer,
  SessionCustomerInsert,
  SessionCustomerUpdate,
  SessionCustomerSummary,
  PreferredContact,

  // Reservations
  Reservation,
  ReservationInsert,
  ReservationUpdate,
  ReservationWithDetails,
  ReservationStatus,
  ReservationOccasion,
  ReservationSettings,
  ReservationSettingsUpdate,
  RestaurantClosure,
  RestaurantClosureInsert,
  RestaurantClosureUpdate,
  EmailStatus,

  // Activity & Metrics
  ActivityLog,
  ActivityLogInsert,
  DailyMetrics,
} from "./database";

// =============================================================================
// API TYPES (Cart, Hooks, Auth)
// =============================================================================

export type {
  // Cart
  CartItem,
  UseCartOptions,

  // Orders hooks
  UseOrdersOptions,
  GroupedOrders,

  // Sessions hooks
  SessionData,
  UseSessionOptions,

  // Tables
  TableData,

  // UI helpers
  StatusConfig,
} from "./api";

// Re-export ORDER_STATUS_CONFIG for backwards compatibility
export { ORDER_STATUS_CONFIG } from "./api";

// =============================================================================
// AUTH TYPES (Token, Login)
// =============================================================================

// TokenPayload is exported from @/lib/auth
export type { TokenPayload } from "@/lib/auth/token";

// LoginResult and AuthContextType are defined in AuthContext
// Import from there if needed: import type { LoginResult } from '@/presentation/contexts/AuthContext'
