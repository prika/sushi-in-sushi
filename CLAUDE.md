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

## 🎉 Estado Atual do Projeto

### Última Atualização: 2026-03-07

**Alterações Recentes (Março 2026):**
- ✅ **Stripe Self-Checkout na Mesa** - Clientes podem pagar diretamente no telemovel via Stripe. PaymentSheet com 5 steps (choice→tip→NIF→payment→success). Webhook-first: fatura Vendus + fecho de sessao automatico. Tabela `payments`, 3 API routes, 13 testes.
- ✅ **Payment Methods Admin CRUD** - CRUD completo de metodos de pagamento em `/admin/definicoes` → tab "Metodos de Pagamento". Entidade `PaymentMethod`, 4 use cases, `SupabasePaymentMethodRepository`, API routes (`/api/payment-methods`), hook `usePaymentMethods()`, 17 testes. Toggle ativo/inativo inline, validacao de slug unico, mapeamento Vendus ID.
- ✅ **Offline/PWA System** - Service Worker com Background Sync, IndexedDB offline queue, cache strategies (stale-while-revalidate para API, cache-first para assets). `OfflineQueue` com `StorageAdapter` interface (swappable para React Native). `offlineFetch()` drop-in replacement. Hook `useOfflineQueue()` via `useSyncExternalStore`. `OfflineBanner` UI component. Página `/offline` fallback. SW registado via `ServiceWorkerRegistrar` nos Providers.
- ✅ **Realtime Store (useSyncExternalStore)** - Sistema de notificações real-time sem `useEffect` para estado. `RealtimeStore` platform-agnostic (zero React imports). 15 eventos tipados (Table, Order, WaiterCall). Dual delivery: broadcast (<100ms) + postgres_changes (~300ms). Hooks: `useRealtimeTable`, `useRealtimeOrders`, `useRealtimeWaiterCalls`. Auto-invalidação de React Query caches.
- ✅ **Image Resize On-the-fly** - Redimensionamento de imagens de produtos via Supabase Storage Transformations. Utility `getOptimizedImageUrl()` em `src/lib/image.ts` com presets (thumbnail 400px, detail 800px, adminPreview 200px). Aplicado em ProductCard, MenuContent, ImageCarousel e admin produtos. Sem duplicação de ficheiros — CDN cache automático.
- ✅ **Marketing Intelligence - Fase 1** - Tab "Estrategia" em `/admin/seo` com 26 objetivos (6 categorias), questionario de contexto, tabela `business_strategy` (singleton). Base para sugestoes AI e segmentacao futuras.
- ✅ **GTM DataLayer Events** - Hook `useGTMEvent()` com 7 eventos type-safe (reservation, menu, QR scan, order, login, signup). Instrumentacao em ReservationForm, MenuContent, mesa/[numero], entrar, registar.
- ✅ **Reservation Source Attribution** - Coluna `source` em reservations (website/phone/walkin/thefork/instagram/google/other), dropdown editavel no admin, badge nos cards.
- ✅ **Presentation Layer Consolidation** - Eliminados diretórios legados (`components/`, `hooks/`, `contexts/`). Todos os componentes React, hooks e contexts vivem agora em `src/presentation/`. Componentes organizados em subpastas semânticas: `layout/`, `homepage/`, `orders/`, `products/`, `reservations/`, `tables/`, `admin/`, `charts/`, `mesa/`, `calendar/`, `seo/`, `menu/`, `auth/`, `ui/`.
- ✅ **Dynamic Site Configuration** - Todos os dados do site (brand name, logo, favicon, OG image, metadata SEO por locale, GTM) configuráveis via admin panel. Zero hardcoded brand references em código de produção.
- ✅ **Google Tag Manager** - GTM Container ID configurável no admin, carregado apenas em páginas públicas (`[locale]/*`)
- ✅ **Dynamic Metadata SEO** - Títulos, descrições, keywords e OG descriptions por locale via JSONB em `site_settings`
- ✅ **Dynamic Branding** - Logo, favicon, Apple Touch Icon e OG image configuráveis, usados em todo o site (Header, Footer, auth pages, mesa, emails, Schema.org)
- ✅ **Customer Auth** - Registo, login, conta, recuperação/redefinição de password (`/entrar`, `/registar`, `/conta`, `/recuperar-password`, `/redefinir-password`)
- ✅ **Dashboard Analytics** - KPIs, gráficos de receita, analytics de produtos/reservas/clientes com date range picker
- ✅ **Kitchen Print System** - Impressão de pedidos via browser ou Vendus POS, com domain service `KitchenPrintService`
- ✅ **Staff Calendar/Agenda** - Página `/admin/agenda` com calendário de folgas, férias e fechos, exportação ICS
- ✅ **Menu Landing Page** - Novo componente `MenuContent` com cards estilo homepage, hover overlay com descrição, layout staggered
- ✅ **RLS Security Hardening** - Migrations 088-090: write access restrito a admin em 15+ tabelas via `is_current_user_admin()`
- ✅ **Atomic Restaurant Hours** - Migration 089: `upsert_restaurant_hours` PL/pgSQL function via RPC
- ✅ **ICS Calendar** - Exportação de calendário com fix de midnight overflow
- ✅ **ReservationForm Improvements** - Locked fields só para valores não-vazios, auth bootstrap com error handling

