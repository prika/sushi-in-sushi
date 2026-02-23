import { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import { Result, Results } from '../Result';

export class DeleteIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const existing = await this.ingredientRepository.findById(id);
      if (!existing) {
        return Results.error('Ingrediente não encontrado', 'NOT_FOUND');
      }

      // Check if ingredient is in use
      const withCount = await this.ingredientRepository.findAllWithProductCount();
      const ingredientWithCount = withCount.find((i) => i.id === id);
      if (ingredientWithCount && ingredientWithCount.productCount > 0) {
        return Results.error(
          `Este ingrediente está associado a ${ingredientWithCount.productCount} produto(s). Remova-o dos produtos primeiro.`,
          'IN_USE'
        );
      }

      await this.ingredientRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao eliminar ingrediente'
      );
    }
  }
}
