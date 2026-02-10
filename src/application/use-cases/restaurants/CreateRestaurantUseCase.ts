import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant, CreateRestaurantData } from '@/domain/entities/Restaurant';
import { Result, Results } from '../Result';

export class CreateRestaurantUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(data: CreateRestaurantData): Promise<Result<Restaurant>> {
    try {
      // Validations
      if (!data.name || data.name.trim().length === 0) {
        return Results.error('Nome do restaurante é obrigatório', 'INVALID_NAME');
      }

      if (!data.slug || data.slug.trim().length === 0) {
        return Results.error('Código do restaurante é obrigatório', 'INVALID_SLUG');
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
      const isUnique = await this.restaurantRepository.validateSlugUnique(data.slug);
      if (!isUnique) {
        return Results.error('Já existe um restaurante com este código', 'SLUG_EXISTS');
      }

      if (!data.address || data.address.trim().length === 0) {
        return Results.error('Endereço é obrigatório', 'INVALID_ADDRESS');
      }

      if (!data.maxCapacity || data.maxCapacity <= 0) {
        return Results.error('Lotação máxima deve ser maior que zero', 'INVALID_CAPACITY');
      }

      if (!data.defaultPeoplePerTable || data.defaultPeoplePerTable <= 0) {
        return Results.error(
          'Pessoas por mesa deve ser maior que zero',
          'INVALID_PEOPLE_PER_TABLE'
        );
      }

      if (data.orderCooldownMinutes !== undefined && data.orderCooldownMinutes < 0) {
        return Results.error(
          'Tempo de cooldown deve ser zero ou positivo',
          'INVALID_COOLDOWN'
        );
      }

      const restaurant = await this.restaurantRepository.create(data);
      return Results.success(restaurant);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar restaurante'
      );
    }
  }
}
