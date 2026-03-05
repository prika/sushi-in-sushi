# Plano Agentic Commerce — MCP Server

> **Data:** 2026-03-05
> **Versão:** 1.0
> **Estado:** Planeamento
> **Prioridade:** Média (após Stripe payments)

---

## 1. Contexto

### O que existe hoje

O RestoHub é um SaaS multi-restaurante com:
- **Next.js 14** (App Router) + TypeScript
- **Supabase** (auth + database + realtime)
- **Vercel** (deploy)
- **Stripe** (pagamentos — em implementação, ver `PLANO_STRIPE_PAGAMENTO_MESA.md`)
- **Stuart** (entregas)

O sistema já suporta pedidos via QR code na mesa, gestão de cozinha, reservas, e dashboard admin. Mas **todos os pedidos são iniciados por humanos** — não há forma de agentes de IA interagirem programaticamente.

### O que queremos

Permitir que **agentes de IA** (Claude, ChatGPT, etc.) façam pedidos de forma autónoma em nome de utilizadores autenticados, usando o **Model Context Protocol (MCP)** da Anthropic.

```
HOJE:   Utilizador → Browser → Pedido manual
FUTURO: Utilizador → Agente IA → MCP Server → Pedido automático
        (com confirmação do utilizador antes de cobrar)
```

### Princípio fundamental

> **Não alterar nada do que já existe.** Só adicionar.

O MCP Server é uma camada nova que reutiliza os use cases, repositories e domain services existentes.

---

## 2. Arquitetura

### Onde encaixa o MCP Server

```
                    ┌──────────────────┐
                    │   Agente IA      │
                    │ (Claude, ChatGPT)│
                    └────────┬─────────┘
                             │ MCP Protocol (JSON-RPC over HTTP)
                             ▼
                    ┌──────────────────┐
                    │  /api/mcp/route  │  ← Nova API route (SSE transport)
                    │  MCP Server      │
                    └────────┬─────────┘
                             │ OAuth2 token validation
                             ▼
                    ┌──────────────────┐
                    │  /lib/mcp/       │
                    │  tools.ts        │  ← 7 tools expostas
                    │  auth.ts         │  ← Autenticação OAuth2
                    │  validators.ts   │  ← Validação + rate limiting
                    └────────┬─────────┘
                             │ Reutiliza camadas existentes
                             ▼
              ┌──────────────────────────────┐
              │  Application Layer           │
              │  (Use Cases existentes)      │
              │  + novos use cases MCP       │
              ├──────────────────────────────┤
              │  Domain Layer                │
              │  (Entidades, Services)       │
              ├──────────────────────────────┤
              │  Infrastructure Layer        │
              │  (Supabase Repositories)     │
              └──────────────────────────────┘
```

### Fluxo de um pedido via agente

```
1. Agente → POST /api/mcp (tool: get_restaurants)
   ← Lista de restaurantes abertos

2. Agente → POST /api/mcp (tool: get_menu, restaurant_id: "xxx")
   ← Menu com preços por tipo de pedido

3. Agente → POST /api/mcp (tool: calculate_order, items: [...])
   ← Subtotal, delivery fee, tax, total estimado

4. Agente → mostra resumo ao utilizador (se require_confirmation=true)
   Utilizador confirma ✓

5. Agente → POST /api/mcp (tool: create_order, items: [...])
   ← order_id, payment_status, estimated_delivery_time

6. Agente → POST /api/mcp (tool: get_order_status, order_id: "xxx")
   ← Status em tempo real, tracking URL
```

---

## 3. Tools MCP

### 3.1 get_restaurants

Lista restaurantes disponíveis com estado de abertura.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| location | string | Não | Filtrar por localização (slug) |

**Retorna:**
```typescript
{
  restaurants: Array<{
    id: string;
    name: string;
    slug: string;
    address: string;
    is_open: boolean;
    delivery_time_estimate: number; // minutos
    order_types: ('dine_in' | 'takeaway' | 'delivery')[];
  }>
}
```

