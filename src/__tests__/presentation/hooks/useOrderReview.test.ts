import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderReview } from '@/presentation/hooks/useOrderReview';
import { CartItem } from '@/domain/entities/CartItem';
import type { Product } from '@/domain/entities/Product';

// === Helpers para dados de teste ===

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Sushi Salmão',
    description: 'Sushi de salmão fresco',
    price: 5.5,
    categoryId: 'cat-1',
    imageUrl: null,
    imageUrls: [],
    isAvailable: true,
    isRodizio: true,
    sortOrder: 1,
    serviceModes: [],
    servicePrices: {},
    ingredients: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = createProduct({ id: overrides.productId || 'prod-1' });
  return {
    productId: product.id,
    product,
    quantity: 1,
    addedBy: 'João',
    ...overrides,
  };
}

function createSessionOrder(
  productId: string,
  quantity: number,
  status: string = 'pending'
): { product_id: string; quantity: number; status: string } {
  return { product_id: productId, quantity, status };
}

describe('useOrderReview', () => {
  let cartWithItems: CartItem[];
  let cartItem1: CartItem;
  let cartItem2: CartItem;

  beforeEach(() => {
    cartItem1 = createCartItem({
      productId: 'prod-1',
      product: createProduct({ id: 'prod-1', name: 'Sushi Salmão' }),
      quantity: 2,
    });
    cartItem2 = createCartItem({
      productId: 'prod-2',
      product: createProduct({ id: 'prod-2', name: 'Sushi Atum', price: 6.0 }),
      quantity: 1,
    });
    cartWithItems = [cartItem1, cartItem2];
  });

  it('deve inicializar com modal fechado', () => {
    const { result } = renderHook(() =>
      useOrderReview({ cart: [], sessionOrders: [] })
    );

    expect(result.current.showReviewModal).toBe(false);
  });

  it('deve abrir o modal de revisão', () => {
    const { result } = renderHook(() =>
      useOrderReview({ cart: [], sessionOrders: [] })
    );

    act(() => {
      result.current.openReview();
    });

    expect(result.current.showReviewModal).toBe(true);
  });

  it('deve fechar o modal de revisão', () => {
    const { result } = renderHook(() =>
      useOrderReview({ cart: [], sessionOrders: [] })
    );

    act(() => {
      result.current.openReview();
    });

    expect(result.current.showReviewModal).toBe(true);

    act(() => {
      result.current.closeReview();
    });

    expect(result.current.showReviewModal).toBe(false);
  });

  it('deve resetar confirmações ao abrir o modal', () => {
    const sessionOrders = [createSessionOrder('prod-1', 1, 'pending')];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    // Confirmar um duplicado
    act(() => {
      result.current.confirmDuplicate('prod-1');
    });

    expect(result.current.confirmedDuplicates.has('prod-1')).toBe(true);

    // Abrir modal deve resetar
    act(() => {
      result.current.openReview();
    });

    expect(result.current.confirmedDuplicates.size).toBe(0);
  });

  it('deve detetar duplicados corretamente', () => {
    const sessionOrders = [
      createSessionOrder('prod-1', 2, 'pending'),
      createSessionOrder('prod-1', 1, 'preparing'),
    ];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    expect(result.current.duplicateMap.size).toBe(1);
    expect(result.current.duplicateMap.get('prod-1')).toEqual({ totalQty: 3 });
    expect(result.current.duplicateItems).toHaveLength(1);
    expect(result.current.duplicateItems[0].productId).toBe('prod-1');
  });

  it('deve retornar sem duplicados quando não há pedidos correspondentes', () => {
    const sessionOrders = [createSessionOrder('prod-99', 1, 'pending')];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    expect(result.current.duplicateMap.size).toBe(0);
    expect(result.current.duplicateItems).toHaveLength(0);
    expect(result.current.hasUnconfirmedDuplicates).toBe(false);
  });

  it('deve adicionar productId ao conjunto de confirmados', () => {
    const sessionOrders = [createSessionOrder('prod-1', 1, 'pending')];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    act(() => {
      result.current.confirmDuplicate('prod-1');
    });

    expect(result.current.confirmedDuplicates.has('prod-1')).toBe(true);
  });

  it('deve remover productId do conjunto de confirmados ao anular', () => {
    const sessionOrders = [createSessionOrder('prod-1', 1, 'pending')];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    act(() => {
      result.current.confirmDuplicate('prod-1');
    });

    expect(result.current.confirmedDuplicates.has('prod-1')).toBe(true);

    act(() => {
      result.current.undoConfirmDuplicate('prod-1');
    });

    expect(result.current.confirmedDuplicates.has('prod-1')).toBe(false);
  });

  it('deve indicar hasUnconfirmedDuplicates como true quando existem duplicados por confirmar', () => {
    const sessionOrders = [
      createSessionOrder('prod-1', 1, 'pending'),
      createSessionOrder('prod-2', 1, 'preparing'),
    ];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    // Ambos são duplicados, nenhum confirmado
    expect(result.current.hasUnconfirmedDuplicates).toBe(true);

    // Confirmar apenas um
    act(() => {
      result.current.confirmDuplicate('prod-1');
    });

    // Ainda existe prod-2 por confirmar
    expect(result.current.hasUnconfirmedDuplicates).toBe(true);
  });

  it('deve indicar hasUnconfirmedDuplicates como false quando todos estão confirmados', () => {
    const sessionOrders = [
      createSessionOrder('prod-1', 1, 'pending'),
      createSessionOrder('prod-2', 1, 'preparing'),
    ];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    act(() => {
      result.current.confirmDuplicate('prod-1');
      result.current.confirmDuplicate('prod-2');
    });

    expect(result.current.hasUnconfirmedDuplicates).toBe(false);
  });

  it('deve indicar hasUnconfirmedDuplicates como false quando não há duplicados', () => {
    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders: [] })
    );

    expect(result.current.hasUnconfirmedDuplicates).toBe(false);
  });

  it('deve excluir pedidos cancelados da deteção de duplicados', () => {
    const sessionOrders = [
      createSessionOrder('prod-1', 2, 'cancelled'),
    ];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    expect(result.current.duplicateMap.size).toBe(0);
    expect(result.current.duplicateItems).toHaveLength(0);
  });

  it('deve excluir pedidos entregues da deteção de duplicados', () => {
    const sessionOrders = [
      createSessionOrder('prod-1', 1, 'delivered'),
    ];

    const { result } = renderHook(() =>
      useOrderReview({ cart: cartWithItems, sessionOrders })
    );

    expect(result.current.duplicateMap.size).toBe(0);
    expect(result.current.duplicateItems).toHaveLength(0);
  });
});
