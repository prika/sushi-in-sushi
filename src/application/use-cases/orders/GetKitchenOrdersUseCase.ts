/**
 * GetKitchenOrdersUseCase - Obtém pedidos para a cozinha
 */

import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { OrderService } from '@/domain/services/OrderService';
import { KitchenOrderDTO, OrderFilterDTO, OrderCountsDTO } from '@/application/dto/OrderDTO';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';
import { Result, Results } from '../Result';

/**
 * Resposta do use case
 */
export interface GetKitchenOrdersResponse {
  orders: KitchenOrderDTO[];
  counts: OrderCountsDTO;
  byStatus: {
    pending: KitchenOrderDTO[];
    preparing: KitchenOrderDTO[];
    ready: KitchenOrderDTO[];
  };
}

/**
 * Use case para obter pedidos da cozinha
 */
export class GetKitchenOrdersUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(filter?: OrderFilterDTO): Promise<Result<GetKitchenOrdersResponse>> {
    try {
      const statuses: OrderStatus[] = filter?.statuses || ['pending', 'preparing', 'ready'];

      const orders = await this.orderRepository.findForKitchen({
        statuses,
        location: filter?.location,
      });

      const now = new Date();

      // Mapear para DTOs com cálculos
      const orderDTOs: KitchenOrderDTO[] = orders.map((order) => ({
        id: order.id,
        sessionId: order.sessionId,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        notes: order.notes,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        timeElapsedMinutes: OrderService.getTimeElapsed(order, now),
        isLate: OrderService.isLate(order, 10, now),
        urgencyColor: OrderService.getUrgencyColor(order, now),
        product: order.product,
        table: order.table,
        customerName: order.customerName,
        waiterName: order.waiterName,
      }));

      // Ordenar por urgência (mais antigos primeiro)
      orderDTOs.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Agrupar por status
      const byStatus = {
        pending: orderDTOs.filter((o) => o.status === 'pending'),
        preparing: orderDTOs.filter((o) => o.status === 'preparing'),
        ready: orderDTOs.filter((o) => o.status === 'ready'),
      };

      // Contar
      const counts: OrderCountsDTO = {
        pending: byStatus.pending.length,
        preparing: byStatus.preparing.length,
        ready: byStatus.ready.length,
        delivered: 0,
        cancelled: 0,
        total: orderDTOs.length,
        active: orderDTOs.length,
      };

      return Results.success({
        orders: orderDTOs,
        counts,
        byStatus,
      });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar pedidos'
      );
    }
  }
}
