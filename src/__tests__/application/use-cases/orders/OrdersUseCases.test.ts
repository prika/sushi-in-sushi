import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetKitchenOrdersUseCase } from '@/application/use-cases/orders/GetKitchenOrdersUseCase';
import { CreateOrderUseCase } from '@/application/use-cases/orders/CreateOrderUseCase';
import { GetSessionOrdersUseCase } from '@/application/use-cases/orders/GetSessionOrdersUseCase';
import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { Order, OrderWithProduct, KitchenOrder } from '@/domain/entities/Order';
import { Product } from '@/domain/entities/Product';

// Helper para criar um pedido de teste
function createTestOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    sessionId: 'session-1',
    productId: 'product-1',
    quantity: 2,
    unitPrice: 12.50,
    notes: null,
    status: 'pending',
    sessionCustomerId: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestOrderWithProduct(overrides: Partial<OrderWithProduct> = {}): OrderWithProduct {
  return {
    ...createTestOrder(overrides),
    product: {
      id: 'product-1',
      name: 'Salmão Sashimi',
      imageUrl: '/images/salmon.jpg',
    },
    ...overrides,
  };
}

function createTestKitchenOrder(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
  return {
    ...createTestOrderWithProduct(overrides),
    table: {
      id: 'table-1',
      number: 5,
      location: 'circunvalacao',
    },
    customerName: 'João',
    waiterName: 'Maria Silva',
    ...overrides,
  };
}

function createTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Salmão Sashimi',
    description: 'Sashimi de salmão fresco',
    price: 12.50,
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

// Mock do repositório de pedidos
function createMockOrderRepository(): IOrderRepository {
  return {
    findById: vi.fn(),
    findByIdWithProduct: vi.fn(),
    findAll: vi.fn(),
    findBySession: vi.fn(),
    findForKitchen: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countByStatus: vi.fn(),
  };
}

// Mock do repositório de produtos
function createMockProductRepository(): IProductRepository {
  return {
    findById: vi.fn(),
    findByIdWithCategory: vi.fn(),
    findAll: vi.fn(),
    findAllWithCategory: vi.fn(),
    findByCategory: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateAvailability: vi.fn(),
    delete: vi.fn(),
  };
}