**Use cases reutilizados:** `GetAllRestaurantsUseCase`, `GetActiveRestaurantsUseCase`

---

### 3.2 get_menu

Menu completo de um restaurante com preços corretos para o tipo de pedido.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| restaurant_id | string (UUID) | Sim | ID do restaurante |
| order_type | 'takeaway' \| 'delivery' | Sim | Tipo de pedido (afeta preços via `vendus_ids`) |

**Retorna:**
```typescript
{
  categories: Array<{
    id: string;
    name: string;
    products: Array<{
      id: number; // products.id é INTEGER
      name: string;
      description: string;
      price: number;
      image_url: string | null;
      available: boolean;
      allergens: string[];
    }>
  }>
}
```

**Use cases reutilizados:** Queries de `IProductRepository` e `ICategoryRepository`

**Nota:** Preços resolvidos via `vendus_ids[order_type]` (ver `PLANO_STRIPE_PAGAMENTO_MESA.md` secção Vendus Multi-Mode).

---

### 3.3 get_past_orders

Histórico de pedidos do utilizador autenticado.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| restaurant_id | string (UUID) | Não | Filtrar por restaurante |
| limit | number | Não | Número de pedidos (default: 5, max: 20) |

**Retorna:**
```typescript
{
  orders: Array<{
    id: string;
    restaurant_name: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    order_type: string;
    created_at: string; // ISO 8601
    status: string;
  }>
}
```

**Utilidade:** Permite ao agente sugerir "repetir o pedido habitual" ou recomendar baseado em histórico.

---

### 3.4 calculate_order

Calcula total antes de criar pedido (dry-run).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| restaurant_id | string (UUID) | Sim | ID do restaurante |
| items | Array<{ product_id: number; quantity: number }> | Sim | Items do pedido |
| order_type | 'takeaway' \| 'delivery' | Sim | Tipo de pedido |
| delivery_address | string | Condicional | Obrigatório se order_type='delivery' |

**Retorna:**
```typescript
{
  subtotal: number;
  delivery_fee: number; // 0 se takeaway
  tax: number;
  total: number;
  estimated_delivery_time: number; // minutos
  items_detail: Array<{
    product_id: number;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}
```

**Nota:** Não cria nada na base de dados — é puramente cálculo.

---

### 3.5 create_order

Cria pedido e inicia pagamento.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| restaurant_id | string (UUID) | Sim | ID do restaurante |
| items | Array<{ product_id: number; quantity: number }> | Sim | Items |
| order_type | 'takeaway' \| 'delivery' | Sim | Tipo |
| delivery_address | string | Condicional | Se delivery |
| payment_method_id | string | Sim | Stripe payment method do utilizador |
| require_confirmation | boolean | Não | Default: true — retorna resumo antes de cobrar |

**Comportamento com `require_confirmation`:**
- `true` (default): Retorna resumo completo. Agente deve chamar `create_order` novamente com `confirmed: true` para efetivar.
- `false`: Cria pedido e cobra imediatamente (só se utilizador permitiu nas settings).

**Retorna:**
```typescript
{
  order_id: string;
  status: 'pending_confirmation' | 'confirmed' | 'payment_processing';
  payment_status: 'pending' | 'succeeded' | 'failed';
  total: number;
  estimated_delivery_time: number;
  confirmation_required: boolean;
}
```

**Validações críticas:**
1. Verificar `agent_sessions.max_order_value` — rejeitar se total > limite
2. Verificar rate limit (max 10 pedidos/hora/utilizador)
3. Verificar que `require_confirmation` respeita config do utilizador
4. Criar entrada em `agent_actions_log`

---

### 3.6 get_order_status

Estado atual de um pedido.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| order_id | string (UUID) | Sim | ID do pedido |

**Retorna:**
```typescript
{
  order_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  tracking_url: string | null;    // Stuart tracking
  driver_name: string | null;      // Stuart driver
  estimated_delivery_at: string | null; // ISO 8601
  updated_at: string;
}
```

