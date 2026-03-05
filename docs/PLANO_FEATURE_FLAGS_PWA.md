# Plano Feature Flags + PWA

> **Data:** 2026-03-05
> **Versao:** 1.0
> **Estado:** Planeamento
> **Prioridade:** Alta (apos Stripe, antes de mobile)

---

## 1. Objetivo

Implementar **feature flags runtime** (via DB) e converter a app em **PWA**, preparando o codebase para white-label e melhorando a experiencia nos dispositivos do restaurante.

**Resultado:** Um unico build do Next.js serve clientes diferentes (cada um com features diferentes na DB), e a cozinha/waiter/mesa podem ser "instalados" como apps no dispositivo.

---

## 2. Feature Flags (Fase 1)

### 2.1 Sistema de Feature Flags

Criar um sistema centralizado de feature flags controlado por **base de dados** (runtime), nao por env vars (build-time). Isto permite que o mesmo build do Next.js sirva clientes diferentes — cada um com a sua configuracao na DB.

> **Porque nao `NEXT_PUBLIC_*` env vars?** O Next.js faz inline de `NEXT_PUBLIC_*` no JS bundle durante `next build`. Cada cliente precisaria de um build separado, o que contradiz a visao white-label de "um build, N clientes". Env vars server-only (`process.env.VENDUS_API_KEY`, etc.) sao resolvidas em runtime e continuam validas.

#### Tabela: `site_settings` (colunas novas)

Feature flags vivem como colunas booleanas na tabela singleton `site_settings` (id=1), que ja existe e tem RLS (public read, admin write).

```sql
-- Migration: 094_feature_flags.sql
ALTER TABLE site_settings
  -- Modulos de Negocio (default ON)
  ADD COLUMN IF NOT EXISTS feature_reservations BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_customer_loyalty BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_customer_auth BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_games BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_analytics BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_multi_location BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_kitchen_print BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_staff_calendar BOOLEAN NOT NULL DEFAULT true,

  -- Modos de Operacao (default ON)
  ADD COLUMN IF NOT EXISTS feature_rodizio_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_piece_limiter BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_waiter_calls BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_qr_ordering BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_allergen_display BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_product_ratings BOOLEAN NOT NULL DEFAULT true,

  -- Pagamento online (default OFF — ativar apos setup Stripe)
  ADD COLUMN IF NOT EXISTS feature_stripe_payments BOOLEAN NOT NULL DEFAULT false,

  -- Branding white-label
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#FFD700',
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS active_locales TEXT NOT NULL DEFAULT 'pt,en,fr,de,it,es',
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'restaurant';
```

#### Ficheiro Central: `src/lib/features/index.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

// Tipo com todas as feature flags
export interface Features {
  // Integracoes (auto-detect por env var server-only — runtime OK)
  VENDUS_POS: boolean;
  EMAIL_SERVICE: boolean;
  AI_DESCRIPTIONS: boolean;
  SMS_VERIFICATION: boolean;
  CRON_AUTOMATION: boolean;

  // Modulos de Negocio (da DB)
  RESERVATIONS: boolean;
  CUSTOMER_LOYALTY: boolean;
  CUSTOMER_AUTH: boolean;
  GAMES: boolean;
  ANALYTICS: boolean;
  MULTI_LOCATION: boolean;
  KITCHEN_PRINT: boolean;
  STAFF_CALENDAR: boolean;
  STRIPE_PAYMENTS: boolean;

  // Modos de Operacao (da DB)
  RODIZIO_MODE: boolean;
  PIECE_LIMITER: boolean;
  WAITER_CALLS: boolean;
  QR_ORDERING: boolean;
  ALLERGEN_DISPLAY: boolean;
  PRODUCT_RATINGS: boolean;
}

export type FeatureKey = keyof Features;

