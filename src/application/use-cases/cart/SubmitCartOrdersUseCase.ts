/**
 * SubmitCartOrdersUseCase - Prepara os dados do carrinho para submissão
 *
 * Use case puro de orquestração que valida o carrinho, constrói os inserts
 * e calcula os totais. Não interage com repositórios - a página mesa
 * faz as chamadas à base de dados directamente.
 */

import { CartItem, OrderInsert } from '@/domain/entities/CartItem';
import { CartService } from '@/domain/services/CartService';
import { Result, Results } from '../Result';

/**
 * Input para o use case de submissão do carrinho
 */
export interface SubmitCartOrdersInput {
  cart: CartItem[];
  sessionId: string;
  sessionCustomerId: string | null;
  currentSessionTotal: number;
  isRodizio: boolean;
}

/**
 * Output do use case de submissão do carrinho
 */
export interface SubmitCartOrdersOutput {
  orderInserts: OrderInsert[];
  newTotal: number;
  extrasTotal: number;
}

/**
 * Use case que prepara os dados do carrinho para inserção na base de dados.
 * Valida o carrinho, constrói o payload de pedidos e calcula os totais.
 */
export class SubmitCartOrdersUseCase {
  async execute(input: SubmitCartOrdersInput): Promise<Result<SubmitCartOrdersOutput>> {
    try {
      const { cart, sessionId, sessionCustomerId, currentSessionTotal, isRodizio } = input;

      // 1. Validar carrinho
      const validation = CartService.validateCart(cart);
      if (!validation.isValid) {
        return Results.error(validation.error!, 'INVALID_CART');
      }

      // 2. Construir order inserts
      const orderInserts = CartService.buildOrderInserts(cart, sessionId, sessionCustomerId);

      // 3. Calcular extras e novo total
      const extrasTotal = CartService.calculateExtrasTotal(cart, isRodizio);
      const newTotal = currentSessionTotal + extrasTotal;

      return Results.success({
        orderInserts,
        newTotal,
        extrasTotal,
      });
    } catch (error) {
      return Results.error('Erro ao preparar pedidos do carrinho', 'SUBMIT_CART_ERROR');
    }
  }
}
