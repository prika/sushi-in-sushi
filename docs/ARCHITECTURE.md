# Clean Architecture - Sushi in Sushi

Documentação completa da arquitetura do projeto, seguindo os princípios da Clean Architecture.

## 🏗️ Visão Geral

O projeto **Sushi in Sushi** implementa **Clean Architecture** com separação rigorosa de responsabilidades em 4 camadas independentes.

```
┌─────────────────────────────────────────┐
│   Presentation Layer                    │  ← UI Components, Hooks, Pages
│   (React, Next.js)                      │
├─────────────────────────────────────────┤
│   Application Layer                     │  ← Use Cases, Orchestration
│   (Business Logic)                      │
├─────────────────────────────────────────┤
│   Domain Layer                          │  ← Core Business Rules
│   (Entities, Interfaces)                │
├─────────────────────────────────────────┤
│   Infrastructure Layer                  │  ← External Services, Database
│   (Supabase, APIs)                      │
└─────────────────────────────────────────┘
```

### Princípios Fundamentais

1. **Dependency Rule**: Dependências apontam sempre para dentro (para o Domain)
2. **Independence**: Domain não depende de nada (camada pura)
3. **Testability**: Use Cases e Domain são 100% testáveis
4. **Flexibility**: Fácil trocar Infrastructure (ex: Supabase → Prisma)

---

## 📦 Camada 1: Domain Layer

**Localização:** `/src/domain/`

A camada mais interna, contém as regras de negócio puras sem dependências externas.

### Entities (`/domain/entities/`)

Representam conceitos do negócio com suas propriedades e invariantes.

```typescript
// src/domain/entities/Order.ts
export interface Order {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';
```

**11 Entidades Principais:**
- Order, Session, Table, Product, Category
- Staff, Reservation, RestaurantClosure
- WaiterCall, Customer, StaffTimeOff, ReservationSettings

### Repository Interfaces (`/domain/repositories/`)

Definem contratos para acesso a dados, sem implementação.

```typescript
// src/domain/repositories/IOrderRepository.ts
export interface IOrderRepository {
  findAll(filter?: OrderFilter): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  create(data: CreateOrderData): Promise<Order>;
  update(id: string, data: UpdateOrderData): Promise<Order>;
  delete(id: string): Promise<void>;
}
```

**12 Repository Interfaces:**
- IOrderRepository, ISessionRepository
- ITableRepository, IProductRepository
- ICategoryRepository, IStaffRepository
- IReservationRepository, IRestaurantClosureRepository
- IWaiterCallRepository, ICustomerRepository
- IStaffTimeOffRepository, IReservationSettingsRepository

### Domain Services (`/domain/services/`)

Encapsulam lógica de negócio que não pertence a uma única entidade.

```typescript
// src/domain/services/OrderService.ts
export class OrderService {
  /**
   * Calcula urgência do pedido baseado em tempo de espera
   */
  static calculateUrgency(order: Order): 'low' | 'medium' | 'high' {
    const minutesWaiting = differenceInMinutes(new Date(), order.createdAt);

    if (minutesWaiting > 30) return 'high';
    if (minutesWaiting > 15) return 'medium';
    return 'low';
  }
}
```

**3 Domain Services:**
- OrderService (44 tests) - Cálculo de urgência, validações
- SessionService (34 tests) - Regras de transição de estados
- TableService (40 tests) - Validação de disponibilidade

---

## 🎯 Camada 2: Application Layer

**Localização:** `/src/application/`

Orquestra a lógica de negócio usando entidades e repositórios do Domain.

### Use Cases (`/application/use-cases/`)

Cada use case representa uma ação específica do sistema.

```typescript
// src/application/use-cases/orders/GetKitchenOrdersUseCase.ts
export class GetKitchenOrdersUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(filter?: OrderFilter): Promise<Result<KitchenOrderDTO[]>> {
    try {
      const orders = await this.orderRepository.findAll(filter);

      // Transform to DTO with additional calculated fields
      const dtos = orders.map(order => ({
        ...order,
        urgency: OrderService.calculateUrgency(order),
        estimatedTime: this.calculateEstimatedTime(order),
      }));

      return Results.success(dtos);
    } catch (error) {
      return Results.error('Erro ao obter pedidos da cozinha');
    }
  }
}
```

**50+ Use Cases Organizados por Feature:**

#### Orders
- GetKitchenOrdersUseCase, GetSessionOrdersUseCase
- CreateOrderUseCase, UpdateOrderStatusUseCase

#### Sessions
- StartSessionUseCase, CloseSessionUseCase
- RequestBillUseCase, GetActiveSessionsUseCase

#### Tables
- GetAllTablesUseCase, UpdateTableStatusUseCase
- GetWaiterTablesUseCase

#### Staff
- GetAllStaffUseCase, CreateStaffUseCase
- UpdateStaffUseCase, DeleteStaffUseCase
- GetAllRolesUseCase

#### Reservations (9 use cases)
- GetAllReservationsUseCase, CreateReservationUseCase
- ConfirmReservationUseCase, CancelReservationUseCase
- MarkReservationSeatedUseCase, MarkReservationNoShowUseCase

