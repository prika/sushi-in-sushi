import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant, UpdateRestaurantData } from '@/domain/entities/Restaurant';
import { Result, Results } from '../Result';

interface UpdateRestaurantInput {
  id: string;
  data: UpdateRestaurantData;
}

export class UpdateRestaurantUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(input: UpdateRestaurantInput): Promise<Result<Restaurant>> {
    try {
      // Check if restaurant exists
      const existing = await this.restaurantRepository.findById(input.id);
      if (!existing) {
        return Results.error('Restaurante não encontrado', 'NOT_FOUND');
      }

      // Validations
      if (input.data.name !== undefined && input.data.name.trim().length === 0) {
        return Results.error('Nome do restaurante não pode estar vazio', 'INVALID_NAME');
      }

      if (input.data.slug !== undefined) {
        if (input.data.slug.trim().length === 0) {
          return Results.error('Código não pode estar vazio', 'INVALID_SLUG');
        }

        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(input.data.slug)) {
          return Results.error(
            'Código deve conter apenas letras minúsculas, números e hífens',
            'INVALID_SLUG_FORMAT'
          );
        }

        // Check slug uniqueness (excluding current restaurant)
        const isUnique = await this.restaurantRepository.validateSlugUnique(
          input.data.slug,
          input.id
        );
        if (!isUnique) {
          return Results.error('Já existe um restaurante com este código', 'SLUG_EXISTS');
        }
      }

      if (input.data.maxCapacity !== undefined && input.data.maxCapacity <= 0) {
        return Results.error('Lotação máxima deve ser maior que zero', 'INVALID_CAPACITY');
      }

      if (input.data.defaultPeoplePerTable !== undefined && input.data.defaultPeoplePerTable <= 0) {
        return Results.error(
          'Pessoas por mesa deve ser maior que zero',
          'INVALID_PEOPLE_PER_TABLE'
        );
      }

      const restaurant = await this.restaurantRepository.update(input.id, input.data);
      return Results.success(restaurant);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar restaurante'
      );
    }
  }
}
