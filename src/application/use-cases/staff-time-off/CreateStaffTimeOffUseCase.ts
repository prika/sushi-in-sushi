/**
 * CreateStaffTimeOffUseCase - Cria nova ausência de funcionário
 */

import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { StaffTimeOff, CreateStaffTimeOffData } from '@/domain/entities/StaffTimeOff';
import { Result, Results } from '../Result';

export class CreateStaffTimeOffUseCase {
  constructor(private staffTimeOffRepository: IStaffTimeOffRepository) {}

  async execute(data: CreateStaffTimeOffData): Promise<Result<StaffTimeOff>> {
    try {
      // Validar campos obrigatórios
      if (!data.staffId) {
        return Results.error('ID do funcionário é obrigatório', 'INVALID_INPUT');
      }

      if (!data.startDate) {
        return Results.error('Data de início é obrigatória', 'INVALID_INPUT');
      }

      if (!data.endDate) {
        return Results.error('Data de fim é obrigatória', 'INVALID_INPUT');
      }

      if (!data.type) {
        return Results.error('Tipo de ausência é obrigatório', 'INVALID_INPUT');
      }

      // Validar que data de fim não é anterior à data de início
      if (data.endDate < data.startDate) {
        return Results.error('Data de fim não pode ser anterior à data de início', 'INVALID_DATES');
      }

      // Verificar sobreposição com outras ausências
      const overlapping = await this.staffTimeOffRepository.findOverlapping(
        data.staffId,
        data.startDate,
        data.endDate
      );

      if (overlapping.length > 0) {
        return Results.error('Já existe uma ausência registada para este período', 'OVERLAP');
      }

      const timeOff = await this.staffTimeOffRepository.create(data);
      return Results.success(timeOff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar ausência'
      );
    }
  }
}