**Alterações Anteriores:**
- ✅ **Sistema de Customer Tiers** - 5 tiers progressivos (Novo→Identificado→Cliente→Regular→VIP)
- ✅ **Vendus Invoice Multi-Modo** - Faturas usam `vendus_ids[orderingMode]` correto por modo de serviço
- ✅ **Dashboard Waiter Reestruturado** - Tabs Ativas/Disponíveis, reservas próximas

Ver detalhes completos em [docs/RECENT_CHANGES.md](docs/RECENT_CHANGES.md)

### Estado do Projeto (2026-02-08)

### ✅ Clean Architecture - 100% Implementada

**O projeto implementou com sucesso a Clean Architecture completa:**
- ✅ **13 entidades** de domínio completas (incluindo DashboardAnalytics)
- ✅ **14 repositórios** (interfaces + implementações Supabase)
- ✅ **57+ use cases** totalmente testados
- ✅ **5 domain services** com lógica de negócio isolada (incluindo KitchenPrintService)
- ✅ **Dependency Injection** via DependencyContext
- ✅ **Result Pattern** para tratamento de erros tipado

### 📊 Cobertura de Testes - Exemplar

**3006 testes passando**:
- ✅ **Use Cases:** 100% testados (55+ use cases)
- ✅ **Domain Services:** 100% testados (148 tests)
  - OrderService (44 tests)
  - SessionService (34 tests)
  - TableService (40 tests)
  - CustomerTierService (30 tests)
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
- ✅ **docs/TESTING.md** - Guia de testes de hooks

### 🚀 Features Recentes

**Kitchen Workflow Optimization** (2026-02-13):
- Kitchen display ends at "Pronto para servir" (Ready to serve) without action button
- OrderStatus label updated: "Pronto" → "Pronto para servir"
- Waiter names displayed on kitchen order cards (👤 icon)
- DependencyContext uses `SupabaseOrderRepositoryOptimized` for proper JOINs
- Waiter panel simplified: single "Prontos para Servir" section (removed duplicates)
- Mesa panel title: "Painel da Mesa #{number}"
- SQL scripts fixed: proper JOIN with roles table, UUID handling via CTEs
- Files: OrderStatus.ts, cozinha/page.tsx, waiter/page.tsx, waiter/mesa/[id]/page.tsx, DependencyContext.tsx

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

