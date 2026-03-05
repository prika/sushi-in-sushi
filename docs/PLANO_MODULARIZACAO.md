# Plano de Modularizacao - RestoHub

> **Data:** 2026-03-05
> **Versao:** 1.0
> **Estado:** Planeamento

---

## Planos Relacionados

| Plano | Ficheiro | Prioridade |
|-------|----------|------------|
| **Stripe (Pagamento Mesa)** | [PLANO_STRIPE_PAGAMENTO_MESA.md](PLANO_STRIPE_PAGAMENTO_MESA.md) | 1 (proximo) |
| **Feature Flags + PWA** | [PLANO_FEATURE_FLAGS_PWA.md](PLANO_FEATURE_FLAGS_PWA.md) | 2 |
| **Modularizacao** | Este documento | 3 (pre-requisito do mobile) |
| **Apps Mobile** | [PLANO_MOBILE.md](PLANO_MOBILE.md) | 4 |

---

## Indice

1. [Objetivo](#1-objetivo)
2. [Estrutura do Monorepo](#2-estrutura-do-monorepo)
3. [Extracao de Packages](#3-extracao-de-packages)
4. [Reutilizacao de Codigo por Camada](#4-reutilizacao-de-codigo-por-camada)
5. [Autenticacao Mobile](#5-autenticacao-mobile)
6. [Push Notifications](#6-push-notifications)
7. [Tarefas de Implementacao](#7-tarefas-de-implementacao)

---

## 1. Objetivo

Transformar o codebase atual (monolito Next.js) numa **arquitetura monorepo** com packages partilhados. Isto permite que web e mobile (React Native) importem o mesmo domain e application layer — zero duplicacao de logica de negocio.

### Principio

```
┌─────────────────────────────────────────────────┐
│              Monorepo (Turborepo)                │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ packages/    │  │ apps/                     │ │
│  │  domain/     │←─│  web/ (Next.js atual)     │ │
│  │  application/│←─│  mesa/ (React Native)     │ │
│  │  config/     │←─│  waiter/ (React Native)   │ │
│  │  shared-ui/  │←─│  kitchen/ (React Native)  │ │
│  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Regra fundamental:** Dependencias apontam sempre para os packages. Apps nunca importam diretamente de outras apps.

---

## 2. Estrutura do Monorepo

```
restohub/
│
├── apps/
│   ├── web/                         # Next.js atual (src/ atual migra para aqui)
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages
│   │   │   ├── components/          # React DOM components
│   │   │   ├── presentation/        # Hooks, contexts (web-specific)
│   │   │   └── infrastructure/      # Supabase repos (web auth: cookies)
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   ├── mesa/                        # App cliente (React Native)
│   │   ├── app/                     # Expo Router pages
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   ├── waiter/                      # App empregado (React Native)
│   │   ├── app/
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── kitchen/                     # App cozinha KDS (React Native)
│       ├── app/
│       ├── assets/
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── domain/                      # @restohub/domain
│   │   ├── entities/                # Order, Session, Table, Product, etc.
│   │   ├── repositories/            # Interfaces (IOrderRepository, etc.)
│   │   ├── services/                # OrderService, SessionService, etc.
│   │   ├── value-objects/           # OrderStatus, SessionStatus, etc.
│   │   ├── index.ts                 # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── application/                 # @restohub/application
│   │   ├── use-cases/               # Todos os use cases
│   │   ├── dto/                     # DTOs
│   │   ├── ports/                   # Interfaces externas
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── infrastructure/              # @restohub/infrastructure
│   │   ├── repositories/            # Supabase repos (base, sem auth-specific)
│   │   ├── realtime/                # Supabase realtime handlers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-ui/                   # @restohub/shared-ui (React Native only)
│   │   ├── OrderCard.tsx
│   │   ├── ProductCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── theme.ts                 # Cores, fontes, espacamentos
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                      # @restohub/config
│       ├── supabase.ts              # Factory de cliente Supabase
│       ├── features.ts              # Feature flags (mobile: via API)
│       ├── api.ts                   # Base URL + fetch wrapper
│       ├── constants.ts             # Enums, cores, etc.
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json                       # Turborepo pipeline config
├── package.json                     # Workspace root
└── tsconfig.base.json               # TypeScript base config
```

> **Importante:** O `package.json` da raiz define workspaces; cada app declara `"@restohub/domain": "workspace:*"` e `"@restohub/application": "workspace:*"`.

---

## 3. Extracao de Packages

### 3.1 @restohub/domain

Extrair de `src/domain/` — camada pura, zero dependencias externas.

**Conteudo:**
- 13 entidades (Order, Session, Table, Product, Category, Staff, Reservation, Customer, Restaurant, etc.)
- 14 interfaces de repositorio
- 5 domain services (OrderService, SessionService, TableService, CustomerTierService, KitchenPrintService)
- Value objects (OrderStatus, SessionStatus, TableStatus, CustomerTier, Location)

**Migracao:** Copy + ajustar imports para paths relativos dentro do package.

```json
// packages/domain/package.json
{
  "name": "@restohub/domain",
  "version": "1.0.0",
  "main": "index.ts",
  "types": "index.ts",
  "dependencies": {}
}
```

### 3.2 @restohub/application

Extrair de `src/application/` — depende apenas de `@restohub/domain`.

**Conteudo:**
- 57+ use cases organizados por feature
- DTOs (OrderDTO, KitchenOrderDTO, SessionOrderDTO, etc.)
- Result pattern (`Result<T>`)
- Ports (interfaces para servicos externos)

```json
// packages/application/package.json
{
  "name": "@restohub/application",
  "version": "1.0.0",
  "main": "index.ts",
  "types": "index.ts",
  "dependencies": {
    "@restohub/domain": "workspace:*"
  }
}
```

### 3.3 @restohub/infrastructure

Base partilhada de repositorios Supabase. Cada app adapta a parte de auth.

**O que partilhar:**
- Logica de mapeamento snake_case ↔ camelCase
- Query builders e filtros comuns
- Realtime handlers

**O que difere por plataforma:**
- Web: `createClient()` com cookies (`@supabase/ssr`)
- Mobile: `createClient()` com SecureStore (ver secao 5)

### 3.4 Estrategia de Migracao

A migracao do web pode ser **incremental** — nao e preciso mover tudo de uma vez:

1. Criar packages com symlinks para o codigo existente
2. Atualizar imports no web (`@/domain/` → `@restohub/domain`)
3. Verificar que build e testes passam
4. Apps mobile importam diretamente dos packages

---

## 4. Reutilizacao de Codigo por Camada

| Camada | % Reutilizado | Web | Mobile | Notas |
|--------|---------------|-----|--------|-------|
| Domain (entities, services, value-objects) | **100%** | `@restohub/domain` | `@restohub/domain` | Identico, zero adaptacao |
| Application (use cases, DTOs) | **100%** | `@restohub/application` | `@restohub/application` | Identico, zero adaptacao |
| Infrastructure (repositories) | **~80%** | Cookies auth | SecureStore auth | Base partilhada, auth difere |
| Presentation (hooks) | **~50%** | React hooks | React hooks | Logica reutilizada, UI bindings diferem |
| UI Components | **0%** | React DOM | React Native | Plataformas incompativeis |
| Config (constants, enums) | **100%** | `@restohub/config` | `@restohub/config` | Identico |

### O que NAO partilhar

- Componentes React DOM (web) vs React Native (mobile) — plataformas incompativeis
- Auth adapters (cookies vs SecureStore) — implementacao especifica
- Next.js specifics (App Router, Server Components, middleware)
- Expo specifics (app.json, metro config, native modules)

---

## 5. Autenticacao Mobile

O Supabase client no mobile usa `expo-secure-store` em vez de cookies:

```typescript
// packages/config/supabase-mobile.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

export function createMobileSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
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
}
```

**Factory pattern** — cada app chama a factory com a sua plataforma:

```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'; // cookies

// apps/mesa/lib/supabase.ts
import { createMobileSupabaseClient } from '@restohub/config/supabase-mobile';
const supabase = createMobileSupabaseClient(URL, KEY);
```

---

## 6. Push Notifications

### 6.1 Arquitetura

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

### 6.2 Trigger Events

| Evento | Destino | Mensagem |
|--------|---------|----------|
| `order.status = 'ready'` | App Mesa (cliente) | "Pedido pronto para servir!" |
| `waiter_call.created` | App Waiter | "Mesa X precisa de ajuda" |
| `order.created` | App Kitchen | "Novo pedido da mesa X" |
| `reservation approaching` | App Waiter | "Reserva em 30 min — mesa X" |

### 6.3 Edge Function: Requisitos de Seguranca

O handler da Edge Function **deve** incluir:

1. **Autenticacao de webhook** — validar `x-supabase-signature` via HMAC-SHA256
2. **Validacao de payload** — schema + ownership (sessao ativa na mesa)
3. **Rate-limiting** — por `table_id` (10 req/min)
4. **Logging estruturado** — timestamp, event_type, resultado, rejeicoes

```typescript
// supabase/functions/push-notifications/index.ts
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

interface WebhookPayload {
  event_type: 'order.ready' | 'waiter_call.created' | 'order.created';
  table_id: string;
  user_id: string;
  restaurant_id: string;
}

function validatePayload(body: unknown): body is WebhookPayload {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  return (
    typeof p.event_type === 'string' &&
    typeof p.table_id === 'string' &&
    typeof p.user_id === 'string' &&
    typeof p.restaurant_id === 'string'
  );
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-supabase-signature');

  // 1. Verify signature
  if (!verifySignature(rawBody, signature)) {
    log('warn', 'Signature verification failed', { reason: 'signature_failed' });
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Validate payload
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch {
    log('warn', 'Invalid JSON', { reason: 'invalid_json' });
    return new Response('Bad Request', { status: 400 });
  }

  if (!validatePayload(payload)) {
    log('warn', 'Invalid payload', { reason: 'invalid_payload' });
    return new Response('Bad Request', { status: 400 });
  }

  // 3. Ownership check
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('table_id', payload.table_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) {
    log('warn', 'Ownership failed', { reason: 'ownership_failed', table_id: payload.table_id });
    return new Response('Forbidden', { status: 403 });
  }

  // 4. Rate limit
  if (!checkRateLimit(`table:${payload.table_id}`)) {
    log('warn', 'Rate limit exceeded', { reason: 'rate_limited', table_id: payload.table_id });
    return new Response('Too Many Requests', { status: 429 });
  }

  // 5. Dispatch
  log('info', 'Dispatching push', {
    event_type: payload.event_type,
    table_id: payload.table_id,
    restaurant_id: payload.restaurant_id,
  });

  // TODO: Implement sendExpoPush() — fetch push tokens from DB, call Expo Push API
  // await sendExpoPush(payload);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 7. Tarefas de Implementacao

| # | Tarefa | Estimativa | Notas |
|---|--------|------------|-------|
| 1 | Setup Turborepo workspace + turbo.json | 0.5d | Root package.json, workspaces config |
| 2 | Criar `packages/domain` — copiar `src/domain/`, barrel exports | 1d | Zero dependencias externas |
| 3 | Criar `packages/application` — copiar `src/application/`, barrel exports | 1d | Depende de @restohub/domain |
| 4 | Criar `packages/config` — constantes, enums, Supabase factories | 0.5d | Web + mobile factories |
| 5 | Migrar `apps/web` — atualizar imports `@/domain/` → `@restohub/domain` | 2d | Incremental, verificar build |
| 6 | Criar `packages/infrastructure` — base partilhada de repos | 1d | Mapeamento + queries comuns |
| 7 | Adaptar testes para imports de packages | 1d | 3006 testes devem continuar a passar |
| 8 | Criar `packages/shared-ui` — componentes RN partilhados | 1d | Para apps mobile |
| 9 | Edge Function push-notifications (Supabase) | 2d | HMAC, rate-limit, Expo Push API |
| 10 | Documentar setup para novos developers | 0.5d | README do monorepo |
| **Total** | | **~10.5 dias (~2 semanas)** | |

### Ordem de Execucao

```
1. Turborepo setup
   │
   ├─> 2. packages/domain
   │   └─> 3. packages/application
   │       └─> 5. Migrar web imports
   │           └─> 7. Adaptar testes
   │
   ├─> 4. packages/config
   │
   ├─> 6. packages/infrastructure
   │
   ├─> 8. packages/shared-ui (pode ser paralelo)
   │
   └─> 9. Edge Function push (pode ser paralelo)
       └─> 10. Documentacao
```

---

> **Pre-requisitos:** Feature Flags implementados ([PLANO_FEATURE_FLAGS_PWA.md](PLANO_FEATURE_FLAGS_PWA.md)).
> **Proximo passo:** Com packages extraidos, iniciar as apps mobile ([PLANO_MOBILE.md](PLANO_MOBILE.md)).
