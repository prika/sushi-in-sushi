import { IProductIngredientRepository } from '@/domain/repositories/IProductIngredientRepository';
import { ProductIngredient } from '@/domain/entities/ProductIngredient';
import { Result, Results } from '../Result';

export class GetProductIngredientsUseCase {
  constructor(private productIngredientRepository: IProductIngredientRepository) {}

  async execute(productId: string): Promise<Result<ProductIngredient[]>> {
    try {
      if (!productId) {
        return Results.error('ID do produto é obrigatório', 'INVALID_ID');
      }

      const ingredients = await this.productIngredientRepository.findByProductId(productId);
      return Results.success(ingredients);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter ingredientes do produto'
      );
    }
  }
}
