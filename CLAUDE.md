# CLAUDE.md - Sushi in Sushi

Este ficheiro contém contexto e convenções do projeto para o Claude Code.

## Sobre o Projeto

**Sushi in Sushi** é um sistema completo de gestão de restaurante para uma cadeia de sushi portuguesa. Inclui:
- Sistema de pedidos via QR code nas mesas
- Gestão de pedidos em tempo real para a cozinha
- Sistema de reservas online
- Dashboard administrativo com analytics
- Interface para empregados de mesa
- Suporte multi-localização (Circunvalação e Boavista)

## 🎉 Estado Atual do Projeto (2026-02-08)

### ✅ Clean Architecture - 100% Implementada

**O projeto implementou com sucesso a Clean Architecture completa:**
- ✅ **12 entidades** de domínio completas (incluindo Restaurant)
- ✅ **13 repositórios** (interfaces + implementações Supabase)
- ✅ **55+ use cases** totalmente testados
- ✅ **3 domain services** com lógica de negócio isolada
- ✅ **Dependency Injection** via DependencyContext
- ✅ **Result Pattern** para tratamento de erros tipado

### 📊 Cobertura de Testes - Exemplar

**598 testes passando** (+61 novos testes desde última revisão):
- ✅ **Use Cases:** 100% testados (55+ use cases)
- ✅ **Domain Services:** 100% testados (118 tests)
  - OrderService (44 tests)
  - SessionService (34 tests)
  - TableService (40 tests)
- ✅ **Infrastructure:** Padrão estabelecido (61 tests)
  - SupabaseRestaurantClosureRepository
  - SupabaseStaffTimeOffRepository
  - SupabaseReservationSettingsRepository
  - SupabaseRestaurantRepository (25 tests)
- ✅ **React Hooks:** Padrão estabelecido (44 tests)
  - useActivityLog
  - useProducts
  - useStaffTimeOff
  - useRestaurants
  - useLocations

### 📚 Documentação Técnica

- ✅ **CLAUDE.md** - Convenções e arquitetura completa
- ✅ **ANALISE_PROJETO.md** - Análise detalhada do projeto
- ✅ **REACT_HOOK_TESTING_GUIDE.md** - Guia de testes de hooks

### 🚀 Features Recentes

**Restaurant Management** (Gestão Dinâmica de Restaurantes):
- Sistema completo de CRUD para restaurantes
- Substituiu hardcoded locations (circunvalacao, boavista) por sistema dinâmico
- 5 use cases com validações (GetAll, GetActive, Create, Update, Delete)
- Repository com mapeamento snake_case ↔ camelCase
- 2 hooks: useRestaurants (gestão) e useLocations (dropdowns)
- 61 testes (31 use cases + 25 repository + 5 hooks)
- Criação automática de mesas baseada em capacidade/pessoas_por_mesa
- Tab "Gestão de Restaurantes" em /admin/definicoes
- Campos: name, slug, address, coordinates, max_capacity, default_people_per_table
- Flags futuras: auto_table_assignment, auto_reservations
- Todos os dropdowns de localização agora são dinâmicos

**StaffTimeOff** (Gestão de Férias/Folgas):
- Domain layer completo
- 5 use cases com validações
- API routes refatorados
- 46 testes (use cases + infrastructure + hooks)

**ReservationSettings** (Configurações):
- Singleton pattern no domain
- Validações de horas e fees
- Settings padrão quando não encontrado
- 7 testes de infrastructure

### 📈 Próximos Passos Recomendados

1. **Performance Optimization** - React Query + cache + paginação
2. **Security** - Implementar bcrypt para passwords
3. **E2E Tests** - Playwright para fluxos críticos

## Stack Tecnológica

- **Framework:** Next.js 14.2 com App Router
- **Linguagem:** TypeScript 5.4
- **Styling:** Tailwind CSS 3.4 (tema gold/dark personalizado)
- **Base de Dados:** Supabase (PostgreSQL) com subscriptions em tempo real
- **Autenticação:** JWT com cookies httpOnly
- **Email:** Resend API com tracking de eventos
- **i18n:** next-intl (PT, EN, FR, DE, IT, ES)
- **Animações:** Framer Motion 11
- **Icons:** Lucide React

## Estrutura de Pastas

O projeto segue uma **arquitetura SOLID em camadas** (Clean Architecture):