1. **E2E Tests** - Playwright para fluxos críticos
2. **Performance** - Paginação server-side para listas grandes (pedidos, clientes)
3. ~~**PWA** - Service worker para modo offline da cozinha/waiter~~ ✅ Implementado (SW + IndexedDB + Background Sync)

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
├── presentation/            # Camada de Apresentação (React) — TUDO React vive aqui
│   ├── components/          # Todos os componentes React
│   │   ├── ui/              # Primitivos UI (Button, Modal, Card, Badge, Toast, Skeleton)
│   │   ├── layout/          # Header, Footer, LanguageSwitcher
│   │   ├── homepage/        # Hero, About, Gallery, Reviews, VideoSection, Locations, Contact, Team
│   │   ├── orders/          # OrderStatusBadge, SessionSummary
│   │   ├── products/        # ProductCard, CategoryTabs, Menu
│   │   ├── reservations/    # ReservationForm
│   │   ├── tables/          # TableSelector
│   │   ├── admin/           # TableMap, TableDetailModal, Analytics sections
│   │   ├── charts/          # Recharts wrappers (AreaChart, BarChart, Donut, KPI, DateRangePicker)
│   │   ├── mesa/            # QR code mesa experience (games, carousel, providers)
│   │   ├── calendar/        # StaffCalendar, ReservationsCalendar
│   │   ├── seo/             # RestaurantSchema, MenuSchema, GoogleTagManager
│   │   ├── menu/            # MenuContent
│   │   └── auth/            # SessionTimeoutWarning
│   ├── contexts/            # DependencyContext, AuthContext, MesaLocaleContext
│   ├── hooks/               # Todos os hooks (useKitchenOrders, useProducts, useSound, etc.)
│   └── providers/           # Providers para o layout (QueryProvider)
│
├── app/                     # Next.js App Router
│   ├── [locale]/            # Páginas públicas com i18n
│   ├── admin/               # Dashboard administrativo
│   ├── cozinha/             # Display da cozinha
│   ├── waiter/              # Interface dos empregados
│   ├── mesa/[numero]/       # Pedidos via QR code
│   └── api/                 # API Routes
│
├── lib/                     # Utilitários e clientes
├── types/                   # TypeScript types
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
- `staff` - Funcionários e credenciais (**IMPORTANTE:** tem `role_id` FK, não coluna `role` direta)
- `roles` - Definições de roles (admin, kitchen, waiter, customer)
- `tables` - Mesas do restaurante (criadas automaticamente baseado em restaurant.max_capacity)
- `categories` - Categorias de produtos
- `products` - Items do menu
- `sessions` - Sessões de mesa (refeições)
- `orders` - Pedidos individuais
- `reservations` - Reservas (`customer_id` FK → customers para tracking de visitas)
- `customers` - Programa de fidelização (tier calculado dinamicamente via `computeCustomerTier`)
- `waiter_tables` - Atribuições empregado-mesa (**UUID types:** staff_id é UUID, não integer)
- `waiter_calls` - Chamadas de assistência
- `restaurant_closures` - Dias de fecho do restaurante
- `staff_time_off` - Férias e folgas dos funcionários
- `reservation_tables` - Junção reserva→mesas (principal + adicionais para junção física)
- `reservation_settings` - Configurações de reservas (lembretes, desperdício, alerta waiter)
- `restaurant_hours` - Horários por dia da semana por restaurante (upsert via RPC `upsert_restaurant_hours`)
- `kitchen_zones` - Zonas de cozinha para split printing
- `team_members` - Staff display no site público (via `staff.show_on_website`)
- `site_settings` - Configuração global do site (singleton id=1): `brand_name`, `description`, `price_range`, URLs de redes sociais, `gtm_id`, `logo_url`, `favicon_url`, `apple_touch_icon_url`, `og_image_url`, metadata SEO JSONB por locale (`meta_titles`, `meta_descriptions`, `meta_og_descriptions`, `meta_keywords`), `page_meta` JSONB (títulos e descrições por sub-página e locale)
- `business_strategy` - Estrategia de marketing (singleton id=1): `objectives` JSONB (array de {id, priority, notes}), `target_audience`, `communication_tone`, `competitive_edge`, `age_range_min/max`, `key_dates` JSONB, `marketing_budget_monthly`, `active_channels` JSONB, `competitors`, `cuisine_types`, `capacity_lunch/dinner`, `avg_price_min/max`

### SQL Scripts de Utilidade
Scripts em `supabase/scripts/`:
- `check-waiter-data.sql` - Verifica empregados disponíveis e suas atribuições
- `assign-waiters-to-tables.sql` - Atribui empregado específico a mesas (requer UUID manual)
- `quick-assign-waiter.sql` - **RECOMENDADO:** Atribui automaticamente primeiro empregado disponível (usa CTE)

**Notas importantes:**
- Sempre fazer JOIN com roles: `JOIN roles r ON s.role_id = r.id`
- staff_id é UUID, nunca usar valores integer
- Para automação, usar `supabase/scripts/quick-assign-waiter.sql` que pega UUID automaticamente

### Enums Importantes
- **SessionStatus:** active, pending_payment, paid, closed
- **OrderStatus:** pending, preparing, ready, delivered, cancelled
  - Labels: "Na fila", "A preparar", "Pronto para servir", "Entregue", "Cancelado"
