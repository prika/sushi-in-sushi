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
  isActive?: boolean;
}

export interface RestaurantFilter {
  isActive?: boolean;
  slug?: string;
}
