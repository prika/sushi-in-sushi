/**
 * KitchenZone Entity
 * Representa uma zona de preparação na cozinha (Quentes, Frios, Bar, etc.)
 */

export interface KitchenZone {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKitchenZoneData {
  name: string;
  slug: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateKitchenZoneData {
  name?: string;
  slug?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface KitchenZoneWithCategoryCount extends KitchenZone {
  categoryCount: number;
}