- **TableStatus:** available, reserved, occupied, inactive
- **ReservationStatus:** pending, confirmed, cancelled, completed, no_show
- **Location:** circunvalacao, boavista

### Kitchen Workflow (Order Status Flow)
**Display da Cozinha** (`/cozinha`):
- **pending** → "Na fila" (awaiting preparation)
- **preparing** → "A preparar" (in progress)
- **ready** → "Pronto para servir" (final step for kitchen - view-only, no action button)

**Painel do Empregado** (`/waiter/mesa/[id]`):
- **ready** → "Prontos para Servir" (waiters can mark as delivered)
- **delivered** → "Entregue" (final state)

**Important:**
- Kitchen display does NOT advance orders from "ready" to "delivered"
- Waiters handle the delivered status transition
- Kitchen cards show waiter names: `👤 {waiterName}` in header
- Requires `SupabaseOrderRepositoryOptimized` in DependencyContext for waiter data

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

### Rotas de Customer Auth
- `/[locale]/entrar` - Login de clientes (Supabase Auth)
- `/[locale]/registar` - Registo de clientes
- `/[locale]/conta` - Área de conta do cliente (reservas, perfil)
- `/[locale]/recuperar-password` - Pedido de reset de password
- `/[locale]/redefinir-password` - Redefinir password (via link email)

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
- Hooks: `import { useKitchenOrders } from '@/presentation/hooks'`
- Components: `import { Button } from '@/presentation/components/ui'`
- Layout: `import { Header } from '@/presentation/components/layout/Header'`
- Contexts: `import { useAuth } from '@/presentation/contexts/AuthContext'`

### Princípios Técnicos Obrigatórios

**Documentação sempre atualizada:**
- Ao completar qualquer desenvolvimento novo (feature, refactor, fix significativo, migration, nova entidade/use case), **atualizar obrigatoriamente**:
  - `CLAUDE.md` — Secções relevantes (Estado Atual, tabelas, entidades, use cases, rotas, etc.)
  - `docs/RECENT_CHANGES.md` — Adicionar entrada com data e descrição da alteração
  - `MEMORY.md` (auto-memory) — Atualizar se o desenvolvimento afeta padrões, convenções ou arquitetura
- A atualização da documentação faz parte da tarefa — não está concluída até a documentação refletir as mudanças
- Manter a secção "Última Atualização" em CLAUDE.md com a data correta
- Ao adicionar novas tabelas, colunas, ou migrações, documentar na secção "Base de Dados"
- Ao adicionar novos componentes, hooks ou rotas, documentar nas secções respetivas

**Proibido valores hardcoded:**
- Nunca usar valores hardcoded (strings, números, URLs, IDs, configurações) diretamente no código
- Extrair para constantes, enums, configuração de ambiente, ou base de dados
- Ao encontrar valores hardcoded existentes no código, corrigir proativamente movendo para constantes/config
- Exemplos: slugs de restaurantes, limites numéricos, labels de UI, endpoints — tudo deve vir de constantes ou config

**Minimizar re-renders — Evitar `useEffect`:**
- **Não usar `useEffect`** para derivar estado — usar `useMemo` ou computar diretamente no render
- **Não usar `useEffect` para sincronizar estado** — preferir estado derivado ou `useSyncExternalStore`
- **Não usar `useEffect` para responder a eventos** — usar event handlers diretamente
- **Não usar `useEffect` para fetch de dados** — usar React Query, SWR, ou Server Components
- `useEffect` só é aceitável para: subscrições externas (Supabase realtime), setup/teardown de listeners DOM, e integração com bibliotecas não-React
- Ao encontrar `useEffect` desnecessários no código existente, refatorar para padrões corretos
- Preferir Server Components (Next.js App Router) sempre que possível para evitar estado client-side

**Padrões React preferidos:**
- `useMemo` / `useCallback` para computações caras e referências estáveis
- Estado derivado em vez de estado sincronizado (não duplicar dados em múltiplos `useState`)
- React Query (`useQuery`/`useMutation`) para server state em vez de `useState` + `useEffect`
- Composição de componentes em vez de prop drilling profundo

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
- `DashboardAnalytics` - Dados agregados para analytics do dashboard
- `PaymentMethod` - Metodos de pagamento (name, slug, vendusId, isActive, sortOrder)

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
- `IDashboardAnalyticsRepository` - Dados agregados para analytics
- `IPaymentMethodRepository` - CRUD de metodos de pagamento + findBySlug