---

### 3.7 cancel_order

Cancela pedido se ainda em estado cancelável.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| order_id | string (UUID) | Sim | ID do pedido |
| reason | string | Não | Motivo do cancelamento |

**Retorna:**
```typescript
{
  success: boolean;
  message: string; // "Pedido cancelado" ou "Pedido não pode ser cancelado (estado: preparing)"
  refund_status: 'initiated' | 'not_applicable' | null;
}
```

**Restrições:** Só cancela se status é `pending` ou `confirmed`. Estados posteriores requerem intervenção humana.

---

## 4. Autenticação e Segurança

### 4.1 Modelo OAuth2

```
Utilizador → /settings/agents → Autoriza agente
           → Define scopes, limite de valor, require_confirmation
           → Gera access_token com TTL

Agente → POST /api/mcp
       → Header: Authorization: Bearer <access_token>
       → Server valida token, scopes, limites
       → Executa tool
       → Log em agent_actions_log
```

### 4.2 Scopes

| Scope | Permite |
|-------|---------|
| `menu:read` | `get_restaurants`, `get_menu` |
| `orders:read` | `get_past_orders`, `get_order_status` |
| `orders:write` | `calculate_order`, `create_order`, `cancel_order` |

### 4.3 Limites configuráveis pelo utilizador

| Configuração | Default | Descrição |
|--------------|---------|-----------|
| `max_order_value` | 50.00 € | Valor máximo por pedido |
| `require_confirmation` | true | Agente confirma com utilizador antes de cobrar |
| `allowed_restaurants` | todos | Restaurantes onde o agente pode pedir |
| `allowed_order_types` | todos | Tipos de pedido permitidos |

### 4.4 Rate Limiting

- **10 pedidos/hora** por utilizador (create_order)
- **100 requests/hora** por sessão de agente (todas as tools)
- **429 Too Many Requests** com `Retry-After` header

### 4.5 Logging obrigatório

Todas as chamadas a tools são logadas em `agent_actions_log`:
- Tool chamada
- Parâmetros (sanitizados — sem tokens de pagamento)
- Resultado (sucesso/erro)
- Timestamp

---

## 5. Base de Dados

### 5.1 Nova tabela: `agent_sessions`

```sql
-- Migration: 095_agent_sessions.sql

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Utilizador que autorizou
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Agente
    agent_name TEXT NOT NULL,  -- 'claude', 'chatgpt', 'custom'
    agent_description TEXT,    -- Descrição livre do agente

    -- Permissões
    scopes TEXT[] NOT NULL DEFAULT ARRAY['menu:read'],
    max_order_value NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    require_confirmation BOOLEAN NOT NULL DEFAULT true,
    allowed_restaurants UUID[],   -- NULL = todos
    allowed_order_types TEXT[],   -- NULL = todos; ex: ARRAY['takeaway', 'delivery']

    -- Token
    access_token TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL,  -- SHA-256 do token (para lookup seguro)

    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_token_hash ON agent_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- Utilizador só vê/gere as suas sessões
CREATE POLICY agent_sessions_user_select ON agent_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY agent_sessions_user_insert ON agent_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_sessions_user_update ON agent_sessions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY agent_sessions_user_delete ON agent_sessions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY agent_sessions_admin_all ON agent_sessions
    FOR ALL TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());
```

### 5.2 Nova tabela: `agent_actions_log`

```sql
CREATE TABLE IF NOT EXISTS agent_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referências
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Ação
    tool_name TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,

    -- Contexto
    ip_address INET,
    user_agent TEXT,
    duration_ms INTEGER,  -- Tempo de execução da tool

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agent_actions_session_id ON agent_actions_log(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON agent_actions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_tool ON agent_actions_log(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions_log(created_at DESC);

-- RLS
ALTER TABLE agent_actions_log ENABLE ROW LEVEL SECURITY;

-- Utilizador só vê os seus logs
CREATE POLICY agent_actions_user_select ON agent_actions_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Inserção via service role (API route)
-- Sem policy de INSERT para authenticated — logs são criados server-side

-- Admin full access
CREATE POLICY agent_actions_admin_all ON agent_actions_log
    FOR ALL TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());
```

