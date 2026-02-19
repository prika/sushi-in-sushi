import { describe, it, expect } from 'vitest';
import { CartService } from '@/domain/services/CartService';
import { Product } from '@/domain/entities/Product';
import { CartItem, DuplicateInfo } from '@/domain/entities/CartItem';

// Helper para criar um produto de teste
function createTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Salmão Nigiri',
    description: 'Nigiri de salmão fresco',
    price: 5.5,
    categoryId: 'cat-1',
    imageUrl: null,
    imageUrls: [],
    isAvailable: true,
    isRodizio: true,
    sortOrder: 1,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Helper para criar um item de carrinho de teste
function createTestCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = overrides.product || createTestProduct({ id: overrides.productId || 'product-1' });
  return {
    productId: product.id,
    product,
    quantity: 1,
    ...overrides,
  };
}

describe('CartService', () => {
  // =====================================================
  // addItem
  // =====================================================
  describe('addItem', () => {
    it('deve adicionar um novo item ao carrinho vazio', () => {
      const product = createTestProduct({ id: 'p1', name: 'Sashimi' });
      const cart: CartItem[] = [];

      const result = CartService.addItem(cart, product, 'Sofia');

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
      expect(result[0].product.name).toBe('Sashimi');
      expect(result[0].quantity).toBe(1);
      expect(result[0].addedBy).toBe('Sofia');
    });

    it('deve incrementar a quantidade se o produto já existir no carrinho', () => {
      const product = createTestProduct({ id: 'p1' });
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', product, quantity: 2 }),
      ];

      const result = CartService.addItem(cart, product, 'Sofia');

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(3);
    });

    it('deve preservar o campo addedBy do item original ao incrementar', () => {
      const product = createTestProduct({ id: 'p1' });
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', product, quantity: 1, addedBy: 'João' }),
      ];

      const result = CartService.addItem(cart, product, 'Sofia');

      expect(result[0].addedBy).toBe('João');
    });

    it('deve preservar os itens existentes ao adicionar um novo', () => {
      const product1 = createTestProduct({ id: 'p1', name: 'Salmão' });
      const product2 = createTestProduct({ id: 'p2', name: 'Atum' });
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', product: product1, quantity: 2 }),
      ];

      const result = CartService.addItem(cart, product2, 'Sofia');

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p1');
      expect(result[0].quantity).toBe(2);
      expect(result[1].productId).toBe('p2');
      expect(result[1].quantity).toBe(1);
    });
  });

  // =====================================================
  // removeItem
  // =====================================================
  describe('removeItem', () => {
    it('deve remover um item existente do carrinho', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
      ];

      const result = CartService.removeItem(cart, 'p1');

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p2');
    });

    it('não deve alterar o carrinho ao remover um productId inexistente', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];

      const result = CartService.removeItem(cart, 'inexistente');

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
    });

    it('deve retornar array vazio ao remover de carrinho vazio', () => {
      const result = CartService.removeItem([], 'p1');

      expect(result).toHaveLength(0);
    });
  });

  // =====================================================
  // updateItemQuantity
  // =====================================================
  describe('updateItemQuantity', () => {
    it('deve aumentar a quantidade de um item', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 2 }),
      ];

      const result = CartService.updateItemQuantity(cart, 'p1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });

    it('deve diminuir a quantidade de um item', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 5 }),
      ];

      const result = CartService.updateItemQuantity(cart, 'p1', 2);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(2);
    });

    it('deve remover o item quando a quantidade é zero', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 3 }),
      ];

      const result = CartService.updateItemQuantity(cart, 'p1', 0);

      expect(result).toHaveLength(0);
    });

    it('deve remover o item quando a quantidade é negativa', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 2 }),
      ];

      const result = CartService.updateItemQuantity(cart, 'p1', -1);

      expect(result).toHaveLength(0);
    });

    it('não deve alterar o carrinho para productId inexistente', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 2 }),
      ];

      const result = CartService.updateItemQuantity(cart, 'inexistente', 5);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
      expect(result[0].quantity).toBe(2);
    });
  });

  // =====================================================
  // updateItemNotes
  // =====================================================
  describe('updateItemNotes', () => {
    it('deve adicionar notas a um item', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];

      const result = CartService.updateItemNotes(cart, 'p1', 'Sem wasabi');

      expect(result[0].notes).toBe('Sem wasabi');
    });

    it('deve limpar as notas de um item ao passar string vazia', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', notes: 'Sem wasabi' }),
      ];

      const result = CartService.updateItemNotes(cart, 'p1', '');

      expect(result[0].notes).toBe('');
    });

    it('não deve alterar outros itens ao atualizar notas de um productId inexistente', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', notes: 'Nota original' }),
      ];

      const result = CartService.updateItemNotes(cart, 'inexistente', 'Nota nova');

      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Nota original');
    });
  });

  // =====================================================
  // calculateExtrasTotal
  // =====================================================
  describe('calculateExtrasTotal', () => {
    it('deve calcular o total de todos os itens quando não é rodízio', () => {
      const cart: CartItem[] = [
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

      const total = CartService.calculateExtrasTotal(cart, false);

      expect(total).toBe(35); // (10*2) + (5*3)
    });

    it('deve excluir itens rodízio quando é modo rodízio', () => {
      const cart: CartItem[] = [
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

      const total = CartService.calculateExtrasTotal(cart, true);

      expect(total).toBe(15); // apenas (5*3), rodízio excluído
    });

    it('deve calcular corretamente com itens mistos em modo rodízio', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 8, isRodizio: true }),
          quantity: 1,
        }),
        createTestCartItem({
          productId: 'p2',
          product: createTestProduct({ id: 'p2', price: 12, isRodizio: false }),
          quantity: 1,
        }),
        createTestCartItem({
          productId: 'p3',
          product: createTestProduct({ id: 'p3', price: 6, isRodizio: true }),
          quantity: 2,
        }),
      ];

      const total = CartService.calculateExtrasTotal(cart, true);

      expect(total).toBe(12); // apenas o item não-rodízio
    });

    it('deve retornar 0 para carrinho vazio', () => {
      const total = CartService.calculateExtrasTotal([], true);

      expect(total).toBe(0);
    });

    it('deve retornar 0 quando todos os itens são rodízio em modo rodízio', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 10, isRodizio: true }),
          quantity: 2,
        }),
        createTestCartItem({
          productId: 'p2',
          product: createTestProduct({ id: 'p2', price: 5, isRodizio: true }),
          quantity: 1,
        }),
      ];

      const total = CartService.calculateExtrasTotal(cart, true);

      expect(total).toBe(0);
    });
  });

  // =====================================================
  // countItems
  // =====================================================
  describe('countItems', () => {
    it('deve somar as quantidades de múltiplos itens', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 3 }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }), quantity: 2 }),
        createTestCartItem({ productId: 'p3', product: createTestProduct({ id: 'p3' }), quantity: 1 }),
      ];

      expect(CartService.countItems(cart)).toBe(6);
    });

    it('deve retornar a quantidade de um único item', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 4 }),
      ];

      expect(CartService.countItems(cart)).toBe(4);
    });

    it('deve retornar 0 para carrinho vazio', () => {
      expect(CartService.countItems([])).toBe(0);
    });
  });

  // =====================================================
  // getItemQuantity
  // =====================================================
  describe('getItemQuantity', () => {
    it('deve retornar a quantidade de um produto existente', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 3 }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }), quantity: 5 }),
      ];

      expect(CartService.getItemQuantity(cart, 'p2')).toBe(5);
    });

    it('deve retornar 0 para um produto inexistente', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', quantity: 3 }),
      ];

      expect(CartService.getItemQuantity(cart, 'inexistente')).toBe(0);
    });

    it('deve retornar 0 para carrinho vazio', () => {
      expect(CartService.getItemQuantity([], 'p1')).toBe(0);
    });
  });

  // =====================================================
  // calculateFinalTotal
  // =====================================================
  describe('calculateFinalTotal', () => {
    it('deve calcular total em modo rodízio: preço base * pessoas + extras', () => {
      const total = CartService.calculateFinalTotal(15, 'rodizio', 17, 3);

      expect(total).toBe(66); // (17*3) + 15
    });

    it('deve retornar apenas extras em modo à la carte', () => {
      const total = CartService.calculateFinalTotal(45, 'carta', 17, 3);

      expect(total).toBe(45);
    });

    it('deve retornar apenas preço base em rodízio quando extras são zero', () => {
      const total = CartService.calculateFinalTotal(0, 'rodizio', 20, 2);

      expect(total).toBe(40); // (20*2) + 0
    });

    it('deve retornar apenas extras quando orderType é null', () => {
      const total = CartService.calculateFinalTotal(30, null, 17, 2);

      expect(total).toBe(30);
    });
  });

  // =====================================================
  // getRodizioPrice
  // =====================================================
  describe('getRodizioPrice', () => {
    it('deve retornar 17 para almoço', () => {
      expect(CartService.getRodizioPrice(true)).toBe(17);
    });

    it('deve retornar 20 para jantar', () => {
      expect(CartService.getRodizioPrice(false)).toBe(20);
    });
  });

  // =====================================================
  // detectDuplicates
  // =====================================================
  describe('detectDuplicates', () => {
    it('deve retornar mapa vazio quando não há duplicados', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];
      const sessionOrders = [
        { product_id: 'p2', quantity: 1, status: 'pending' },
      ];

      const result = CartService.detectDuplicates(cart, sessionOrders);

      expect(result.size).toBe(0);
    });

    it('deve detectar duplicados entre carrinho e pedidos existentes', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
      ];
      const sessionOrders = [
        { product_id: 'p1', quantity: 2, status: 'pending' },
        { product_id: 'p3', quantity: 1, status: 'pending' },
      ];

      const result = CartService.detectDuplicates(cart, sessionOrders);

      expect(result.size).toBe(1);
      expect(result.has('p1')).toBe(true);
      expect(result.get('p1')!.totalQty).toBe(2);
    });

    it('deve excluir pedidos cancelados da detecção', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];
      const sessionOrders = [
        { product_id: 'p1', quantity: 3, status: 'cancelled' },
      ];

      const result = CartService.detectDuplicates(cart, sessionOrders);

      expect(result.size).toBe(0);
    });

    it('deve excluir pedidos entregues da detecção', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];
      const sessionOrders = [
        { product_id: 'p1', quantity: 2, status: 'delivered' },
      ];

      const result = CartService.detectDuplicates(cart, sessionOrders);

      expect(result.size).toBe(0);
    });

    it('deve somar quantidades de múltiplos pedidos do mesmo produto', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];
      const sessionOrders = [
        { product_id: 'p1', quantity: 2, status: 'pending' },
        { product_id: 'p1', quantity: 3, status: 'preparing' },
      ];

      const result = CartService.detectDuplicates(cart, sessionOrders);

      expect(result.size).toBe(1);
      expect(result.get('p1')!.totalQty).toBe(5);
    });
  });

  // =====================================================
  // getDuplicateItems
  // =====================================================
  describe('getDuplicateItems', () => {
    it('deve retornar itens do carrinho que são duplicados', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
        createTestCartItem({ productId: 'p3', product: createTestProduct({ id: 'p3' }) }),
      ];
      const duplicateMap = new Map<string, DuplicateInfo>([
        ['p1', { totalQty: 2 }],
        ['p3', { totalQty: 1 }],
      ]);

      const result = CartService.getDuplicateItems(cart, duplicateMap);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p1');
      expect(result[1].productId).toBe('p3');
    });

    it('deve retornar array vazio quando não há duplicados', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
      ];
      const duplicateMap = new Map<string, DuplicateInfo>();

      const result = CartService.getDuplicateItems(cart, duplicateMap);

      expect(result).toHaveLength(0);
    });

    it('deve retornar array vazio para carrinho vazio', () => {
      const duplicateMap = new Map<string, DuplicateInfo>([
        ['p1', { totalQty: 2 }],
      ]);

      const result = CartService.getDuplicateItems([], duplicateMap);

      expect(result).toHaveLength(0);
    });
  });

  // =====================================================
  // hasUnconfirmedDuplicates
  // =====================================================
  describe('hasUnconfirmedDuplicates', () => {
    it('deve retornar false quando todos os duplicados estão confirmados', () => {
      const duplicateItems: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
      ];
      const confirmedIds = new Set(['p1', 'p2']);

      const result = CartService.hasUnconfirmedDuplicates(duplicateItems, confirmedIds);

      expect(result).toBe(false);
    });

    it('deve retornar true quando nenhum duplicado está confirmado', () => {
      const duplicateItems: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
      ];
      const confirmedIds = new Set<string>();

      const result = CartService.hasUnconfirmedDuplicates(duplicateItems, confirmedIds);

      expect(result).toBe(true);
    });

    it('deve retornar true quando apenas alguns duplicados estão confirmados', () => {
      const duplicateItems: CartItem[] = [
        createTestCartItem({ productId: 'p1' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
        createTestCartItem({ productId: 'p3', product: createTestProduct({ id: 'p3' }) }),
      ];
      const confirmedIds = new Set(['p1']);

      const result = CartService.hasUnconfirmedDuplicates(duplicateItems, confirmedIds);

      expect(result).toBe(true);
    });

    it('deve retornar false quando não há duplicados', () => {
      const duplicateItems: CartItem[] = [];
      const confirmedIds = new Set<string>();

      const result = CartService.hasUnconfirmedDuplicates(duplicateItems, confirmedIds);

      expect(result).toBe(false);
    });
  });

  // =====================================================
  // buildOrderInserts
  // =====================================================
  describe('buildOrderInserts', () => {
    it('deve construir inserções de pedido básicas', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 10 }),
          quantity: 2,
        }),
      ];

      const result = CartService.buildOrderInserts(cart, 'session-1', null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        session_id: 'session-1',
        product_id: 'p1',
        quantity: 2,
        unit_price: 10,
        notes: null,
        status: 'pending',
        session_customer_id: null,
      });
    });

    it('deve incluir notas quando existem', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 8 }),
          quantity: 1,
          notes: 'Sem gengibre',
        }),
      ];

      const result = CartService.buildOrderInserts(cart, 'session-1', null);

      expect(result[0].notes).toBe('Sem gengibre');
    });

    it('deve incluir session_customer_id quando fornecido', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 5.5 }),
          quantity: 1,
        }),
      ];

      const result = CartService.buildOrderInserts(cart, 'session-1', 'customer-42');

      expect(result[0].session_customer_id).toBe('customer-42');
    });

    it('deve construir inserções para múltiplos itens do carrinho', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 10 }),
          quantity: 2,
        }),
        createTestCartItem({
          productId: 'p2',
          product: createTestProduct({ id: 'p2', price: 7.5 }),
          quantity: 1,
          notes: 'Extra soja',
        }),
        createTestCartItem({
          productId: 'p3',
          product: createTestProduct({ id: 'p3', price: 12 }),
          quantity: 3,
        }),
      ];

      const result = CartService.buildOrderInserts(cart, 'session-5', 'customer-1');

      expect(result).toHaveLength(3);
      expect(result[0].product_id).toBe('p1');
      expect(result[0].quantity).toBe(2);
      expect(result[0].unit_price).toBe(10);
      expect(result[0].notes).toBe(null);
      expect(result[1].product_id).toBe('p2');
      expect(result[1].quantity).toBe(1);
      expect(result[1].unit_price).toBe(7.5);
      expect(result[1].notes).toBe('Extra soja');
      expect(result[2].product_id).toBe('p3');
      expect(result[2].quantity).toBe(3);
      expect(result[2].unit_price).toBe(12);
      result.forEach((insert) => {
        expect(insert.session_id).toBe('session-5');
        expect(insert.session_customer_id).toBe('customer-1');
        expect(insert.status).toBe('pending');
      });
    });
  });

  // =====================================================
  // groupByPerson
  // =====================================================
  describe('groupByPerson', () => {
    it('deve agrupar todos os itens sob uma única pessoa', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', addedBy: 'Sofia' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }), addedBy: 'Sofia' }),
      ];

      const result = CartService.groupByPerson(cart);

      expect(Object.keys(result)).toEqual(['Sofia']);
      expect(result['Sofia']).toHaveLength(2);
    });

    it('deve agrupar itens por múltiplas pessoas', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', addedBy: 'Sofia' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }), addedBy: 'João' }),
        createTestCartItem({ productId: 'p3', product: createTestProduct({ id: 'p3' }), addedBy: 'Sofia' }),
        createTestCartItem({ productId: 'p4', product: createTestProduct({ id: 'p4' }), addedBy: 'Maria' }),
      ];

      const result = CartService.groupByPerson(cart);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['Sofia']).toHaveLength(2);
      expect(result['João']).toHaveLength(1);
      expect(result['Maria']).toHaveLength(1);
    });

    it('deve usar "?" para itens sem addedBy', () => {
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', addedBy: 'Sofia' }),
        createTestCartItem({ productId: 'p2', product: createTestProduct({ id: 'p2' }) }),
        createTestCartItem({ productId: 'p3', product: createTestProduct({ id: 'p3' }), addedBy: undefined }),
      ];

      const result = CartService.groupByPerson(cart);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['Sofia']).toHaveLength(1);
      expect(result['?']).toHaveLength(2);
    });
  });

  // =====================================================
  // validateCart
  // =====================================================
  describe('validateCart', () => {
    it('deve validar um carrinho correto', () => {
      const cart: CartItem[] = [
        createTestCartItem({
          productId: 'p1',
          product: createTestProduct({ id: 'p1', price: 10 }),
          quantity: 2,
        }),
        createTestCartItem({
          productId: 'p2',
          product: createTestProduct({ id: 'p2', price: 5 }),
          quantity: 1,
        }),
      ];

      const result = CartService.validateCart(cart);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar carrinho vazio', () => {
      const result = CartService.validateCart([]);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Carrinho está vazio');
    });

    it('deve rejeitar item com quantidade zero', () => {
      const product = createTestProduct({ id: 'p1', name: 'Tempura' });
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', product, quantity: 0 }),
      ];

      const result = CartService.validateCart(cart);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Quantidade inválida');
      expect(result.error).toContain('Tempura');
    });

    it('deve rejeitar item com preço negativo', () => {
      const product = createTestProduct({ id: 'p1', name: 'Edamame', price: -3 });
      const cart: CartItem[] = [
        createTestCartItem({ productId: 'p1', product, quantity: 1 }),
      ];

      const result = CartService.validateCart(cart);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Preço inválido');
      expect(result.error).toContain('Edamame');
    });
  });
});
