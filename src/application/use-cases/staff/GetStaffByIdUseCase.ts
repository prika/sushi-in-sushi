/**
 * GetStaffByIdUseCase - Obtém funcionário por ID
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { StaffWithRole } from '@/domain/entities/Staff';
import { Result, Results } from '../Result';

export class GetStaffByIdUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(id: string): Promise<Result<StaffWithRole | null>> {
    try {
      const staff = await this.staffRepository.findById(id);
      return Results.success(staff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar funcionário'
      );
    }
  }
}