### 5.3 Nova tabela: `agent_rate_limits`

```sql
CREATE TABLE IF NOT EXISTS agent_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,

    UNIQUE(session_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_session ON agent_rate_limits(session_id, window_start DESC);

ALTER TABLE agent_rate_limits ENABLE ROW LEVEL SECURITY;

-- Só service role escreve
CREATE POLICY agent_rate_limits_admin ON agent_rate_limits
    FOR ALL TO authenticated
    USING (is_current_user_admin());
```

---

## 6. Ficheiros a Criar

### Estrutura

```
src/
├── app/
│   ├── api/
│   │   └── mcp/
│   │       └── route.ts              # Endpoint MCP Server (SSE transport)
│   └── [locale]/
│       └── conta/
│           └── agentes/
│               └── page.tsx           # UI gestão de agentes (dentro da área de conta)
│
├── lib/
│   └── mcp/
│       ├── server.ts                  # MCP Server setup (@modelcontextprotocol/sdk)
│       ├── tools.ts                   # Definição e handler das 7 tools
│       ├── auth.ts                    # Validação OAuth2 token + scopes
│       ├── validators.ts              # Validação de parâmetros + limites
│       └── rate-limiter.ts            # Rate limiting por sessão
│
├── application/
│   └── use-cases/
│       └── agent/
│           ├── ValidateAgentSessionUseCase.ts
│           ├── LogAgentActionUseCase.ts
│           └── CheckAgentRateLimitUseCase.ts
│
├── domain/
│   ├── entities/
│   │   └── AgentSession.ts
│   └── repositories/
│       └── IAgentSessionRepository.ts
│
└── infrastructure/
    └── repositories/
        └── SupabaseAgentSessionRepository.ts

supabase/
└── migrations/
    └── 095_agent_sessions.sql         # Tabelas: agent_sessions, agent_actions_log, agent_rate_limits
```

### 6.1 /lib/mcp/server.ts — MCP Server Setup

```typescript
// Usa @modelcontextprotocol/sdk
// Configura StreamableHTTPServerTransport para SSE
// Regista as 7 tools
// Middleware: auth validation → rate limiting → tool execution → logging
```

### 6.2 /lib/mcp/tools.ts — Implementação das Tools

```typescript
// Cada tool segue o padrão:
// 1. Validar parâmetros (validators.ts)
// 2. Verificar scopes do agente (auth.ts)
// 3. Executar via use cases existentes
// 4. Formatar resposta para o agente
// 5. Log da ação (agent_actions_log)

// Tools reutilizam use cases existentes:
// - get_restaurants → GetActiveRestaurantsUseCase
// - get_menu → IProductRepository + ICategoryRepository
// - get_past_orders → IOrderRepository (nova query por user_id)
// - calculate_order → OrderService (cálculos) + domain logic
// - create_order → CreateOrderUseCase + Stripe PaymentIntent
// - get_order_status → GetOrderByIdUseCase
// - cancel_order → UpdateOrderStatusUseCase (com validação)
```

### 6.3 /app/api/mcp/route.ts — API Route

```typescript
// Endpoint principal: POST /api/mcp
// Transport: StreamableHTTPServerTransport (HTTP+SSE)
// Flow:
//   1. Extrair Bearer token do header Authorization
//   2. Validar token via ValidateAgentSessionUseCase
//   3. Passar request ao MCP Server
//   4. Server executa tool → retorna resultado
//   5. Log em agent_actions_log
```

### 6.4 /app/[locale]/conta/agentes/page.tsx — UI de Gestão

