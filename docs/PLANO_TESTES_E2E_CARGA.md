# Plano de Testes E2E e Carga — Sushi in Sushi

## Visao Geral

Este documento define os testes automaticos de fluxo (E2E) e de carga para cobrir os principais fluxos do sistema. Complementa os testes unitarios existentes (3006 unit tests) que cobrem logica isolada.

---

## 1. Testes E2E (Playwright)

### Setup

- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, Mobile Safari (webkit)
- **Ambiente:** Supabase local (`npx supabase start`) + Next.js dev server
- **Dados:** Seed script dedicado para testes (`supabase/seed-e2e.sql`)
- **CI:** GitHub Actions com Playwright container

### Estrutura de Ficheiros

```
e2e/
├── fixtures/
│   ├── auth.ts              # Login helpers (admin, waiter, kitchen, customer)
│   └── seed.ts              # Reset + seed DB antes de cada suite
├── pages/                   # Page Object Models
│   ├── mesa.page.ts
│   ├── cozinha.page.ts
│   ├── waiter.page.ts
│   ├── admin.page.ts
│   ├── reserva.page.ts
│   └── auth.page.ts
├── flows/
│   ├── pedido-completo.spec.ts
│   ├── reserva-completa.spec.ts
│   ├── sessao-mesa.spec.ts
│   ├── waiter-workflow.spec.ts
│   ├── kitchen-workflow.spec.ts
│   ├── admin-gestao.spec.ts
│   ├── customer-auth.spec.ts
│   ├── pagamento-mesa.spec.ts
│   └── realtime-sync.spec.ts
└── playwright.config.ts
```

---

### Fluxo 1: Pedido Completo (QR Code -> Entrega)

**Ficheiro:** `e2e/flows/pedido-completo.spec.ts`
**Prioridade:** Critica

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Abrir `/mesa/{numero}` | Pagina de mesa carrega, menu visivel |
| 2 | Verificar sessao (PIN) | Sessao ativa criada |
| 3 | Adicionar items ao carrinho | Carrinho atualiza (contador, total) |
| 4 | Submeter pedido | Toast de confirmacao, pedido criado |
| 5 | Abrir `/cozinha` (login kitchen) | Pedido aparece em "Na fila" |
| 6 | Avancar para "A preparar" | Card move para coluna correta |
| 7 | Avancar para "Pronto para servir" | Card em "Pronto", sem botao de acao |
| 8 | Abrir `/waiter/mesa/{id}` (login waiter) | Pedido aparece em "Prontos para Servir" |
| 9 | Marcar como "Entregue" | Pedido move para "Entregue" |

**Testes adicionais:**
- Pedido com items de categorias diferentes
- Pedido em modo Rodizio vs A La Carte
- Cancelamento de pedido pela cozinha
- Multiplos pedidos na mesma sessao

---

### Fluxo 2: Reserva Completa

**Ficheiro:** `e2e/flows/reserva-completa.spec.ts`
**Prioridade:** Critica

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Abrir `/reservar` | Formulario carrega com campos obrigatorios |
| 2 | Preencher dados (nome, email, phone, data, hora, pessoas) | Validacao inline funciona |
| 3 | Selecionar restaurante | Dropdown dinamico com localizacoes ativas |
| 4 | Submeter reserva | Sucesso, email enviado (mock Resend) |
| 5 | Admin abre `/admin` | Reserva aparece na lista com status "pending" |
| 6 | Admin confirma reserva | Status muda para "confirmed", email de confirmacao |
| 7 | Admin marca como "seated" | Status "completed", customer visit recorded |

**Testes adicionais:**
- Auto-reserva (restaurante com `auto_reservations=true`): skip confirmacao manual
- Cancelamento pelo cliente (via link no email)
- Reserva com horario indisponivel (restaurante fechado)
- Validacao de campos obrigatorios (submit vazio)
- Reserva para data passada (deve rejeitar)

---

### Fluxo 3: Sessao de Mesa

