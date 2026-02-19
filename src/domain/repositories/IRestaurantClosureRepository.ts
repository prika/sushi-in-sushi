/**
 * IRestaurantClosureRepository - Interface para repositório de folgas
 */

import {
  RestaurantClosure,
  CreateClosureData,
  UpdateClosureData,
  ClosureFilter,
  ClosureCheckResult,
} from '../entities/RestaurantClosure';

export interface IRestaurantClosureRepository {
  findAll(filter?: ClosureFilter): Promise<RestaurantClosure[]>;
  findById(id: number): Promise<RestaurantClosure | null>;
  findRecurring(): Promise<RestaurantClosure[]>;
  create(data: CreateClosureData, createdBy?: string): Promise<RestaurantClosure>;
  update(id: number, data: UpdateClosureData): Promise<RestaurantClosure>;
  delete(id: number): Promise<void>;
  checkClosure(date: string, location?: string): Promise<ClosureCheckResult>;
}
