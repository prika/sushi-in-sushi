/**
 * Presentation Hooks - Exportações centralizadas
 */

// Original hooks
export * from './useKitchenOrders';
export * from './useSessionOrders';
export * from './useSessionManagement';
export * from './useTableManagement';
export * from './useActivityLog';
export * from './useProducts';
export * from './useStaffTimeOff';
export * from './useReservation';
export * from './useStaff';
export * from './useReservations';
export * from './useClosures';
export * from './useWaiterCalls';
export * from './useCustomers';

// Optimized hooks with React Query (Phase 3 - Performance Optimization)
export * from './useProductsOptimized';
export * from './useKitchenOrdersOptimized';

// Admin-specific hooks (API-based, bypass RLS)
export * from './useAdminProducts';

// Restaurant management hooks
export * from './useRestaurants';
export * from './useLocations';

// Category and kitchen zone management hooks
export * from './useCategories';
export * from './useKitchenZones';

// Cart and order review hooks
export * from './useCart';
export * from './useOrderReview';

// Order cooldown hook
export * from './useOrderCooldown';

// Order notification channel (broadcast + timer cleanup)
export * from './useOrderNotificationChannel';

// Ingredient management hooks
export * from './useIngredients';
export * from './useProductIngredients';

// Games hooks
export * from './useGameSession';
export * from './useGameConfig';
