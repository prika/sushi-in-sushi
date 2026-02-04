/**
 * UpdateOrderStatusUseCase - Atualiza o status de um pedido
 */

import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { OrderService } from '@/domain/services/OrderService';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';
import { IActivityLogger } from '@/application/ports/IActivityLogger';
import { Order } from '@/domain/entities/Order';
import { Result, Results } from '../Result';

/**
 * Input do use case
 */
export interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
  userId?: string;
}

/**
 * Use case para atualizar status de um pedido
 */
export class UpdateOrderStatusUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private activityLogger?: IActivityLogger
  ) {}

  async execute(input: UpdateOrderStatusInput): Promise<Result<Order>> {
    try {
      // Buscar pedido atual
      const order = await this.orderRepository.findById(input.orderId);

      if (!order) {
        return Results.error('Pedido não encontrado', 'ORDER_NOT_FOUND');
      }

      // Validar transição de status
      const validation = OrderService.canChangeStatus(order, input.newStatus);

      if (!validation.isValid) {
        return Results.error(validation.error!, 'INVALID_TRANSITION');
      }

      // Atualizar status
      const updatedOrder = await this.orderRepository.updateStatus(
        input.orderId,
        input.newStatus
      );

      // Registar atividade (se logger disponível)
      if (this.activityLogger) {
        await this.activityLogger.log({
          action: `order_${input.newStatus}`,
          entityType: 'order',
          entityId: input.orderId,
          userId: input.userId,
          details: {
            previousStatus: order.status,
            newStatus: input.newStatus,
          },
        });
      }

      return Results.success(updatedOrder);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar pedido'
      );
    }
  }

  /**
   * Avança o pedido para o próximo status na sequência
   */
  async advanceToNextStatus(
    orderId: string,
    userId?: string
  ): Promise<Result<Order>> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      return Results.error('Pedido não encontrado', 'ORDER_NOT_FOUND');
    }

    const nextStatus = OrderService.getNextStatus(order);

    if (!nextStatus) {
      return Results.error('Pedido já está no estado final', 'ALREADY_FINAL');
    }

    return this.execute({
      orderId,
      newStatus: nextStatus,
      userId,
    });
  }
}
