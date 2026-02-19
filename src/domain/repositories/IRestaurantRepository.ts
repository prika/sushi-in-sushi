import {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantFilter,
} from '../entities/Restaurant';

export interface IRestaurantRepository {
  findAll(filter?: RestaurantFilter): Promise<Restaurant[]>;
  findActive(): Promise<Restaurant[]>; // For dropdowns
  findById(id: string): Promise<Restaurant | null>;
  findBySlug(slug: string): Promise<Restaurant | null>;
  create(data: CreateRestaurantData): Promise<Restaurant>;
  update(id: string, data: UpdateRestaurantData): Promise<Restaurant>;
  delete(id: string): Promise<void>;
  validateSlugUnique(slug: string, excludeId?: string): Promise<boolean>;
}
