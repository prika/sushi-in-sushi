/**
 * GetStaffTimeOffByIdUseCase - Obtém ausência por ID
 */

import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { StaffTimeOffWithStaff } from '@/domain/entities/StaffTimeOff';
import { Result, Results } from '../Result';

interface GetStaffTimeOffByIdInput {
  id: number;
}

export class GetStaffTimeOffByIdUseCase {
  constructor(private staffTimeOffRepository: IStaffTimeOffRepository) {}

  async execute(input: GetStaffTimeOffByIdInput): Promise<Result<StaffTimeOffWithStaff>> {
    try {
      if (!input.id) {
        return Results.error('ID da ausência é obrigatório', 'INVALID_INPUT');
      }

      const timeOff = await this.staffTimeOffRepository.findById(input.id);

      if (!timeOff) {
        return Results.error('Ausência não encontrada', 'NOT_FOUND');
      }

      return Results.success(timeOff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter ausência'
      );
    }
  }
}
