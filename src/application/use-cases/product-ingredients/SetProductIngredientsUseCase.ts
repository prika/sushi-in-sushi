import { IProductIngredientRepository } from '@/domain/repositories/IProductIngredientRepository';
import { ProductIngredient, SetProductIngredientsData } from '@/domain/entities/ProductIngredient';
import { Result, Results } from '../Result';

export class SetProductIngredientsUseCase {
  constructor(private productIngredientRepository: IProductIngredientRepository) {}

  async execute(data: SetProductIngredientsData): Promise<Result<ProductIngredient[]>> {
    try {
      if (!data.productId) {
        return Results.error('ID do produto é obrigatório', 'INVALID_PRODUCT_ID');
      }

      // Validate each ingredient entry
      for (const ing of data.ingredients) {
        if (!ing.ingredientId) {
          return Results.error('ID do ingrediente é obrigatório', 'INVALID_INGREDIENT_ID');
        }
        if (!ing.quantity || ing.quantity <= 0) {
          return Results.error('Quantidade deve ser maior que zero', 'INVALID_QUANTITY');
        }
      }

      // Check for duplicate ingredient IDs
      const ids = data.ingredients.map((i) => i.ingredientId);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        return Results.error('Ingredientes duplicados não são permitidos', 'DUPLICATE_INGREDIENT');
      }

      const result = await this.productIngredientRepository.setProductIngredients(data);
      return Results.success(result);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao guardar ingredientes do produto'
      );
    }
  }
}
