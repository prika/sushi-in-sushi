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

// Restaurant management hooks
export * from './useRestaurants';
export * from './useLocations';

// Cart and order review hooks
export * from './useCart';
export * from './useOrderReview';