// Server-side: ler da DB com cache de 5 min
export const getFeatures = unstable_cache(
  async (): Promise<Features> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_settings')
      .select('feature_*')
      .eq('id', 1)
      .single();

    return {
      // Integracoes: auto-detect por API key (server-only env, runtime OK)
      VENDUS_POS: Boolean(process.env.VENDUS_API_KEY),
      EMAIL_SERVICE: Boolean(process.env.RESEND_API_KEY),
      AI_DESCRIPTIONS: Boolean(process.env.ANTHROPIC_API_KEY),
      SMS_VERIFICATION: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      CRON_AUTOMATION: Boolean(process.env.CRON_SECRET),

      // Modulos da DB (default true se DB falhar)
      RESERVATIONS: data?.feature_reservations ?? true,
      CUSTOMER_LOYALTY: data?.feature_customer_loyalty ?? true,
      CUSTOMER_AUTH: data?.feature_customer_auth ?? true,
      GAMES: data?.feature_games ?? true,
      ANALYTICS: data?.feature_analytics ?? true,
      MULTI_LOCATION: data?.feature_multi_location ?? true,
      KITCHEN_PRINT: data?.feature_kitchen_print ?? true,
      STAFF_CALENDAR: data?.feature_staff_calendar ?? true,
      STRIPE_PAYMENTS: data?.feature_stripe_payments ?? false,

      // Modos da DB
      RODIZIO_MODE: data?.feature_rodizio_mode ?? true,
      PIECE_LIMITER: data?.feature_piece_limiter ?? true,
      WAITER_CALLS: data?.feature_waiter_calls ?? true,
      QR_ORDERING: data?.feature_qr_ordering ?? true,
      ALLERGEN_DISPLAY: data?.feature_allergen_display ?? true,
      PRODUCT_RATINGS: data?.feature_product_ratings ?? true,
    };
  },
  ['feature-flags'],
  { revalidate: 300, tags: ['feature-flags'] } // 5 min cache
);

