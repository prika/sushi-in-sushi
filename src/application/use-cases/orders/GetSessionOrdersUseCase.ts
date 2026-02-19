/**
 * GetSessionOrdersUseCase - Obtém pedidos de uma sessão
 */

import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { SessionOrderDTO, SessionOrdersSummaryDTO, OrderCountsDTO } from '@/application/dto/OrderDTO';
import { Result, Results } from '../Result';

/**
 * Input do use case
 */
export interface GetSessionOrdersInput {
  sessionId: string;
}

/**
 * Use case para obter pedidos de uma sessão
 */
export class GetSessionOrdersUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(input: GetSessionOrdersInput): Promise<Result<SessionOrdersSummaryDTO>> {
    try {
      const { sessionId } = input;

      if (!sessionId) {
        return Results.error('ID da sessão é obrigatório');
      }

      const orders = await this.orderRepository.findBySession(sessionId);

      // Mapear para DTOs
      const orderDTOs: SessionOrderDTO[] = orders.map((order) => ({
        id: order.id,
        sessionId: order.sessionId,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        notes: order.notes,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        product: order.product,
        subtotal: order.quantity * order.unitPrice,
      }));

      // Ordenar por data de criação (mais recentes primeiro)
      orderDTOs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Contar por status
      const counts: OrderCountsDTO = {
        pending: orderDTOs.filter((o) => o.status === 'pending').length,
        preparing: orderDTOs.filter((o) => o.status === 'preparing').length,
        ready: orderDTOs.filter((o) => o.status === 'ready').length,
        delivered: orderDTOs.filter((o) => o.status === 'delivered').length,
        cancelled: orderDTOs.filter((o) => o.status === 'cancelled').length,
        total: orderDTOs.length,
        active: orderDTOs.filter((o) =>
          ['pending', 'preparing', 'ready'].includes(o.status)
        ).length,
      };

      // Calcular totais (apenas pedidos não cancelados)
      const validOrders = orderDTOs.filter((o) => o.status !== 'cancelled');
      const totals = {
        subtotal: validOrders.reduce((sum, o) => sum + o.subtotal, 0),
        itemCount: validOrders.reduce((sum, o) => sum + o.quantity, 0),
      };

      return Results.success({
        orders: orderDTOs,
        counts,
        totals,
      });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar pedidos da sessão'
      );
    }
  }
}
