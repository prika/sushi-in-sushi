import { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import { Ingredient, CreateIngredientData } from '@/domain/entities/Ingredient';
import { Result, Results } from '../Result';

const VALID_UNITS = ['g', 'kg', 'ml', 'L', 'un'];

export class CreateIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(data: CreateIngredientData): Promise<Result<Ingredient>> {
    try {
      if (!data.name || data.name.trim().length === 0) {
        return Results.error('Nome do ingrediente é obrigatório', 'INVALID_NAME');
      }

      if (!data.unit || !VALID_UNITS.includes(data.unit)) {
        return Results.error(
          'Unidade inválida. Use: g, kg, ml, L, un',
          'INVALID_UNIT'
        );
      }

      // Check name uniqueness
      const existing = await this.ingredientRepository.findByName(data.name.trim());
      if (existing) {
        return Results.error('Já existe um ingrediente com este nome', 'NAME_EXISTS');
      }

      const ingredient = await this.ingredientRepository.create({
        ...data,
        name: data.name.trim(),
      });
      return Results.success(ingredient);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar ingrediente'
      );
    }
  }
}