**Ficheiro:** `e2e/flows/sessao-mesa.spec.ts`
**Prioridade:** Critica

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Waiter abre mesa (via painel) | Mesa muda status para "occupied" |
| 2 | Cliente acede via QR code `/mesa/{numero}` | Sessao existente detetada |
| 3 | Cliente faz pedidos | Pedidos associados a sessao |
| 4 | Cliente pede conta | Sessao muda para "pending_payment" |
| 5 | Waiter confirma pagamento | Sessao fecha, mesa volta a "available" |

**Testes adicionais:**
- Sessao com multiplos participantes (session_customers)
- Mesa sem pedidos: botao "Encerrar Mesa" (fecho direto)
- Tentativa de abrir sessao em mesa ocupada

---

### Fluxo 4: Waiter Workflow

**Ficheiro:** `e2e/flows/waiter-workflow.spec.ts`
**Prioridade:** Alta

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Login waiter `/login` | Redireciona para `/waiter` |
| 2 | Ver dashboard | Stats bar, tabs ativas/disponiveis |
| 3 | Ver alerta de reserva proxima | Card com reserva confirmada dentro de janela de alerta |
| 4 | Atribuir mesas a reserva | Selecao principal (gold) + adicionais (azul) |
| 5 | Responder a chamada de cliente | Chamada muda de pending para acknowledged |
| 6 | Ver pedidos prontos | Seccao "Prontos para Servir" com pedidos ready |
| 7 | Marcar pedido como entregue | Pedido desaparece de "Prontos" |

**Testes adicionais:**
- Filtro por localizacao (mesas atribuidas ao waiter)
- Waiter sem mesas atribuidas (estado vazio)

---

### Fluxo 5: Kitchen Workflow

**Ficheiro:** `e2e/flows/kitchen-workflow.spec.ts`
**Prioridade:** Alta

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Login kitchen `/login` | Redireciona para `/cozinha` |
| 2 | Ver pedidos por status | Colunas "Na fila", "A preparar", "Pronto para servir" |
| 3 | Avancar pedido pending -> preparing | Card move, timestamp atualiza |
| 4 | Avancar pedido preparing -> ready | Card em "Pronto para servir", sem botao |
| 5 | Nome do waiter visivel | Icone com nome no card |

**Testes adicionais:**
- Real-time: novo pedido aparece automaticamente (sem refresh)
- Multiplos pedidos em simultaneo
- Impressao de pedido (mock browser print)

---

### Fluxo 6: Admin Gestao

**Ficheiro:** `e2e/flows/admin-gestao.spec.ts`
**Prioridade:** Alta

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Login admin `/login` | Redireciona para `/admin` |
| 2 | Dashboard KPIs | KPIs carregam com valores, graficos renderizam |
| 3 | Gerir produtos | CRUD: criar, editar, eliminar produto |
| 4 | Gerir staff | CRUD: criar com role, editar, eliminar |
| 5 | Gerir restaurantes | CRUD em `/admin/definicoes` tab restaurantes |
| 6 | Site settings | Alterar brand name, logo, metadata SEO |
| 7 | Agenda | Criar folga/ferias, visualizar calendario |
| 8 | QR codes | Gerar QR codes para mesas |

**Testes adicionais:**
- Permissoes: kitchen user nao acede `/admin`
- Validacoes de formularios (campos obrigatorios, formatos)
- Date range picker no dashboard funciona

---

### Fluxo 7: Customer Auth

**Ficheiro:** `e2e/flows/customer-auth.spec.ts`
**Prioridade:** Media

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Abrir `/registar` | Formulario de registo carrega |
| 2 | Preencher e submeter | Conta criada, redirect para `/entrar` |
| 3 | Login em `/entrar` | Autenticado, redirect para `/conta` |
| 4 | Ver area de conta | Reservas do cliente, perfil editavel |
| 5 | Recuperar password | Email enviado com link (mock) |
| 6 | Redefinir password via link | Password atualizada com sucesso |

**Testes adicionais:**
- Login com credenciais erradas
- Registo com email duplicado
- Campos obrigatorios no registo

---

### Fluxo 8: Pagamento na Mesa (Stripe)

**Ficheiro:** `e2e/flows/pagamento-mesa.spec.ts`
**Prioridade:** Media (quando Stripe implementado)

