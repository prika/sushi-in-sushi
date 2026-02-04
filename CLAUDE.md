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
│   └── realtime/            # Handlers de real-time
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
- `staff` - Funcionários e credenciais
- `roles` - Definições de roles (admin, kitchen, waiter, customer)
- `tables` - Mesas do restaurante
- `categories` - Categorias de produtos
- `products` - Items do menu
- `sessions` - Sessões de mesa (refeições)
- `orders` - Pedidos individuais
- `reservations` - Reservas
- `customers` - Programa de fidelização
- `waiter_tables` - Atribuições empregado-mesa
- `waiter_calls` - Chamadas de assistência
- `restaurant_closures` - Dias de fecho

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

### Nova Arquitetura (SOLID)

**Para criar novos features:**
1. Criar entidade em `/src/domain/entities/`
2. Criar interface de repositório em `/src/domain/repositories/`
3. Criar implementação Supabase em `/src/infrastructure/repositories/`
4. Criar use case em `/src/application/use-cases/`
5. Adicionar ao DependencyContext em `/src/presentation/contexts/`
6. Criar hook em `/src/presentation/hooks/`

**Hooks disponíveis (nova arquitetura):**
- `useKitchenOrders()` - Pedidos para a cozinha com real-time
- `useProducts()` - Catálogo de produtos

**Para usar nos componentes:**
```typescript
import { useKitchenOrders } from '@/presentation/hooks';

function KitchenPage() {
  const { orders, updateStatus, isLoading } = useKitchenOrders();
  // ...
}
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

## Localizações do Restaurante

1. **Circunvalação** - Localização principal
2. **Boavista** - Segunda localização

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
