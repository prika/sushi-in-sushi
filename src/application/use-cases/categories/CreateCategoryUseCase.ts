import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category, CreateCategoryData } from '@/domain/entities/Category';
import { Result, Results } from '../Result';

export class CreateCategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(data: CreateCategoryData): Promise<Result<Category>> {
    try {
      // Validations
      if (!data.name || data.name.trim().length === 0) {
        return Results.error('Nome da categoria é obrigatório', 'INVALID_NAME');
      }

      if (!data.slug || data.slug.trim().length === 0) {
        return Results.error('Código da categoria é obrigatório', 'INVALID_SLUG');
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
      const existing = await this.categoryRepository.findBySlug(data.slug);
      if (existing) {
        return Results.error('Já existe uma categoria com este código', 'SLUG_EXISTS');
      }

      const category = await this.categoryRepository.create(data);
      return Results.success(category);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar categoria'
      );
    }
  }
}
