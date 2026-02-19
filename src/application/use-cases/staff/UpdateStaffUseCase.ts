/**
 * UpdateStaffUseCase - Atualiza funcionário
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { Staff, UpdateStaffData } from '@/domain/entities/Staff';
import { Result, Results } from '../Result';

export class UpdateStaffUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(id: string, data: UpdateStaffData): Promise<Result<Staff>> {
    try {
      // Verificar se funcionário existe
      const existing = await this.staffRepository.findById(id);
      if (!existing) {
        return Results.error('Funcionário não encontrado', 'NOT_FOUND');
      }

      // Se está a atualizar email, verificar duplicação
      if (data.email && data.email !== existing.email) {
        const emailExists = await this.staffRepository.findByEmail(data.email);
        if (emailExists) {
          return Results.error('Email já está em uso', 'EMAIL_IN_USE');
        }
      }

      const staff = await this.staffRepository.update(id, data);
      return Results.success(staff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar funcionário'
      );
    }
  }
}
