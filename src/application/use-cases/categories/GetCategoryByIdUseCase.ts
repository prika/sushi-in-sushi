import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category } from '@/domain/entities/Category';
import { Result, Results } from '../Result';

export class GetCategoryByIdUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(id: string): Promise<Result<Category>> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        return Results.error('Categoria não encontrada', 'NOT_FOUND');
      }
      return Results.success(category);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter categoria'
      );
    }
  }
}