describe('GetKitchenOrdersUseCase', () => {
  let useCase: GetKitchenOrdersUseCase;
  let mockRepository: IOrderRepository;

  beforeEach(() => {
    mockRepository = createMockOrderRepository();
    useCase = new GetKitchenOrdersUseCase(mockRepository);
  });

  it('deve retornar pedidos da cozinha agrupados por status', async () => {
    const orders = [
      createTestKitchenOrder({ id: 'order-1', status: 'pending' }),
      createTestKitchenOrder({ id: 'order-2', status: 'preparing' }),
      createTestKitchenOrder({ id: 'order-3', status: 'ready' }),
      createTestKitchenOrder({ id: 'order-4', status: 'pending' }),
    ];
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue(orders);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders).toHaveLength(4);
      expect(result.data.byStatus.pending).toHaveLength(2);
      expect(result.data.byStatus.preparing).toHaveLength(1);
      expect(result.data.byStatus.ready).toHaveLength(1);
      expect(result.data.counts.pending).toBe(2);
      expect(result.data.counts.preparing).toBe(1);
      expect(result.data.counts.ready).toBe(1);
      expect(result.data.counts.total).toBe(4);
    }
  });

  it('deve aplicar filtros de status', async () => {
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue([]);

    await useCase.execute({ statuses: ['pending', 'preparing'] });

    expect(mockRepository.findForKitchen).toHaveBeenCalledWith({
      statuses: ['pending', 'preparing'],
      location: undefined,
    });
  });

  it('deve aplicar filtro de localização', async () => {
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue([]);

    await useCase.execute({ location: 'boavista' });

    expect(mockRepository.findForKitchen).toHaveBeenCalledWith({
      statuses: ['pending', 'preparing', 'ready'],
      location: 'boavista',
    });
  });

  it('deve calcular tempo decorrido', async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
    const orders = [
      createTestKitchenOrder({ id: 'order-1', createdAt: thirtyMinutesAgo }),
    ];
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue(orders);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders[0].timeElapsedMinutes).toBeGreaterThanOrEqual(29);
    }
  });

  it('deve identificar pedidos atrasados', async () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000);
    const orders = [
      createTestKitchenOrder({ id: 'order-1', status: 'pending', createdAt: fifteenMinutesAgo }),
    ];
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue(orders);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders[0].isLate).toBe(true);
    }
  });

  it('deve ordenar por urgência (mais antigos primeiro)', async () => {
    const orders = [
      createTestKitchenOrder({ id: 'order-2', createdAt: new Date('2024-01-01T12:10:00Z') }),
      createTestKitchenOrder({ id: 'order-1', createdAt: new Date('2024-01-01T12:00:00Z') }),
      createTestKitchenOrder({ id: 'order-3', createdAt: new Date('2024-01-01T12:05:00Z') }),
    ];
    vi.mocked(mockRepository.findForKitchen).mockResolvedValue(orders);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders[0].id).toBe('order-1');
      expect(result.data.orders[1].id).toBe('order-3');
      expect(result.data.orders[2].id).toBe('order-2');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findForKitchen).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepository: IOrderRepository;
  let mockProductRepository: IProductRepository;

  beforeEach(() => {
    mockOrderRepository = createMockOrderRepository();
    mockProductRepository = createMockProductRepository();
    useCase = new CreateOrderUseCase(mockOrderRepository, mockProductRepository);
  });

  it('deve criar pedido com dados válidos', async () => {
    const product = createTestProduct({ price: 15.00 });
    const createdOrder = createTestOrder({ productId: 'product-1', unitPrice: 15.00 });

    vi.mocked(mockProductRepository.findById).mockResolvedValue(product);
    vi.mocked(mockOrderRepository.create).mockResolvedValue(createdOrder);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitPrice).toBe(15.00);
    }
    expect(mockOrderRepository.create).toHaveBeenCalledWith({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 2,
      unitPrice: 15.00,
      notes: null,
      sessionCustomerId: null,
    });
  });

  it('deve criar pedido com notas', async () => {
    const product = createTestProduct();
    const createdOrder = createTestOrder({ notes: 'Sem wasabi' });

    vi.mocked(mockProductRepository.findById).mockResolvedValue(product);
    vi.mocked(mockOrderRepository.create).mockResolvedValue(createdOrder);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 1,
      notes: 'Sem wasabi',
    });

    expect(result.success).toBe(true);
    expect(mockOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Sem wasabi' })
    );
  });

  it('deve criar pedido com cliente de sessão', async () => {
    const product = createTestProduct();
    const createdOrder = createTestOrder({ sessionCustomerId: 'customer-1' });

    vi.mocked(mockProductRepository.findById).mockResolvedValue(product);
    vi.mocked(mockOrderRepository.create).mockResolvedValue(createdOrder);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 1,
      sessionCustomerId: 'customer-1',
    });

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se produto não existe', async () => {
    vi.mocked(mockProductRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'non-existent',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
    expect(mockOrderRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se produto não está disponível', async () => {
    const unavailableProduct = createTestProduct({ isAvailable: false });
    vi.mocked(mockProductRepository.findById).mockResolvedValue(unavailableProduct);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('disponível');
    }
    expect(mockOrderRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se quantidade inválida', async () => {
    const product = createTestProduct();
    vi.mocked(mockProductRepository.findById).mockResolvedValue(product);

    const result = await useCase.execute({
      sessionId: 'session-1',
      productId: 'product-1',
      quantity: 0,
    });

    expect(result.success).toBe(false);
    expect(mockOrderRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar múltiplos pedidos', async () => {
    const product1 = createTestProduct({ id: 'product-1', price: 10 });
    const product2 = createTestProduct({ id: 'product-2', price: 15 });
    const order1 = createTestOrder({ id: 'order-1', productId: 'product-1' });
    const order2 = createTestOrder({ id: 'order-2', productId: 'product-2' });

    vi.mocked(mockProductRepository.findById)
      .mockResolvedValueOnce(product1)
      .mockResolvedValueOnce(product2);
    vi.mocked(mockOrderRepository.create)
      .mockResolvedValueOnce(order1)
      .mockResolvedValueOnce(order2);

    const result = await useCase.executeMultiple([
      { sessionId: 'session-1', productId: 'product-1', quantity: 1 },
      { sessionId: 'session-1', productId: 'product-2', quantity: 2 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('deve continuar mesmo com erro parcial em múltiplos pedidos', async () => {
    const product = createTestProduct();
    const order = createTestOrder();

    vi.mocked(mockProductRepository.findById)
      .mockResolvedValueOnce(null) // primeiro falha
      .mockResolvedValueOnce(product); // segundo sucesso
    vi.mocked(mockOrderRepository.create).mockResolvedValue(order);

    const result = await useCase.executeMultiple([
      { sessionId: 'session-1', productId: 'non-existent', quantity: 1 },
      { sessionId: 'session-1', productId: 'product-1', quantity: 1 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });
});

describe('GetSessionOrdersUseCase', () => {
  let useCase: GetSessionOrdersUseCase;
  let mockRepository: IOrderRepository;

  beforeEach(() => {
    mockRepository = createMockOrderRepository();
    useCase = new GetSessionOrdersUseCase(mockRepository);
  });

  it('deve retornar pedidos da sessão', async () => {
    const orders = [
      createTestOrderWithProduct({ id: 'order-1', status: 'delivered', quantity: 2, unitPrice: 10 }),
      createTestOrderWithProduct({ id: 'order-2', status: 'pending', quantity: 1, unitPrice: 15 }),
      createTestOrderWithProduct({ id: 'order-3', status: 'preparing', quantity: 3, unitPrice: 12 }),
    ];
    vi.mocked(mockRepository.findBySession).mockResolvedValue(orders);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders).toHaveLength(3);
      expect(result.data.counts.delivered).toBe(1);
      expect(result.data.counts.pending).toBe(1);
      expect(result.data.counts.preparing).toBe(1);
      expect(result.data.counts.total).toBe(3);
      expect(result.data.counts.active).toBe(2); // pending + preparing
    }
  });

  it('deve retornar erro se ID da sessão não fornecido', async () => {
    const result = await useCase.execute({ sessionId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve calcular subtotal de cada pedido', async () => {
    const orders = [
      createTestOrderWithProduct({ id: 'order-1', quantity: 3, unitPrice: 10 }),
    ];
    vi.mocked(mockRepository.findBySession).mockResolvedValue(orders);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders[0].subtotal).toBe(30); // 3 * 10
    }
  });

  it('deve calcular totais excluindo cancelados', async () => {
    const orders = [
      createTestOrderWithProduct({ id: 'order-1', status: 'delivered', quantity: 2, unitPrice: 10 }),
      createTestOrderWithProduct({ id: 'order-2', status: 'cancelled', quantity: 5, unitPrice: 20 }),
      createTestOrderWithProduct({ id: 'order-3', status: 'pending', quantity: 1, unitPrice: 15 }),
    ];
    vi.mocked(mockRepository.findBySession).mockResolvedValue(orders);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      // Subtotal: (2*10) + (1*15) = 35 (exclui cancelado)
      expect(result.data.totals.subtotal).toBe(35);
      // Item count: 2 + 1 = 3 (exclui cancelado)
      expect(result.data.totals.itemCount).toBe(3);
    }
  });

  it('deve ordenar por data (mais recentes primeiro)', async () => {
    const orders = [
      createTestOrderWithProduct({ id: 'order-1', createdAt: new Date('2024-01-01T12:00:00Z') }),
      createTestOrderWithProduct({ id: 'order-3', createdAt: new Date('2024-01-01T12:10:00Z') }),
      createTestOrderWithProduct({ id: 'order-2', createdAt: new Date('2024-01-01T12:05:00Z') }),
    ];
    vi.mocked(mockRepository.findBySession).mockResolvedValue(orders);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders[0].id).toBe('order-3'); // mais recente
      expect(result.data.orders[1].id).toBe('order-2');
      expect(result.data.orders[2].id).toBe('order-1'); // mais antigo
    }
  });

  it('deve retornar lista vazia para sessão sem pedidos', async () => {
    vi.mocked(mockRepository.findBySession).mockResolvedValue([]);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orders).toHaveLength(0);
      expect(result.data.counts.total).toBe(0);
      expect(result.data.totals.subtotal).toBe(0);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findBySession).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(false);
  });
});