**Value Objects** (`/domain/value-objects/`):
- `OrderStatus`, `SessionStatus`, `TableStatus`, `ReservationStatus`
- `Location` (circunvalacao | boavista)
- `CustomerTier` - Tiers 1-5 com labels, cores e lógica de computação

**Domain Services** (`/domain/services/`):
- `OrderService` - Cálculo de urgência, validação de status
- `SessionService` - Regras de transição de estados
- `TableService` - Validação de disponibilidade
- `KitchenPrintService` - Formatação de pedidos para impressão (browser/Vendus)
- `CustomerTierService` - Computação de tier, insights comportamentais, upgrade prompts

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

**Payment Methods** (`/application/use-cases/payment-methods/`):
- `GetAllPaymentMethodsUseCase`, `CreatePaymentMethodUseCase`
- `UpdatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`

**DTOs** (`/application/dto/`):
- `OrderDTO`, `KitchenOrderDTO`, `SessionOrderDTO`
- `OrderCountsDTO`, `SessionTotalsDTO`

**Result Pattern** (`/application/use-cases/Result.ts`):
```typescript
type Result<T> = SuccessResult<T> | ErrorResult;

// Uso:
const result = await useCase.execute(input);
if (result.success) {
  console.info(result.data);
} else {
  console.error(result.error, result.code);
}
```

---

### 3. Infrastructure Layer (`/src/infrastructure`)

**Repositories** (`/infrastructure/repositories/`):
- `SupabaseOrderRepository` - Implementação IOrderRepository
  - **IMPORTANTE:** Usar `SupabaseOrderRepositoryOptimized` no DependencyContext
  - Versão otimizada inclui JOINs corretos para waiter_tables e staff
  - Garante que KitchenOrderDTO contém waiterName
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
- `SupabasePaymentMethodRepository` - Implementação IPaymentMethodRepository

**Padrões de Implementação:**
- Mapeamento snake_case (DB) ↔ camelCase (Domain)
- Tratamento de erros Supabase
- Conversão de tipos (Date, enums)
- Queries otimizadas com joins
- **Repository Optimization Pattern:**
  - Criar versão `.optimized.ts` quando precisar de JOINs adicionais
  - Sempre preferir versão otimizada no DependencyContext
  - Exemplo: `SupabaseOrderRepositoryOptimized` para incluir dados de waiter

**Real-time** (`/infrastructure/realtime/`):
- `RealtimeStore` - Store reativo platform-agnostic (subscribe/getSnapshot, zero React imports)
- `events.ts` - 15 eventos tipados: TableEvent, OrderEvent, WaiterCallEvent + RealtimeEnvelope
- `channels/table.ts` - Canal de mesas (postgres_changes + broadcasts)
- `channels/order.ts` - Canal de pedidos (com filtro por status)
- `channels/waiter-call.ts` - Canal de chamadas
- `OrderRealtimeHandler` - Legacy handler (subscrição a mudanças em pedidos)

**Offline** (`/infrastructure/offline/`):
- `OfflineQueue` - Fila de requests offline com `StorageAdapter` interface (IndexedDB web, swappable para RN)
- `offlineFetch` - Drop-in fetch() replacement que enfileira mutações quando offline
- `IndexedDBStorageAdapter` - Implementação web do StorageAdapter

---

### 4. Presentation Layer (`/src/presentation`)

**Dependency Injection** (`/presentation/contexts/DependencyContext.tsx`):
```typescript
const { getKitchenOrders, updateOrderStatus } = useDependencies();
```

**Hooks** (`/presentation/hooks/`):
- `useKitchenOrders()` - Pedidos para cozinha com real-time
  - Versão otimizada disponível: `useKitchenOrdersOptimized()`
  - Inclui waiterName nos KitchenOrderDTO
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
- `usePaymentMethods()` - CRUD de metodos de pagamento
- `useRealtimeTable()` - Eventos real-time de mesas (broadcast + postgres_changes)
- `useRealtimeOrders()` - Eventos real-time de pedidos
- `useRealtimeWaiterCalls()` - Eventos real-time de chamadas
- `useOfflineQueue()` - Estado offline (online status, fila, contagem) via useSyncExternalStore
- `useOnlineStatus()` - Status online/offline reativo

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
│       ├── TableService.test.ts (40 tests)
│       └── CustomerTierService.test.ts (30 tests)
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

