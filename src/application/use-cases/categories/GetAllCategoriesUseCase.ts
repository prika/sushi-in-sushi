import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { CategoryWithCount } from '@/domain/entities/Category';
import { Result, Results } from '../Result';

export class GetAllCategoriesUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(): Promise<Result<CategoryWithCount[]>> {
    try {
      const categories = await this.categoryRepository.findAllWithCount();
      return Results.success(categories);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter categorias'
      );
    }
  }
}