#### Closures
- GetAllClosuresUseCase, CreateClosureUseCase
- DeleteClosureUseCase, CheckClosureUseCase

#### WaiterCalls
- GetAllWaiterCallsUseCase, CreateWaiterCallUseCase
- AcknowledgeWaiterCallUseCase, CompleteWaiterCallUseCase

#### Customers
- GetAllCustomersUseCase, CreateCustomerUseCase
- AddCustomerPointsUseCase, RecordCustomerVisitUseCase

### Result Pattern

Tratamento de erros tipado e explícito.

```typescript
// src/application/use-cases/Result.ts
export type Result<T> = SuccessResult<T> | ErrorResult;

interface SuccessResult<T> {
  success: true;
  data: T;
}

interface ErrorResult {
  success: false;
  error: string;
  code?: string;
}

// Uso:
const result = await useCase.execute(input);

if (result.success) {
  console.log(result.data); // Type-safe access
} else {
  console.error(result.error, result.code);
}
```

### DTOs (`/application/dto/`)

Data Transfer Objects para comunicação entre camadas.

```typescript
// src/application/dto/KitchenOrderDTO.ts
export interface KitchenOrderDTO extends Order {
  product: Product;
  urgency: 'low' | 'medium' | 'high';
  estimatedTime: number;
  tableNumber: number;
}
```

---

## 🔌 Camada 3: Infrastructure Layer

**Localização:** `/src/infrastructure/`

Implementa as interfaces definidas no Domain, conectando com serviços externos.

### Repository Implementations (`/infrastructure/repositories/`)

Implementações concretas dos repositórios usando Supabase.

```typescript
// src/infrastructure/repositories/SupabaseOrderRepository.ts
export class SupabaseOrderRepository implements IOrderRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(filter?: OrderFilter): Promise<Order[]> {
    let query = this.supabase
      .from('orders')
      .select(`
        *,
        product:products(*),
        session:sessions(
          table:tables(number, location)
        )
      `)
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(this.mapToEntity);
  }

  private mapToEntity(row: any): Order {
    return {
      id: row.id,
      sessionId: row.session_id,
      productId: row.product_id,
      quantity: row.quantity,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
```

**12 Repository Implementations:**
- Mapeamento snake_case (DB) ↔ camelCase (Domain)
- Tratamento de erros Supabase
- Conversão de tipos (Date, enums)
- Queries otimizadas com joins

### Real-time Handlers (`/infrastructure/realtime/`)

Handlers para subscrições real-time do Supabase.

```typescript
// src/infrastructure/realtime/OrderRealtimeHandler.ts
export class OrderRealtimeHandler {
  constructor(
    private supabase: SupabaseClient,
    private onNewOrder: (order: Order) => void,
    private onOrderUpdate: (order: Order) => void,
  ) {}

  subscribe(): RealtimeChannel {
    return this.supabase
      .channel('orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        this.onNewOrder(this.mapToEntity(payload.new));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        this.onOrderUpdate(this.mapToEntity(payload.new));
      })
      .subscribe();
  }
}
```

---

## ⚛️ Camada 4: Presentation Layer

**Localização:** `/src/presentation/`

Camada de interface do usuário usando React e Next.js.

### Dependency Injection (`/presentation/contexts/DependencyContext.tsx`)

Fornece todas as dependências para os componentes React.

```typescript
// src/presentation/contexts/DependencyContext.tsx
export interface Dependencies {
  // Repositórios
  orderRepository: IOrderRepository;
  sessionRepository: ISessionRepository;
  // ... outros repositórios

  // Use Cases
  getKitchenOrders: GetKitchenOrdersUseCase;
  updateOrderStatus: UpdateOrderStatusUseCase;
  // ... outros use cases

  // Services
  activityLogger: IActivityLogger;
}

export function DependencyProvider({ children }: Props) {
  const dependencies = useMemo(() => {
    // Criar repositórios
    const orderRepo = new SupabaseOrderRepository(supabase);
    const sessionRepo = new SupabaseSessionRepository(supabase);

    // Criar use cases
    const getKitchenOrders = new GetKitchenOrdersUseCase(orderRepo);
    const updateOrderStatus = new UpdateOrderStatusUseCase(orderRepo);

    return {
      orderRepository: orderRepo,
      sessionRepository: sessionRepo,
      getKitchenOrders,
      updateOrderStatus,
      // ... outros
    };
  }, []);

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
}
```

### Custom Hooks (`/presentation/hooks/`)

Abstraem lógica de UI e integram com use cases.

```typescript
// src/presentation/hooks/useKitchenOrders.ts
export function useKitchenOrders(filter?: OrderFilter) {
  const { getKitchenOrders, updateOrderStatus } = useDependencies();

  const [orders, setOrders] = useState<KitchenOrderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const result = await getKitchenOrders.execute(filter);

    if (result.success) {
      setOrders(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [getKitchenOrders, filter]);

  const advanceOrder = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const nextStatus = getNextStatus(order.status);
    const result = await updateOrderStatus.execute(orderId, nextStatus);

    if (result.success) {
      await fetchOrders();
    }
  }, [orders, updateOrderStatus, fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    byStatus: groupByStatus(orders),
    counts: countByStatus(orders),
    isLoading,
    error,
    advanceOrder,
    refresh: fetchOrders,
  };
}
```

