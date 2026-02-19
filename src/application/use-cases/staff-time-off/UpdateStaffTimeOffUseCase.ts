/**
 * UpdateStaffTimeOffUseCase - Atualiza ausência de funcionário
 */

import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { StaffTimeOff, UpdateStaffTimeOffData } from '@/domain/entities/StaffTimeOff';
import { Result, Results } from '../Result';

interface UpdateStaffTimeOffInput {
  id: number;
  data: UpdateStaffTimeOffData;
}

export class UpdateStaffTimeOffUseCase {
  constructor(private staffTimeOffRepository: IStaffTimeOffRepository) {}

  async execute(input: UpdateStaffTimeOffInput): Promise<Result<StaffTimeOff>> {
    try {
      if (!input.id) {
        return Results.error('ID da ausência é obrigatório', 'INVALID_INPUT');
      }

      // Verificar se ausência existe
      const existing = await this.staffTimeOffRepository.findById(input.id);
      if (!existing) {
        return Results.error('Ausência não encontrada', 'NOT_FOUND');
      }

      // Calcular datas finais para validação
      const startDate = input.data.startDate ?? existing.startDate;
      const endDate = input.data.endDate ?? existing.endDate;

      // Validar que data de fim não é anterior à data de início
      if (endDate < startDate) {
        return Results.error('Data de fim não pode ser anterior à data de início', 'INVALID_DATES');
      }

      // Verificar sobreposição com outras ausências (excluindo a atual)
      if (input.data.startDate || input.data.endDate) {
        const overlapping = await this.staffTimeOffRepository.findOverlapping(
          existing.staffId,
          startDate,
          endDate,
          input.id
        );

        if (overlapping.length > 0) {
          return Results.error('Já existe uma ausência registada para este período', 'OVERLAP');
        }
      }

      const timeOff = await this.staffTimeOffRepository.update(input.id, input.data);
      return Results.success(timeOff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar ausência'
      );
    }
  }
}
