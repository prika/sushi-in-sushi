export interface Restaurant {
  id: string;
  name: string;
  slug: string; // unique identifier: "circunvalacao", "boavista", etc.
  address: string;
  latitude: number | null;
  longitude: number | null;
  maxCapacity: number; // Total restaurant capacity
  defaultPeoplePerTable: number; // Default for new tables
  autoTableAssignment: boolean; // Enable auto-assignment (future)
  autoReservations: boolean; // Enable auto-reservations (future)
  orderCooldownMinutes: number; // Minutes between orders per session (0 = disabled)
  showUpgradeAfterOrder: boolean; // Show tier upgrade prompt after order
  showUpgradeAtBill: boolean; // Show tier upgrade prompt at bill time
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRestaurantData {
  name: string;
  slug: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  maxCapacity: number;
  defaultPeoplePerTable: number;
  autoTableAssignment?: boolean;
  autoReservations?: boolean;
  orderCooldownMinutes?: number;
  showUpgradeAfterOrder?: boolean;
  showUpgradeAtBill?: boolean;
  isActive?: boolean;
}

export interface UpdateRestaurantData {
  name?: string;
  slug?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  maxCapacity?: number;
  defaultPeoplePerTable?: number;
  autoTableAssignment?: boolean;
  autoReservations?: boolean;
  orderCooldownMinutes?: number;
  showUpgradeAfterOrder?: boolean;
  showUpgradeAtBill?: boolean;
  isActive?: boolean;
}

export interface RestaurantFilter {
  isActive?: boolean;
  slug?: string;
}
