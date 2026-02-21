import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category, UpdateCategoryData } from '@/domain/entities/Category';
import { Result, Results } from '../Result';

interface UpdateCategoryInput {
  id: string;
  data: UpdateCategoryData;
}

export class UpdateCategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<Result<Category>> {
    try {
      // Check if category exists
      const existing = await this.categoryRepository.findById(input.id);
      if (!existing) {
        return Results.error('Categoria não encontrada', 'NOT_FOUND');
      }

      // Validations
      if (input.data.name !== undefined && input.data.name.trim().length === 0) {
        return Results.error('Nome da categoria é obrigatório', 'INVALID_NAME');
      }

      if (input.data.slug !== undefined) {
        if (input.data.slug.trim().length === 0) {
          return Results.error('Código da categoria é obrigatório', 'INVALID_SLUG');
        }

        // Validate slug format (lowercase alphanumeric + hyphens)
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(input.data.slug)) {
          return Results.error(
            'Código deve conter apenas letras minúsculas, números e hífens',
            'INVALID_SLUG_FORMAT'
          );
        }

        // Check slug uniqueness only if slug is being changed
        if (input.data.slug !== existing.slug) {
          const slugExists = await this.categoryRepository.findBySlug(input.data.slug);
          if (slugExists) {
            return Results.error('Já existe uma categoria com este código', 'SLUG_EXISTS');
          }
        }
      }

      const category = await this.categoryRepository.update(input.id, input.data);
      return Results.success(category);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar categoria'
      );
    }
  }
}
