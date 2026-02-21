import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import { KitchenZone, CreateKitchenZoneData } from '@/domain/entities/KitchenZone';
import { Result, Results } from '../Result';

export class CreateKitchenZoneUseCase {
  constructor(private kitchenZoneRepository: IKitchenZoneRepository) {}

  async execute(data: CreateKitchenZoneData): Promise<Result<KitchenZone>> {
    try {
      // Validations
      if (!data.name || data.name.trim().length === 0) {
        return Results.error('Nome da zona é obrigatório', 'INVALID_NAME');
      }

      if (!data.slug || data.slug.trim().length === 0) {
        return Results.error('Código da zona é obrigatório', 'INVALID_SLUG');
      }

      // Validate slug format (lowercase alphanumeric + hyphens)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(data.slug)) {
        return Results.error(
          'Código deve conter apenas letras minúsculas, números e hífens',
          'INVALID_SLUG_FORMAT'
        );
      }

      // Check slug uniqueness
      const isUnique = await this.kitchenZoneRepository.validateSlugUnique(data.slug);
      if (!isUnique) {
        return Results.error('Já existe uma zona com este código', 'SLUG_EXISTS');
      }

      const zone = await this.kitchenZoneRepository.create(data);
      return Results.success(zone);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar zona'
      );
    }
  }
}