```
src/
├── domain/                  # Camada de Domínio (PURA - sem dependências externas)
│   ├── entities/            # Entidades de negócio (Order, Product, Session, Table)
│   ├── repositories/        # Interfaces de repositório (contratos)
│   ├── services/            # Serviços de domínio (regras de negócio)
│   └── value-objects/       # Enums e tipos do domínio (OrderStatus, Location)
│
├── application/             # Camada de Aplicação (orquestração)
│   ├── use-cases/           # Casos de uso (GetKitchenOrdersUseCase, etc.)
│   ├── dto/                 # Data Transfer Objects
│   └── ports/               # Interfaces para serviços externos
│
├── infrastructure/          # Camada de Infraestrutura (implementações)
│   ├── repositories/        # Implementações Supabase dos repositórios
│   ├── realtime/            # Handlers de real-time
│   └── services/            # Implementações de serviços (ApiActivityLogger)
│
├── presentation/            # Camada de Apresentação (React)
│   ├── contexts/            # DependencyContext (injeção de dependências)
│   ├── hooks/               # Hooks refatorados (useKitchenOrders, useProducts)
│   └── providers/           # Providers para o layout
│
├── app/                     # Next.js App Router
│   ├── [locale]/            # Páginas públicas com i18n
│   ├── admin/               # Dashboard administrativo
│   ├── cozinha/             # Display da cozinha
│   ├── waiter/              # Interface dos empregados
│   ├── mesa/[numero]/       # Pedidos via QR code
│   └── api/                 # API Routes
│
├── components/              # Componentes React (legado - migrar gradualmente)
├── hooks/                   # Hooks legados (usar presentation/hooks para novos)
├── lib/                     # Utilitários e clientes
├── types/                   # TypeScript types (legado)
├── contexts/                # React Context (legado)
└── messages/                # Traduções i18n
```

### Fluxo de Dependências (SOLID)

```
Presentation (React) → Application (Use Cases) → Domain (Entidades + Interfaces)
                                                        ↑
                                               Infrastructure (Supabase)
```

