import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart, UseCartOptions } from '@/presentation/hooks/useCart';
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createNonRodizioProduct(overrides: Partial<Product> = {}): Product {
  return createProduct({
    id: 'prod-extra-1',
    name: 'Coca-Cola',
    description: 'Bebida',
    price: 3.0,
    isRodizio: false,
    ...overrides,
  });
}

const defaultOptions: UseCartOptions = {
  orderType: 'rodizio',
  isLunch: false,
  numPessoas: 2,
};

describe('useCart', () => {
  let product1: Product;
  let product2: Product;
  let extraProduct: Product;

  beforeEach(() => {
    product1 = createProduct({ id: 'prod-1', name: 'Sushi Salmão', price: 5.5 });
    product2 = createProduct({ id: 'prod-2', name: 'Sushi Atum', price: 6.0 });
    extraProduct = createNonRodizioProduct({ id: 'prod-extra', name: 'Coca-Cola', price: 3.0 });
  });

  it('deve inicializar com carrinho vazio', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    expect(result.current.cart).toEqual([]);
    expect(result.current.cartItemsCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
    expect(result.current.editingNotes).toBeNull();
  });

  it('deve adicionar um novo produto ao carrinho', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].productId).toBe('prod-1');
    expect(result.current.cart[0].quantity).toBe(1);
    expect(result.current.cart[0].addedBy).toBe('João');
  });

  it('deve incrementar quantidade ao adicionar produto existente', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it('deve remover um produto do carrinho', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product2, 'Maria');
    });

    act(() => {
      result.current.removeFromCart('prod-1');
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].productId).toBe('prod-2');
  });

  it('deve atualizar a quantidade de um item', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    act(() => {
      result.current.updateQuantity('prod-1', 5);
    });

    expect(result.current.cart[0].quantity).toBe(5);
  });

  it('deve remover item quando quantidade é atualizada para 0', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    act(() => {
      result.current.updateQuantity('prod-1', 0);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('deve atualizar as notas de um item', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
    });

    act(() => {
      result.current.updateNotes('prod-1', 'Sem wasabi');
    });

    expect(result.current.cart[0].notes).toBe('Sem wasabi');
  });

  it('deve retornar a quantidade correta para um produto no carrinho', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product1, 'João');
    });

    expect(result.current.getCartQuantity('prod-1')).toBe(3);
  });

  it('deve retornar 0 para produto inexistente no carrinho', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    expect(result.current.getCartQuantity('prod-inexistente')).toBe(0);
  });

  it('deve limpar todo o carrinho', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product2, 'Maria');
    });

    expect(result.current.cart).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartItemsCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('deve excluir itens rodízio do total em modo rodízio', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João'); // isRodizio: true, price: 5.5
      result.current.addToCart(extraProduct, 'João'); // isRodizio: false, price: 3.0
    });

    // Apenas o extra (3.0) conta no cartTotal em modo rodízio
    expect(result.current.cartTotal).toBe(3.0);
  });

  it('deve incluir todos os itens no total em modo carta', () => {
    const { result } = renderHook(() =>
      useCart({ orderType: 'carta', isLunch: false, numPessoas: 2 })
    );

    act(() => {
      result.current.addToCart(product1, 'João'); // price: 5.5
      result.current.addToCart(extraProduct, 'João'); // price: 3.0
    });

    // Todos contam: 5.5 + 3.0 = 8.5
    expect(result.current.cartTotal).toBe(8.5);
  });

  it('deve somar todas as quantidades no cartItemsCount', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    act(() => {
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product1, 'João');
      result.current.addToCart(product2, 'Maria');
    });

    // product1: qty 2, product2: qty 1 => total 3
    expect(result.current.cartItemsCount).toBe(3);
  });

  it('deve adicionar preço base do rodízio no finalTotal em modo rodízio', () => {
    const { result } = renderHook(() =>
      useCart({ orderType: 'rodizio', isLunch: false, numPessoas: 2 })
    );

    act(() => {
      result.current.addToCart(extraProduct, 'João'); // extra: 3.0
    });

    // rodizio price = 20 (jantar), numPessoas = 2
    // finalTotal = 20 * 2 + 3.0 = 43.0
    expect(result.current.finalTotal).toBe(43.0);
  });

  it('deve ter finalTotal igual ao cartTotal em modo carta', () => {
    const { result } = renderHook(() =>
      useCart({ orderType: 'carta', isLunch: false, numPessoas: 2 })
    );

    act(() => {
      result.current.addToCart(product1, 'João'); // 5.5
      result.current.addToCart(extraProduct, 'João'); // 3.0
    });

    // Em modo carta: finalTotal = cartTotal = 5.5 + 3.0 = 8.5
    expect(result.current.finalTotal).toBe(result.current.cartTotal);
    expect(result.current.finalTotal).toBe(8.5);
  });

  it('deve retornar 17 para rodizioPrice ao almoço', () => {
    const { result } = renderHook(() =>
      useCart({ orderType: 'rodizio', isLunch: true, numPessoas: 2 })
    );

    expect(result.current.rodizioPrice).toBe(17);
  });

  it('deve retornar 20 para rodizioPrice ao jantar', () => {
    const { result } = renderHook(() =>
      useCart({ orderType: 'rodizio', isLunch: false, numPessoas: 2 })
    );

    expect(result.current.rodizioPrice).toBe(20);
  });

  it('deve gerir o estado de editingNotes corretamente', () => {
    const { result } = renderHook(() => useCart(defaultOptions));

    expect(result.current.editingNotes).toBeNull();

    act(() => {
      result.current.setEditingNotes('prod-1');
    });

    expect(result.current.editingNotes).toBe('prod-1');

    act(() => {
      result.current.setEditingNotes(null);
    });

    expect(result.current.editingNotes).toBeNull();
  });
});