**Cobertura:** 3006 testes passando
- Use Cases: 100% testados (55+ use cases)
- Domain Services: 100% testados (OrderService, SessionService, TableService, CustomerTierService)
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
- **cursor-pointer obrigatório** em todos os elementos clicáveis (botões, links, tabs, cards interativos). Usar `cursor-pointer` explicitamente — não assumir que o browser o aplica automaticamente
- Tema escuro com gold como cor de destaque (`text-gold`, `bg-gold`, `border-gold/30`)
- `bg-card` para fundos de cartões, `text-muted` para texto secundário
- `font-display` para títulos, `font-sans` para corpo

## Funcionalidades em Tempo Real

O projeto usa Supabase Realtime para:
- Atualização de pedidos no display da cozinha
- Sincronização de carrinho entre dispositivos na mesa
- Notificações de chamadas de empregados
- Tracking de participantes na sessão

## Sistema de Emails de Reserva

### Tipos de Email

| Email | Template | Trigger | Tracking DB |
|---|---|---|---|
| Receção do pedido | `getCustomerConfirmationEmail()` | Criação (fluxo manual) | `customer_email_*` |
| Reserva Confirmada | `getReservationConfirmedEmail()` | Admin confirma OU auto-reserva | `confirmation_email_*` |
| Notificação Restaurante | `getRestaurantNotificationEmail()` | Criação (sempre) | — |
| Lembrete 24h | `getDayBeforeReminderEmail()` | Cron 8h | `day_before_reminder_*` |
| Lembrete 2h | `getSameDayReminderEmail()` | Cron 16h | `same_day_reminder_*` |
| Cancelamento | `getCancellationEmail()` | Admin/cliente cancela | — |
| Despedida | `getFarewellEmail()` | Não implementado | — |

### Fluxo Auto vs Manual
- **Auto-reserva** (`auto_reservations = true` no restaurante): reserva vai direto para `confirmed`, envia `sendReservationConfirmedEmail()` + `sendRestaurantNotificationEmail()` separado
- **Manual**: envia `sendReservationEmails()` (cliente + restaurante), admin confirma depois → `sendReservationConfirmedEmail()`

### Cron de Lembretes
- **Vercel cron:** `0 8,16 * * *` (8h manhã + 16h tarde, UTC)
- **Rota:** `GET /api/cron/reservation-reminders`
- **Auth:** `CRON_SECRET` header (Bearer token)
- **Settings:** `reservation_settings` (singleton id=1) — `day_before_reminder_enabled/hours`, `same_day_reminder_enabled/hours`

### Tracking via Webhooks
- Resend webhook: `/api/webhooks/resend`
- Eventos: sent, delivered, opened, clicked, bounced, complained
- Atualiza `*_status` e `*_at` na reserva + `email_events` audit table

### Ficheiros Chave
- `/src/lib/email/index.ts` — Funções de envio (sendReservationEmails, sendReservationConfirmedEmail, sendRestaurantNotificationEmail, sendDayBeforeReminderEmail, sendSameDayReminderEmail)
- `/src/lib/email/templates.ts` — Templates HTML
- `/src/app/api/cron/reservation-reminders/route.ts` — Cron job
- `/src/app/api/webhooks/resend/route.ts` — Webhook tracking

## Variáveis de Ambiente

