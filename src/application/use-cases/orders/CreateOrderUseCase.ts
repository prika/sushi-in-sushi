/**
 * CreateOrderUseCase - Cria um novo pedido
 */

import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { OrderService } from '@/domain/services/OrderService';
import { Order } from '@/domain/entities/Order';
import { CreateOrderDTO } from '@/application/dto/OrderDTO';
import { Result, Results } from '../Result';

/**
 * Use case para criar um pedido
 */
export class CreateOrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async execute(input: CreateOrderDTO): Promise<Result<Order>> {
    try {
      // Buscar produto para obter preço
      const product = await this.productRepository.findById(input.productId);

      if (!product) {
        return Results.error('Produto não encontrado', 'PRODUCT_NOT_FOUND');
      }

      if (!product.isAvailable) {
        return Results.error('Produto não está disponível', 'PRODUCT_UNAVAILABLE');
      }

      // Validar dados
      const validation = OrderService.validateCreateData({
        quantity: input.quantity,
        unitPrice: product.price,
      });

      if (!validation.isValid) {
        return Results.error(validation.error!, 'VALIDATION_ERROR');
      }

      // Criar pedido
      const order = await this.orderRepository.create({
        sessionId: input.sessionId,
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: product.price,
        notes: input.notes || null,
        sessionCustomerId: input.sessionCustomerId || null,
      });

      return Results.success(order);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar pedido'
      );
    }
  }

  /**
   * Cria múltiplos pedidos de uma vez
   */
  async executeMultiple(inputs: CreateOrderDTO[]): Promise<Result<Order[]>> {
    const orders: Order[] = [];
    const errors: string[] = [];

    for (const input of inputs) {
      const result = await this.execute(input);

      if (result.success) {
        orders.push(result.data);
      } else {
        errors.push(`Produto ${input.productId}: ${result.error}`);
      }
    }

    if (errors.length > 0 && orders.length === 0) {
      return Results.error(errors.join('; '));
    }

    return Results.success(orders);
  }
}
