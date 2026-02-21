import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import { KitchenZoneWithCategoryCount } from '@/domain/entities/KitchenZone';
import { Result, Results } from '../Result';

export class GetAllKitchenZonesUseCase {
  constructor(private kitchenZoneRepository: IKitchenZoneRepository) {}

  async execute(): Promise<Result<KitchenZoneWithCategoryCount[]>> {
    try {
      const zones = await this.kitchenZoneRepository.findAllWithCategoryCount();
      return Results.success(zones);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter zonas'
      );
    }
  }
}
