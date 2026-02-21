import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import { Result, Results } from '../Result';

export class DeleteKitchenZoneUseCase {
  constructor(private kitchenZoneRepository: IKitchenZoneRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      // Check if zone exists
      const existing = await this.kitchenZoneRepository.findById(id);
      if (!existing) {
        return Results.error('Zona não encontrada', 'NOT_FOUND');
      }

      await this.kitchenZoneRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao eliminar zona'
      );
    }
  }
}
