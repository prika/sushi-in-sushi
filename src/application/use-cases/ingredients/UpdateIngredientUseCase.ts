import { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import { Ingredient, UpdateIngredientData } from '@/domain/entities/Ingredient';
import { Result, Results } from '../Result';

const VALID_UNITS = ['g', 'kg', 'ml', 'L', 'un'];

interface UpdateIngredientInput {
  id: string;
  data: UpdateIngredientData;
}

export class UpdateIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(input: UpdateIngredientInput): Promise<Result<Ingredient>> {
    try {
      const existing = await this.ingredientRepository.findById(input.id);
      if (!existing) {
        return Results.error('Ingrediente não encontrado', 'NOT_FOUND');
      }

      if (input.data.name !== undefined && input.data.name.trim().length === 0) {
        return Results.error('Nome do ingrediente é obrigatório', 'INVALID_NAME');
      }

      if (input.data.unit !== undefined && !VALID_UNITS.includes(input.data.unit)) {
        return Results.error(
          'Unidade inválida. Use: g, kg, ml, L, un',
          'INVALID_UNIT'
        );
      }

      // Check name uniqueness if name is being changed
      if (input.data.name !== undefined && input.data.name.trim() !== existing.name) {
        const nameExists = await this.ingredientRepository.findByName(input.data.name.trim());
        if (nameExists) {
          return Results.error('Já existe um ingrediente com este nome', 'NAME_EXISTS');
        }
      }

      const ingredient = await this.ingredientRepository.update(input.id, {
        ...input.data,
        name: input.data.name?.trim(),
      });
      return Results.success(ingredient);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar ingrediente'
      );
    }
  }
}
