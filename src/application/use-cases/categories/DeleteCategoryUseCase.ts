import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Result, Results } from '../Result';

export class DeleteCategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      // Check if category exists
      const existing = await this.categoryRepository.findById(id);
      if (!existing) {
        return Results.error('Categoria não encontrada', 'NOT_FOUND');
      }

      await this.categoryRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao eliminar categoria'
      );
    }
  }
}