**Regra:** Dependências apontam sempre para o Domain. UI nunca importa Supabase diretamente.

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Supabase local
npx supabase start
npx supabase db reset
```

## Base de Dados

### Tabelas Principais
- `restaurants` - **NOVO** Localizações e configurações de restaurantes (substituiu hardcoded locations)
- `staff` - Funcionários e credenciais
- `roles` - Definições de roles (admin, kitchen, waiter, customer)
- `tables` - Mesas do restaurante (criadas automaticamente baseado em restaurant.max_capacity)
- `categories` - Categorias de produtos
- `products` - Items do menu
- `sessions` - Sessões de mesa (refeições)
- `orders` - Pedidos individuais
- `reservations` - Reservas
- `customers` - Programa de fidelização
- `waiter_tables` - Atribuições empregado-mesa
- `waiter_calls` - Chamadas de assistência
- `restaurant_closures` - Dias de fecho do restaurante
- `staff_time_off` - Férias e folgas dos funcionários

### Enums Importantes
- **SessionStatus:** active, pending_payment, paid, closed
- **OrderStatus:** pending, preparing, ready, delivered, cancelled
- **TableStatus:** available, reserved, occupied, inactive
- **ReservationStatus:** pending, confirmed, cancelled, completed, no_show
- **Location:** circunvalacao, boavista

## Autenticação e Roles

### Roles do Sistema
- `admin` - Acesso total
- `kitchen` - Display da cozinha
- `waiter` - Mesas atribuídas e gestão de sessões
- `customer` - Área pública

### Rotas Protegidas
- `/admin/*` - Requer role admin
- `/cozinha` - Requer role admin ou kitchen
- `/waiter/*` - Requer role admin ou waiter

## Convenções de Código

### Naming
- Componentes: PascalCase (`ProductCard.tsx`)
- Hooks: camelCase com prefixo `use` (`useCart.ts`)
- Utilitários: camelCase (`token.ts`)
- Tipos: PascalCase (`SessionStatus`)
- Entidades: PascalCase (`Order.ts`)
- Repositórios: Interface com prefixo `I` (`IOrderRepository.ts`)
- Use Cases: PascalCase com sufixo `UseCase` (`GetKitchenOrdersUseCase.ts`)

### Imports
- Usar path alias `@/` para imports relativos
- Domain: `import { Order } from '@/domain/entities'`
- Application: `import { GetKitchenOrdersUseCase } from '@/application/use-cases'`
- Infrastructure: `import { SupabaseOrderRepository } from '@/infrastructure/repositories'`
- Presentation: `import { useKitchenOrders } from '@/presentation/hooks'`

### Clean Architecture (SOLID)

O projeto segue **Clean Architecture** com separação rigorosa de responsabilidades em 4 camadas:

```
┌─────────────────────────────────────────┐
│   Presentation Layer (React/Next.js)   │  ← UI Components, Hooks, Pages
├─────────────────────────────────────────┤
│   Application Layer (Use Cases)        │  ← Business Logic Orchestration
├─────────────────────────────────────────┤
│   Domain Layer (Entities + Interfaces) │  ← Core Business Rules
├─────────────────────────────────────────┤
│   Infrastructure Layer (Supabase)      │  ← External Services, DB Access
└─────────────────────────────────────────┘
```

**Princípios Fundamentais:**
- ✅ Dependências apontam sempre para dentro (para o Domain)
- ✅ Domain não depende de nada (camada pura)
- ✅ Use Cases orquestram a lógica de negócio
- ✅ Repositories abstraem acesso a dados
- ✅ Dependency Injection via Context
- ✅ Result pattern para tratamento de erros

---

## Camadas da Arquitetura

### 1. Domain Layer (`/src/domain`)

**Entidades** (`/domain/entities/`):
- `Restaurant` - **NOVO** Localizações de restaurantes (name, slug, address, coordinates, capacity, automation flags)
- `Order` - Pedidos individuais
- `Session` - Sessões de mesa
- `Table` - Mesas do restaurante
- `Product` - Produtos do menu
- `Category` - Categorias de produtos
- `Staff` - Funcionários e suas informações
- `Reservation` - Reservas de mesas
- `RestaurantClosure` - Dias de fecho
- `WaiterCall` - Chamadas de empregados
- `Customer` - Clientes do programa de fidelização
- `StaffTimeOff` - Ausências e férias de funcionários
- `ReservationSettings` - Configurações de reservas

**Repository Interfaces** (`/domain/repositories/`):
- `IRestaurantRepository` - **NOVO** CRUD de restaurantes + validação de slug único
- `IOrderRepository` - CRUD e queries de pedidos
- `ISessionRepository` - Gestão de sessões
- `ITableRepository` - Gestão de mesas
- `IProductRepository` - Catálogo de produtos
- `ICategoryRepository` - Categorias
- `IStaffRepository` - Funcionários
- `IReservationRepository` - Reservas
- `IRestaurantClosureRepository` - Dias de fecho
- `IWaiterCallRepository` - Chamadas de empregados
- `ICustomerRepository` - Clientes
- `IStaffTimeOffRepository` - Ausências de funcionários
- `IReservationSettingsRepository` - Configurações

**Value Objects** (`/domain/value-objects/`):
- `OrderStatus`, `SessionStatus`, `TableStatus`, `ReservationStatus`
- `Location` (circunvalacao | boavista)

**Domain Services** (`/domain/services/`):
- `OrderService` - Cálculo de urgência, validação de status
- `SessionService` - Regras de transição de estados
- `TableService` - Validação de disponibilidade

---

### 2. Application Layer (`/src/application`)

**Use Cases** organizados por feature:

**Orders** (`/application/use-cases/orders/`):
- `GetKitchenOrdersUseCase` - Lista pedidos para cozinha
- `GetSessionOrdersUseCase` - Pedidos de uma sessão
- `CreateOrderUseCase` - Criar novo pedido
- `UpdateOrderStatusUseCase` - Atualizar status

**Sessions** (`/application/use-cases/sessions/`):
- `StartSessionUseCase` - Iniciar sessão de mesa
- `CloseSessionUseCase` - Fechar sessão
- `RequestBillUseCase` - Solicitar conta
- `GetActiveSessionsUseCase` - Listar sessões ativas

**Tables** (`/application/use-cases/tables/`):
- `GetAllTablesUseCase` - Listar mesas
- `GetTableByIdUseCase` - Obter mesa por ID
- `UpdateTableStatusUseCase` - Atualizar status
- `GetWaiterTablesUseCase` - Mesas atribuídas a empregado

**Staff** (`/application/use-cases/staff/`):
- `GetAllStaffUseCase`, `GetStaffByIdUseCase`
- `CreateStaffUseCase`, `UpdateStaffUseCase`, `DeleteStaffUseCase`
- `GetAllRolesUseCase`

**Reservations** (`/application/use-cases/reservations/`):
- `GetAllReservationsUseCase`, `GetReservationByIdUseCase`
- `CreateReservationUseCase`, `UpdateReservationUseCase`, `DeleteReservationUseCase`
- `ConfirmReservationUseCase`, `CancelReservationUseCase`
- `MarkReservationSeatedUseCase`, `MarkReservationNoShowUseCase`, `MarkReservationCompletedUseCase`

**Closures** (`/application/use-cases/closures/`):
- `GetAllClosuresUseCase`, `CreateClosureUseCase`, `DeleteClosureUseCase`

**Customers** (`/application/use-cases/customers/`):
- `GetAllCustomersUseCase`, `GetCustomerByIdUseCase`
- `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`
- `AddCustomerPointsUseCase`, `RecordCustomerVisitUseCase`

**Waiter Calls** (`/application/use-cases/waiter-calls/`):
- `GetWaiterCallsUseCase`, `CreateWaiterCallUseCase`
- `ResolveWaiterCallUseCase`, `DeleteWaiterCallUseCase`

**Staff Time Off** (`/application/use-cases/staff-time-off/`):
- `GetAllStaffTimeOffUseCase`, `GetStaffTimeOffByIdUseCase`
- `CreateStaffTimeOffUseCase`, `UpdateStaffTimeOffUseCase`, `DeleteStaffTimeOffUseCase`

**Reservation Settings** (`/application/use-cases/reservation-settings/`):
- `GetReservationSettingsUseCase`, `UpdateReservationSettingsUseCase`

**DTOs** (`/application/dto/`):
- `OrderDTO`, `KitchenOrderDTO`, `SessionOrderDTO`
- `OrderCountsDTO`, `SessionTotalsDTO`

**Result Pattern** (`/application/use-cases/Result.ts`):
```typescript
type Result<T> = SuccessResult<T> | ErrorResult;

// Uso:
const result = await useCase.execute(input);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error, result.code);
}
```

---

### 3. Infrastructure Layer (`/src/infrastructure`)

**Repositories** (`/infrastructure/repositories/`):
- `SupabaseOrderRepository` - Implementação IOrderRepository
- `SupabaseSessionRepository` - Implementação ISessionRepository
- `SupabaseTableRepository` - Implementação ITableRepository
- `SupabaseProductRepository` - Implementação IProductRepository
- `SupabaseCategoryRepository` - Implementação ICategoryRepository
- `SupabaseStaffRepository` - Implementação IStaffRepository
- `SupabaseReservationRepository` - Implementação IReservationRepository
- `SupabaseRestaurantClosureRepository` - Implementação IRestaurantClosureRepository
- `SupabaseWaiterCallRepository` - Implementação IWaiterCallRepository
- `SupabaseCustomerRepository` - Implementação ICustomerRepository
- `SupabaseStaffTimeOffRepository` - Implementação IStaffTimeOffRepository
- `SupabaseReservationSettingsRepository` - Implementação IReservationSettingsRepository

**Padrões de Implementação:**
- Mapeamento snake_case (DB) ↔ camelCase (Domain)
- Tratamento de erros Supabase
- Conversão de tipos (Date, enums)
- Queries otimizadas com joins

**Real-time Handlers** (`/infrastructure/realtime/`):
- `OrderRealtimeHandler` - Subscrição a mudanças em pedidos
- Event handlers para novos pedidos e atualizações

---

### 4. Presentation Layer (`/src/presentation`)

**Dependency Injection** (`/presentation/contexts/DependencyContext.tsx`):
```typescript
const { getKitchenOrders, updateOrderStatus } = useDependencies();
```

**Hooks** (`/presentation/hooks/`):
- `useKitchenOrders()` - Pedidos para cozinha com real-time
- `useSessionOrders()` - Pedidos de uma sessão
- `useProducts()` - Catálogo de produtos
- `useSessionManagement()` - Gestão de sessões
- `useTableManagement()` - Gestão de mesas
- `useActivityLog()` - Logging de atividades
- `useReservations()` - Gestão de reservas
- `useClosures()` - Gestão de fechos
- `useWaiterCalls()` - Gestão de chamadas
- `useCustomers()` - Gestão de clientes
- `useStaff()` - Gestão de funcionários
- `useStaffTimeOff()` - Gestão de ausências

**Exemplo de Uso:**
```typescript
import { useKitchenOrders } from '@/presentation/hooks';

function KitchenPage() {
  const {
    orders,
    byStatus,
    counts,
    updateStatus,
    advanceOrder,
    isLoading,
    error
  } = useKitchenOrders();

  return (
    <div>
      <h2>Pending: {counts.pending}</h2>
      {byStatus.pending.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onAdvance={() => advanceOrder(order.id)}
        />
      ))}
    </div>
  );
}
```

---

## API Routes com Clean Architecture

Todas as rotas principais seguem o mesmo padrão:

**Exemplo:** `/api/staff-time-off/route.ts`
```typescript
import { SupabaseStaffTimeOffRepository } from '@/infrastructure/repositories';
import { GetAllStaffTimeOffUseCase } from '@/application/use-cases/staff-time-off';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const repository = new SupabaseStaffTimeOffRepository(supabase);
  const useCase = new GetAllStaffTimeOffUseCase(repository);

  const result = await useCase.execute({ filter });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Map to snake_case for backwards compatibility
  const data = result.data.map(mapToSnakeCase);
  return NextResponse.json(data);
}
```

**Rotas Refatoradas:**
- ✅ `/api/closures` - Dias de fecho
- ✅ `/api/staff-time-off` - Ausências de funcionários
- ✅ `/api/reservations` - Reservas
- ✅ `/api/reservation-settings` - Configurações

---

## Testes

**Estrutura de Testes:**
```
src/__tests__/
├── application/
│   └── use-cases/
│       ├── orders/OrdersUseCases.test.ts
│       ├── sessions/SessionsUseCases.test.ts
│       ├── tables/TablesUseCases.test.ts
│       ├── staff/StaffUseCases.test.ts
│       ├── reservations/ReservationsUseCases.test.ts
│       ├── closures/ClosuresUseCases.test.ts
│       ├── customers/CustomersUseCases.test.ts
│       ├── waiter-calls/WaiterCallsUseCases.test.ts
│       └── staff-time-off/StaffTimeOffUseCases.test.ts
├── domain/
│   └── services/
│       ├── OrderService.test.ts (44 tests)
│       ├── SessionService.test.ts (34 tests)
│       └── TableService.test.ts (40 tests)
├── infrastructure/
│   └── repositories/
│       ├── SupabaseRestaurantClosureRepository.test.ts (19 tests)
│       ├── SupabaseStaffTimeOffRepository.test.ts (10 tests)
│       └── SupabaseReservationSettingsRepository.test.ts (7 tests)
└── presentation/
    └── hooks/
        ├── useActivityLog.test.ts (7 tests)
        ├── useProducts.test.ts (20 tests)
        └── useStaffTimeOff.test.ts (12 tests)
```

**Cobertura:** 537 testes passando
- Use Cases: 100% testados (50+ use cases)
- Domain Services: 100% testados (OrderService, SessionService, TableService)
- Repositories: Padrão estabelecido com infraestrutura testada
- React Hooks: Padrão estabelecido (useActivityLog, useProducts, useStaffTimeOff)

**Padrões de Teste:**
```typescript
// Mock do repositório
const mockRepository: IOrderRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  // ...
};

// Teste de use case
it('deve criar pedido com sucesso', async () => {
  vi.mocked(mockRepository.create).mockResolvedValue(order);

  const result = await useCase.execute(input);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.id).toBe(order.id);
  }
});
```

---

## Como Criar Novos Features

**1. Criar Entidade:**
```typescript
// src/domain/entities/MyFeature.ts
export interface MyFeature {
  id: string;
  name: string;
  createdAt: Date;
}
```

**2. Criar Repository Interface:**
```typescript
// src/domain/repositories/IMyFeatureRepository.ts
export interface IMyFeatureRepository {
  findAll(): Promise<MyFeature[]>;
  findById(id: string): Promise<MyFeature | null>;
  create(data: CreateMyFeatureData): Promise<MyFeature>;
}
```

**3. Criar Implementação Supabase:**
```typescript
// src/infrastructure/repositories/SupabaseMyFeatureRepository.ts
export class SupabaseMyFeatureRepository implements IMyFeatureRepository {
  async findAll(): Promise<MyFeature[]> {
    const { data } = await this.supabase.from('my_features').select('*');
    return data.map(this.mapToEntity);
  }
}
```

**4. Criar Use Cases:**
```typescript
// src/application/use-cases/my-feature/GetAllMyFeaturesUseCase.ts
export class GetAllMyFeaturesUseCase {
  constructor(private repository: IMyFeatureRepository) {}

  async execute(): Promise<Result<MyFeature[]>> {
    try {
      const features = await this.repository.findAll();
      return Results.success(features);
    } catch (error) {
      return Results.error('Erro ao obter features');
    }
  }
}
```

**5. Criar Testes:**
```typescript
// src/__tests__/application/use-cases/my-feature/MyFeatureUseCases.test.ts
describe('GetAllMyFeaturesUseCase', () => {
  it('deve retornar features com sucesso', async () => {
    // ... test implementation
  });
});
```

**6. Usar na Apresentação:**
```typescript
// Em API Route ou Hook
const repository = new SupabaseMyFeatureRepository(supabase);
const useCase = new GetAllMyFeaturesUseCase(repository);
const result = await useCase.execute();
```

### Estilo
- Tailwind CSS para styling

## Funcionalidades em Tempo Real

O projeto usa Supabase Realtime para:
- Atualização de pedidos no display da cozinha
- Sincronização de carrinho entre dispositivos na mesa
- Notificações de chamadas de empregados
- Tracking de participantes na sessão

## Variáveis de Ambiente

Ficheiro `.env.local` requer:
- `NEXT_PUBLIC_SITE_URL`
- `AUTH_SECRET`
- `ADMIN_PASSWORD`, `COZINHA_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`, `FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`

## Gestão de Restaurantes (Multi-Localização)

### Sistema Dinâmico de Restaurantes

O sistema agora suporta **gestão dinâmica de restaurantes** via interface admin, substituindo as localizações hardcoded anteriores.

**Restaurantes Atuais:**
1. **Circunvalação** (slug: `circunvalacao`) - Localização principal
2. **Boavista** (slug: `boavista`) - Segunda localização

**Novos restaurantes podem ser adicionados via:**
- `/admin/definicoes` → Tab "Gestão de Restaurantes"
- CRUD completo: Create, Read, Update, Delete
- Validações: slug único, formato válido, capacidades positivas

**Criação Automática de Mesas:**
- Ao criar/editar restaurante, o sistema calcula automaticamente: `num_mesas = max_capacity / default_people_per_table`
- Exemplo: 50 pessoas ÷ 4 pessoas/mesa = 12-13 mesas criadas automaticamente
- Mesas criadas com número sequencial (1, 2, 3, ...) e capacidade padrão

**Campos do Restaurante:**
- `name` - Nome exibido (ex: "Circunvalação")
- `slug` - Identificador único usado no código (ex: "circunvalacao")
- `address` - Endereço completo
- `latitude`, `longitude` - Coordenadas (opcional, para futuro mapa)
- `max_capacity` - Capacidade total do restaurante
- `default_people_per_table` - Capacidade padrão para novas mesas
- `auto_table_assignment` - Flag para futura automação de atribuição de mesas
- `auto_reservations` - Flag para futura automação de reservas
- `is_active` - Restaurante ativo (aparece em dropdowns)

Cada localização tem gestão independente de mesas, pedidos e reservas.

## Migrações da Base de Dados

As migrações estão em `/supabase/migrations/`:
- `001_user_management.sql` - Staff e roles
- `002_table_management.sql` - Mesas e sessões
- `003_reservations.sql` - Sistema de reservas
- `004_email_tracking.sql` - Tracking de emails
- `005_restaurant_closures.sql` - Gestão de folgas
- `007_waiter_calls.sql` - Chamadas de empregados
- `008_session_customers.sql` - Participantes na sessão
- `009_waiter_calls_order_id.sql` - Relação chamadas-pedidos

## Notas Importantes

- O sistema suporta modo Rodízio (all-you-can-eat) e À La Carte
- QR codes são gerados automaticamente para cada mesa
- Emails são enviados via Resend com webhook tracking
- Activity log regista todas as ações dos funcionários
- Row Level Security (RLS) está ativo em todas as tabelas
