/**
 * DeleteStaffUseCase - Remove funcionário
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { Result, Results } from '../Result';

export class DeleteStaffUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      // Verificar se funcionário existe
      const existing = await this.staffRepository.findById(id);
      if (!existing) {
        return Results.error('Funcionário não encontrado', 'NOT_FOUND');
      }

      await this.staffRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover funcionário'
      );
    }
  }
}
