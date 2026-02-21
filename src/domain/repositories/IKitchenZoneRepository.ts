/**
 * IKitchenZoneRepository - Interface para gestão de zonas de cozinha
 */

import type {
  KitchenZone,
  CreateKitchenZoneData,
  UpdateKitchenZoneData,
  KitchenZoneWithCategoryCount,
} from '../entities/KitchenZone';

export interface IKitchenZoneRepository {
  findAll(): Promise<KitchenZone[]>;
  findActive(): Promise<KitchenZone[]>;
  findAllWithCategoryCount(): Promise<KitchenZoneWithCategoryCount[]>;
  findById(id: string): Promise<KitchenZone | null>;
  findBySlug(slug: string): Promise<KitchenZone | null>;
  create(data: CreateKitchenZoneData): Promise<KitchenZone>;
  update(id: string, data: UpdateKitchenZoneData): Promise<KitchenZone>;
  delete(id: string): Promise<void>;
  validateSlugUnique(slug: string, excludeId?: string): Promise<boolean>;
}
