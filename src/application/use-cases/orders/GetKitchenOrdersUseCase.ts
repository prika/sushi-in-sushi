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
      const orderDTOs: KitchenOrderDTO[] = orders.map((order) => {
        const preparingStartedAt = order.preparingStartedAt?.toISOString() ?? null;
        const readyAt = order.readyAt?.toISOString() ?? null;
        const prepTimeMinutes =
          order.preparingStartedAt && order.readyAt
            ? Math.round((order.readyAt.getTime() - order.preparingStartedAt.getTime()) / 60000)
            : null;

        // Stage-specific timing
        let pendingMinutes: number;
        let preparingMinutes: number | null = null;
        let readyMinutes: number | null = null;

        if (order.status === 'pending') {
          pendingMinutes = Math.round((now.getTime() - order.createdAt.getTime()) / 60000);
        } else if (order.preparingStartedAt) {
          pendingMinutes = Math.round((order.preparingStartedAt.getTime() - order.createdAt.getTime()) / 60000);
        } else {
          pendingMinutes = Math.round((now.getTime() - order.createdAt.getTime()) / 60000);
        }

        if (order.status === 'preparing' && order.preparingStartedAt) {
          preparingMinutes = Math.round((now.getTime() - order.preparingStartedAt.getTime()) / 60000);
        } else if (order.preparingStartedAt && order.readyAt) {
          preparingMinutes = Math.round((order.readyAt.getTime() - order.preparingStartedAt.getTime()) / 60000);
        }

        if (order.status === 'ready' && order.readyAt) {
          readyMinutes = Math.round((now.getTime() - order.readyAt.getTime()) / 60000);
        }

        return {
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
          zone: order.zone,
          customerName: order.customerName,
          waiterName: order.waiterName,
          preparedBy: order.preparedBy ?? null,
          preparerName: order.preparerName ?? null,
          preparingStartedAt,
          readyAt,
          prepTimeMinutes,
          pendingMinutes,
          preparingMinutes,
          readyMinutes,
        };
      });

      // Ordenar por timestamp do estado atual (mais antigos primeiro)
      // Quando um pedido muda de estado, vai para o fim da lista
      orderDTOs.sort((a, b) => {
        let timeA: number;
        let timeB: number;

        // Para pedidos 'pending', usar created_at
        if (a.status === 'pending') {
          timeA = new Date(a.createdAt).getTime();
        }
        // Para pedidos 'preparing', usar preparing_started_at (ou created_at se não existir)
        else if (a.status === 'preparing') {
          timeA = a.preparingStartedAt ? new Date(a.preparingStartedAt).getTime() : new Date(a.createdAt).getTime();
        }
        // Para pedidos 'ready', usar ready_at (ou created_at se não existir)
        else if (a.status === 'ready') {
          timeA = a.readyAt ? new Date(a.readyAt).getTime() : new Date(a.createdAt).getTime();
        }
        else {
          timeA = new Date(a.createdAt).getTime();
        }

        // Mesma lógica para pedido B
        if (b.status === 'pending') {
          timeB = new Date(b.createdAt).getTime();
        }
        else if (b.status === 'preparing') {
          timeB = b.preparingStartedAt ? new Date(b.preparingStartedAt).getTime() : new Date(b.createdAt).getTime();
        }
        else if (b.status === 'ready') {
          timeB = b.readyAt ? new Date(b.readyAt).getTime() : new Date(b.createdAt).getTime();
        }
        else {
          timeB = new Date(b.createdAt).getTime();
        }

        return timeA - timeB;
      });

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