```
┌─────────────────────────────────────────────────────────┐
│  Agentes IA                                              │
│                                                          │
│  Gerir agentes que podem fazer pedidos em seu nome.      │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Claude                           Ativo ●            │ │
│  │ Scopes: menu:read, orders:read, orders:write        │ │
│  │ Limite: 50.00€  │  Confirmação: Sim                 │ │
│  │ Último uso: há 2 horas                              │ │
│  │                                                     │ │
│  │ [Editar]  [Revogar]  [Ver Logs]                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ChatGPT                          Inativo ○          │ │
│  │ Scopes: menu:read                                   │ │
│  │ Expirado: 2026-02-28                                │ │
│  │                                                     │ │
│  │ [Reativar]  [Remover]  [Ver Logs]                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [+ Adicionar Agente]                                    │
│                                                          │
│  ─── Logs Recentes ──────────────────────────────────── │
│  │ 14:32  Claude  get_menu          ✓ Sucesso          │ │
│  │ 14:31  Claude  get_restaurants   ✓ Sucesso          │ │
│  │ 14:15  Claude  create_order      ✓ Pedido #847      │ │
│  │ 14:14  Claude  calculate_order   ✓ Total: 32.50€    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Dependências NPM

```json
{
  "@modelcontextprotocol/sdk": "^1.12.0"
}
```

Única dependência nova. O MCP SDK da Anthropic fornece:
- `McpServer` — Classe principal do servidor
- `StreamableHTTPServerTransport` — Transport HTTP+SSE para Next.js
- Types para tools, resources, prompts

---

## 8. Fluxo MVP Completo

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Utilizador  │     │  Agente IA   │     │  MCP Server     │
│ (Browser)   │     │ (Claude/GPT) │     │  (/api/mcp)     │
└──────┬──────┘     └──────┬───────┘     └────────┬────────┘
       │                   │                      │
       │ 1. Autoriza agente│                      │
       │ em /conta/agentes │                      │
       │ (scopes, limites) │                      │
       │───────────────────>                      │
       │                   │                      │
       │  Token gerado     │                      │
       │<───────────────────                      │
       │                   │                      │
       │                   │ 2. get_restaurants   │
       │                   │─────────────────────>│
       │                   │     Lista restaurantes│
       │                   │<─────────────────────│
       │                   │                      │
       │                   │ 3. get_menu           │
       │                   │─────────────────────>│
       │                   │     Menu + preços     │
       │                   │<─────────────────────│
       │                   │                      │
       │                   │ 4. calculate_order   │
       │                   │─────────────────────>│
       │                   │     Total: 32.50€    │
       │                   │<─────────────────────│
       │                   │                      │
       │ 5. "Confirma      │                      │
       │    32.50€?"       │                      │
       │<──────────────────│                      │
       │                   │                      │
       │ "Sim, confirmar"  │                      │
       │──────────────────>│                      │
       │                   │                      │
       │                   │ 6. create_order      │
       │                   │   (confirmed: true)  │
       │                   │─────────────────────>│
       │                   │     order_id, status  │
       │                   │<─────────────────────│
       │                   │                      │
       │                   │ 7. get_order_status  │
       │                   │─────────────────────>│
       │                   │     "A preparar"     │
       │                   │<─────────────────────│
       │ "O seu pedido     │                      │
       │  está a ser       │                      │
       │  preparado!"      │                      │
       │<──────────────────│                      │
```

---

## 9. Segurança — Checklist

| # | Aspecto | Implementação |
|---|---------|---------------|
| 1 | **Token seguro** | `crypto.randomBytes(48).toString('hex')` + SHA-256 hash em DB |
| 2 | **Token TTL** | Expira em 30 dias (configurável), renovação manual |
| 3 | **Scopes granulares** | Cada tool verifica scope antes de executar |
| 4 | **Limite de valor** | `max_order_value` verificado em `create_order` antes de cobrar |
| 5 | **Confirmação obrigatória** | `require_confirmation=true` por default em todos os pedidos |
| 6 | **Rate limiting** | 10 orders/h + 100 requests/h por sessão |
| 7 | **Logging completo** | Todas as ações em `agent_actions_log` com IP e user-agent |
| 8 | **Sem dados sensíveis** | Tokens de pagamento nunca logados, mascarados nos logs |
| 9 | **Revogação imediata** | Utilizador pode revogar token a qualquer momento via UI |
| 10 | **Validação server-side** | Todos os parâmetros validados com Zod schemas |

