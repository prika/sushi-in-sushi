import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import { KitchenZone } from '@/domain/entities/KitchenZone';
import { Result, Results } from '../Result';

export class GetActiveKitchenZonesUseCase {
  constructor(private kitchenZoneRepository: IKitchenZoneRepository) {}

  async execute(): Promise<Result<KitchenZone[]>> {
    try {
      const zones = await this.kitchenZoneRepository.findActive();
      return Results.success(zones);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter zonas ativas'
      );
    }
  }
}
