import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubmitCartOrdersUseCase,
  SubmitCartOrdersInput,
} from '@/application/use-cases/cart/SubmitCartOrdersUseCase';
import { CartItem } from '@/domain/entities/CartItem';
import { Product } from '@/domain/entities/Product';

// Helper para criar um produto de teste
function createTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Salmão Sashimi',
    description: 'Sashimi de salmão fresco',
    price: 12.5,
    categoryId: 'category-1',
    isAvailable: true,
    isRodizio: true,
    imageUrl: '/images/salmon.jpg',
    imageUrls: ['/images/salmon.jpg'],
    sortOrder: 1,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Helper para criar um item de carrinho de teste
function createTestCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'product-1',
    product: createTestProduct(),
    quantity: 2,
    addedBy: 'João',
    ...overrides,
  };
}

// Helper para criar input base de teste
function createTestInput(overrides: Partial<SubmitCartOrdersInput> = {}): SubmitCartOrdersInput {
  return {
    cart: [createTestCartItem()],
    sessionId: 'session-1',
    sessionCustomerId: 'customer-1',
    currentSessionTotal: 50,
    isRodizio: false,
    ...overrides,
  };
}

describe('SubmitCartOrdersUseCase', () => {
  let useCase: SubmitCartOrdersUseCase;

  beforeEach(() => {
    useCase = new SubmitCartOrdersUseCase();
  });

  it('deve retornar order inserts e novo total com sucesso', async () => {
    const input = createTestInput();

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderInserts).toHaveLength(1);
      expect(result.data.extrasTotal).toBe(25); // 12.50 * 2
      expect(result.data.newTotal).toBe(75); // 50 + 25
    }
  });

  it('deve retornar erro para carrinho vazio', async () => {
    const input = createTestInput({ cart: [] });

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('vazio');
      expect(result.code).toBe('INVALID_CART');
    }
  });

  it('deve retornar erro para item com quantidade zero', async () => {
    const input = createTestInput({
      cart: [createTestCartItem({ quantity: 0 })],
    });

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Quantidade inválida');
      expect(result.code).toBe('INVALID_CART');
    }
  });

  it('deve retornar erro para item com preço negativo', async () => {
    const input = createTestInput({
      cart: [
        createTestCartItem({
          product: createTestProduct({ price: -5 }),
        }),
      ],
    });

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Preço inválido');
      expect(result.code).toBe('INVALID_CART');
    }
  });

  it('deve calcular extras total correctamente em modo não-rodízio', async () => {
    const cart = [
      createTestCartItem({
        productId: 'p1',
        product: createTestProduct({ id: 'p1', price: 10, isRodizio: true }),
        quantity: 2,
      }),
      createTestCartItem({
        productId: 'p2',
        product: createTestProduct({ id: 'p2', price: 5, isRodizio: false }),
        quantity: 3,
      }),
    ];
    const input = createTestInput({ cart, isRodizio: false, currentSessionTotal: 0 });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      // Não-rodízio: todos os itens contam → (10*2) + (5*3) = 35
      expect(result.data.extrasTotal).toBe(35);
      expect(result.data.newTotal).toBe(35);
    }
  });

  it('deve calcular extras total correctamente em modo rodízio (exclui itens rodízio)', async () => {
    const cart = [
      createTestCartItem({
        productId: 'p1',
        product: createTestProduct({ id: 'p1', price: 10, isRodizio: true }),
        quantity: 2,
      }),
      createTestCartItem({
        productId: 'p2',
        product: createTestProduct({ id: 'p2', price: 5, isRodizio: false }),
        quantity: 3,
      }),
    ];
    const input = createTestInput({ cart, isRodizio: true, currentSessionTotal: 40 });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      // Rodízio: itens com isRodizio são gratuitos → apenas (5*3) = 15
      expect(result.data.extrasTotal).toBe(15);
      expect(result.data.newTotal).toBe(55); // 40 + 15
    }
  });

  it('deve mapear correctamente os itens do carrinho para order inserts', async () => {
    const cart = [
      createTestCartItem({
        productId: 'p1',
        product: createTestProduct({ id: 'p1', price: 10 }),
        quantity: 3,
        notes: 'Sem gengibre',
      }),
      createTestCartItem({
        productId: 'p2',
        product: createTestProduct({ id: 'p2', price: 7.5 }),
        quantity: 1,
      }),
    ];
    const input = createTestInput({
      cart,
      sessionId: 'session-abc',
      sessionCustomerId: 'cust-123',
    });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderInserts).toHaveLength(2);

      expect(result.data.orderInserts[0]).toEqual({
        session_id: 'session-abc',
        product_id: 'p1',
        quantity: 3,
        unit_price: 10,
        notes: 'Sem gengibre',
        status: 'pending',
        session_customer_id: 'cust-123',
      });

      expect(result.data.orderInserts[1]).toEqual({
        session_id: 'session-abc',
        product_id: 'p2',
        quantity: 1,
        unit_price: 7.5,
        notes: null,
        status: 'pending',
        session_customer_id: 'cust-123',
      });
    }
  });

  it('deve lidar com sessionCustomerId nulo', async () => {
    const input = createTestInput({ sessionCustomerId: null });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderInserts[0].session_customer_id).toBeNull();
    }
  });

  it('deve incluir notas dos itens nos order inserts', async () => {
    const cart = [
      createTestCartItem({ notes: 'Extra wasabi por favor' }),
    ];
    const input = createTestInput({ cart });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderInserts[0].notes).toBe('Extra wasabi por favor');
    }
  });

  it('deve preservar unit_price do produto no order insert', async () => {
    const cart = [
      createTestCartItem({
        product: createTestProduct({ price: 18.9 }),
        quantity: 1,
      }),
    ];
    const input = createTestInput({ cart });

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderInserts[0].unit_price).toBe(18.9);
    }
  });
});