// Helper para uso em Server Components e API Routes
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const features = await getFeatures();
  return features[key];
}
```

### 2.2 Mapa de Features por Modulo

#### Modulo CORE (sempre ativo)

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

#### Modulos Opcionais

| Modulo | Flag DB | Ficheiros Chave |
|--------|---------|-----------------|
| RESERVATIONS | `feature_reservations` | `/api/reservations`, `useReservations`, 14 use cases |
| CUSTOMER_LOYALTY | `feature_customer_loyalty` | `CustomerTierService`, `useCustomers`, 11 use cases |
| CUSTOMER_AUTH | `feature_customer_auth` | `/[locale]/entrar`, `/[locale]/registar`, `/[locale]/conta` |
| GAMES | `feature_games` | `GameHub`, `QuizGame`, `SwipeRatingGame`, `PreferenceGame` |
| ANALYTICS | `feature_analytics` | `/api/admin/dashboard-analytics`, componentes `charts/` |
| MULTI_LOCATION | `feature_multi_location` | `useRestaurants`, `useLocations` |
| STAFF_CALENDAR | `feature_staff_calendar` | `/admin/agenda`, `StaffCalendar`, `useStaffTimeOff` |
| KITCHEN_PRINT | `feature_kitchen_print` | `KitchenPrintService`, `useKitchenPrint` |
| STRIPE_PAYMENTS | `feature_stripe_payments` | `PaymentSheet`, `/api/payments/*` |
| VENDUS_POS | Auto-detect `VENDUS_API_KEY` | `/admin/vendus/*`, `src/lib/vendus/` |
| AI_TOOLS | Auto-detect `ANTHROPIC_API_KEY` | `/api/products/generate-description` |

#### Modos de Operacao

| Modo | Flag DB | Descricao |
|------|---------|-----------|
| RODIZIO_MODE | `feature_rodizio_mode` | Modo all-you-can-eat |
| PIECE_LIMITER | `feature_piece_limiter` | Limite de pecas por sessao |
| WAITER_CALLS | `feature_waiter_calls` | Botao "Chamar empregado" na mesa |
| QR_ORDERING | `feature_qr_ordering` | Cliente faz pedidos via QR |
| ALLERGEN_DISPLAY | `feature_allergen_display` | Mostra alergenos nos produtos |
| PRODUCT_RATINGS | `feature_product_ratings` | Rating de produtos |

### 2.3 Exemplos White-Label

Cada deploy usa o **mesmo build** do Next.js. A diferenca entre clientes esta em:
1. **`.env`** — apenas segredos server-only (API keys, Supabase credentials)
2. **`site_settings` (DB)** — feature flags, branding, configuracao visivel

#### Cervejaria (sem sushi-specific)

```sql
UPDATE site_settings SET
  brand_name = 'Cervejaria Artesanal',
  business_type = 'brewery',
  feature_rodizio_mode = false,
  feature_piece_limiter = false,
  feature_games = false,
  feature_customer_loyalty = false,
  feature_customer_auth = false
WHERE id = 1;
```

#### Restaurante tradicional (waiter-only)

```sql
UPDATE site_settings SET
  brand_name = 'Restaurante Tradicional',
  feature_qr_ordering = false,
  feature_games = false,
  feature_rodizio_mode = false,
  feature_piece_limiter = false,
  feature_product_ratings = false
WHERE id = 1;
```

#### Sushi in Sushi (tudo ativo)

Defaults — tudo `true`. Nenhuma alteracao necessaria.

### 2.4 Branding White-Label

| Configuracao | Coluna DB | Default |
|-------------|-----------|---------|
| Nome do negocio | `brand_name` | 'Sushi in Sushi' |
| Logo | `logo_url` | NULL |
| Cor primaria | `primary_color` | '#FFD700' |
| Cor de fundo | `background_color` | '#1a1a1a' |
| Idiomas ativos | `active_locales` | 'pt,en,fr,de,it,es' |
| Moeda | `currency` | 'EUR' |
| Timezone | `timezone` | 'Europe/Lisbon' |
| Tipo de negocio | `business_type` | 'restaurant' |

A coluna `business_type` ajusta terminologia automaticamente:

| Termo | restaurant | brewery | cafe | fast_food |
|-------|-----------|---------|------|-----------|
| "Mesa" | Mesa | Mesa | Mesa | Balcao |
| "Empregado" | Empregado | Staff | Barista | Operador |
| "Cozinha" | Cozinha | Cozinha | Cozinha | Preparacao |

### 2.5 Implementacao Tecnica

#### FeaturesProvider (Client Components)

```typescript
// src/lib/features/FeaturesContext.tsx
'use client';
import { createContext, useContext } from 'react';
import type { Features, FeatureKey } from '@/lib/features';

const FeaturesContext = createContext<Features | null>(null);

export function FeaturesProvider({
  features,
  children
}: {
  features: Features;
  children: React.ReactNode;
}) {
  return (
    <FeaturesContext.Provider value={features}>
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures(): Features {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures must be used within FeaturesProvider');
  return ctx;
}

export function useFeature(key: FeatureKey): boolean {
  return useFeatures()[key];
}
```

#### Root Layout (Server Component injeta features)

```typescript
// src/app/layout.tsx
import { getFeatures } from '@/lib/features';
import { FeaturesProvider } from '@/lib/features/FeaturesContext';

export default async function RootLayout({ children }) {
  const features = await getFeatures(); // cached 5 min
  return (
    <html>
      <body>
        <FeaturesProvider features={features}>
          {children}
        </FeaturesProvider>
      </body>
    </html>
  );
}
```

#### FeatureGate Component (Client)

```typescript
// src/components/FeatureGate.tsx
'use client';
import { useFeature } from '@/lib/features/FeaturesContext';
import type { FeatureKey } from '@/lib/features';

export function FeatureGate({
  feature,
  children,
  fallback = null
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!useFeature(feature)) return fallback;
  return <>{children}</>;
}
```

#### Server Component Gate

```typescript
import { getFeatures } from '@/lib/features';

export default async function AdminReservasPage() {
  const features = await getFeatures();
  if (!features.RESERVATIONS) notFound();
  // ... render page
}
```

#### API Route Guard

```typescript
// src/lib/features/guard.ts
import { NextResponse } from 'next/server';
import { isFeatureEnabled, FeatureKey } from '@/lib/features';

export async function requireFeature(feature: FeatureKey): Promise<NextResponse | null> {
  if (!(await isFeatureEnabled(feature))) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
  }
  return null;
}

// Uso:
export async function GET(request: NextRequest) {
  const blocked = await requireFeature('RESERVATIONS');
  if (blocked) return blocked;
  // ... handle request
}
```

#### Revalidacao de Cache

```typescript
// No PATCH /api/admin/site-settings
import { revalidateTag } from 'next/cache';

export async function PATCH(request: Request) {
  // ... update site_settings
  revalidateTag('feature-flags');
  return NextResponse.json({ success: true });
}
```

### 2.6 Tarefas Feature Flags

| # | Tarefa | Estimativa | Prioridade |
|---|--------|------------|------------|
| 1.1 | Migration `094_feature_flags.sql` — colunas `feature_*` + branding em `site_settings` | 1h | Alta |
| 1.2 | Criar `src/lib/features/index.ts` — `getFeatures()` com `unstable_cache` | 2h | Alta |
| 1.3 | Criar `FeaturesContext.tsx` — `FeaturesProvider`, `useFeature()`, `useFeatures()` | 1h | Alta |
| 1.4 | Integrar `FeaturesProvider` no root layout | 1h | Alta |
| 1.5 | Criar `FeatureGate` component (client) | 0.5h | Alta |
| 1.6 | Envolver sidebar admin com feature gates | 3h | Alta |
| 1.7 | Envolver paginas admin com `getFeatures()` guards (Server Components) | 4h | Alta |
| 1.8 | Envolver tabs do mesa (jogos, chamar, etc.) com `FeatureGate` | 2h | Alta |
| 1.9 | Criar `requireFeature()` guard para API routes | 1h | Media |
| 1.10 | Adicionar guards nas API routes de modulos opcionais | 3h | Media |
| 1.11 | Envolver seccoes do waiter dashboard com gates | 2h | Media |
| 1.12 | UI de gestao de feature flags em `/admin/definicoes` | 3h | Media |
| 1.13 | Revalidacao de cache (`revalidateTag('feature-flags')`) no PATCH | 0.5h | Media |
| 1.14 | Testes unitarios para `getFeatures()`, `FeatureGate`, guards | 3h | Media |
| **Total** | | **~27h (~3.5 dias)** | |

---

## 3. PWA (Fase 2)

Converter a app existente num PWA completo. Experiencia "app-like" nos dispositivos do restaurante com zero custo de distribuicao.

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

### 3.3 PWA vs React Native

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

## 4. Cronograma

```
Semana 1-2: Feature Flags (3.5 dias)
  ├── Migration + lib/features + FeaturesContext
  ├── FeatureGate + guards (admin, mesa, waiter, API)
  └── UI admin + testes

Semana 2-3: PWA (2.5 dias)
  ├── Service Worker + Manifest + Offline
  ├── Push Notifications + Install Prompt
  └── Cache de Menu + Kitchen Keep-Awake
```

**Total: ~6 dias (~1.5 semanas)**

---

## 5. Relacao com Outros Planos

| Plano | Dependencia |
|-------|-------------|
| **Stripe (pagamento mesa)** | Feature flags permitem ativar/desativar Stripe via `feature_stripe_payments` |
| **Mobile (React Native)** | Apps mobile consomem feature flags via mesma API; PWA serve como bridge ate mobile estar pronto |
| **White-label** | Feature flags + branding DB sao a base do modelo white-label |

---

> **Proximo passo apos Stripe:** Implementar feature flags (Fase 1), seguido de PWA (Fase 2).
