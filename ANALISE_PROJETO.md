# SUSHI IN SUSHI - Análise Completa do Projeto

## Índice
1. [Especificações do Projeto](#1-especificações-do-projeto)
2. [Flows e Diagramas de Dados](#2-flows-e-diagramas-de-dados)
3. [Possíveis Melhorias](#3-possíveis-melhorias)
4. [Plano de Desenvolvimento](#4-plano-de-desenvolvimento)

---

## 1. Especificações do Projeto

### 1.1 Visão Geral

**Sushi in Sushi** é um sistema completo de gestão de restaurante japonês com suporte a múltiplas localizações (Circunvalação e Boavista), incluindo:

- Sistema de pedidos por QR code (self-service)
- Display de cozinha em tempo real
- Interface para empregados de mesa
- Dashboard administrativo
- Sistema de reservas online
- Programa de fidelização de clientes

### 1.2 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Frontend** | React + Next.js | 18.3.0 / 14.2.0 |
| **Linguagem** | TypeScript | 5.4.0 |
| **Styling** | Tailwind CSS | 3.4.0 |
| **Animações** | Framer Motion | 11.0.0 |
| **Base de Dados** | Supabase (PostgreSQL) | 2.93.3 |
| **Autenticação** | JWT (Jose) | 6.1.3 |
| **Email** | Resend | 6.9.1 |
| **i18n** | next-intl | 4.8.2 |
| **Testes** | Vitest | 4.0.18 |

### 1.3 Estrutura do Projeto

```
sushi/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── [locale]/             # Páginas públicas (PT, EN, FR, DE, IT, ES)
│   │   ├── admin/                # Dashboard administrativo
│   │   ├── cozinha/              # Display da cozinha
│   │   ├── waiter/               # Interface empregados
│   │   ├── mesa/[numero]/        # Sistema de pedidos por QR
│   │   └── api/                  # API Routes
│   ├── domain/                   # Camada de Domínio (SOLID)
│   │   ├── entities/             # Order, Product, Session, Table
│   │   ├── repositories/         # Interfaces dos repositórios
│   │   ├── services/             # OrderService, SessionService
│   │   └── value-objects/        # OrderStatus, SessionStatus
│   ├── application/              # Camada de Aplicação
│   │   ├── use-cases/            # GetKitchenOrders, CreateOrder, etc
│   │   └── dto/                  # Data Transfer Objects
│   ├── infrastructure/           # Implementações concretas
│   │   └── repositories/         # Supabase implementations
│   ├── presentation/             # Camada de Apresentação
│   │   ├── contexts/             # DependencyContext
│   │   └── hooks/                # useKitchenOrders, useProducts
│   ├── components/               # Componentes React (legado)
│   ├── hooks/                    # Hooks legados
│   ├── lib/                      # Utilitários e clientes
│   ├── types/                    # TypeScript types
│   └── messages/                 # Traduções i18n
├── supabase/
│   └── migrations/               # 14 migrações SQL
└── src/__tests__/                # Testes unitários
```

**Tamanho Total:** ~33.600 linhas de código

### 1.4 Funcionalidades Principais

#### Sistema de Mesas
- Geração de QR codes por mesa
- Sessões de refeição com múltiplos participantes
- Suporte a dispositivos múltiplos na mesma mesa
- Carrinho partilhado via localStorage

#### Menu Digital
- Categorias e produtos com imagens
- Suporte a Rodízio e À La Carte
- Preços e disponibilidade em tempo real
- Traduções em 6 idiomas

#### Gestão de Pedidos
- Estados: pending → preparing → ready → delivered
- Cancelamento em qualquer estado
- Notificações em tempo real
- Indicadores de urgência (tempo de espera)

#### Display de Cozinha
- Pedidos agrupados por mesa
- Filtros por estado
- Notificações sonoras
- Indicadores visuais de atraso

#### Sistema de Reservas
- Formulário público online
- Validação de disponibilidade
- Emails de confirmação automáticos
- Gestão de dias de fecho

#### Dashboard Admin
- Gestão de mesas e sessões
- Gestão de produtos e categorias
- Exportação de dados (CSV/JSON)
- Gestão de reservas
- Atribuição de empregados a mesas

### 1.5 Internacionalização

| Código | Idioma |
|--------|--------|
| pt | Português |
| en | English |
| fr | Français |
| de | Deutsch |
| it | Italiano |
| es | Español |

### 1.6 Localizações

| Código | Nome |
|--------|------|
| circunvalacao | Circunvalação |
| boavista | Boavista |

---

## 2. Flows e Diagramas de Dados

### 2.1 Arquitetura de Camadas (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│         (React Components, Hooks, Providers)                     │
│   useKitchenOrders, useProducts, DependencyContext              │
├─────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                             │
│              (Use Cases & DTOs)                                  │
│   GetKitchenOrdersUseCase, CreateOrderUseCase, Result<T>        │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                                │
│         (Entidades, Services & Interfaces)                       │
│   Order, Product, Session, OrderService, IOrderRepository       │
├─────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                           │
│              (Implementações Supabase)                           │
│   SupabaseOrderRepository, SupabaseProductRepository            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│              PostgreSQL + Real-time                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Modelo de Dados (ERD)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   roles     │       │   staff     │       │  customers  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ role_id(FK) │       │ id (PK)     │
│ name        │       │ id (PK)     │       │ name        │
│ permissions │       │ email       │       │ email       │
└─────────────┘       │ password    │       │ phone       │
                      │ name        │       │ points      │
                      │ location    │       └─────────────┘
                      └─────────────┘
                            │
                            │ waiter_tables
                            ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ categories  │       │   tables    │       │reservations │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │◄──────│ table_id(FK)│
│ name        │       │ number      │       │ id (PK)     │
│ display_ord │       │ name        │       │ name        │
│ location    │       │ location    │       │ email       │
└─────────────┘       │ status      │       │ date/time   │
      │               │ qr_code     │       │ guests      │
      │               └─────────────┘       │ status      │
      ▼                     │               └─────────────┘
┌─────────────┐             │
│  products   │             │
├─────────────┤             ▼
│ id (PK)     │       ┌─────────────┐       ┌─────────────┐
│ category_id │       │  sessions   │       │session_cust │
│ name        │       ├─────────────┤       ├─────────────┤
│ description │       │ id (PK)     │◄──────│ session_id  │
│ price       │       │ table_id(FK)│       │ id (PK)     │
│ image_url   │       │ status      │       │ device_id   │
│ available   │       │ type        │       │ name        │
│ location    │       │ created_at  │       └─────────────┘
└─────────────┘       │ closed_at   │
      │               └─────────────┘
      │                     │
      │                     ▼
      │               ┌─────────────┐       ┌─────────────┐
      └──────────────►│   orders    │       │waiter_calls │
                      ├─────────────┤       ├─────────────┤
                      │ id (PK)     │       │ id (PK)     │
                      │ session_id  │       │ table_id    │
                      │ product_id  │       │ type        │
                      │ quantity    │       │ status      │
                      │ status      │       │ message     │
                      │ notes       │       └─────────────┘
                      │ created_at  │
                      └─────────────┘
```

### 2.3 Estados e Transições

#### Order Status Flow
```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────┐    ┌──────────┐    ┌───────┐    ┌───────────┐ │
│ PENDING │───►│PREPARING │───►│ READY │───►│ DELIVERED │ │
└─────────┘    └──────────┘    └───────┘    └───────────┘ │
     │              │              │              │        │
     └──────────────┴──────────────┴──────────────┘        │
                    │                                      │
                    ▼                                      │
              ┌───────────┐                                │
              │ CANCELLED │────────────────────────────────┘
              └───────────┘     (não pode reverter)
```

#### Session Status Flow
```
┌────────┐    ┌─────────────────┐    ┌──────┐    ┌────────┐
│ ACTIVE │───►│ PENDING_PAYMENT │───►│ PAID │───►│ CLOSED │
└────────┘    └─────────────────┘    └──────┘    └────────┘
```

#### Reservation Status Flow
```
┌─────────┐    ┌───────────┐    ┌───────────┐
│ PENDING │───►│ CONFIRMED │───►│ COMPLETED │
└─────────┘    └───────────┘    └───────────┘
     │              │
     ▼              ▼
┌───────────┐  ┌─────────┐
│ CANCELLED │  │ NO_SHOW │
└───────────┘  └─────────┘
```

### 2.4 Flow de Pedido por QR Code

```
┌─────────────┐
│   Cliente   │
│  scan QR    │
└──────┬──────┘
       │
       ▼
┌─────────────┐    token válido?    ┌─────────────┐
│ /mesa/[num] │───────────────────►│  Verifica   │
│  ?token=X   │                     │   sessão    │
└─────────────┘                     └──────┬──────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
              sessão ativa                                   sem sessão
                    │                                              │
                    ▼                                              ▼
            ┌─────────────┐                               ┌─────────────┐
            │   Carregar  │                               │   Iniciar   │
            │   carrinho  │                               │   sessão    │
            └──────┬──────┘                               └──────┬──────┘
                   │                                              │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │    Menu     │
                                   │  (produtos) │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  Adicionar  │
                                   │ ao carrinho │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  Confirmar  │
                                   │   pedido    │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ POST /api/  │
                                   │   orders    │
                                   └──────┬──────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
            ┌─────────────┐                             ┌─────────────┐
            │   Supabase  │──── real-time ────────────►│   Display   │
            │   insert    │                             │   Cozinha   │
            └─────────────┘                             └─────────────┘
```

### 2.5 Flow de Autenticação

```
┌──────────────┐
│    Staff     │
│   (login)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│ POST /api/   │───►│   Verificar  │
│ auth/login   │    │  credenciais │
└──────────────┘    └──────┬───────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
   inválido                                válido
        │                                      │
        ▼                                      ▼
┌──────────────┐                    ┌──────────────┐
│   Erro 401   │                    │  Criar JWT   │
│              │                    │   (Jose)     │
└──────────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Set Cookie   │
                                    │  (httpOnly)  │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  Redirect    │
                                    │  por role    │
                                    └──────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
       ┌──────────┐                 ┌──────────┐                 ┌──────────┐
       │  /admin  │                 │ /cozinha │                 │ /waiter  │
       │  (admin) │                 │(kitchen) │                 │ (waiter) │
       └──────────┘                 └──────────┘                 └──────────┘
```

### 2.6 Flow de Reservas

```
┌──────────────┐
│   Cliente    │
│  (website)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Formulário  │
│  de reserva  │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│ POST /api/   │───►│   Validar    │
│ reservations │    │disponibilidade│
└──────────────┘    └──────┬───────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
   indisponível                           disponível
        │                                      │
        ▼                                      ▼
┌──────────────┐                    ┌──────────────┐
│   Erro com   │                    │   Inserir    │
│   mensagem   │                    │   Supabase   │
└──────────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │    Enviar    │
                                    │   emails     │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
                    ▼                                              ▼
            ┌──────────────┐                              ┌──────────────┐
            │  Email para  │                              │  Email para  │
            │   cliente    │                              │ restaurante  │
            │(confirmação) │                              │(notificação) │
            └──────────────┘                              └──────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │    Admin     │
                                    │  confirma    │
                                    └──────────────┘
```

---

## 3. Possíveis Melhorias

### 3.1 Problemas Críticos (Segurança)

| ID | Problema | Ficheiro | Descrição | Prioridade |
|----|----------|----------|-----------|------------|
| C1 | **Password Hashing** | `lib/auth/password.ts` | Passwords armazenadas em plain text! `hashPassword()` retorna password direto | **CRÍTICO** |
| C2 | **Fallback Credentials** | `app/api/auth/login.ts` | Passwords hardcoded no código para dev | **CRÍTICO** |
| C3 | **RLS Incompleto** | migrations/*.sql | Nem todas as queries respeitam RLS policies | **ALTO** |

### 3.2 Problemas de Arquitetura

| ID | Problema | Descrição | Impacto |
|----|----------|-----------|---------|
| A1 | **Código Misto** | Mistura de código legado (`hooks/`, `components/`) com nova arquitetura SOLID | Manutenção difícil |
| A2 | **Type Safety** | Múltiplos `any` types em exportar, auth | Bugs em runtime |
| A3 | **Middleware Duplo** | Legacy JWT + Supabase Auth coexistem | Complexidade |
| A4 | **Console Logs** | 121+ instâncias de console.log/error | Produção poluída |

### 3.3 Problemas de Performance

| ID | Problema | Descrição | Solução |
|----|----------|-----------|---------|
| P1 | **Sem Paginação** | Exportação carrega tudo em memória | Cursor-based pagination |
| P2 | **Sem Cache** | useProducts faz 2 queries sem cache | React Query / SWR |
| P3 | **Queries N+1** | Algumas queries com relações aninhadas | Otimizar joins |

### 3.4 Problemas de Testes

| ID | Problema | Descrição |
|----|----------|-----------|
| T1 | **Cobertura Limitada** | Apenas domain + application têm testes |
| T2 | **Sem Testes API** | API routes sem testes |
| T3 | **Sem Testes E2E** | Sem Playwright ou Cypress |

### 3.5 Melhorias Sugeridas

#### Quick Wins
1. Implementar bcrypt para passwords
2. Remover console.logs com ESLint rule
3. Remover fallback credentials
4. Corrigir `any` types

#### Medium Priority
5. Consolidar types num único namespace
6. Adicionar React Query para cache
7. Expandir cobertura de testes
8. Completar migração SOLID

#### Strategic
9. Audit completo de RLS
10. Error tracking (Sentry)
11. Traduzir admin panel
12. Analytics dashboard

---

## 4. Plano de Desenvolvimento

> **Nota:** As fases estão organizadas por dependência e prioridade. A duração dependerá dos recursos disponíveis e complexidade encontrada durante a implementação.

### Fase 1: Segurança (Urgente)

**Objetivo:** Resolver vulnerabilidades críticas antes de produção

#### Tarefas:
- [ ] **1.1** Implementar bcrypt para hashing de passwords
  - Instalar `bcryptjs`
  - Refatorar `lib/auth/password.ts`
  - Migrar passwords existentes na DB

- [ ] **1.2** Remover fallback credentials
  - Limpar constantes FALLBACK_USERS
  - Garantir que login apenas funciona via DB

- [ ] **1.3** Audit de RLS
  - Mapear todas as queries Supabase
  - Garantir compliance com policies
  - Adicionar testes de permissões

#### Entregáveis:
- Password hashing funcional
- Login seguro sem fallbacks
- Documentação de policies RLS

---

### Fase 2: Estabilização

**Objetivo:** Melhorar qualidade do código e type safety

#### Tarefas:
- [ ] **2.1** Remover console.logs
  - Configurar ESLint `no-console: error`
  - Substituir por logger estruturado (opcional)

- [ ] **2.2** Corrigir type safety
  - Eliminar todos os `any` types
  - Adicionar tipos explícitos em exports
  - Tipar respostas de API

- [ ] **2.3** Consolidar types
  - Criar `src/types/index.ts` centralizado
  - Organizar por namespace (Database, API, Domain)
  - Remover duplicações

#### Entregáveis:
- Zero `any` types
- TypeScript strict sem erros
- Types organizados

---

### Fase 3: Completar Arquitetura SOLID

**Objetivo:** Finalizar migração para Clean Architecture

#### Tarefas:
- [ ] **3.1** Migrar hooks legados
  - `useCart` → domain/application
  - `useSession` → domain/application
  - `useOrders` → domain/application

- [ ] **3.2** Migrar components legados
  - Identificar components com lógica de negócio
  - Extrair para use-cases
  - Components apenas presentation

- [ ] **3.3** Remover código legado
  - Eliminar `src/hooks/` antigo
  - Consolidar em `src/presentation/`

- [ ] **3.4** Documentar arquitetura
  - Atualizar CLAUDE.md
  - Criar guia de contribuição

#### Entregáveis:
- Arquitetura SOLID completa
- Zero código legado
- Documentação atualizada

---

### Fase 4: Testes e Qualidade

**Objetivo:** Expandir cobertura de testes

#### Tarefas:
- [ ] **4.1** Testes de API Routes
  - Testar endpoints de autenticação
  - Testar CRUD de orders/sessions
  - Testar validações

- [ ] **4.2** Testes de Integração
  - Setup de test database
  - Testar fluxos completos
  - Testar RLS policies

- [ ] **4.3** Testes E2E (opcional)
  - Setup Playwright
  - Testar fluxo de pedido
  - Testar fluxo de reserva

- [ ] **4.4** CI/CD Pipeline
  - GitHub Actions para testes
  - Deploy automático
  - Preview deployments

#### Entregáveis:
- Cobertura > 80%
- CI/CD funcional
- Testes automatizados em PR

---

### Fase 5: Performance

**Objetivo:** Otimizar performance da aplicação

#### Tarefas:
- [ ] **5.1** Implementar cache
  - Instalar React Query
  - Cachear produtos/categorias
  - Invalidação inteligente

- [ ] **5.2** Paginação
  - Implementar cursor-based pagination
  - Aplicar em listagens admin
  - Otimizar exportação

- [ ] **5.3** Otimizar queries
  - Identificar queries N+1
  - Usar joins apropriados
  - Indexes em colunas frequentes

#### Entregáveis:
- Cache implementado
- Paginação funcional
- Queries otimizadas

---

### Fase 6: Funcionalidades Adicionais

**Objetivo:** Melhorar experiência de utilizador

#### Tarefas:
- [ ] **6.1** Error tracking
  - Integrar Sentry
  - Configurar alertas
  - Dashboard de erros

- [ ] **6.2** Traduzir admin panel
  - Extrair strings para messages/
  - Traduzir para 6 idiomas
  - Selector de idioma no admin

- [ ] **6.3** Analytics dashboard
  - Métricas de vendas
  - Gráficos por período
  - KPIs do restaurante

- [ ] **6.4** Melhorias UX
  - Dark mode no admin
  - Notificações push
  - PWA para mobile

#### Entregáveis:
- Monitoring em produção
- Admin multilingue
- Dashboard analytics

---

### Fase 7: DevOps e Deploy

**Objetivo:** Preparar para produção escalável

#### Tarefas:
- [ ] **7.1** Containerização
  - Dockerfile otimizado
  - Docker Compose para dev
  - Multi-stage builds

- [ ] **7.2** Infrastructure as Code
  - Terraform/Pulumi para Supabase
  - Vercel configuration
  - Environment management

- [ ] **7.3** Monitoring
  - Health checks
  - Uptime monitoring
  - Performance metrics

- [ ] **7.4** Backup e Recovery
  - Backup automático DB
  - Disaster recovery plan
  - Data retention policy

#### Entregáveis:
- Deploy automatizado
- Infraestrutura documentada
- Plano de recovery

---

### Resumo das Fases

| Fase | Título | Prioridade | Dependências |
|------|--------|------------|--------------|
| 1 | Segurança | **URGENTE** | - |
| 2 | Estabilização | Alta | Fase 1 |
| 3 | Arquitetura SOLID | Alta | Fase 2 |
| 4 | Testes e Qualidade | Média | Fase 3 |
| 5 | Performance | Média | Fase 2 |
| 6 | Funcionalidades | Baixa | Fases 4, 5 |
| 7 | DevOps | Média | Fase 4 |

---

## Conclusão

O projeto **Sushi in Sushi** está bem estruturado e em processo de modernização para Clean Architecture. Os pontos fortes incluem:

- Arquitetura SOLID em progresso
- Testes de domain/application
- i18n completo (6 idiomas)
- Real-time com Supabase
- Múltiplas localizações

As áreas que requerem atenção imediata são:

1. **Segurança de passwords** (crítico)
2. **Remoção de código legado** (arquitetura)
3. **Expansão de testes** (qualidade)
4. **Cache e paginação** (performance)

Com a implementação das fases propostas, o projeto estará pronto para produção com alta qualidade e manutenibilidade.

---

*Documento gerado em 2026-02-04*