---

## 10. Tarefas de Implementação

### Fase 1 — Fundação (prioridade alta)

| # | Tarefa | Descrição |
|---|--------|-----------|
| 1 | Migration SQL | Tabelas `agent_sessions`, `agent_actions_log`, `agent_rate_limits` com RLS |
| 2 | Domain entities | `AgentSession` entity + `IAgentSessionRepository` interface |
| 3 | Infrastructure | `SupabaseAgentSessionRepository` |
| 4 | Use cases | `ValidateAgentSessionUseCase`, `LogAgentActionUseCase`, `CheckAgentRateLimitUseCase` |

### Fase 2 — MCP Server (prioridade alta)

| # | Tarefa | Descrição |
|---|--------|-----------|
| 5 | `/lib/mcp/auth.ts` | Validação de token + extração de scopes |
| 6 | `/lib/mcp/validators.ts` | Schemas Zod para parâmetros de cada tool |
| 7 | `/lib/mcp/rate-limiter.ts` | Rate limiting por sessão com sliding window |
| 8 | `/lib/mcp/tools.ts` | Implementação das 7 tools com handlers |
| 9 | `/lib/mcp/server.ts` | MCP Server setup com `@modelcontextprotocol/sdk` |
| 10 | `/app/api/mcp/route.ts` | API route com SSE transport |

### Fase 3 — UI + Polish (prioridade média)

| # | Tarefa | Descrição |
|---|--------|-----------|
| 11 | `/conta/agentes/page.tsx` | UI para gerir agentes (CRUD + logs) |
| 12 | Token generation | Fluxo de criação de token com scopes picker |
| 13 | Logs viewer | Tabela de logs com filtros por tool e data |

### Fase 4 — Testes (prioridade média)

| # | Tarefa | Descrição |
|---|--------|-----------|
| 14 | Unit tests | Tools, validators, rate limiter, auth |
| 15 | Integration tests | Fluxo completo: auth → tool → response → log |
| 16 | E2E com MCP client | Testar com `@modelcontextprotocol/sdk` client |

---

## 11. Compatibilidade com ACP (Futuro)

O MCP Server é o passo imediato. No futuro, o sistema pode também expor endpoints **Agentic Commerce Protocol (ACP)** — o standard aberto da OpenAI + Stripe para comércio agentic.

```
MCP (Anthropic)  — Tool-based, agente chama tools diretamente
ACP (OpenAI/Stripe) — Checkout-based, agente inicia checkout sessions
```

A arquitetura proposta suporta ambos porque:
- As tools do MCP mapeiam diretamente para endpoints ACP (get_menu → Product Catalog, create_order → Checkout Session)
- A camada de autenticação OAuth2 é compatível com ACP
- Os use cases são reutilizáveis por ambos os protocolos

Para ACP, seria necessário adicionar:
- Endpoints REST (`/api/acp/checkouts`, `/api/acp/products`)
- Shared Payment Tokens (SPT) do Stripe
- Product feed sync para o Stripe Dashboard

Mas isso é uma evolução futura — o MCP cobre o MVP.

---

## 12. Regras Importantes (Resumo)

1. **`require_confirmation=true`** por default em todos os pedidos
2. **Nunca processar pagamento** sem validar limites configurados pelo utilizador
3. **Guardar log completo** de todas as ações no Supabase (`agent_actions_log`)
4. **TypeScript estrito** — todos os parâmetros tipados e validados com Zod
5. **Tratar todos os erros** e retornar mensagens claras para o agente
6. **Não alterar código existente** — apenas adicionar novos ficheiros e tabelas
7. **Reutilizar use cases existentes** sempre que possível
