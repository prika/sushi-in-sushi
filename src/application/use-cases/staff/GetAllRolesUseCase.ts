/**
 * GetAllRolesUseCase - Obtém todos os roles
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { Role } from '@/domain/entities/Staff';
import { Result, Results } from '../Result';

export class GetAllRolesUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(): Promise<Result<Role[]>> {
    try {
      const roles = await this.staffRepository.getAllRoles();
      return Results.success(roles);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar roles'
      );
    }
  }
}
