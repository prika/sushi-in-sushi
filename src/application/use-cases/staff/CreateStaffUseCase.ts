/**
 * CreateStaffUseCase - Cria novo funcionário
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { Staff, CreateStaffData } from '@/domain/entities/Staff';
import { Result, Results } from '../Result';

export class CreateStaffUseCase {
  constructor(private staffRepository: IStaffRepository) {}

  async execute(data: CreateStaffData): Promise<Result<Staff>> {
    try {
      // Verificar se email já existe
      const existing = await this.staffRepository.findByEmail(data.email);
      if (existing) {
        return Results.error('Email já está em uso', 'EMAIL_IN_USE');
      }

      const staff = await this.staffRepository.create(data);
      return Results.success(staff);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar funcionário'
      );
    }
  }
}
