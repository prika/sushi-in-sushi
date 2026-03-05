import type { GamePrizeType, GamesMode } from '../value-objects/GameConfig';

export interface Restaurant {
  id: string;
  name: string;
  slug: string; // unique identifier: "circunvalacao", "boavista", etc.
  address: string;
  description: string | null;
  addressLocality: string; // "Porto"
  addressCountry: string;  // "PT"
  googleMapsUrl: string | null;
  phone: string | null;
  opensAt: string; // "HH:MM"
  closesAt: string; // "HH:MM"
  latitude: number | null;
  longitude: number | null;
  maxCapacity: number; // Total restaurant capacity
  defaultPeoplePerTable: number; // Default for new tables
  autoTableAssignment: boolean; // Enable auto-assignment (future)
  autoReservations: boolean; // Enable auto-reservations
  autoReservationMaxPartySize: number; // Max party size for auto-reservations (1-20)
  orderCooldownMinutes: number; // Minutes between orders per session (0 = disabled)
  showUpgradeAfterOrder: boolean; // Show tier upgrade prompt after order
  showUpgradeAtBill: boolean; // Show tier upgrade prompt at bill time
  gamesEnabled: boolean; // Enable games on mesa page
  gamesMode: GamesMode;
  gamesPrizeType: GamePrizeType;
  gamesPrizeValue: string | null;
  gamesPrizeProductId: number | null;
  gamesMinRoundsForPrize: number;
  gamesQuestionsPerRound: number;
  kitchenPrintMode: 'none' | 'vendus' | 'browser';
  zoneSplitPrinting: boolean;
  autoPrintOnOrder: boolean;
  vendusStoreId: string | null;
  vendusRegisterId: string | null;
  email: string | null;
  vendusEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRestaurantData {
  name: string;
  slug: string;
  address: string;
  description?: string | null;
  addressLocality?: string;
  addressCountry?: string;
  googleMapsUrl?: string | null;
  phone?: string | null;
  opensAt?: string;
  closesAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  maxCapacity: number;
  defaultPeoplePerTable: number;
  autoTableAssignment?: boolean;
  autoReservations?: boolean;
  autoReservationMaxPartySize?: number;
  orderCooldownMinutes?: number;
  showUpgradeAfterOrder?: boolean;
  showUpgradeAtBill?: boolean;
  gamesEnabled?: boolean;
  gamesMode?: GamesMode;
  gamesPrizeType?: GamePrizeType;
  gamesPrizeValue?: string | null;
  gamesPrizeProductId?: number | null;
  gamesMinRoundsForPrize?: number;
  gamesQuestionsPerRound?: number;
  kitchenPrintMode?: 'none' | 'vendus' | 'browser';
  zoneSplitPrinting?: boolean;
  autoPrintOnOrder?: boolean;
  vendusStoreId?: string | null;
  vendusRegisterId?: string | null;
  email?: string | null;
  vendusEnabled?: boolean;
  isActive?: boolean;
}

export interface UpdateRestaurantData {
  name?: string;
  slug?: string;
  address?: string;
  description?: string | null;
  addressLocality?: string;
  addressCountry?: string;
  googleMapsUrl?: string | null;
  phone?: string | null;
  opensAt?: string;
  closesAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  maxCapacity?: number;
  defaultPeoplePerTable?: number;
  autoTableAssignment?: boolean;
  autoReservations?: boolean;
  autoReservationMaxPartySize?: number;
  orderCooldownMinutes?: number;
  showUpgradeAfterOrder?: boolean;
  showUpgradeAtBill?: boolean;
  gamesEnabled?: boolean;
  gamesMode?: GamesMode;
  gamesPrizeType?: GamePrizeType;
  gamesPrizeValue?: string | null;
  gamesPrizeProductId?: number | null;
  gamesMinRoundsForPrize?: number;
  gamesQuestionsPerRound?: number;
  kitchenPrintMode?: 'none' | 'vendus' | 'browser';
  zoneSplitPrinting?: boolean;
  autoPrintOnOrder?: boolean;
  vendusStoreId?: string | null;
  vendusRegisterId?: string | null;
  email?: string | null;
  vendusEnabled?: boolean;
  isActive?: boolean;
}

export interface RestaurantFilter {
  isActive?: boolean;
  slug?: string;
}