| Passo | Acao | Verificacao |
|-------|------|-------------|
| 1 | Sessao com pedidos entregues | Total calculado corretamente |
| 2 | Cliente clica "Pagar" | Stripe checkout abre (ou embed) |
| 3 | Preencher dados de pagamento (Stripe test card) | Pagamento processado |
| 4 | Confirmacao | Sessao fecha, mesa liberta, recibo disponivel |

**Testes adicionais:**
- Pagamento falhado (cartao recusado)
- Split payment (multiplos clientes)
- Gorjeta opcional

---

### Fluxo 9: Sincronizacao Real-time

**Ficheiro:** `e2e/flows/realtime-sync.spec.ts`
**Prioridade:** Media

| Cenario | Acao | Verificacao |
|---------|------|-------------|
| Novo pedido | Cliente submete pedido na mesa | Cozinha ve pedido sem refresh |
| Status update | Cozinha avanca pedido | Waiter ve atualizacao automatica |
| Chamada waiter | Cliente chama empregado | Waiter ve notificacao |
| Sessao multi-device | 2 browsers na mesma mesa | Carrinho sincronizado |

---

## 2. Testes de Carga (k6)

### Setup

- **Framework:** k6 (Grafana)
- **Motivo:** Leve, scripts em JS, bom para APIs HTTP e WebSockets
- **Metricas:** p95 response time, error rate, throughput
- **Ambiente:** Staging com Supabase dedicado (nao correr contra producao)

### Estrutura de Ficheiros

```
load-tests/
├── scenarios/
│   ├── hora-ponta-pedidos.js
│   ├── realtime-subscriptions.js
│   ├── api-dashboard.js
│   ├── reservas-simultaneas.js
│   └── auth-concurrent.js
├── helpers/
│   ├── auth.js
│   └── data.js
└── k6.config.js
```

---

### Cenario 1: Hora de Ponta — Pedidos Simultaneos

**Ficheiro:** `load-tests/scenarios/hora-ponta-pedidos.js`
**Prioridade:** Alta

Simula hora de pico num restaurante com todas as mesas ativas.

| Parametro | Valor |
|-----------|-------|
| Virtual users (VUs) | 30 (simula 30 mesas) |
| Duracao | 10 minutos |
| Ramp-up | 30s ate 30 VUs |
| Accoes por VU | Criar sessao, fazer 3-5 pedidos, pedir conta |

**Thresholds:**
- p95 response time < 500ms para POST /api/orders
- p95 response time < 300ms para GET /api/orders (kitchen)
- Error rate < 1%
- Nenhum pedido perdido (count in = count out)

---

### Cenario 2: Subscricoes Realtime

**Ficheiro:** `load-tests/scenarios/realtime-subscriptions.js`
**Prioridade:** Alta

Simula multiplos listeners (cozinha + waiters + mesas) em simultaneo.

| Parametro | Valor |
|-----------|-------|
| WebSocket connections | 50 (2 cozinhas + 8 waiters + 40 mesas) |
| Duracao | 5 minutos |
| Eventos/minuto | 60 (1 pedido/segundo) |

**Thresholds:**
- Latencia de propagacao < 2s (evento DB -> todos os listeners)
- Zero desconexoes nao planeadas
- Memoria do servidor estavel (sem leaks)

---

### Cenario 3: API Dashboard Analytics

**Ficheiro:** `load-tests/scenarios/api-dashboard.js`
**Prioridade:** Media

Dashboard admin com queries pesadas de agregacao.

| Parametro | Valor |
|-----------|-------|
| VUs | 5 (admins simultaneos) |
| Duracao | 5 minutos |
| Endpoints | dashboard-analytics, product-analytics, reservation-analytics, customer-analytics |

**Thresholds:**
- p95 response time < 2s para queries com date range de 30 dias
- p95 response time < 5s para queries com date range de 90 dias
- Sem timeouts

---

### Cenario 4: Reservas Simultaneas

**Ficheiro:** `load-tests/scenarios/reservas-simultaneas.js`
**Prioridade:** Media