Ficheiro `.env.local` requer:
- `NEXT_PUBLIC_SITE_URL`
- `AUTH_SECRET`
- `ADMIN_PASSWORD`, `COZINHA_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`, `FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- `CRON_SECRET` — Autenticação do cron de lembretes
- `TEST_EMAIL_OVERRIDE` — Redireciona todos os emails para este endereço (dev)
- `RESTAURANT_EMAIL_1`, `RESTAURANT_EMAIL_2` — Emails por localização

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
- `043_close_session_update_table.sql` - Função atómica `close_session_and_free_table`
- `046-049` - Vendus POS integration (sync, products, invoices, retry queue)
- `053_products_vendus_ids.sql` - `vendus_ids` JSONB multi-modo (dine_in, delivery, takeaway)
- `055_ingredients_catalog.sql` - Catálogo de ingredientes e product-ingredients
- `058_reservation_table_assignment.sql` - Atribuição de mesas a reservas, alerta waiter
- `073_piece_limiter.sql` - Limitador de peças por sessão
- `075_reservation_customer_id.sql` - FK `customer_id` em reservations → customers (visit tracking)

## Notas Importantes

- O sistema suporta modo Rodízio (all-you-can-eat) e À La Carte
- QR codes são gerados automaticamente para cada mesa
- Emails são enviados via Resend com webhook tracking
- Activity log regista todas as ações dos funcionários
- Row Level Security (RLS) está ativo em todas as tabelas

### Kitchen & Waiter Flow
- **Kitchen display** termina no status "ready" (sem botão de ação)
- **Waiter panel** avança de "ready" para "delivered"
- Nomes de empregados aparecem nos cartões da cozinha (👤 icon)
- DependencyContext deve usar `SupabaseOrderRepositoryOptimized`
- Painel do waiter tem título "Painel da Mesa #{number}"
- Uma única seção "Prontos para Servir" (não duplicar)

### Waiter Dashboard Layout
Ordem das secções no painel do waiter (`/waiter`):
1. **Stats Bar** — mesas ativas / total, pessoas
2. **Prontos para Servir** — green, pedidos prontos da cozinha
3. **Reservas Proximas** — purple, reservas confirmadas dentro da janela de alerta
4. **Chamadas de Clientes** — red/yellow, chamadas pendentes/acknowledged
5. **Tabs: Mesas Ativas / Disponíveis** — gold tabs com grelha de mesas
6. **Na Cozinha / Aguardam Cozinha** — bottom, menos proeminente

### Reservation Table Assignment
- **Setting:** `reservation_settings.waiter_alert_minutes` (default: 60, min: 15, max: 180)
- **Admin:** `/admin/definicoes` → Notificações → card "Alerta para Empregados"
- **Tabela:** `reservation_tables` (reservation_id, table_id, is_primary, assigned_by, assigned_at)
- **Flag:** `reservations.tables_assigned` (false até waiter atribuir mesas)
- **Fluxo waiter:** Vê alerta → clica "Atribuir Mesa" → seleciona principal (dourado) + adicionais (azul) → confirmar
- **Resultado:** Mesas ficam com status "reserved", `reservation_tables` preenchida, alerta desaparece
- **Sem pedidos na mesa:** Botão "Encerrar Mesa" (fecho direto) em vez de "Pedir Conta"

### Vendus Invoice Multi-Mode
- Produtos com preços diferentes por modo têm `vendus_ids` JSONB: `{"dine_in": "123", "delivery": "456"}`
- Faturas resolvem: `vendus_ids[session.ordering_mode]` → `vendus_id` → `product_id`
- Migration 053 adicionou a coluna e migrou dados existentes

### Customer Tiers (Progressive Profiling)

**5 tiers baseados em perfil + comportamento:**

| Tier | Label | Critério |
|------|-------|----------|
| 1 | Novo | Sem email nem phone (só dados estatísticos) |
| 2 | Identificado | Tem email **ou** phone |
| 3 | Cliente | Tem email ou phone **e** >= 1 visita concluída |
| 4 | Regular | Perfil completo (email+phone+birthDate) **e** >= 3 visitas |
| 5 | VIP | Perfil completo **e** >= 10 visitas **e** >= 500€ gasto |

**Ficheiros chave:**
- `/src/domain/value-objects/CustomerTier.ts` — `computeCustomerTier()`, labels, cores
- `/src/domain/services/CustomerTierService.ts` — `computeTier()`, `getMissingFieldsForNextTier()`, `computeInsights()`, `shouldShowUpgradePrompt()`
- `/src/__tests__/domain/services/CustomerTierService.test.ts` — 30 testes

**Cores por tier:** cinza (1), azul (2), âmbar (3), esmeralda (4), roxo (5)

### Reservation → Customer Visit Tracking

**Fluxo completo:**
```
1. Cliente faz reserva (POST /api/reservations)
   → Customer upsert (email+phone) → Tier 2 (Identificado)
   → reservations.customer_id = customer.id

2. Admin confirma (PATCH status=confirmed)
   → Email confirmação

3. Cliente chega (PATCH status=completed + session_id)
   → MarkReservationSeatedUseCase: status→completed, seated_at, session_id
   → RecordCustomerVisitUseCase: visitCount++ → Tier 3 (Cliente)
