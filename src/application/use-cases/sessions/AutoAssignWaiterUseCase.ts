/**
 * AutoAssignWaiterUseCase - Atribuição automática de mesa ao waiter menos ocupado
 *
 * Executado após criação de sessão quando restaurant.autoTableAssignment está ativo.
 * Erros nunca bloqueiam a criação da sessão.
 */

import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { WaiterAssignmentService, WaiterWithLoad } from '@/domain/services/WaiterAssignmentService';
import { Result, Results } from '../Result';

export interface AutoAssignWaiterInput {
  tableId: string;
  location: string;
}

export interface AutoAssignWaiterOutput {
  assigned: boolean;
  waiterId?: string;
  waiterName?: string;
}

export class AutoAssignWaiterUseCase {
  constructor(
    private staffRepository: IStaffRepository,
    private tableRepository: ITableRepository,
    private restaurantRepository: IRestaurantRepository,
  ) {}

  async execute(input: AutoAssignWaiterInput): Promise<Result<AutoAssignWaiterOutput>> {
    try {
      // 1. Verificar se auto-assignment está ativo para este restaurante
      const restaurant = await this.restaurantRepository.findBySlug(input.location);
      if (!restaurant || !restaurant.autoTableAssignment) {
        return Results.success({ assigned: false });
      }

      // 2. Buscar waiters ativos nesta localização
      const allStaff = await this.staffRepository.findAll({
        location: input.location as any,
        isActive: true,
      });
      const waiters = allStaff.filter(s => s.role.name === 'waiter');

      if (waiters.length === 0) {
        return Results.success({ assigned: false });
      }

      // 3. Contar mesas ocupadas de cada waiter
      const waiterLoads: WaiterWithLoad[] = await Promise.all(
        waiters.map(async (waiter) => {
          const assignedTableIds = await this.staffRepository.getAssignedTables(waiter.id);

          let occupiedCount = 0;
          if (assignedTableIds.length > 0) {
            const tables = await Promise.all(
              assignedTableIds.map(id => this.tableRepository.findById(id))
            );
            occupiedCount = tables.filter(t => t && t.status === 'occupied').length;
          }

          return {
            staffId: waiter.id,
            staffName: waiter.name,
            occupiedTableCount: occupiedCount,
          };
        })
      );

      // 4. Selecionar o menos ocupado
      const selected = WaiterAssignmentService.selectLeastBusyWaiter(waiterLoads);
      if (!selected) {
        return Results.success({ assigned: false });
      }

      // 5. Atribuir mesa
      await this.staffRepository.addTableAssignment(selected.staffId, input.tableId);

      return Results.success({
        assigned: true,
        waiterId: selected.staffId,
        waiterName: selected.staffName,
      });
    } catch (error) {
      // Falha na auto-atribuição nunca bloqueia a sessão
      console.error('[AutoAssignWaiterUseCase] Error:', error);
      return Results.success({ assigned: false });
    }
  }
}
