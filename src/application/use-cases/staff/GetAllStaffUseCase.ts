/**
 * GetAllStaffUseCase - Obtém todos os funcionários
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { StaffWithRole, StaffFilter } from '@/domain/entities/Staff';
import { Result, Results } from '../Result';

export class GetAllStaffUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(filter?: StaffFilter): Promise<Result<StaffWithRole[]>> {
    try {
      const staff = await this.staffRepository.findAll(filter);
      return Results.success(staff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar funcionários'
      );
    }
  }
}
