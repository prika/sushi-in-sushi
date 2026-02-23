import { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import { IngredientWithProductCount } from '@/domain/entities/Ingredient';
import { Result, Results } from '../Result';

export class GetAllIngredientsUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(): Promise<Result<IngredientWithProductCount[]>> {
    try {
      const ingredients = await this.ingredientRepository.findAllWithProductCount();
      return Results.success(ingredients);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter ingredientes'
      );
    }
  }
}
