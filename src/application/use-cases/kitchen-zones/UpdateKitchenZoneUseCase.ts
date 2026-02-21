import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import { KitchenZone, UpdateKitchenZoneData } from '@/domain/entities/KitchenZone';
import { Result, Results } from '../Result';

interface UpdateKitchenZoneInput {
  id: string;
  data: UpdateKitchenZoneData;
}

export class UpdateKitchenZoneUseCase {
  constructor(private kitchenZoneRepository: IKitchenZoneRepository) {}

  async execute(input: UpdateKitchenZoneInput): Promise<Result<KitchenZone>> {
    try {
      // Check if zone exists
      const existing = await this.kitchenZoneRepository.findById(input.id);
      if (!existing) {
        return Results.error('Zona não encontrada', 'NOT_FOUND');
      }

      // Validations
      if (input.data.name !== undefined && input.data.name.trim().length === 0) {
        return Results.error('Nome da zona é obrigatório', 'INVALID_NAME');
      }

      if (input.data.slug !== undefined) {
        if (input.data.slug.trim().length === 0) {
          return Results.error('Código da zona é obrigatório', 'INVALID_SLUG');
        }

        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(input.data.slug)) {
          return Results.error(
            'Código deve conter apenas letras minúsculas, números e hífens',
            'INVALID_SLUG_FORMAT'
          );
        }

        // Check slug uniqueness (excluding current zone)
        const isUnique = await this.kitchenZoneRepository.validateSlugUnique(
          input.data.slug,
          input.id
        );
        if (!isUnique) {
          return Results.error('Já existe uma zona com este código', 'SLUG_EXISTS');
        }
      }

      const zone = await this.kitchenZoneRepository.update(input.id, input.data);
      return Results.success(zone);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar zona'
      );
    }
  }
}
