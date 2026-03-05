# Plano de Modularizacao e Apps Mobile - RestoHub

> **Data:** 2026-03-05
> **Versao:** 1.0
> **Estado:** Planeamento

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Fase 1 - Feature Flags e Modularizacao](#2-fase-1---feature-flags-e-modularizacao)
3. [Fase 2 - PWA (Quick Win)](#3-fase-2---pwa-quick-win)
4. [Fase 3 - React Native: App Mesa (Cliente)](#4-fase-3---react-native-app-mesa-cliente)
5. [Fase 4 - React Native: App Waiter](#5-fase-4---react-native-app-waiter)
6. [Fase 5 - React Native: App Kitchen (KDS)](#6-fase-5---react-native-app-kitchen-kds)
7. [Arquitetura Mobile Partilhada](#7-arquitetura-mobile-partilhada)
8. [Publicacao nas Stores](#8-publicacao-nas-stores)
9. [Custos Detalhados](#9-custos-detalhados)
10. [Cronograma Geral](#10-cronograma-geral)
11. [Riscos e Mitigacoes](#11-riscos-e-mitigacoes)

---

## 1. Visao Geral

### Objetivo

Transformar o RestoHub num **sistema white-label reutilizavel** que pode ser adaptado para diferentes tipos de negocio:

- **Restaurante de sushi** (caso atual, todas as features)
- **Cervejaria / bar** (menu digital, pedidos, sem rodizio, sem jogos)
- **Restaurante tradicional** (reservas, pedidos, sem QR ordering)
- **Cadeia multi-local** (analytics, multi-location, staff calendar)
- **Take-away / delivery** (menu, pedidos, sem mesas fisicas)

### Abordagem

Em vez de "planos" com niveis, o sistema e **a la carte por feature**: cada cliente ativa apenas o que precisa via env vars. O mesmo codebase serve todos - zero forks, zero branches por cliente.

```
.env do cliente  -->  Liga/desliga modulos  -->  Mesmo deploy
Monorepo Expo    -->  Apps nativas partilham domain/application layers
API Routes       -->  Backend unico para web + mobile
```

### Exemplos Praticos

| Negocio | Ativa | Desativa |
|---------|-------|----------|
| **Sushi in Sushi** (atual) | Tudo | Nada |
| **Cervejaria** | Core, Reservas, Analytics, Waiter Calls | Rodizio, Jogos, Piece Limiter, Customer Auth |
| **Restaurante fino** | Core, Reservas, Loyalty, Analytics, Multi-location | Rodizio, Jogos, QR Ordering (waiter-only) |
| **Fast-food** | Core, QR Ordering, Kitchen Print | Reservas, Loyalty, Jogos, Staff Calendar |
| **Food court** | Core, QR Ordering, Multi-location | Reservas, Waiter Calls (self-service) |

---

## 2. Fase 1 - Feature Flags e Modularizacao

### 2.1 Sistema de Feature Flags

Criar um sistema centralizado de feature flags controlado por variaveis de ambiente. Cada feature pode ser ativada/desativada sem alterar codigo.

#### Ficheiro Central: `src/lib/features/index.ts`

```typescript
// Todas as features default ON - desativar explicitamente com 'false' no .env
export const FEATURES = {
  // --- Integracoes Externas (auto-detect pela API key) ---
  VENDUS_POS:       Boolean(process.env.VENDUS_API_KEY),
  EMAIL_SERVICE:    Boolean(process.env.RESEND_API_KEY),
  AI_DESCRIPTIONS:  Boolean(process.env.ANTHROPIC_API_KEY),
  SMS_VERIFICATION: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  CRON_AUTOMATION:  Boolean(process.env.CRON_SECRET),

  // --- Modulos de Negocio ---
  RESERVATIONS:     process.env.NEXT_PUBLIC_FEATURE_RESERVATIONS !== 'false',
  CUSTOMER_LOYALTY: process.env.NEXT_PUBLIC_FEATURE_CUSTOMER_LOYALTY !== 'false',
  CUSTOMER_AUTH:    process.env.NEXT_PUBLIC_FEATURE_CUSTOMER_AUTH !== 'false',
  GAMES:            process.env.NEXT_PUBLIC_FEATURE_GAMES !== 'false',
  ANALYTICS:        process.env.NEXT_PUBLIC_FEATURE_ANALYTICS !== 'false',
  MULTI_LOCATION:   process.env.NEXT_PUBLIC_FEATURE_MULTI_LOCATION !== 'false',
  KITCHEN_PRINT:    process.env.NEXT_PUBLIC_FEATURE_KITCHEN_PRINT !== 'false',
  STAFF_CALENDAR:   process.env.NEXT_PUBLIC_FEATURE_STAFF_CALENDAR !== 'false',

  // --- Modos de Operacao ---
  RODIZIO_MODE:     process.env.NEXT_PUBLIC_FEATURE_RODIZIO !== 'false',
  PIECE_LIMITER:    process.env.NEXT_PUBLIC_FEATURE_PIECE_LIMITER !== 'false',
  WAITER_CALLS:     process.env.NEXT_PUBLIC_FEATURE_WAITER_CALLS !== 'false',
  QR_ORDERING:      process.env.NEXT_PUBLIC_FEATURE_QR_ORDERING !== 'false',
  ALLERGEN_DISPLAY: process.env.NEXT_PUBLIC_FEATURE_ALLERGENS !== 'false',
  PRODUCT_RATINGS:  process.env.NEXT_PUBLIC_FEATURE_RATINGS !== 'false',
} as const;

export type FeatureKey = keyof typeof FEATURES;
export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
```

### 2.2 Mapa de Features por Modulo

Organizacao logica das features em modulos independentes:

#### Modulo CORE (sempre ativo - incluido em todos os planos)

| Feature | Descricao | Ficheiros Chave |
|---------|-----------|-----------------|
| Menu Digital | Catalogo de produtos com categorias | `/[locale]/menu`, `useProductsOptimized` |
| Gestao de Mesas | CRUD de mesas, status, QR codes | `/admin/mesas`, `useTableManagement` |
| Sistema de Pedidos | Criar e gerir pedidos | `/api/orders`, `CreateOrderUseCase` |
| Sessoes | Iniciar/fechar sessoes de mesa | `/api/sessions`, `SessionService` |
| Display Cozinha | Kanban de pedidos em real-time | `/cozinha`, `useKitchenOrdersOptimized` |
| Painel Waiter | Dashboard basico do empregado | `/waiter`, `useSessionManagement` |
| Staff Management | CRUD de funcionarios e roles | `/admin/staff`, `useStaff` |
| Autenticacao Staff | Login, roles, permissoes | `/login`, JWT auth |
| i18n | 6 idiomas (PT, EN, FR, DE, IT, ES) | `messages/`, `next-intl` |

#### Modulo RESERVATIONS

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Sistema de Reservas | CRUD completo, estados, atribuicao de mesas | `NEXT_PUBLIC_FEATURE_RESERVATIONS` |
| Email de Reservas | Confirmacao, lembretes, cancelamento | `RESEND_API_KEY` + reservations |
| Cron Lembretes | 24h e 2h antes | `CRON_SECRET` + reservations |
| Cancelamento Online | Portal publico de cancelamento | Depende de reservations |
| Alerta Waiter | Notifica empregados de reservas proximas | `reservation_settings.waiter_alert_minutes` |

**Ficheiros:** `/api/reservations`, `/[locale]/reservar`, `/[locale]/cancelar-reserva`, `useReservations`, 14 use cases

#### Modulo CUSTOMER_LOYALTY

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Programa de Fidelizacao | 5 tiers progressivos | `NEXT_PUBLIC_FEATURE_CUSTOMER_LOYALTY` |
| Customer Auth | Login/registo de clientes | `NEXT_PUBLIC_FEATURE_CUSTOMER_AUTH` |
| Tracking de Visitas | Contagem automatica via reservas | Depende de loyalty |
| Pontos | Sistema de pontos por compra | Depende de loyalty |
| Area de Conta | Perfil, historico, reservas | `/[locale]/conta` |

**Ficheiros:** `/api/customers`, `CustomerTierService`, `useCustomers`, 11 use cases, `/[locale]/entrar`, `/[locale]/registar`, `/[locale]/conta`

#### Modulo GAMES

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Quiz Game | Perguntas multiple-choice | `NEXT_PUBLIC_FEATURE_GAMES` |
| Swipe Rating | Rating de produtos estilo Tinder | Depende de games |
| Preference Game | Preferencias binarias | Depende de games |
| Leaderboard | Rankings e premios | Depende de games |

**Ficheiros:** `/api/mesa/games/*`, `GameHub`, `QuizGame`, `SwipeRatingGame`, `PreferenceGame`, `useGameSession`, `useGameConfig`

#### Modulo VENDUS_POS

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Sync de Produtos | Importar/exportar com Vendus | `VENDUS_API_KEY` |
| Faturacao | Criar faturas, PDFs | Depende de vendus |
| Mapeamento | Mapear produtos e categorias | Depende de vendus |
| Kitchen Print (Vendus) | Impressao via POS Vendus | Depende de vendus |
| Sync Automatico | Cron de sincronizacao | `CRON_SECRET` + vendus |

**Ficheiros:** `/admin/vendus/*`, `src/lib/vendus/`, 8 API routes

#### Modulo ANALYTICS

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Dashboard KPIs | Receita, pedidos, ticket medio | `NEXT_PUBLIC_FEATURE_ANALYTICS` |
| Product Analytics | Performance de produtos | Depende de analytics |
| Reservation Analytics | Metricas de reservas | Depende de analytics + reservations |
| Customer Analytics | Distribuicao de tiers | Depende de analytics + loyalty |

**Ficheiros:** `/api/admin/dashboard-analytics`, `/api/admin/product-analytics`, componentes `charts/`, `useDashboardAnalytics`

#### Modulo AI_TOOLS

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Descricoes de Produtos | Geracao com Claude | `ANTHROPIC_API_KEY` |
| Traducao Ingredientes | 6 idiomas automatico | Depende de AI |
| Detecao Alergenos | Identificacao automatica | Depende de AI |

**Ficheiros:** `/api/products/generate-description`, `/api/ingredients/translate`, `/api/ingredients/detect-allergens`

#### Modulo MULTI_LOCATION

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Gestao de Restaurantes | CRUD de localizacoes | `NEXT_PUBLIC_FEATURE_MULTI_LOCATION` |
| Filtro por Localizacao | Dropdowns em toda a app | Depende de multi-location |
| Horarios por Local | Horarios independentes | Depende de multi-location |
| Equipa por Local | Staff filtrado por localizacao | Depende de multi-location |

**Ficheiros:** `useRestaurants`, `useLocations`, `/admin/definicoes` (tab restaurantes)

#### Modulo STAFF_CALENDAR

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Agenda de Staff | Ferias, folgas, fechos | `NEXT_PUBLIC_FEATURE_STAFF_CALENDAR` |
| Exportacao ICS | Calendario para apps externas | Depende de calendar |

**Ficheiros:** `/admin/agenda`, `StaffCalendar`, `useStaffTimeOff`, `/api/calendar/timeoff`

#### Modulo KITCHEN_PRINT

| Feature | Descricao | Env Var |
|---------|-----------|---------|
| Impressao Browser | window.print() | `NEXT_PUBLIC_FEATURE_KITCHEN_PRINT` |
| Impressao Vendus | Via POS API | Depende de print + vendus |
| Zone Split Printing | Dividir por zona de cozinha | Depende de print |
| Auto-Print | Imprimir automatico ao criar pedido | Depende de print |

**Ficheiros:** `KitchenPrintService`, `useKitchenPrint`, `/api/kitchen/print`

### 2.3 Exemplos White-Label por Tipo de Negocio

Cada deploy e uma instancia do mesmo codebase com `.env` diferente. Sem forks.

#### Exemplo: Cervejaria (menu + pedidos + reservas, sem sushi-specific)
```env
NEXT_PUBLIC_SITE_URL=https://cervejaria-artesanal.pt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SECRET=...

# Cervejaria: pedidos na mesa, reservas, sem rodizio/jogos
NEXT_PUBLIC_FEATURE_RODIZIO=false
NEXT_PUBLIC_FEATURE_PIECE_LIMITER=false
NEXT_PUBLIC_FEATURE_GAMES=false
NEXT_PUBLIC_FEATURE_CUSTOMER_LOYALTY=false
NEXT_PUBLIC_FEATURE_CUSTOMER_AUTH=false

# Email para reservas (opcional)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=reservas@cervejaria-artesanal.pt
```

#### Exemplo: Restaurante tradicional (waiter-only, sem QR ordering)
```env
NEXT_PUBLIC_SITE_URL=https://restaurante-tradicional.pt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SECRET=...

# Tradicional: empregado faz pedidos, cliente nao
NEXT_PUBLIC_FEATURE_QR_ORDERING=false
NEXT_PUBLIC_FEATURE_GAMES=false
NEXT_PUBLIC_FEATURE_RODIZIO=false
NEXT_PUBLIC_FEATURE_PIECE_LIMITER=false
NEXT_PUBLIC_FEATURE_RATINGS=false

# Reservas + emails ativos
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=reservas@restaurante-tradicional.pt
CRON_SECRET=xxxxx
```

#### Exemplo: Sushi in Sushi (caso atual - tudo ativo)
```env
NEXT_PUBLIC_SITE_URL=https://sushiinsushi.pt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SECRET=...

# Tudo ativo (defaults sao true, so declarar integracoes)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=reservas@sushiinsushi.pt
RESTAURANT_EMAIL_1=circunvalacao@sushiinsushi.pt
RESTAURANT_EMAIL_2=boavista@sushiinsushi.pt
RESEND_WEBHOOK_SECRET=whsec_xxxxx
VENDUS_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+351xxxxxxx
CRON_SECRET=xxxxx
```

### 2.4 Branding White-Label

Alem das features, o sistema precisa de ser visualmente adaptavel:

| Configuracao | Onde | Como |
|-------------|------|------|
| **Nome do negocio** | `site_settings.brand_name` | Admin > Marca & SEO |
| **Logo** | `site_settings` ou ficheiro estatico | Upload via admin |
| **Cores do tema** | `tailwind.config.ts` (var CSS) | Env var `NEXT_PUBLIC_BRAND_COLOR` ou admin |
| **Favicon / App Icon** | `public/` | Por deploy |
| **Dominio** | `NEXT_PUBLIC_SITE_URL` | .env |
| **Idiomas ativos** | `NEXT_PUBLIC_LOCALES` | .env (ex: `pt,en`) |
| **Moeda** | `NEXT_PUBLIC_CURRENCY` | .env (default: `EUR`) |
| **Timezone** | `NEXT_PUBLIC_TIMEZONE` | .env (default: `Europe/Lisbon`) |

#### Novas env vars de branding a adicionar:
```env
# Branding
NEXT_PUBLIC_BRAND_NAME="Cervejaria Artesanal"
NEXT_PUBLIC_BRAND_COLOR="#D4A017"         # gold, ou qualquer hex
NEXT_PUBLIC_BRAND_COLOR_DARK="#1a1a1a"    # fundo escuro
NEXT_PUBLIC_LOCALES="pt,en"              # idiomas ativos (default: pt,en,fr,de,it,es)
NEXT_PUBLIC_CURRENCY="EUR"               # moeda (default: EUR)
NEXT_PUBLIC_TIMEZONE="Europe/Lisbon"     # timezone (default: Europe/Lisbon)
NEXT_PUBLIC_BUSINESS_TYPE="brewery"      # restaurant | brewery | cafe | fast_food | food_court
```

A var `NEXT_PUBLIC_BUSINESS_TYPE` permite ajustar terminologia automaticamente:

| Termo | restaurant | brewery | cafe | fast_food |
|-------|-----------|---------|------|-----------|
| "Mesa" | Mesa | Mesa | Mesa | Balcao |
| "Empregado" | Empregado | Staff | Barista | Operador |
| "Cozinha" | Cozinha | Cozinha | Cozinha | Preparacao |
| "Reserva" | Reserva | Reserva | Reserva | - |
| "Rodizio" | Rodizio | - | - | - |
| "Sessao" | Sessao | Sessao | Sessao | Pedido |

### 2.5 Implementacao Tecnica dos Feature Flags

#### Componente React Condicional

```typescript
// src/components/FeatureGate.tsx
import { isFeatureEnabled, FeatureKey } from '@/lib/features';

export function FeatureGate({
  feature,
  children,
  fallback = null
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!isFeatureEnabled(feature)) return fallback;
  return <>{children}</>;
}

// Uso:
<FeatureGate feature="RESERVATIONS">
  <ReservationTab />
</FeatureGate>
```

#### Middleware de API Route

```typescript
// src/lib/features/middleware.ts
export function requireFeature(feature: FeatureKey) {
  return (req: NextRequest) => {
    if (!isFeatureEnabled(feature)) {
      return NextResponse.json(
        { error: 'Feature not available' },
        { status: 403 }
      );
    }
  };
}
```

#### Navegacao Condicional no Admin

```typescript
// Sidebar do admin filtra items baseado em features
const adminNavItems = [
  { label: 'Dashboard', href: '/admin', feature: null }, // sempre visivel
  { label: 'Reservas', href: '/admin/reservas', feature: 'RESERVATIONS' },
  { label: 'Clientes', href: '/admin/clientes', feature: 'CUSTOMER_LOYALTY' },
  { label: 'Jogos', href: '/admin/jogos', feature: 'GAMES' },
  { label: 'Vendus', href: '/admin/vendus', feature: 'VENDUS_POS' },
  { label: 'Agenda', href: '/admin/agenda', feature: 'STAFF_CALENDAR' },
].filter(item => !item.feature || isFeatureEnabled(item.feature));
```

### 2.6 Tarefas de Implementacao - Fase 1

| # | Tarefa | Estimativa | Prioridade |
|---|--------|------------|------------|
| 1.1 | Criar `src/lib/features/index.ts` com todas as flags | 2h | Alta |
| 1.2 | Criar `FeatureGate` component | 1h | Alta |
| 1.3 | Envolver sidebar admin com feature gates | 3h | Alta |
| 1.4 | Envolver paginas admin com feature guards | 4h | Alta |
| 1.5 | Envolver tabs do mesa (jogos, chamar, etc.) com gates | 2h | Alta |
| 1.6 | Adicionar middleware de feature check nas API routes | 4h | Media |
| 1.7 | Envolver seccoes do waiter dashboard com gates | 2h | Media |
| 1.8 | Documentar `.env.example` com todos os flags | 1h | Media |
| 1.9 | Criar script de setup para cada plano | 2h | Baixa |
| 1.10 | Testes unitarios para feature flags | 3h | Media |
| **Total** | | **~24h (~3 dias)** | |

---

## 3. Fase 2 - PWA (Quick Win)

Antes de investir em React Native, converter a app existente num PWA completo. Isto da experiencia "app-like" nos dispositivos do restaurante com zero custo de distribuicao.

### 3.1 O que ja existe

- Layout mobile-optimized no `/mesa`
- Metadata PWA basica no layout do mesa
- Real-time via Supabase (funciona em qualquer browser)

### 3.2 O que falta

| Tarefa | Descricao | Estimativa |
|--------|-----------|------------|
| Service Worker | Cache shell da app + dados criticos offline | 4h |
| Web App Manifest | Icones, splash screens, theme color, display: standalone | 2h |
| Offline Fallback | Pagina offline quando sem rede | 2h |
| Push Notifications | Web Push API para waiter calls e order ready | 6h |
| Install Prompt | Banner "Adicionar ao ecra inicial" | 2h |
| Cache de Menu | Service worker cache do catalogo de produtos | 3h |
| Kitchen Keep-Awake | Wake Lock API para tablets da cozinha | 1h |
| **Total** | | **~20h (~2.5 dias)** |

### 3.3 Quando usar PWA vs React Native

| Criterio | PWA | React Native |
|----------|-----|--------------|
| Distribuicao | URL direto, zero fricao | App Store/Play Store |
| Custo inicial | Baixo (ja temos web) | Alto (novo projeto) |
| Bluetooth Printers | Nao (iOS) / Parcial (Android) | Sim |
| Push Notifications | Parcial (iOS limitado) | Completo |
| Offline robusto | Limitado | Completo (SQLite) |
| Performance | Boa (90%+ dos casos) | Excelente |
| Atualizacoes | Instantaneas (deploy) | OTA via EAS Update |
| Presenca em Store | Nao | Sim |

**Recomendacao:** PWA para cozinha (tablet fixo, WiFi), React Native para waiter (precisa impressao) e mesa (presenca em store).

---

## 4. Fase 3 - React Native: App Mesa (Cliente)

### 4.1 Visao Geral

App para clientes fazerem pedidos na mesa, substituindo/complementando a experiencia web via QR code.

**Nome sugerido:** "Sushi in Sushi" (App Store) / "Sushi in Sushi - Pedidos" (se precisar diferenciar)

### 4.2 Ecras e Navegacao

```
App Mesa
├── SplashScreen (logo + loading)
├── ScanScreen (camera QR ou input manual de mesa)
├── WelcomeScreen (nome, n. pessoas, modo rodizio/carta)
│
├── MainNavigator (Bottom Tabs)
│   ├── MenuTab
│   │   ├── CategorySidebar (scroll horizontal)
│   │   ├── ProductGrid (cards com imagem)
│   │   └── ProductDetailSheet (bottom sheet com ingredientes, alergenos)
│   │
│   ├── CartTab
│   │   ├── CartItemList (quantidade, notas, remover)
│   │   ├── CartSummary (total, modo)
│   │   └── SubmitButton (com cooldown timer)
│   │
│   ├── OrdersTab
│   │   ├── ActiveOrders (status em real-time)
│   │   └── OrderHistory (pedidos anteriores da sessao)
│   │
│   ├── CallTab (se WAITER_CALLS ativo)
│   │   └── CallWaiterButton (com confirmacao)
│   │
│   └── GamesTab (se GAMES ativo)
│       ├── GameHub (selecao de jogo)
│       ├── QuizGame
│       ├── SwipeRatingGame
│       ├── PreferenceGame
│       └── Leaderboard
│
├── BillScreen (modal - pedir conta)
├── LanguagePicker (6 idiomas)
└── CustomerAuthFlow (se CUSTOMER_AUTH ativo)
    ├── LoginScreen
    ├── RegisterScreen
    └── AccountScreen
```

### 4.3 Features Nativas Especificas

| Feature | Biblioteca | Descricao |
|---------|------------|-----------|
| QR Scanner | `expo-camera` | Scan do QR code da mesa |
| Push Notifications | `expo-notifications` | "Pedido pronto para servir!" |
| Haptic Feedback | `expo-haptics` | Feedback ao adicionar ao carrinho |
| Offline Menu | `@tanstack/react-query` + persistence | Menu cached offline |
| Deep Links | `expo-linking` | `sushiinsushi://mesa/5` |
| Storage | `react-native-mmkv` | Preferencias, idioma, cart |
| Animacoes | `react-native-reanimated` | Transicoes fluidas |
| Bottom Sheets | `@gorhom/bottom-sheet` | Detalhe de produto |
| Gestos | `react-native-gesture-handler` | Swipe nos jogos |

### 4.4 Fluxo de Dados

```
[App Mesa] ---> [API Routes existentes] ---> [Supabase]
                      |
                      v
              [Supabase Realtime] ---> [App Mesa] (orders update)
                      |
                      v
              [Push Notification] ---> [App Mesa] (order ready)
```

**API Endpoints usados (ja existentes):**
- `GET /api/sessions?tableNumber=X&location=Y` - Verificar sessao
- `POST /api/sessions` - Criar sessao
- `POST /api/orders` - Criar pedidos
- `GET /api/mesa/games/*` - Jogos
- `POST /api/mesa/games/answer` - Submeter resposta
- `GET /api/mesa/product-ratings` - Ratings

### 4.5 Tarefas de Desenvolvimento

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 3.1 | Setup Expo monorepo + packages partilhados | 3d | - |
| 3.2 | Integracao Supabase (auth + realtime) | 2d | 3.1 |
| 3.3 | Navegacao (React Navigation + tabs) | 2d | 3.1 |
| 3.4 | QR Scanner screen | 1d | 3.3 |
| 3.5 | Welcome/session flow | 2d | 3.2 |
| 3.6 | Menu screen (categorias + produtos) | 3d | 3.2 |
| 3.7 | Product detail bottom sheet | 2d | 3.6 |
| 3.8 | Cart (state + UI) | 2d | 3.6 |
| 3.9 | Submit order (+ cooldown) | 1d | 3.8 |
| 3.10 | Orders tab (real-time status) | 2d | 3.2 |
| 3.11 | Push notifications setup | 2d | 3.2 |
| 3.12 | Call waiter feature | 1d | 3.2 |
| 3.13 | Bill request screen | 1d | 3.2 |
| 3.14 | Games hub + Quiz | 3d | 3.2 |
| 3.15 | Swipe Rating game | 2d | 3.14 |
| 3.16 | Preference game + leaderboard | 2d | 3.14 |
| 3.17 | Language picker (6 idiomas) | 1d | 3.1 |
| 3.18 | Customer auth flow (login/registo) | 2d | 3.2 |
| 3.19 | Offline support (menu cache) | 2d | 3.6 |
| 3.20 | Testes (unit + integration) | 3d | Todos |
| 3.21 | Polish UI/UX + animacoes | 3d | Todos |
| 3.22 | Build iOS + Android + submit | 3d | Todos |
| **Total** | | **~42 dias (~8-9 semanas)** | |

---

## 5. Fase 4 - React Native: App Waiter

### 5.1 Visao Geral

App para empregados de mesa gerirem mesas, pedidos e sessoes. Substitui `/waiter` com capacidades nativas (impressao Bluetooth, notificacoes push, haptics).

**Nome sugerido:** "Sushi in Sushi Staff" (internal distribution ou Store)

### 5.2 Ecras e Navegacao

```
App Waiter
├── LoginScreen (staff credentials)
│
├── MainNavigator (Bottom Tabs)
│   ├── DashboardTab
│   │   ├── StatsBar (mesas ativas, pessoas)
│   │   ├── ReadyToServeSection (pedidos prontos - highlight verde)
│   │   ├── ReservationAlerts (proximas reservas - highlight roxo)
│   │   ├── WaiterCalls (chamadas pendentes - highlight vermelho)
│   │   └── TableGrid (tabs: ativas/disponiveis)
│   │
│   ├── TableDetailScreen (push from grid)
│   │   ├── OrderList (por status, com cores)
│   │   ├── QuickActions (marcar entregue, pedir conta)
│   │   ├── SessionInfo (modo, pessoas, duracao)
│   │   ├── OrderingModeSwitch (rodizio/carta/waiter-only)
│   │   └── BillingFlow (3 passos: metodo → NIF → confirmar)
│   │
│   ├── ReservationsTab (se RESERVATIONS ativo)
│   │   ├── UpcomingList (proximas 24h)
│   │   ├── TableAssignment (modal de atribuicao)
│   │   └── ReservationDetail
│   │
│   └── SettingsTab
│       ├── PrinterConfig (Bluetooth/WiFi printer)
│       ├── NotificationPrefs
│       ├── LocationSelector (multi-location)
│       └── Logout
│
├── StartSessionModal
│   ├── ModeSelector (rodizio/carta)
│   ├── PeopleCounter
│   └── ConfirmButton
│
└── TableAssignModal (para reservas)
    ├── PrimaryTableSelect (dourado)
    ├── AdditionalTablesSelect (azul)
    └── ConfirmAssign
```

### 5.3 Features Nativas Especificas

| Feature | Biblioteca | Descricao |
|---------|------------|-----------|
| Push Notifications | `expo-notifications` | Chamadas de clientes, pedidos prontos |
| Bluetooth Printing | `react-native-thermal-receipt-printer` | Impressao de contas em impressora termica |
| Haptic Feedback | `expo-haptics` | Alertas de chamada, novo pedido |
| Badge Count | `expo-notifications` | Numero de chamadas pendentes no icone |
| Background Fetch | `expo-background-fetch` | Verificar chamadas mesmo com app em background |
| Secure Storage | `expo-secure-store` | JWT token do staff |
| Vibration | `expo-haptics` | Alerta de chamada urgente |
| Keep Awake | `expo-keep-awake` | Opcao para manter ecra ligado durante servico |

### 5.4 Fluxo de Impressao (Bluetooth)

```
Waiter pede conta
     │
     ├──> POST /api/sessions/[id]/close (action: "request_bill")
     │
     ├──> Calcular total no backend
     │
     ├──> Retornar dados do recibo (items, totais, NIF)
     │
     └──> App formata ESC/POS commands
          │
          ├──> Descobrir printer via Bluetooth scan
          │
          ├──> Conectar e enviar dados
          │
          └──> Imprimir recibo termal
```

**Impressoras recomendadas:**
- Epson TM-T20III (WiFi + Bluetooth) - ~€250
- Star Micronics mC-Print3 (WiFi + Bluetooth + USB) - ~€350
- Sunmi Cloud Printer (Android embedded) - ~€150

### 5.5 Tarefas de Desenvolvimento

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 4.1 | App setup no monorepo existente | 1d | Fase 3 (monorepo) |
| 4.2 | Login screen + auth flow | 2d | 4.1 |
| 4.3 | Dashboard layout + stats bar | 2d | 4.2 |
| 4.4 | Table grid (ativas/disponiveis) | 2d | 4.3 |
| 4.5 | Table detail screen (orders list) | 3d | 4.4 |
| 4.6 | Mark order delivered action | 1d | 4.5 |
| 4.7 | Start session modal | 1d | 4.4 |
| 4.8 | Billing flow (3 passos) | 3d | 4.5 |
| 4.9 | Ready-to-serve section (real-time) | 2d | 4.3 |
| 4.10 | Waiter calls (push notifications) | 2d | 4.3 |
| 4.11 | Reservation alerts + assignment | 3d | 4.3 |
| 4.12 | Bluetooth printer integration | 4d | 4.8 |
| 4.13 | Settings screen (printer, prefs) | 1d | 4.12 |
| 4.14 | Ordering mode switch | 1d | 4.5 |
| 4.15 | Offline fallback (cached tables/sessions) | 2d | 4.3 |
| 4.16 | Testes | 3d | Todos |
| 4.17 | Polish + animacoes | 2d | Todos |
| 4.18 | Build + submit | 2d | Todos |
| **Total** | | **~35 dias (~7 semanas)** | |

---

## 6. Fase 5 - React Native: App Kitchen (KDS)

### 6.1 Visao Geral

App dedicada para o Kitchen Display System (KDS). Desenhada para tablets fixos na cozinha. Foco em velocidade, clareza e fiabilidade.

**Nome sugerido:** "Sushi in Sushi Kitchen" (internal distribution)

### 6.2 Ecras e Navegacao

```
App Kitchen (KDS)
├── LoginScreen (staff credentials, role: kitchen/admin)
│
├── KitchenScreen (fullscreen Kanban)
│   ├── HeaderBar
│   │   ├── Clock (real-time)
│   │   ├── LocationFilter (dropdown)
│   │   ├── StatusCounts (pendentes: X, preparando: Y, prontos: Z)
│   │   └── SettingsToggle
│   │
│   ├── KanbanBoard (3 colunas, drag-and-drop)
│   │   ├── PendingColumn ("Na fila")
│   │   │   └── OrderCard[] (mesa, waiter, items, notas, tempo)
│   │   ├── PreparingColumn ("A Preparar")
│   │   │   └── OrderCard[] (com timer de preparacao)
│   │   └── ReadyColumn ("Prontos para Servir")
│   │       └── OrderCard[] (view-only, sem botao)
│   │
│   └── NotificationOverlay (new order popup)
│
├── SettingsSheet (bottom sheet)
│   ├── SoundToggle
│   ├── NotificationToggle
│   ├── ReadyColumnToggle
│   ├── PrinterConfig
│   └── Logout
│
└── PrintPreview (modal)
    └── ReceiptPreview + PrintButton
```

### 6.3 Features Nativas Especificas

| Feature | Biblioteca | Descricao |
|---------|------------|-----------|
| Keep Awake | `expo-keep-awake` | Ecra sempre ligado (obrigatorio para KDS) |
| Sound Alerts | `expo-av` | Som de novo pedido |
| Haptic Alerts | `expo-haptics` | Vibracao no tablet ao novo pedido |
| Push Notifications | `expo-notifications` | Backup quando app em background |
| Drag & Drop | `react-native-gesture-handler` + custom | Arrastar entre colunas |
| Network Printing | TCP socket via `react-native-tcp-socket` | Impressora de cozinha via rede |
| Landscape Lock | `expo-screen-orientation` | Forcar horizontal em tablet |
| Fullscreen/Kiosk | Config nativa (Android) | Modo quiosque para tablet dedicado |
| Background Audio | `expo-av` | Som mesmo com app em segundo plano |

### 6.4 Consideracoes para Tablet de Cozinha

**Hardware recomendado:**
- Samsung Galaxy Tab A8 (10.5") - ~€230 (boa relacao qualidade/preco)
- Samsung Galaxy Tab S6 Lite (10.4") - ~€350 (melhor performance)
- iPad 10th gen (10.9") - ~€400 (se ja usam iOS)

**Setup do tablet:**
1. Instalar app via MDM ou sideload (Android) / TestFlight (iOS)
2. Ativar "Kiosk mode" (Android: usar Screen Pinning ou Knox; iOS: Guided Access)
3. Desativar auto-sleep
4. Configurar WiFi fixo do restaurante
5. Montar suporte de parede na cozinha

### 6.5 Tarefas de Desenvolvimento

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 5.1 | App setup no monorepo | 1d | Fase 3 (monorepo) |
| 5.2 | Login screen (kitchen role) | 1d | 5.1 |
| 5.3 | Kanban board layout (3 colunas) | 3d | 5.2 |
| 5.4 | Order card component | 2d | 5.3 |
| 5.5 | Drag-and-drop entre colunas | 3d | 5.3 |
| 5.6 | Real-time order updates (Supabase) | 2d | 5.3 |
| 5.7 | Sound + notification alerts | 1d | 5.6 |
| 5.8 | Location filter | 1d | 5.3 |
| 5.9 | Network printer integration | 3d | 5.3 |
| 5.10 | Settings sheet | 1d | 5.3 |
| 5.11 | Keep-awake + landscape lock | 0.5d | 5.1 |
| 5.12 | Kiosk mode setup (Android) | 1d | 5.1 |
| 5.13 | Offline fallback (cached orders) | 2d | 5.6 |
| 5.14 | Testes | 2d | Todos |
| 5.15 | Polish + performance | 2d | Todos |
| 5.16 | Build + distribute | 1d | Todos |
| **Total** | | **~25.5 dias (~5 semanas)** | |

---

## 7. Arquitetura Mobile Partilhada

### 7.1 Estrutura do Monorepo

```
sushi-mobile/
│
├── apps/
│   ├── mesa/                    # App cliente (QR ordering)
│   │   ├── app/                 # Expo Router pages
│   │   ├── assets/              # Icones, splash, imagens
│   │   ├── app.json             # Expo config
│   │   └── package.json
│   │
│   ├── waiter/                  # App empregado
│   │   ├── app/
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── kitchen/                 # App cozinha (KDS)
│       ├── app/
│       ├── assets/
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── domain/                  # COPIA DIRETA de src/domain/
│   │   ├── entities/            # Order, Session, Table, Product, etc.
│   │   ├── repositories/        # Interfaces (IOrderRepository, etc.)
│   │   ├── services/            # OrderService, SessionService, etc.
│   │   └── value-objects/       # OrderStatus, SessionStatus, etc.
│   │
│   ├── application/             # COPIA DIRETA de src/application/
│   │   ├── use-cases/           # Todos os use cases
│   │   ├── dto/                 # DTOs
│   │   └── ports/               # Interfaces externas
│   │
│   ├── infrastructure/          # Adaptado para React Native
│   │   ├── repositories/        # Supabase repos (AsyncStorage em vez de cookies)
│   │   ├── realtime/            # Supabase realtime handlers
│   │   ├── storage/             # MMKV / AsyncStorage wrappers
│   │   └── notifications/       # Expo Notifications service
│   │
│   ├── shared-ui/               # Componentes partilhados entre apps
│   │   ├── OrderCard.tsx
│   │   ├── ProductCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── theme.ts             # Cores, fontes, espacamentos
│   │
│   └── config/                  # Configuracao partilhada
│       ├── supabase.ts          # Cliente Supabase para RN
│       ├── features.ts          # Feature flags (mobile)
│       ├── api.ts               # Base URL + fetch wrapper
│       └── constants.ts         # Enums, cores, etc.
│
├── turbo.json                   # Turborepo config
├── package.json                 # Workspace root
└── tsconfig.base.json           # TypeScript base config
```

### 7.2 Reutilizacao de Codigo

| Camada | % Reutilizado | Fonte |
|--------|---------------|-------|
| Domain (entities, services, value-objects) | **100%** | Copia direta de `src/domain/` |
| Application (use cases, DTOs) | **100%** | Copia direta de `src/application/` |
| Infrastructure (repositories) | **~80%** | Adaptar auth (AsyncStorage vs cookies) |
| Presentation (hooks) | **~50%** | Logica reutilizada, UI diferente |
| UI Components | **0%** | React Native !== React DOM |

### 7.3 Autenticacao Mobile

```typescript
// packages/infrastructure/auth/mobile-auth.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### 7.4 Push Notifications Architecture

```
                    ┌─────────────────┐
                    │  Supabase DB    │
                    │  (order update) │
                    └────────┬────────┘
                             │ trigger
                    ┌────────v────────┐
                    │  Edge Function  │
                    │  (webhook)      │
                    └────────┬────────┘
                             │
                    ┌────────v────────┐
                    │  Expo Push      │
                    │  Service        │
                    └───┬────────┬────┘
                        │        │
                   ┌────v──┐ ┌──v────┐
                   │  APNs │ │  FCM  │
                   │ (iOS) │ │(Andr) │
                   └───┬───┘ └───┬───┘
                       │         │
                   ┌───v─────────v───┐
                   │   Device App    │
                   │ (notification)  │
                   └─────────────────┘
```

**Trigger events:**
- `order.status = 'ready'` → Push para app mesa do cliente
- `waiter_call.created` → Push para app waiter
- `order.created` → Push para app kitchen
- `reservation approaching` → Push para app waiter

---

## 8. Publicacao nas Stores

### 8.1 Apple App Store (iOS)

#### Pre-requisitos
- [ ] Conta Apple Developer Program ($99/ano)
- [ ] Certificados de distribuicao (gerados via EAS)
- [ ] App Store Connect account configurada
- [ ] D-U-N-S number da empresa (se conta Organization)

#### Processo passo a passo

**1. Preparacao (1-2 dias)**
- Criar App ID no Apple Developer Portal
- Configurar Push Notification capability
- Configurar Camera capability (QR scanner)
- Preparar Privacy Policy URL (obrigatorio)
- Preparar Terms of Service URL

**2. Assets necessarios**
- [ ] Icone da app (1024x1024px, sem transparencia)
- [ ] Screenshots iPhone 6.7" (1290x2796px) - minimo 3
- [ ] Screenshots iPhone 6.5" (1284x2778px) - minimo 3
- [ ] Screenshots iPad 12.9" (2048x2732px) - se suportar iPad
- [ ] App Preview video (opcional, max 30s) - recomendado
- [ ] Descricao curta (30 chars) e longa (4000 chars)
- [ ] Keywords (100 chars max)
- [ ] Categoria: Food & Drink
- [ ] Subcategoria: Restaurants
- [ ] Classificacao etaria: 4+ (sem conteudo restrito)

**3. Privacy Nutrition Labels**
- [ ] Dados recolhidos: Email, Nome, Numero Mesa
- [ ] Dados de uso: Analytics (opcional)
- [ ] Tracking: Nenhum (nao usamos tracking de terceiros)

**4. Build e Submit**
```bash
# Build com EAS
eas build --platform ios --profile production

# Submit para App Store
eas submit --platform ios

# Ou manualmente via Xcode/Transporter
```

**5. Review**
- Tempo tipico: 24-48h (90% dos casos)
- Rejeicoes comuns para apps de restaurante:
  - Falta de Privacy Policy
  - Screenshots incompletos
  - App sem funcionalidade suficiente (precisa de restaurante ativo)
  - Sign in with Apple obrigatorio se oferecer social login

**6. TestFlight (beta)**
- Internal: ate 100 testers, disponivel imediatamente
- External: ate 10,000 testers, requer beta review (24-48h)
- Builds expiram em 90 dias

#### Atualizacoes
- **OTA via EAS Update**: JS bundle updates sem review (segundos)
- **Native updates**: Requer nova build + review (24-48h)
- Recomendacao: Usar OTA para bugfixes, Store para features nativas

### 8.2 Google Play Store (Android)

#### Pre-requisitos
- [ ] Conta Google Play Developer ($25 one-time)
- [ ] Verificacao de identidade (NIF + documento)
- [ ] Keystore de assinatura (gerado via EAS)

#### Processo passo a passo

**1. Preparacao (1-2 dias)**
- Criar app no Google Play Console
- Configurar App Signing by Google Play
- Configurar Firebase (para FCM push notifications)

**2. Assets necessarios**
- [ ] Icone da app (512x512px)
- [ ] Feature graphic (1024x500px) - header na Store
- [ ] Screenshots phone (min 2, max 8) - 16:9 ou 9:16
- [ ] Screenshots tablet 7" (opcional)
- [ ] Screenshots tablet 10" (opcional)
- [ ] Descricao curta (80 chars) e longa (4000 chars)
- [ ] Categoria: Food & Drink
- [ ] Content rating questionnaire
- [ ] Data safety form

**3. Closed Testing (OBRIGATORIO para novas contas)**
- [ ] Criar track de teste fechado
- [ ] Adicionar minimo 20 testers (emails)
- [ ] Correr teste por minimo 14 dias
- [ ] So depois pode submeter para producao

**4. Build e Submit**
```bash
# Build com EAS
eas build --platform android --profile production

# Submit para Google Play
eas submit --platform android

# Output: .aab (Android App Bundle)
```

**5. Review**
- Tempo tipico: poucas horas a 3 dias
- Novas contas: ate 7 dias
- Rejeicoes comuns:
  - Data safety form incompleto
  - Permissoes nao justificadas (camera, bluetooth)
  - Target API level desatualizado

### 8.3 Distribuicao Enterprise (Staff Apps)

Para apps de waiter e kitchen que nao precisam de estar publicas:

#### Opcao A: Google Play Private (Android)
- Publicar como app "Private" visivel so para a organizacao
- Requer Google Workspace ou MDM
- Updates automaticos via Play Store
- **Custo:** $0 adicional

#### Opcao B: Sideload APK (Android)
- Hospedar APK num servidor proprio
- Staff instala manualmente
- Precisa ativar "Unknown sources"
- **Custo:** $0

#### Opcao C: TestFlight permanente (iOS)
- Builds expiram em 90 dias (re-upload necessario)
- Ate 10,000 testers
- Sem custo adicional
- **Limitacao:** builds expiram, requer re-install periodico

#### Opcao D: Apple Enterprise Program (iOS)
- Distribuicao direta sem App Store
- $299/ano
- Risco de revogacao se Apple detetar uso publico
- **Recomendado apenas se:** tiver muitos dispositivos iOS internos

### 8.4 Estrategia Recomendada

| App | iOS | Android |
|-----|-----|---------|
| **Mesa (Cliente)** | App Store (publica) | Google Play (publica) |
| **Waiter (Staff)** | TestFlight | Google Play Private ou sideload |
| **Kitchen (KDS)** | TestFlight / Guided Access | Google Play Private ou sideload |

---

## 9. Custos Detalhados

### 9.1 Custos Fixos (Anuais)

| Item | Custo | Frequencia | Obrigatorio |
|------|-------|------------|-------------|
| Apple Developer Program | €91/ano | Anual | Sim (para iOS) |
| Google Play Developer | €23 | Unico (one-time) | Sim (para Android) |
| Apple Enterprise Program | €275/ano | Anual | Nao (so se distribuicao interna iOS) |

### 9.2 Custos de Servicos (Mensais)

| Servico | Free Tier | Plano Pago | Necessidade |
|---------|-----------|------------|-------------|
| **EAS Build (Expo)** | 30 builds/mes | $99/mes (unlimited) | Recomendado para equipa |
| **EAS Update (OTA)** | 1000 users/mes | $99/mes (unlimited) | Incluido no plano acima |
| **Expo Push Service** | Ilimitado | $0 | Sim |
| **Firebase (FCM)** | Ilimitado push | $0 | Sim (Android) |
| **Supabase** | Ja existente | Ja existente | Sem custo adicional |
| **Vercel** | Ja existente | Ja existente | Sem custo adicional |

### 9.3 Custos de Hardware (Kitchen)

| Item | Custo | Quantidade | Total |
|------|-------|------------|-------|
| Tablet Samsung Galaxy Tab A8 | ~€230 | 1-2 por restaurante | €230-460 |
| Suporte parede para tablet | ~€25 | 1-2 | €25-50 |
| Impressora termica (cozinha) | ~€250 | 1 por restaurante | €250 |
| Impressora termica (waiter, opcional) | ~€150 | 1-2 | €150-300 |

### 9.4 Custos de Desenvolvimento (Estimativa)

| Fase | Duracao | Custo (1 dev senior) | Custo (2 devs) |
|------|---------|---------------------|-----------------|
| Fase 1 - Feature Flags | ~3 dias | €1,200 | €1,200 |
| Fase 2 - PWA | ~2.5 dias | €1,000 | €1,000 |
| Fase 3 - App Mesa | ~9 semanas | €14,400 | €10,000 |
| Fase 4 - App Waiter | ~7 semanas | €11,200 | €8,000 |
| Fase 5 - App Kitchen | ~5 semanas | €8,000 | €5,600 |
| **Total** | **~25 semanas** | **€35,800** | **€25,800** |

> *Nota: Estimativas baseadas em rate medio de €400/dia para dev senior. Com 2 devs, Fases 3-5 podem ser parcialmente paralelizadas.*

### 9.5 Resumo de Custos (Primeiro Ano)

| Categoria | Custo Minimo | Custo Completo |
|-----------|-------------|----------------|
| Stores (iOS + Android) | €114 | €114 |
| EAS Build (12 meses) | €0 (free tier) | €1,188 |
| Hardware (2 restaurantes) | €510 | €1,520 |
| Desenvolvimento | €25,800 | €35,800 |
| **Total Primeiro Ano** | **~€26,424** | **~€38,622** |

| Categoria | Custo Minimo | Custo Completo |
|-----------|-------------|----------------|
| **Anual Recorrente (apos ano 1)** | **~€91** | **~€1,279** |

---

## 10. Cronograma Geral

```
2026
Mar     Abr     Mai     Jun     Jul     Ago     Set     Out
│       │       │       │       │       │       │       │
├─F1─┤  │       │       │       │       │       │       │
│ Feature Flags (3d)    │       │       │       │       │
│  ├─F2─┤       │       │       │       │       │       │
│  │ PWA (2.5d) │       │       │       │       │       │
│  │    │       │       │       │       │       │       │
│  │    ├───────── F3: App Mesa ─────────┤      │       │
│  │    │  Setup   Menu    Cart   Orders │ Games│ Polish│
│  │    │  Auth    QR      Push   RT     │      │ Submit│
│  │    │       │       │       │       │       │       │
│  │    │       │       ├──── F4: App Waiter ───┤       │
│  │    │       │       │  Dashboard  Tables    │ Print │
│  │    │       │       │  Sessions   Billing   │ Submit│
│  │    │       │       │       │       │       │       │
│  │    │       │       │       │  ├── F5: Kitchen ──┤  │
│  │    │       │       │       │  │  Kanban  DnD    │  │
│  │    │       │       │       │  │  RT      Print  │  │
│  │    │       │       │       │  │  Kiosk   Submit │  │
│       │       │       │       │       │       │       │
```

### Timeline Detalhada

| Fase | Inicio | Fim | Dependencias |
|------|--------|-----|--------------|
| **F1: Feature Flags** | Semana 1 | Semana 1 | Nenhuma |
| **F2: PWA** | Semana 1-2 | Semana 2 | Nenhuma (paralelo com F1) |
| **F3: App Mesa** | Semana 2 | Semana 11 | F1 (feature flags partilhados) |
| **F4: App Waiter** | Semana 6 | Semana 13 | F3 (monorepo + packages) |
| **F5: App Kitchen** | Semana 10 | Semana 15 | F3 (monorepo + packages) |
| **Store Review** | Semana 11+ | Semana 16 | Builds completos |

**Total: ~4 meses com 2 developers** (Fases 4 e 5 parcialmente paralelas com F3)

### Milestones

| Marco | Data Estimada | Criterio de Sucesso |
|-------|---------------|---------------------|
| M1: Feature Flags Live | Semana 1 | Plano "Essencial" funciona com flags desativados |
| M2: PWA Instalavel | Semana 2 | Mesa, waiter e kitchen instalaveis como PWA |
| M3: Mesa App Beta | Semana 8 | TestFlight + Internal Testing funcional |
| M4: Mesa App Store | Semana 11 | Publicada em ambas as stores |
| M5: Waiter App Beta | Semana 11 | TestFlight para staff |
| M6: Waiter App Deploy | Semana 13 | Distribuida via TestFlight/sideload |
| M7: Kitchen App Beta | Semana 13 | Testada em tablet de cozinha |
| M8: Kitchen App Deploy | Semana 15 | Instalada nos tablets dos restaurantes |
| M9: Sistema Completo | Semana 16 | Tudo em producao, monitorizado |

---

## 11. Riscos e Mitigacoes

### Riscos Tecnicos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Bluetooth printing falha em certos dispositivos | Media | Alto | Testar com impressoras especificas antes; fallback para impressao via API (rede) |
| Apple rejeita app por falta de funcionalidade | Media | Medio | Preparar conta demo com dados reais; documentar fluxo completo para reviewer |
| Supabase Realtime falha intermitente em mobile | Baixa | Alto | Implementar retry logic + polling fallback + React Query cache |
| Performance em Android low-end | Media | Medio | Testar em dispositivos baratos; otimizar renders com `React.memo` |
| OTA updates incompativeis com native code | Baixa | Medio | Separar JS updates de native updates; usar EAS Update channels |

### Riscos de Negocio

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Clientes nao querem instalar app | Alta | Alto | PWA como alternativa; QR code abre web se app nao instalada |
| Custo de manutencao 3 apps | Media | Alto | Monorepo com codigo partilhado; minimizar divergencias |
| Staff resiste a nova ferramenta | Media | Medio | Treino; periodo de transicao com web e app em paralelo |
| Impressoras incompativeis | Media | Medio | Comprar modelos testados; manter fallback via web/API print |

### Riscos de Projeto

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Scope creep no mobile | Alta | Alto | Features MVP rigido; nao adicionar features que web nao tem |
| Atraso na review da App Store | Baixa | Baixo | Submeter com antecedencia; usar TestFlight para staff |
| Inconsistencia web vs mobile | Media | Medio | Usar mesmos use cases e DTOs; API unica |

---

## Apendice A: Dependencias React Native

### Partilhadas (todas as apps)

```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "@supabase/supabase-js": "^2.43.0",
  "@tanstack/react-query": "^5.50.0",
  "react-native-reanimated": "~3.15.0",
  "react-native-gesture-handler": "~2.20.0",
  "react-native-mmkv": "^2.12.0",
  "expo-secure-store": "~13.0.0",
  "expo-notifications": "~0.28.0",
  "expo-haptics": "~13.0.0"
}
```

### Mesa (adicional)

```json
{
  "expo-camera": "~15.0.0",
  "@gorhom/bottom-sheet": "^4.6.0",
  "expo-linking": "~6.3.0"
}
```

### Waiter (adicional)

```json
{
  "react-native-thermal-receipt-printer-image-qr": "^0.18.0",
  "expo-keep-awake": "~13.0.0",
  "expo-background-fetch": "~12.0.0"
}
```

### Kitchen (adicional)

```json
{
  "expo-keep-awake": "~13.0.0",
  "expo-screen-orientation": "~7.0.0",
  "expo-av": "~14.0.0",
  "react-native-tcp-socket": "^6.0.0"
}
```

---

## Apendice B: Checklist de Publicacao

### App Store (iOS)

- [ ] Apple Developer account ativa
- [ ] Bundle ID registado (com.sushiinsushi.mesa / .waiter / .kitchen)
- [ ] Push Notification certificate/key
- [ ] Privacy Policy URL publicada
- [ ] App Store Connect app record criado
- [ ] Screenshots preparados (6.7" + 6.5" + iPad opcional)
- [ ] Icone 1024x1024 sem transparencia
- [ ] Descricao em PT + EN
- [ ] Classificacao etaria submetida
- [ ] Privacy Nutrition Labels preenchidos
- [ ] Build uploaded via EAS
- [ ] TestFlight internal testing aprovado
- [ ] TestFlight external testing (opcional, 14d)
- [ ] Submitted for App Review
- [ ] Aprovado e publicado

### Google Play (Android)

- [ ] Google Play Developer account ativa
- [ ] Verificacao de identidade completa
- [ ] App Signing configurado
- [ ] Firebase project para FCM
- [ ] Data Safety form preenchido
- [ ] Content rating questionnaire
- [ ] Screenshots preparados (phone + tablet opcional)
- [ ] Feature graphic 1024x500
- [ ] Icone 512x512
- [ ] Closed testing track (20 testers, 14 dias)
- [ ] Build (.aab) uploaded via EAS
- [ ] Internal testing aprovado
- [ ] Production track submitted
- [ ] Aprovado e publicado

---

## Apendice C: Comandos EAS Uteis

```bash
# Setup inicial
npx create-expo-app sushi-mobile --template expo-template-blank-typescript
cd sushi-mobile
eas init

# Build de desenvolvimento
eas build --platform all --profile development

# Build de producao
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit para stores
eas submit --platform ios
eas submit --platform android

# OTA update (sem rebuild)
eas update --channel production --message "Fix: corrigido bug no carrinho"

# Preview em dispositivo
npx expo start --dev-client
```

---

> **Proximo passo:** Comecar pela Fase 1 (Feature Flags) que desbloqueia a venda modular, seguida da Fase 2 (PWA) como quick win antes do investimento em React Native.