Simula pico de reservas online (ex: promocao, fim de semana).

| Parametro | Valor |
|-----------|-------|
| VUs | 20 |
| Duracao | 5 minutos |
| Accoes por VU | Criar reserva, receber confirmacao |

**Thresholds:**
- p95 response time < 1s para POST /api/reservations
- Sem reservas duplicadas para o mesmo horario/mesa
- Emails despachados sem backlog (mock Resend)

---

### Cenario 5: Auth Concorrente

**Ficheiro:** `load-tests/scenarios/auth-concurrent.js`
**Prioridade:** Baixa

Logins simultaneos de staff e customers.

| Parametro | Valor |
|-----------|-------|
| VUs | 30 |
| Duracao | 3 minutos |
| Accoes | Login + refresh token + logout |

**Thresholds:**
- p95 login time < 1s
- Zero falsos 401/403
- Rate limiting funciona (brute force blocked)

---

## 3. Matriz de Prioridades

### E2E Tests

| Fluxo | Prioridade | Impacto no Negocio | Complexidade |
|-------|------------|---------------------|--------------|
| Pedido Completo | Critica | Core do negocio | Alta |
| Reserva Completa | Critica | Receita direta | Media |
| Sessao de Mesa | Critica | Operacao diaria | Media |
| Waiter Workflow | Alta | Eficiencia operacional | Media |
| Kitchen Workflow | Alta | Eficiencia operacional | Baixa |
| Admin Gestao | Alta | Gestao do restaurante | Alta |
| Customer Auth | Media | Fidelizacao | Baixa |
| Pagamento Mesa | Media | Receita (futuro) | Alta |
| Realtime Sync | Media | UX e confiabilidade | Alta |

### Load Tests

| Cenario | Prioridade | Quando Implementar |
|---------|------------|---------------------|
| Hora Ponta Pedidos | Alta | Antes de abrir nova localizacao |
| Realtime Subscriptions | Alta | Se houver latencia reportada |
| Dashboard Analytics | Media | Se admins reportarem lentidao |
| Reservas Simultaneas | Media | Antes de campanhas/promocoes |
| Auth Concorrente | Baixa | So se houver problemas |

---

## 4. Integracao CI/CD

### GitHub Actions — E2E

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    branches: [main, dev]
  schedule:
    - cron: '0 6 * * 1-5'  # Seg-Sex 6h UTC

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx supabase start
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Load Tests — Manual/Scheduled

```yaml
# .github/workflows/load-test.yml
name: Load Tests
on:
  workflow_dispatch:
    inputs:
      scenario:
        description: 'Cenario a executar'
        required: true
        type: choice
        options:
          - hora-ponta-pedidos
          - realtime-subscriptions
          - api-dashboard
          - reservas-simultaneas
          - auth-concurrent

jobs:
  load:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: load-tests/scenarios/${{ inputs.scenario }}.js
```

---

## 5. Metricas e Alertas

### E2E

- **Dashboard:** Playwright HTML report + GitHub Actions artifacts
- **Alerta:** PR bloqueado se testes criticos falharem
- **Flaky test policy:** 3 retries antes de marcar como falha

### Carga

- **Dashboard:** k6 Cloud ou Grafana (self-hosted)
- **Baseline:** Primeira execucao define baseline de performance
- **Regressao:** Alerta se p95 degradar mais de 20% vs baseline

---

## 6. Proximos Passos

1. **Fase 1 — Setup Playwright** (imediato)
   - Instalar e configurar Playwright
   - Criar fixtures de auth e seed
   - Implementar Fluxo 1 (Pedido Completo) como prova de conceito

2. **Fase 2 — Fluxos Criticos** (semana 1-2)
   - Implementar fluxos de Reserva e Sessao de Mesa
   - Adicionar ao CI (PR checks)

3. **Fase 3 — Fluxos Restantes** (semana 3-4)
   - Waiter, Kitchen, Admin, Customer Auth
   - Realtime sync tests

4. **Fase 4 — Load Tests** (quando necessario)
   - Setup k6 com cenario de hora de ponta
   - Executar antes de eventos criticos (nova localizacao, campanhas)
