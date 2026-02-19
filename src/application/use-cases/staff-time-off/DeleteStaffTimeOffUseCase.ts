/**
 * DeleteStaffTimeOffUseCase - Remove ausência de funcionário
 */

import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { Result, Results } from '../Result';

interface DeleteStaffTimeOffInput {
  id: number;
}

export class DeleteStaffTimeOffUseCase {
  constructor(private staffTimeOffRepository: IStaffTimeOffRepository) {}

  async execute(input: DeleteStaffTimeOffInput): Promise<Result<void>> {
    try {
      if (!input.id) {
        return Results.error('ID da ausência é obrigatório', 'INVALID_INPUT');
      }

      // Verificar se ausência existe
      const existing = await this.staffTimeOffRepository.findById(input.id);
      if (!existing) {
        return Results.error('Ausência não encontrada', 'NOT_FOUND');
      }

      await this.staffTimeOffRepository.delete(input.id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover ausência'
      );
    }
  }
}
