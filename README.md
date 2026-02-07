# Sushi in Sushi

Sistema de gestão completo para restaurante de sushi, incluindo website público, sistema de pedidos por mesa, painel administrativo, ecrã de cozinha e integrações com serviços externos.

## Índice

- [Tecnologias](#tecnologias)
- [Funcionalidades](#funcionalidades)
  - [Website Público](#website-público)
  - [Sistema de Pedidos por Mesa](#sistema-de-pedidos-por-mesa)
  - [Painel Administrativo](#painel-administrativo)
  - [Ecrã de Cozinha](#ecrã-de-cozinha)
  - [Sistema de Reservas](#sistema-de-reservas)
- [Integrações](#integrações)
- [Base de Dados](#base-de-dados)
- [Autenticação](#autenticação)
- [Internacionalização](#internacionalização)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| **Frontend** | React 18.3, Next.js 14.2, TypeScript 5.4 |
| **Styling** | Tailwind CSS 3.4, Framer Motion 11 |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL) |
| **Autenticação** | JWT com jose 6.1 |
| **Email** | Resend API |
| **i18n** | next-intl 4.8 |
| **Icons** | Lucide React |
| **QR Codes** | qrcode |

---

## Funcionalidades

### Website Público

Website moderno e responsivo com suporte a 6 idiomas.

| Secção | Descrição |
|--------|-----------|
| **Homepage** | Landing page com hero, vídeo promocional e call-to-actions |
| **Menu** | Catálogo de produtos com categorias, imagens, descrições e preços |
| **Equipa** | Apresentação da equipa do restaurante |
| **Galeria** | Galeria de fotos com efeito marquee |
| **Reviews** | Testemunhos de clientes |
| **Localizações** | Duas localizações: Circunvalação e Boavista |
| **Contacto** | Formulário de contacto e informações |
| **Reservas** | Formulário de reserva online |

**Rotas:**
- `/` - Homepage
- `/menu` - Menu completo
- `/equipa` - Página da equipa

---

### Sistema de Pedidos por Mesa

Sistema de pedidos colaborativo via QR code, permitindo múltiplos dispositivos na mesma mesa.

#### Características Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| **QR Code** | Cada mesa tem um QR code único que direciona para `/mesa/[numero]` |
| **Carrinho Partilhado** | Todos os dispositivos na mesma mesa vêm o mesmo carrinho em tempo real |
| **Identificação de Dispositivo** | Cada dispositivo recebe um nome único (ex: "Feliz Salmão") |
| **Tipos de Serviço** | Suporte para Rodízio (all-you-can-eat) e À La Carte |
| **Tracking de Pedidos** | Acompanhamento do estado: pendente → a preparar → pronto → entregue |
| **Participantes** | Visualização de quantos dispositivos estão a fazer pedidos |

#### Estados dos Pedidos

| Estado | Descrição |
|--------|-----------|
| `pending` | Pedido recebido, aguarda preparação |
| `preparing` | Em preparação na cozinha |
| `ready` | Pronto para servir |
| `delivered` | Entregue ao cliente |
| `cancelled` | Cancelado |

#### Fluxo do Cliente

1. Ler QR code da mesa
2. Escolher tipo de serviço (Rodízio/À La Carte)
3. Navegar pelo menu e adicionar itens ao carrinho
4. Confirmar pedido
5. Acompanhar estado em tempo real

---

### Painel Administrativo

Dashboard completo para gestão do restaurante com estatísticas em tempo real.

**Rota:** `/admin`

#### Dashboard Principal

| Métrica | Descrição |
|---------|-----------|
| Sessões Activas | Número de mesas ocupadas no momento |
| Sessões Hoje | Total de sessões do dia |
| Pedidos por Estado | Contagem de pedidos pendentes, a preparar, prontos |
| Receita do Dia | Faturação total do dia |
| Ticket Médio | Valor médio por sessão |
| Ocupação | Percentagem de mesas ocupadas |

#### Gestão de Mesas (`/admin/mesas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Criar Mesa | Adicionar nova mesa com número e nome |
| Editar Mesa | Modificar dados da mesa |
| Localização | Atribuir mesa a Circunvalação ou Boavista |
| Estado | Activar/desactivar mesas |
| Eliminar | Remover mesas (soft delete) |

#### Gestão de Produtos (`/admin/produtos`)

| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD Completo | Criar, ver, editar e eliminar produtos |
| Categorias | Organização por categorias |
| Preços | Gestão de preços |
| Disponibilidade | Marcar produtos como disponíveis/indisponíveis |
| Rodízio | Marcar produtos incluídos no rodízio |
| Ordenação | Definir ordem de apresentação |
| Imagens | URL de imagem do produto |

#### Gestão de Reservas (`/admin/reservas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Lista de Reservas | Ver todas as reservas com filtros por data e estado |
| Confirmar | Confirmar reservas pendentes |
| Cancelar | Cancelar reservas com motivo |
| Atribuir Mesa | Associar mesa à reserva |
| Enviar Email | Notificação automática ao cliente |
| Estados | pending, confirmed, cancelled, completed, no_show |

#### Gestão de Folgas (`/admin/folgas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Dias de Fecho | Definir dias em que o restaurante está fechado |
| Por Localização | Fecho específico por localização ou ambas |
| Fecho Recorrente | Definir dia da semana sempre fechado (ex: segunda-feira) |
| Motivo | Registar motivo do fecho |
| Validação | Bloqueia reservas em dias fechados |

#### Gestão de Sessões (`/admin/sessoes`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Sessões Activas | Ver sessões em curso |
| Histórico | Ver sessões anteriores |
| Filtros | Filtrar por estado e data |
| Detalhes | Ver pedidos de cada sessão |
| Fechar Sessão | Finalizar sessão manualmente |

#### Gestão de Staff (`/admin/staff`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Criar Funcionário | Adicionar novo membro da equipa |
| Roles | Atribuir função: admin, kitchen, waiter |
| Localização | Associar a uma ou ambas localizações |
| Credenciais | Definir email e password |
| Desactivar | Desactivar conta sem eliminar |
| Atribuições | Atribuir empregados a mesas |

#### Gestão de Clientes (`/admin/clientes`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Base de Dados | Clientes do programa de fidelização |
| Informação | Nome, email, telefone, data de nascimento |
| Preferências | Localização preferida |
| Marketing | Consentimento para comunicações |
| Pontos | Sistema de pontos de fidelização |
| Histórico | Total gasto e número de visitas |

#### QR Codes (`/admin/qrcodes`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Geração Automática | QR codes para todas as mesas |
| Por Localização | Agrupados por restaurante |
| Formato A6 | Optimizado para impressão |
| Impressão em Lote | Imprimir todos de uma vez |

#### Exportação de Dados (`/admin/exportar`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Períodos | Hoje, semana, mês ou intervalo personalizado |
| Formatos | CSV e JSON |
| Dados | Sessões e pedidos detalhados |
| Filtros | Por estado de sessão |
| Encoding | UTF-8 com BOM para Excel |

---

### Ecrã de Cozinha

Interface dedicada para a equipa de cozinha gerir pedidos em tempo real.

**Rota:** `/cozinha`

#### Características

| Funcionalidade | Descrição |
|----------------|-----------|
| Fila de Pedidos | Lista de pedidos ordenada por tempo |
| Agrupamento | Pedidos agrupados por mesa |
| Estados | Actualizar estado: pendente → a preparar → pronto |
| Filtro por Local | Ver pedidos de uma localização específica |
| Notificações Sonoras | Alerta áudio para novos pedidos |
| Notificações Push | Notificações do browser |
| Indicador Visual | Header pisca quando há novos pedidos |
| Tempo | Mostra há quanto tempo o pedido foi feito |

#### Fluxo da Cozinha

1. Novo pedido aparece com som de alerta
2. Cozinheiro clica "A Preparar"
3. Quando pronto, clica "Pronto"
4. Empregado é notificado para servir

---

### Sistema de Reservas

Sistema completo de reservas online com confirmação por email.

#### Formulário Público

| Campo | Descrição |
|-------|-----------|
| Nome | Primeiro e último nome |
| Email | Para confirmação |
| Telefone | Contacto |
| Data | Calendário com dias fechados bloqueados |
| Hora | Horários disponíveis |
| Pessoas | 1 a 20 pessoas |
| Localização | Circunvalação ou Boavista |
| Tipo | Rodízio ou À La Carte |
| Pedidos Especiais | Campo livre para observações |
| Ocasião | Aniversário, negócios, etc. |
| Marketing | Consentimento para comunicações |

#### Tracking de Email

| Evento | Descrição |
|--------|-----------|
| `sent` | Email enviado |
| `delivered` | Email entregue |
| `opened` | Email aberto pelo destinatário |
| `clicked` | Link clicado |
| `bounced` | Email rejeitado |

---

## Integrações

### Supabase

Base de dados PostgreSQL com funcionalidades em tempo real.

| Funcionalidade | Uso |
|----------------|-----|
| **Database** | Armazenamento de todos os dados |
| **Real-time** | Subscriptions para dashboard e pedidos |
| **Row Level Security** | Políticas de segurança por role |
| **Functions** | Funções PostgreSQL para lógica de negócio |

**Gerar tipos TypeScript a partir do schema:** O comando `gen types` escreve para o stdout, por isso é preciso redirecionar para um ficheiro. Além disso, é necessário estar autenticado e usar o **project ref** (subdomínio da URL do projeto, e.g. em `https://abcdefgh.supabase.co` o ref é `NEXT_PUBLIC_SUPABASE_PROJECT_REF`).

```bash
# 1. Autenticar (uma vez)
npx supabase login

# 2a. Com project ref em variável de ambiente (extrair ref da NEXT_PUBLIC_SUPABASE_URL)
export SUPABASE_PROJECT_REF=NEXT_PUBLIC_SUPABASE_PROJECT_REF   
# o subdomínio do teu projeto
npm run supabase:types

# 2b. Ou, se tiveres o projeto ligado (supabase link)
npm run supabase:types:linked
```

Os tipos são gravados em `src/types/supabase.ts`.

### Resend (Email)

Serviço de envio de emails transaccionais.

| Tipo de Email | Quando |
|---------------|--------|
| **Confirmação ao Cliente** | Quando submete reserva |
| **Notificação ao Restaurante** | Nova reserva recebida |
| **Confirmação de Reserva** | Admin confirma reserva |
| **Webhooks** | Tracking de eventos de email |

### Vendus POS (Branch: vendus_billing)

Integração com sistema de ponto de venda português.

| Funcionalidade | Descrição |
|----------------|-----------|
| **Sync de Produtos** | Sincronização bidireccional |
| **Importar Mesas** | Importar mesas/salas do Vendus |
| **Faturação** | Emissão de faturas/recibos |
| **Impressão Cozinha** | Enviar para impressora da cozinha |
| **Retry Queue** | Fila de retry para operações falhadas |

---

## Base de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `staff` | Funcionários e credenciais |
| `roles` | Funções (admin, kitchen, waiter, customer) |
| `customers` | Clientes do programa de fidelização |
| `tables` | Mesas do restaurante |
| `categories` | Categorias de produtos |
| `products` | Produtos/itens do menu |
| `sessions` | Sessões de mesa (refeição) |
| `orders` | Pedidos individuais |
| `cart_items` | Itens no carrinho partilhado |
| `session_participants` | Dispositivos numa sessão |
| `reservations` | Reservas de mesa |
| `restaurant_closures` | Dias de fecho |
| `email_events` | Log de eventos de email |
| `activity_log` | Auditoria de acções |
| `waiter_tables` | Atribuição empregado-mesa |

### Migrations

```
supabase/migrations/
├── 001_user_management.sql      # Staff, roles, tables base
├── 002_table_management.sql     # Sessions, orders, cart
├── 003_reservations.sql         # Sistema de reservas
├── 004_email_tracking.sql       # Tracking de emails
├── 005_restaurant_closures.sql  # Gestão de folgas
└── 006_vendus_integration.sql   # Integração Vendus (branch)
```

---

## Autenticação

### Sistema de Tokens

| Aspecto | Implementação |
|---------|---------------|
| **Tipo** | JWT (JSON Web Token) |
| **Biblioteca** | jose |
| **Armazenamento** | Cookie httpOnly, secure, sameSite: lax |
| **Expiração** | 24 horas |
| **Payload** | id, email, name, role, location |

### Roles e Permissões

| Role | Permissões |
|------|------------|
| `admin` | Acesso total a todas as funcionalidades |
| `kitchen` | Ecrã de cozinha, ver pedidos |
| `waiter` | Gestão de mesas atribuídas, criar pedidos |
| `customer` | Apenas área pública |

### Rotas Protegidas

| Rota | Roles Permitidos |
|------|------------------|
| `/admin/*` | admin |
| `/cozinha` | admin, kitchen |
| `/waiter/*` | admin, waiter |

---

## Internacionalização

### Idiomas Suportados

| Código | Idioma |
|--------|--------|
| `pt` | Português (default) |
| `en` | Inglês |
| `fr` | Francês |
| `de` | Alemão |
| `it` | Italiano |
| `es` | Espanhol |

### Configuração

- **Biblioteca:** next-intl
- **Estratégia:** Prefixo apenas quando necessário
- **Ficheiros:** `/src/messages/[locale].json`

---

## Instalação

### Pré-requisitos

- Node.js 20+
- npm ou yarn
- Conta Supabase
- Conta Resend (opcional, para emails)

### Passos

```bash
# Clonar repositório
git clone <repo-url>
cd sushi-in-sushi

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com as suas credenciais

# Executar migrations no Supabase
# (via Supabase Dashboard ou CLI)

# Iniciar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

---

## Variáveis de Ambiente

```env
# =============================================
# Site
# =============================================
NEXT_PUBLIC_SITE_URL=https://seudominio.pt

# =============================================
# Autenticação
# =============================================
AUTH_SECRET=chave-secreta-mudar-em-producao
ADMIN_PASSWORD=password-admin
COZINHA_PASSWORD=password-cozinha

# =============================================
# Supabase
# =============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================
# Email (Resend)
# =============================================
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=reservas@seudominio.pt
RESTAURANT_EMAIL_1=notificacoes@seudominio.pt
RESTAURANT_EMAIL_2=gerente@seudominio.pt
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# =============================================
# Vendus POS (opcional)
# =============================================
VENDUS_API_KEY=sua_api_key
VENDUS_STORE_ID=id_da_loja
VENDUS_REGISTER_ID=id_da_caixa

# Por localização (opcional)
# VENDUS_API_KEY_CIRCUNVALACAO=
# VENDUS_API_KEY_BOAVISTA=

# Cron Jobs
CRON_SECRET=secret-para-cron-jobs
```

---

## Estrutura do Projecto

```
src/
├── app/
│   ├── [locale]/           # Páginas públicas com i18n
│   │   ├── page.tsx        # Homepage
│   │   ├── menu/           # Menu
│   │   └── equipa/         # Equipa
│   ├── admin/              # Painel administrativo
│   │   ├── page.tsx        # Dashboard
│   │   ├── mesas/          # Gestão de mesas
│   │   ├── produtos/       # Gestão de produtos
│   │   ├── reservas/       # Gestão de reservas
│   │   ├── folgas/         # Gestão de folgas
│   │   ├── sessoes/        # Gestão de sessões
│   │   ├── staff/          # Gestão de staff
│   │   ├── clientes/       # Gestão de clientes
│   │   ├── qrcodes/        # Geração de QR codes
│   │   ├── exportar/       # Exportação de dados
│   │   └── vendus/         # Integração Vendus
│   ├── cozinha/            # Ecrã de cozinha
│   ├── waiter/             # Interface empregado
│   ├── mesa/               # Sistema de pedidos por mesa
│   ├── login/              # Página de login
│   └── api/                # API Routes
│       ├── auth/           # Autenticação
│       ├── reservations/   # Reservas
│       ├── closures/       # Folgas
│       ├── export/         # Exportação
│       ├── cron/           # Cron jobs
│       └── vendus/         # API Vendus
├── components/             # Componentes React
│   ├── ui/                 # Componentes UI base
│   └── ...                 # Componentes de página
├── contexts/               # Context providers
├── hooks/                  # Custom hooks
├── lib/
│   ├── auth.ts             # Utilitários de autenticação
│   ├── supabase/           # Clientes Supabase
│   ├── email/              # Serviço de email
│   └── vendus/             # Serviço Vendus
├── types/                  # Tipos TypeScript
├── messages/               # Traduções i18n
└── middleware.ts           # Middleware Next.js
```

---

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Iniciar em produção |
| `npm run lint` | Verificar código com ESLint |
| `npm test` | Executar testes unitários |

---

## 📚 Documentação

Documentação técnica completa disponível em **[/docs/](docs/)**:

### Documentação Principal
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Clean Architecture completa
  - 11 entidades, 12 repositórios, 50+ use cases
  - Domain, Application, Infrastructure, Presentation layers
  - Dependency Injection e Result pattern

- **[PERFORMANCE.md](docs/PERFORMANCE.md)** - Otimizações de performance
  - React Query (89-96% faster)
  - Hook optimization (zero memoization)
  - Database indexes (40-60% improvement)

- **[TESTING.md](docs/TESTING.md)** - Guia de testes
  - 537 testes passando
  - Testing patterns para hooks React
  - Unit tests com Vitest

### Convenções de Desenvolvimento
- **[CLAUDE.md](CLAUDE.md)** - Contexto e convenções do projeto
  - Estrutura de pastas detalhada
  - Clean Architecture patterns
  - Como adicionar novas funcionalidades

### Estado Atual (2026-02-07)
- ✅ Clean Architecture 100% implementada
- ✅ 537 testes passando (100% use cases, 100% domain services)
- ✅ Performance otimizada (React Query + Hooks + Indexes)
- ✅ Zero warnings ESLint
- ✅ Código limpo e bem documentado