```

**Ficheiros chave:**
- `/src/app/api/reservations/route.ts` — POST: upsert customer + guarda `customer_id` na reserva
- `/src/app/api/reservations/[id]/route.ts` — PATCH: ao completar, chama `RecordCustomerVisitUseCase`
- `/src/application/use-cases/customers/RecordCustomerVisitUseCase.ts` — incrementa `visit_count` e `total_spent`
- `/supabase/migrations/075_reservation_customer_id.sql` — `customer_id UUID REFERENCES customers(id)`

### Admin Clientes — Tabs

A página `/admin/clientes` tem duas tabs:
- **Fidelizados** — Clientes da tabela `customers` (programa de fidelização, tiers, pontos)
- **Sessão** — Clientes da tabela `session_customers` (utilizadores de mesa via QR code)
  - Mostra dados de jogos: respostas, scores, prémios
  - Tier computado dinamicamente via `computeCustomerTier()` (não usa tier guardado)
  - APIs: `GET /api/admin/session-customers` (lista) e `GET /api/admin/session-customers/[id]` (detalhe)

### RLS Security Model (Migrations 081-090)

**Padrão de segurança:**
- **Admin-only writes** via `is_current_user_admin()` em: products, categories, ingredients, product_ingredients, payment_methods, kitchen_zones, locations, restaurant_hours, customers, daily_metrics, site_settings, staff_time_off, vendus_retry_queue, vendus_sync_log, storage (team-photos)
- **Staff read** via `(select auth.role()) = 'authenticated'` em todas as tabelas acima
- **Anon read** via `FOR SELECT TO anon USING (true)` em: products, categories, ingredients, product_ingredients, payment_methods, kitchen_zones, locations, restaurant_hours, site_settings
- **Location-based** via `can_access_location()` em: orders (SELECT/UPDATE), sessions (SELECT/UPDATE), tables (SELECT)
- **Admin writes go through API routes** com `createAdminClient()` (service role, bypasses RLS) — as policies são defense-in-depth
- **Waiter write access** mantido em: table_status_history (INSERT), reservation_tables (INSERT/DELETE)

### Dashboard Analytics

- **Página:** `/admin` (dashboard principal)
- **API routes:** `/api/admin/dashboard-analytics`, `/api/admin/product-analytics`, `/api/admin/reservation-analytics`, `/api/admin/customer-analytics`
- **Use case:** `GetDashboardAnalyticsUseCase` com `IDashboardAnalyticsRepository`
- **Componentes:** `ProductAnalytics`, `ReservationAnalytics`, `CustomerAnalyticsSection`
- **Charts:** Recharts com componentes wrapper em `/components/charts/` (AreaChart, BarChart, DonutChart, HorizontalBar, KpiCard, DateRangePicker)

### Dynamic Site Configuration & Branding

- **Tabela:** `site_settings` (singleton id=1) — central config store para todo o site
- **Server-side:** `getSiteMetadata()` em `src/lib/metadata/index.ts` — `unstable_cache` (24h, tag `site-metadata`)
- **Client-side:** `useSiteSettings()` hook para componentes React
- **Cache invalidation:** `revalidateTag("site-metadata")` no PATCH de `/api/admin/site-settings`
- **GTM:** `src/components/seo/GoogleTagManager.tsx` — server component, carregado apenas em `[locale]/layout.tsx`
- **Schema.org:** `RestaurantSchema.tsx` usa `logo_url` e `og_image_url` dinâmicos
- **Emails:** `BRAND_NAME` var em templates, `initBrandName()` antes de gerar HTML
- **Princípio:** Zero hardcoded brand references — tudo vem da BD com NOT NULL + DEFAULT

### Kitchen Print System

- **Domain:** `KitchenPrintService` — formata pedidos para impressão
- **Ports:** `IKitchenPrinter` — interface para browser e Vendus
- **Implementações:** `BrowserKitchenPrinter` (window.print), `VendusKitchenPrinter` (API POS)
- **Use case:** `PrintKitchenOrderUseCase`
- **Hook:** `useKitchenPrint()` — integrado na página `/cozinha`
- **API:** `POST /api/kitchen/print`
- **Settings:** `kitchenPrintMode` (none/browser/vendus), `zoneSplitPrinting`, `autoPrintOnOrder` em `/admin/definicoes`