**Hooks Principais:**
- useKitchenOrders, useSessionOrders
- useProducts, useCategories
- useSessionManagement, useTableManagement
- useReservations, useClosures
- useWaiterCalls, useCustomers
- useStaffTimeOff, useActivityLog

---

## 🔄 Fluxo de Dados Completo

### Exemplo: Atualizar Status de Pedido

```
┌─────────────────────┐
│ 1. User clicks      │
│    "Mark Ready"     │
└──────────┬──────────┘
           │
┌──────────▼──────────────────┐
│ 2. Component calls          │
│    advanceOrder(orderId)    │
└──────────┬──────────────────┘
           │
┌──────────▼────────────────────────┐
│ 3. Hook calls                     │
│    updateOrderStatus.execute()    │
└──────────┬────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│ 4. Use Case validates & calls repo │
│    orderRepository.update()         │
└──────────┬──────────────────────────┘
           │
┌──────────▼─────────────────────┐
│ 5. Repository updates Supabase │
│    UPDATE orders SET status    │
└──────────┬─────────────────────┘
           │
┌──────────▼──────────────────┐
│ 6. Real-time subscription   │
│    notifies all listeners   │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────┐
│ 7. Hook updates state   │
│    UI re-renders        │
└─────────────────────────┘
```

---

## ✅ Benefícios da Arquitetura

### 1. Testabilidade
- ✅ Use Cases testáveis sem UI
- ✅ Domain Services 100% testados
- ✅ Mocking fácil de repositórios

### 2. Manutenibilidade
- ✅ Código organizado por feature
- ✅ Responsabilidades claras
- ✅ Fácil encontrar e modificar

### 3. Escalabilidade
- ✅ Adicionar features sem afetar existentes
- ✅ Múltiplas implementações (ex: cache layer)
- ✅ Paralelização de desenvolvimento

### 4. Flexibility
- ✅ Trocar Supabase por outro DB
- ✅ Trocar React por outro framework
- ✅ Reutilizar use cases em apps diferentes

---

## 📊 Estatísticas do Projeto

**Camadas Implementadas:**
- ✅ **Domain:** 11 entidades + 12 interfaces + 3 services
- ✅ **Application:** 50+ use cases testados
- ✅ **Infrastructure:** 12 repositórios Supabase
- ✅ **Presentation:** 15+ hooks customizados

**Testes:**
- ✅ **537 testes passando**
- ✅ Use Cases: 100% testados
- ✅ Domain Services: 100% testados
- ✅ Infrastructure: Padrão estabelecido
- ✅ Hooks: Padrão estabelecido

---

## 🚀 Como Adicionar Nova Funcionalidade

### Passo 1: Domain Layer

```typescript
// 1. Criar entidade
// src/domain/entities/NewFeature.ts
export interface NewFeature {
  id: string;
  name: string;
  createdAt: Date;
}

// 2. Criar repository interface
// src/domain/repositories/INewFeatureRepository.ts
export interface INewFeatureRepository {
  findAll(): Promise<NewFeature[]>;
  create(data: CreateData): Promise<NewFeature>;
}
```

### Passo 2: Application Layer

```typescript
// 3. Criar use case
// src/application/use-cases/new-feature/GetAllNewFeaturesUseCase.ts
export class GetAllNewFeaturesUseCase {
  constructor(private repository: INewFeatureRepository) {}

  async execute(): Promise<Result<NewFeature[]>> {
    try {
      const features = await this.repository.findAll();
      return Results.success(features);
    } catch (error) {
      return Results.error('Erro ao obter features');
    }
  }
}

// 4. Escrever testes
// src/__tests__/application/use-cases/new-feature/NewFeatureUseCases.test.ts
```

### Passo 3: Infrastructure Layer

```typescript
// 5. Implementar repository
// src/infrastructure/repositories/SupabaseNewFeatureRepository.ts
export class SupabaseNewFeatureRepository implements INewFeatureRepository {
  async findAll(): Promise<NewFeature[]> {
    const { data } = await this.supabase.from('new_features').select('*');
    return data.map(this.mapToEntity);
  }
}
```

### Passo 4: Presentation Layer

```typescript
// 6. Criar hook
// src/presentation/hooks/useNewFeatures.ts
export function useNewFeatures() {
  const { getAllNewFeatures } = useDependencies();

  // State e lógica do hook

  return { features, isLoading, error };
}

// 7. Usar no componente
function MyComponent() {
  const { features } = useNewFeatures();
  return <div>{features.map(...)}</div>;
}
```

---

## 📚 Referências

- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)

---

**Última atualização:** 2026-02-07
**Arquitetura:** Clean Architecture 100% implementada
**Status:** ✅ Produção-ready
