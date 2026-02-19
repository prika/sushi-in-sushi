/**
 * GetAllStaffTimeOffUseCase - Lista ausências de funcionários
 */

import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { StaffTimeOffWithStaff, StaffTimeOffFilter } from '@/domain/entities/StaffTimeOff';
import { Result, Results } from '../Result';

interface GetAllStaffTimeOffInput {
  filter?: StaffTimeOffFilter;
}

export class GetAllStaffTimeOffUseCase {
  constructor(private staffTimeOffRepository: IStaffTimeOffRepository) {}

  async execute(input?: GetAllStaffTimeOffInput): Promise<Result<StaffTimeOffWithStaff[]>> {
    try {
      const timeOffs = await this.staffTimeOffRepository.findAll(input?.filter);
      return Results.success(timeOffs);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao listar ausências'
      );
    }
  }
}
