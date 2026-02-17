/**
 * PushOrderToVendusUseCase - Envia uma sessão/conta para o Vendus
 */

import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import {
  IVendusIntegrationService,
  VendusOrderLineDTO,
  VendusOrderPushResult,
} from '@/application/ports/IVendusIntegrationService';
import { Result, Results } from '@/application/use-cases/Result';

export interface PushOrderToVendusInput {
  sessionId: string;
}

export interface PushOrderToVendusOutput extends VendusOrderPushResult {}

export class PushOrderToVendusUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository: IProductRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly vendusService: IVendusIntegrationService,
  ) {}

  async execute(input: PushOrderToVendusInput): Promise<Result<PushOrderToVendusOutput>> {
    const { sessionId } = input;

    if (!sessionId) {
      return Results.error<PushOrderToVendusOutput>('ID da sessão é obrigatório', 'SESSION_ID_REQUIRED');
    }

    const session = await this.sessionRepository.findByIdWithTable(sessionId);

    if (!session) {
      return Results.error<PushOrderToVendusOutput>('Sessão não encontrada', 'SESSION_NOT_FOUND');
    }

    const orders = await this.orderRepository.findBySession(sessionId);

    if (orders.length === 0) {
      return Results.error<PushOrderToVendusOutput>('Sessão sem pedidos', 'NO_ORDERS');
    }

    const lines: VendusOrderLineDTO[] = [];

    for (const order of orders) {
      const product = await this.productRepository.findById(order.productId);

      if (!product || !product.vendusProductId) {
        return Results.error<PushOrderToVendusOutput>(
          `Produto sem mapeamento Vendus (productId=${order.productId})`,
          'MISSING_VENDUS_PRODUCT',
        );
      }

      lines.push({
        vendusProductId: product.vendusProductId,
        quantity: order.quantity,
        unitPrice: product.price,
      });
    }

    const tableLabel = `Mesa ${session.table.number}`;

    const vendusResult = await this.vendusService.pushOrder(tableLabel, lines);

    if (!vendusResult.success) {
      return Results.error<PushOrderToVendusOutput>(
        vendusResult.error ?? 'Erro ao enviar venda para Vendus',
        'VENDUS_PUSH_ERROR',
      );
    }

    return Results.success<PushOrderToVendusOutput>(vendusResult.data);
  }
}

