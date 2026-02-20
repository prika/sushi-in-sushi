# Sushi in Sushi

Sistema de gestão completo para uma cadeia de restaurantes de sushi portuguesa. Inclui website público, sistema de pedidos por mesa via QR code, painel administrativo com analytics, ecrã de cozinha em tempo real, sistema de reservas com confirmação por email, programa de fidelização progressivo, jogos interactivos na mesa e suporte multi-localização.

## Índice

- [Tecnologias](#tecnologias)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
  - [Website Público](#website-público)
  - [Sistema de Pedidos por Mesa](#sistema-de-pedidos-por-mesa)
  - [Jogos Interactivos na Mesa](#jogos-interactivos-na-mesa)
  - [Programa de Fidelização](#programa-de-fidelização)
  - [Painel Administrativo](#painel-administrativo)
  - [Ecrã de Cozinha](#ecrã-de-cozinha)
  - [Interface do Empregado](#interface-do-empregado)
  - [Sistema de Reservas](#sistema-de-reservas)
  - [Gestão Multi-Restaurante](#gestão-multi-restaurante)
- [Tempo Real](#tempo-real)
- [Performance](#performance)
- [Testes](#testes)
- [API Routes](#api-routes)
- [Base de Dados](#base-de-dados)
- [Autenticação](#autenticação)
- [Internacionalização](#internacionalização)
- [Integrações](#integrações)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura do Projecto](#estrutura-do-projecto)

---

## Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| **Framework** | React 18.3, Next.js 14.2 (App Router), TypeScript 5.4 |
| **Styling** | Tailwind CSS 3.4 (tema gold/dark personalizado), Framer Motion 11 |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL) |
| **Real-time** | Supabase Realtime (subscriptions) |
| **Caching** | React Query (TanStack Query) |
| **Autenticação** | JWT com jose 6.1, cookies httpOnly, Supabase Auth (prod) |
| **POS** | Vendus POS (faturação certificada AT) |
| **SMS** | Twilio (verificação de telefone) |
| **Email** | Resend API com webhook tracking |
| **i18n** | next-intl 4.8 (6 idiomas) |
| **Testes** | Vitest (1691 testes) |
| **Icons** | Lucide React |
| **QR Codes** | qrcode |

---

## Arquitectura

O projecto segue **Clean Architecture** com separação rigorosa em 4 camadas:

```
┌─────────────────────────────────────────┐
│   Presentation (React/Next.js)         │  Hooks, Pages, Contexts
├─────────────────────────────────────────┤
│   Application (Use Cases)              │  Orquestração de lógica de negócio
├─────────────────────────────────────────┤
│   Domain (Entidades + Interfaces)      │  Regras de negócio puras
├─────────────────────────────────────────┤
│   Infrastructure (Supabase)            │  Acesso a dados, serviços externos
└─────────────────────────────────────────┘
```

**Dependências apontam sempre para dentro** (para o Domain). A UI nunca importa Supabase directamente.

### Números da Arquitectura

| Camada | Quantidade |
|--------|------------|
| **Entidades** | 20 (Order, Session, Table, Product, Category, Staff, Reservation, Restaurant, Customer, StaffTimeOff, RestaurantClosure, WaiterCall, ReservationSettings, DeviceProfile, CartItem, GameQuestion, GameSession, GameAnswer, GamePrize, KitchenMetrics) |
| **Value Objects** | 6 (OrderStatus, SessionStatus, TableStatus, CustomerTier, Location, GameConfig) |
| **Domain Services** | 7 (OrderService, SessionService, TableService, CartService, GameService, CustomerTierService, WaiterAssignmentService) |
| **Repository Interfaces** | 17 |
| **Repository Implementações** | 17 (Supabase) |
| **Use Cases** | 88+ |
| **Presentation Hooks** | 24+ |

### Padrões Implementados

- **Result Pattern** — Tratamento de erros tipado (`Result<T>` com success/error)
- **Dependency Injection** — Via `DependencyContext` (React Context)
- **Repository Pattern** — Interfaces no Domain, implementações na Infrastructure
- **Repository Optimization** — Versões `.optimized.ts` com JOINs adicionais para melhor performance
- **Use Case Pattern** — Uma classe por operação, responsabilidade única
- **Optimistic Updates** — UI instantânea com rollback automático em caso de erro

---

## Funcionalidades

### Website Público

Website moderno e responsivo com suporte a 6 idiomas.

**Rotas:** `/` · `/menu` · `/equipa`

| Secção | Descrição |
|--------|-----------|
| **Homepage** | Landing page com hero, vídeo promocional e call-to-actions |
| **Menu** | Catálogo de produtos com categorias, imagens, descrições e preços |
| **Equipa** | Apresentação da equipa do restaurante |
| **Galeria** | Galeria de fotos com efeito marquee |
| **Reviews** | Testemunhos de clientes |
| **Localizações** | Circunvalação e Boavista com mapa |
| **Contacto** | Formulário de contacto e informações |
| **Reservas** | Formulário de reserva online com confirmação por email |

---

### Sistema de Pedidos por Mesa

Sistema de pedidos colaborativo via QR code, permitindo múltiplos dispositivos na mesma mesa com sincronização em tempo real.

**Rota:** `/mesa/[numero]`

#### Tabs da Interface

| Tab | Descrição |
|-----|-----------|
| **Menu** | Navegar produtos por categoria, adicionar ao carrinho |
| **Carrinho** | Rever itens, confirmar pedido |
| **Pedidos** | Acompanhar estado dos pedidos em tempo real |
| **Chamar** | Chamar empregado de mesa |
| **Conta** | Solicitar conta |
| **Jogos** | Jogos interactivos durante a refeição |

#### Características Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| **QR Code** | Cada mesa tem um QR code único que direcciona para `/mesa/[numero]` |
| **Carrinho Partilhado** | Todos os dispositivos na mesma mesa vêem o mesmo carrinho em tempo real |
| **Identificação de Dispositivo** | Nome único gerado automaticamente (ex: "Feliz Salmão") |
| **Persistência de Dispositivo** | Reconhece clientes que regressam e pré-preenche dados |
| **Tipos de Serviço** | Rodízio (all-you-can-eat) e À La Carte |
| **Tracking de Pedidos** | Acompanhamento visual: pendente → a preparar → pronto → entregue |
| **Cooldown de Pedidos** | Período de espera entre pedidos para evitar spam |
| **Participantes** | Visualização de quantos dispositivos estão ligados à mesa |
| **Sair da Mesa** | Cliente pode sair se não consumiu (€0 + 0 pedidos), sessão fechada atomicamente |

#### Estados dos Pedidos

```
pending (Na fila) → preparing (A preparar) → ready (Pronto para servir) → delivered (Entregue)
                                                                                ↓
                                                                           cancelled
```

**Separação de Responsabilidades:**
- **Cozinha:** Avança até "Pronto para servir" (ready) - estado final no display da cozinha
- **Empregado:** Avança de "Pronto para servir" para "Entregue" (delivered) no painel do empregado

#### Fluxo do Cliente

1. Ler QR code da mesa
2. Escolher tipo de serviço (Rodízio/À La Carte)
3. Navegar pelo menu e adicionar itens ao carrinho
4. Confirmar pedido
5. Acompanhar estado em tempo real
6. Jogar jogos enquanto espera
7. Solicitar conta quando terminar
8. Sair da mesa sem consumo (se aplicável)

---

### Jogos Interactivos na Mesa

Sistema de jogos que permite aos clientes interagir durante a refeição, ganhar pontos e competir por prémios.

#### 3 Tipos de Jogos

**1. Swipe/Tinder Game** — Avaliar produtos com gestos de swipe
| Funcionalidade | Descrição |
|----------------|-----------|
| Drag gestures | Arrastar para a direita (LIKE, 5 estrelas) ou esquerda (NOPE, 2 estrelas) |
| Animações | Spring physics com Framer Motion |
| Per-Order-Item | Cada item pedido gera um cartão de avaliação (mesmo produto pedido 2x = 2 cartões) |
| Progresso | Barra de progresso para bebida grátis (threshold: 5 ratings) |
| Table Leader | Produto mais votado da mesa |
| Acessibilidade | Botões manuais como alternativa ao swipe |

**2. Quiz Game** — Perguntas sobre sushi e culinária japonesa
| Funcionalidade | Descrição |
|----------------|-----------|
| 4 opções | Perguntas de escolha múltipla (A, B, C, D) |
| Temporizador | 15 segundos por pergunta com barra animada |
| Feedback visual | Verde (correcto), vermelho (errado), amarelo (timeout) |
| Pontuação | Score em tempo real no header |
| Dificuldade | Categorias e níveis de dificuldade com estrelas |
| Animações | Transições slide entre perguntas |

**3. Preference Game (A vs B)** — Escolhas de preferência
| Funcionalidade | Descrição |
|----------------|-----------|
| Layout VS | Duas opções lado a lado |
| Sem respostas erradas | Sempre ganha pontos |
| Imagens opcionais | Suporte a imagens nas opções |
| Animações | Scale + highlight dourado na selecção |

#### Sistema de Prémios

| Funcionalidade | Descrição |
|----------------|-----------|
| Tipos de prémio | Desconto %, produto grátis, jantar grátis |
| Elegibilidade | Rondas mínimas configuráveis por restaurante |
| Revelação | Animação de revelação com troféu |
| Validação | QR code + código alfanumérico para o empregado validar |
| Resgate | Estado de "já resgatado" após utilização |

#### Leaderboard em Tempo Real

- Ranking de jogadores da mesa via Supabase subscriptions
- Notificações toast quando alguém ultrapassa no ranking
- Nomes anónimos engraçados para cada jogador

---

### Programa de Fidelização

Sistema de registo progressivo com 4 níveis (tiers):

| Tier | Nome | Dados |
|------|------|-------|
| 1 | Session Only | Nome anónimo gerado automaticamente |
| 2 | Basic Contact | Email OU telefone |
| 3 | Full Contact | Email + telefone + nome completo + data de nascimento |
| 4 | Delivery | Reservado para futuro (morada de entrega) |

| Funcionalidade | Descrição |
|----------------|-----------|
| Progressivo | Dados pedidos gradualmente, sem formulários longos |
| Device Fingerprinting | Reconhece dispositivos que regressam |
| Pré-preenchimento | Dados guardados para visitas futuras |
| Pontos | Sistema de pontos por visita e gasto |
| Upgrade Prompts | Convites configuráveis por restaurante para fornecer mais dados |
| Opt-in | Adesão voluntária ao programa completo |

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
| Receita do Dia | Facturação total do dia |
| Ticket Médio | Valor médio por sessão |
| Ocupação | Percentagem de mesas ocupadas |

#### Chamadas de Empregados (`/admin/chamadas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Chamadas pendentes | Lista de mesas que pediram assistência |
| Acknowledge | Marcar chamada como reconhecida |
| Completar | Marcar chamada como resolvida |
| Tempo | Há quanto tempo a chamada está pendente |

#### Gestão de Reservas (`/admin/reservas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Lista de Reservas | Todas as reservas com filtros por data e estado |
| Confirmar/Cancelar | Gestão de estados com notificação por email |
| Atribuir Mesa | Associar mesa à reserva |
| Estados | pending → confirmed → seated → completed / cancelled / no_show |
| Emails automáticos | Confirmação, lembretes (véspera e dia), cancelamento |
| Cron Jobs | Lembretes automáticos via cron |

#### Gestão de Folgas (`/admin/folgas`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Dias de Fecho | Definir dias específicos em que o restaurante está fechado |
| Fecho Recorrente | Definir dias da semana sempre fechados (ex: segunda-feira) |
| Por Localização | Fecho específico por localização ou ambas |
| Motivo | Registar motivo do fecho |
| Validação | Bloqueia automaticamente reservas em dias fechados |

#### Gestão de Sessões (`/admin/sessoes`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Sessões Activas | Ver sessões em curso com detalhes |
| Histórico | Ver sessões anteriores |
| Filtros | Filtrar por estado, data e localização |
| Detalhes | Ver pedidos de cada sessão |
| Fechar Sessão | Finalizar sessão manualmente |

#### Gestão de Produtos (`/admin/produtos`)

| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD Completo | Criar, ver, editar e eliminar produtos |
| Múltiplas Imagens | Upload de várias imagens por produto |
| Categorias | Organização por categorias |
| Preços | Gestão de preços |
| Disponibilidade | Marcar produtos como disponíveis/indisponíveis |
| Rodízio | Marcar produtos incluídos no rodízio |
| Ordenação | Definir ordem de apresentação |
| Ratings | Média de avaliações e contagem (integração com jogos) |

#### Gestão de Staff (`/admin/staff`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Criar Funcionário | Adicionar novo membro da equipa |
| Roles | Atribuir função: admin, kitchen, waiter |
| Localização | Associar a uma ou ambas localizações |
| Credenciais | Definir email e password |
| Desactivar | Desactivar conta sem eliminar |
| Atribuições | Atribuir empregados a mesas |
| Métricas | Performance individual do empregado |

#### Gestão de Clientes (`/admin/clientes`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Base de Dados | Clientes do programa de fidelização |
| Informação | Nome, email, telefone, data de nascimento |
| Preferências | Localização preferida |
| Marketing | Consentimento para comunicações |
| Pontos | Sistema de pontos de fidelização |
| Histórico | Total gasto, número de visitas, pedidos anteriores |
| Criar de Sessão | Converter participante anónimo em cliente registado |

#### Gestão de Jogos (`/admin/jogos`)

| Funcionalidade | Descrição |
|----------------|-----------|
| Tab Quiz | CRUD de perguntas de quiz (texto, 4 opções, resposta correcta, categoria, dificuldade, pontos) |
| Tab Preferência | CRUD de perguntas A vs B (texto, opção A/B com label + imagem opcional) |
| Tab Analytics | Dashboard com métricas de jogos |
| Preview | Pré-visualização inline com estilo dark (simula aparência no telemóvel) |
| Toggle | Activar/desactivar perguntas inline |
| Configuração | Jogos configurados por restaurante no modal de edição |

#### Analytics de Jogos

| Métrica | Descrição |
|---------|-----------|
| Sessões totais | Número de sessões de jogo |
| Taxa de conclusão | % de jogos completados |
| Respostas totais | Total de respostas submetidas |
| Precisão quiz | Taxa de respostas correctas |
| Score médio | Pontuação média dos jogadores |
| Prémios | Total, resgatados, taxa de resgate, breakdown por tipo |
| Top/Bottom Produtos | 5 produtos melhor e pior avaliados |
| Perguntas difíceis | Perguntas com menor/maior taxa de acerto |
| Actividade diária | Gráfico dos últimos 30 dias |

#### Definições (`/admin/definicoes`)

5 tabs de configuração:

| Tab | Conteúdo |
|-----|----------|
| **Notificações** | Lembretes de reserva (véspera, dia), política de desperdício rodízio (fee por peça) |
| **Fechos Semanais** | Definir dias recorrentes de fecho |
| **Exportação** | Exportar sessões/pedidos em CSV/JSON com filtros de data |
| **Mesas** | Mapa visual de mesas, criar/editar, gerar QR codes |
| **Restaurantes** | CRUD de restaurantes, criação automática de mesas, configuração de jogos |

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

Interface dedicada para a equipa de cozinha gerir pedidos em tempo real, com tracking individual de quem preparou cada pedido.

**Rota:** `/cozinha`

| Funcionalidade | Descrição |
|----------------|-----------|
| Fila de Pedidos | Lista de pedidos ordenada por tempo de criação |
| Agrupamento | Pedidos agrupados por mesa |
| Estados | Actualizar estado: pendente → a preparar → pronto para servir |
| Fluxo da Cozinha | Kitchen display termina em "Pronto para servir" (sem botão de avanço) |
| Nome do Empregado | Cartões mostram nome do empregado atribuído à mesa (👤 icon) |
| Tracking de Preparador | Regista automaticamente quem iniciou a preparação (`prepared_by`) |
| Identidade do Staff | Nome do funcionário autenticado exibido no header (ex: "Cozinha - Tiago") |
| Nome do Preparador | Cartões mostram quem está a preparar/preparou cada pedido |
| Tempo de Preparação | Calcula tempo real entre início da preparação e pedido pronto |
| Filtro por Local | Ver pedidos de uma localização específica |
| Notificações Sonoras | Alerta áudio para novos pedidos |
| Notificações Push | Notificações do browser |
| Indicador Visual | Header pisca quando há novos pedidos |
| Tempo de Espera | Mostra há quanto tempo o pedido foi feito |
| Indicador de Urgência | Destaque visual para pedidos antigos |

**Fluxo:** Novo pedido (som) → Staff clica "A Preparar" (regista `prepared_by` + timestamp) → "Pronto para servir" (regista `ready_at`, view-only) → Empregado marca como "Entregue"

**Importante:** A cozinha NÃO avança pedidos de "pronto para servir" para "entregue". Essa transição é feita pelo empregado de mesa.

#### Métricas de Performance da Cozinha

| Métrica | Descrição |
|---------|-----------|
| Pedidos Preparados | Total de pedidos por funcionário |
| Tempo Médio de Preparação | Média de `ready_at - preparing_started_at` |
| Avaliações Recebidas | Ratings dos clientes nos pedidos preparados |
| Avaliação Média | Média das notas recebidas (1-5) |

**API:** `GET /api/admin/kitchen-metrics?location=SLUG&from=DATE&to=DATE` (admin only)

---

### Interface do Empregado

Interface dedicada para empregados de mesa.

**Rota:** `/waiter` · `/waiter/mesa/[id]`

| Funcionalidade | Descrição |
|----------------|-----------|
| Mesas Atribuídas | Ver apenas as mesas do empregado |
| Painel da Mesa | Título "Painel da Mesa #{número}" para cada mesa |
| Sessões Activas | Sessões em curso nas mesas atribuídas (inclui `pending_payment`) |
| Pedidos Prontos | Pedidos prontos para servir (única secção consolidada) |
| Marcar como Entregue | Empregado avança pedidos de "pronto para servir" para "entregue" |
| Chamadas | Alertas de chamadas de assistência |
| Participantes | Tracking de dispositivos por sessão |
| Atribuição Automática | Sistema de auto-assign de empregados a mesas |
| Filtro de Mesas | Mesas disponíveis para comandar excluem mesas de outros empregados |

**Nota:** O empregado é responsável pela transição final do estado do pedido (ready → delivered).

---

### Sistema de Reservas

Sistema completo de reservas online com confirmação por email e lembretes automáticos.

#### Formulário Público

| Campo | Descrição |
|-------|-----------|
| Nome | Primeiro e último nome |
| Email | Para confirmação |
| Telefone | Contacto |
| Data | Calendário com dias fechados bloqueados |
| Hora | Horários disponíveis |
| Pessoas | 1 a 20 pessoas |
| Localização | Circunvalação ou Boavista (dinâmico) |
| Tipo | Rodízio ou À La Carte |
| Pedidos Especiais | Campo livre para observações |
| Ocasião | Aniversário, negócios, etc. |
| Marketing | Consentimento para comunicações |

#### Emails Automáticos

| Tipo | Quando |
|------|--------|
| Confirmação ao Cliente | Ao submeter reserva |
| Notificação ao Restaurante | Nova reserva recebida |
| Confirmação de Reserva | Admin confirma reserva |
| Lembrete Véspera | Cron job, horas configuráveis |
| Lembrete Dia | Cron job, horas configuráveis |

#### Tracking de Email

| Evento | Descrição |
|--------|-----------|
| `sent` | Email enviado |
| `delivered` | Email entregue |
| `opened` | Email aberto pelo destinatário |
| `clicked` | Link clicado |
| `bounced` | Email rejeitado |

---

### Gestão Multi-Restaurante

Sistema dinâmico para gestão de múltiplas localizações, substituindo localizações hardcoded.

| Campo | Descrição |
|-------|-----------|
| `name` | Nome exibido (ex: "Circunvalação") |
| `slug` | Identificador único (ex: "circunvalacao") |
| `address` | Endereço completo |
| `latitude/longitude` | Coordenadas (para futuro mapa) |
| `max_capacity` | Capacidade total do restaurante |
| `default_people_per_table` | Capacidade padrão por mesa |
| `games_enabled` | Jogos activos nesta localização |
| `games_prize_type` | Tipo de prémio configurado |
| `auto_table_assignment` | Flag para futura automação |
| `auto_reservations` | Flag para futura automação |
| `is_active` | Restaurante activo (aparece em dropdowns) |

**Criação Automática de Mesas:** Ao criar/editar restaurante, o sistema calcula `max_capacity / default_people_per_table` e cria mesas automaticamente.

**Localizações Actuais:** Circunvalação (slug: `circunvalacao`) e Boavista (slug: `boavista`).

---

## Tempo Real

O projecto usa **Supabase Realtime** para sincronização instantânea:

| Funcionalidade | Subscrição |
|----------------|------------|
| Pedidos na cozinha | Novos pedidos e actualizações de estado |
| Carrinho partilhado | Sincronização entre dispositivos na mesma mesa |
| Chamadas de empregado | Notificação imediata ao empregado |
| Participantes da sessão | Tracking de dispositivos ligados |
| Leaderboard de jogos | Rankings actualizados em tempo real |
| Respostas de jogos | Notificação quando alguém responde |

---

## Performance

### React Query

| Área | Melhoria |
|------|----------|
| Produtos | 89% mais rápido (270ms → 30ms) com cache de 5-10 min |
| Pedidos da cozinha | 96% mais rápido (500ms → 20ms) com refetch de 10s |
| Actualizações | Optimistic updates com rollback automático |

### Hooks Optimizados

- Estratégia zero memoization (useRef + lazy init)
- Zero re-renders desnecessários

### Índices de Base de Dados

18 índices estratégicos (migration 022) com melhoria esperada de 40-60%:
- Orders: status + created_at (DESC)
- Sessions: status + location + started_at
- Waiter calls: location + status (pending only)
- Staff time off: staff_id + dates

---

## Testes

**1691 testes passando** com Vitest (66 test suites).

### Cobertura por Camada

| Camada | Testes | Cobertura |
|--------|--------|-----------|
| **Use Cases** | 96+ testes | 100% |
| **Domain Services** | 143+ testes | 100% (OrderService 44, SessionService 34, TableService 40, GameService 25+) |
| **Infrastructure** | 129+ testes | Padrão estabelecido (8 repositórios testados) |
| **Presentation Hooks** | 69+ testes | Padrão estabelecido (6 hooks testados) |
| **Vendus POS** | 131 testes | 88% cobertura (client, config, invoices, products, categories, tables, kitchen) |

### Repositórios Testados

| Repositório | Testes |
|-------------|--------|
| SupabaseRestaurantRepository | 25 |
| SupabaseRestaurantClosureRepository | 19 |
| SupabaseGameQuestionRepository | 25 |
| SupabaseGameSessionRepository | 16 |
| SupabaseGameAnswerRepository | 15 |
| SupabaseGamePrizeRepository | 12 |
| SupabaseStaffTimeOffRepository | 10 |
| SupabaseReservationSettingsRepository | 7 |

### Módulos Vendus Testados

| Módulo | Testes |
|--------|--------|
| client (HTTP, retry, errors) | 35 |
| invoices (faturação, retry queue) | 27 |
| config (configuração, constantes) | 21 |
| tables (import mesas) | 17 |
| products (sync push/pull) | 15 |
| kitchen (impressão cozinha) | 12 |
| categories (sync categorias) | 4 |

### Hooks Testados

| Hook | Testes |
|------|--------|
| useProducts | 20 |
| useGameSession | 18 |
| useStaffTimeOff | 12 |
| useActivityLog | 7 |
| useGameConfig | 7 |
| useRestaurants | 5 |

---

## API Routes

### Autenticação (`/api/auth/`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login de staff |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Dados do utilizador actual |
| `/api/auth/secure-login` | POST | Login seguro |
| `/api/auth/mfa/enroll` | POST | Activar MFA |
| `/api/auth/mfa/verify` | POST | Verificar código MFA |
| `/api/auth/mfa/status` | GET | Estado do MFA |

### Mesa / Jogos (`/api/mesa/`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/mesa/games` | GET | Leaderboard da sessão |
| `/api/mesa/games` | POST | Iniciar sessão de jogo |
| `/api/mesa/games/answer` | POST | Submeter resposta |
| `/api/mesa/games/complete` | POST | Completar jogo |
| `/api/mesa/games/redeem` | POST | Resgatar prémio |
| `/api/mesa/ratings` | GET | Stats de ratings |
| `/api/mesa/ratings` | POST | Guardar rating de produto |

### Admin (`/api/admin/`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/admin/game-questions` | GET/POST/PUT/DELETE | CRUD de perguntas de jogos |
| `/api/admin/game-stats` | GET | Analytics de jogos |
| `/api/admin/kitchen-metrics` | GET | Métricas de performance da cozinha por staff |
| `/api/admin/products/stats` | GET | Estatísticas de produtos |
| `/api/admin/products/upload` | POST | Upload de imagens |

### Core

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/sessions` | GET/POST | Gestão de sessões |
| `/api/reservations` | GET/POST | CRUD de reservas |
| `/api/reservations/[id]` | GET/PUT/DELETE | Reserva individual |
| `/api/closures` | GET/POST/DELETE | Gestão de fechos |
| `/api/closures/check` | GET | Verificar se data está fechada |
| `/api/staff-time-off` | GET/POST | CRUD de ausências |
| `/api/staff-time-off/[id]` | GET/PUT/DELETE | Ausência individual |
| `/api/staff/[id]/metrics` | GET | Métricas de performance |
| `/api/customers/from-session` | POST | Criar cliente de sessão |
| `/api/customers/[id]/history` | GET | Histórico de pedidos |
| `/api/reservation-settings` | GET/PUT | Configurações de reservas |
| `/api/export` | GET | Exportação de dados |
| `/api/activity/log` | POST | Log de actividade |

### Vendus POS (`/api/vendus/`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/vendus/sync/products` | POST | Sync produtos (push/pull) |
| `/api/vendus/sync/categories` | POST | Sync categorias |
| `/api/vendus/sync/tables` | POST | Import mesas do Vendus |
| `/api/vendus/invoices` | GET/POST | Listar/criar facturas |
| `/api/locations` | GET | Listar localizações |
| `/api/locations/:slug` | PATCH | Actualizar localização (Vendus config) |

### Webhooks e Cron

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/webhooks/resend` | POST | Tracking de eventos de email |
| `/api/cron/reservation-reminders` | POST | Lembretes automáticos de reservas |
| `/api/cron/vendus-sync` | GET | Sync automática Vendus + retry queue |

---

## Base de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `restaurants` | Localizações e configurações de restaurantes |
| `staff` | Funcionários e credenciais |
| `roles` | Funções (admin, kitchen, waiter, customer) |
| `customers` | Clientes do programa de fidelização |
| `device_profiles` | Persistência de dispositivos |
| `tables` | Mesas do restaurante |
| `categories` | Categorias de produtos |
| `products` | Produtos/itens do menu |
| `sessions` | Sessões de mesa (refeição) |
| `session_participants` | Dispositivos numa sessão |
| `orders` | Pedidos individuais (com `prepared_by`, `preparing_started_at`, `ready_at`) |
| `cart_items` | Itens no carrinho partilhado |
| `reservations` | Reservas de mesa |
| `reservation_settings` | Configurações de reservas |
| `restaurant_closures` | Dias de fecho |
| `staff_time_off` | Férias e folgas de funcionários |
| `waiter_tables` | Atribuição empregado-mesa |
| `waiter_calls` | Chamadas de assistência |
| `locations` | Localizações com config Vendus (`vendus_store_id`, `vendus_register_id`, `vendus_enabled`) |
| `payment_methods` | Métodos de pagamento com `vendus_id` opcional |
| `invoices` | Facturas com referência Vendus (`vendus_id`, `vendus_document_number`) |
| `vendus_sync_log` | Log de operações de sincronização Vendus |
| `vendus_retry_queue` | Fila de retry para operações falhadas |
| `product_ratings` | Avaliações de produtos (swipe game, per-order-item via `order_id`) |
| `game_questions` | Perguntas de quiz e preferência |
| `game_sessions` | Sessões de jogo |
| `game_answers` | Respostas dos jogadores |
| `game_prizes` | Prémios ganhos |
| `email_events` | Log de eventos de email |
| `activity_log` | Auditoria de acções |

### Migrations

```
supabase/migrations/
├── 001_user_management.sql         # Staff, roles, tables base
├── 002_table_management.sql        # Sessions, orders, cart
├── 003_reservations.sql            # Sistema de reservas
├── 004_email_tracking.sql          # Tracking de emails
├── 005_restaurant_closures.sql     # Gestão de folgas
├── 007_waiter_calls.sql            # Chamadas de empregados
├── 008_session_customers.sql       # Participantes na sessão
├── 009_waiter_calls_order_id.sql   # Relação chamadas-pedidos
├── ...                             # Migrations intermédias
├── 024_order_cooldown.sql          # Cooldown entre pedidos
├── 025_progressive_registration.sql # Registo progressivo, device_profiles
├── 026_product_images_multiple.sql # Múltiplas imagens por produto
├── 027_products_rls_admin.sql      # RLS policy para admin
├── 028_product_ratings.sql         # Ratings de produtos (swipe game)
├── 029_games.sql                   # 4 tabelas de jogos + config restaurante
├── 030_game_questions_seed.sql     # 35 perguntas seed (quiz + preferência)
├── 031_game_answers_realtime.sql   # Real-time para respostas
├── 032_unified_game_scoring.sql    # Sistema de pontuação unificado
├── 033_games_mode.sql              # Modo de selecção de jogos
├── 034_order_prepared_by.sql       # Tracking de quem preparou cada pedido
├── 035_order_item_ratings.sql      # Ratings per-order-item (order_id em product_ratings)
├── 036_order_delivered_at.sql      # Timestamp de entrega
├── 037_waiter_calls_customer.sql   # Chamadas com dados de cliente
├── 038_identity_verification.sql   # Verificação de identidade (Twilio)
├── 039_session_ordering_mode.sql   # Modo de pedido na sessão
├── 040_waiter_location_filter.sql  # Filtro de localização para waiter
├── 041_fix_waiter_assignments.sql  # Correcção de atribuições de waiter
├── 042_enable_auto_assignment.sql  # Auto-atribuição de empregados
├── 043_close_session_update_table.sql # Função close_session_and_free_table
├── 044_fix_close_session_function.sql # Fix da função de fecho
├── 045_fix_product_ratings.sql     # Fix constraints product_ratings
├── 046_vendus_integration.sql      # Integração Vendus: tabelas core
├── 047_vendus_categories.sql       # Vendus: mapeamento de categorias
├── 048_locations_flexible.sql      # Remove constraint de slugs fixos
├── 049_products_location.sql       # Produtos por localização
├── 050_products_service_modes.sql  # Modos de serviço por produto
├── 051_import_vendus_products.sql  # Import de produtos Vendus
├── 052_products_service_prices.sql # Preços por modo de serviço
└── 053_products_vendus_ids.sql     # IDs Vendus em produtos
```

### Scripts SQL de Utilidade

Scripts no diretório raiz do projeto para gestão de empregados:

| Script | Descrição |
|--------|-----------|
| `check-waiter-data.sql` | Verificar empregados disponíveis e suas atribuições a mesas |
| `assign-waiters-to-tables.sql` | Atribuir empregado específico a mesas (requer UUID manual) |
| `quick-assign-waiter.sql` | **Recomendado:** Atribui automaticamente primeiro empregado disponível (usa CTE) |

**Notas importantes:**
- Tabela `staff` tem coluna `role_id` (FK para `roles`), não coluna `role` direta
- Sempre fazer JOIN: `JOIN roles r ON s.role_id = r.id`
- `staff_id` é tipo UUID, nunca usar valores integer
- Para automação, usar `quick-assign-waiter.sql` que seleciona UUID automaticamente via CTE

---

## Autenticação

### Sistema Dual de Autenticação

O sistema suporta dois modos de autenticação, seleccionado automaticamente pelo ambiente:

| Modo | Ambiente | Descrição |
|------|----------|-----------|
| **Legacy** | `npm run dev` | Comparação de password na tabela `staff`, sem Supabase Auth |
| **Secure** | `npm run dev:prod` / `build` | Supabase Auth (`signInWithPassword`), JWT cookie, rate limiting, MFA |

Ambos os modos geram um cookie JWT (`sushi-auth-token`) para as API routes.

### Tokens JWT

| Aspecto | Implementação |
|---------|---------------|
| **Tipo** | JWT (JSON Web Token) |
| **Biblioteca** | jose |
| **Armazenamento** | Cookie httpOnly, secure, sameSite: lax |
| **Expiração** | 24 horas |
| **Payload** | id, email, name, role, location |
| **MFA** | Suporte a autenticação multi-factor |

### Setup de Produção (Supabase Auth)

1. Criar utilizador em Supabase Auth (Dashboard > Authentication > Users)
2. Email deve corresponder ao registo na tabela `staff`
3. Ligar: `UPDATE staff SET auth_user_id = '<auth-uuid>' WHERE email = '<email>'`

### Roles e Permissões

| Role | Permissões |
|------|------------|
| `admin` | Acesso total a todas as funcionalidades |
| `kitchen` | Ecrã de cozinha, ver e gerir pedidos |
| `waiter` | Gestão de mesas atribuídas, criar pedidos, chamadas |
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
| `pt` | Portugues (default) |
| `en` | Inglês |
| `fr` | Francês |
| `de` | Alemão |
| `it` | Italiano |
| `es` | Espanhol |

- **Biblioteca:** next-intl
- **Estratégia:** Prefixo apenas quando necessário
- **Ficheiros:** `/src/messages/[locale].json`
- **Cobertura:** Website público (100%), mesa (100%), jogos (100%), admin (parcial)

---

## Integrações

### Supabase

| Funcionalidade | Uso |
|----------------|-----|
| **Database** | PostgreSQL para todos os dados |
| **Real-time** | Subscriptions para dashboard, pedidos, jogos |
| **Row Level Security** | Políticas de segurança por role |
| **Storage** | Upload de imagens de produtos |

**Gerar tipos TypeScript:**

```bash
npx supabase login
npm run supabase:types
```

Os tipos são gravados em `src/types/supabase.ts`.

### Resend (Email)

| Tipo de Email | Quando |
|---------------|--------|
| Confirmação ao Cliente | Ao submeter reserva |
| Notificação ao Restaurante | Nova reserva recebida |
| Confirmação de Reserva | Admin confirma reserva |
| Lembretes | Cron jobs (véspera e dia) |
| Webhooks | Tracking de eventos de email |

### Vendus POS (Faturação Certificada)

Integração com o [Vendus POS](https://www.vendus.pt) para faturação certificada pela AT (Autoridade Tributária).

| Funcionalidade | Descrição |
|----------------|-----------|
| **Sync de Produtos** | Sincronização bidireccional (push/pull) com preview e resolução de conflitos |
| **Sync de Categorias** | Export de categorias para o Vendus |
| **Importar Mesas** | Importar mesas/salas do Vendus |
| **Faturação** | Emissão de facturas certificadas AT (FS sem NIF, FR com NIF) |
| **Impressão Cozinha** | Enviar pedidos para impressora da cozinha (opcional, não-bloqueante) |
| **Retry Queue** | Fila de retry com backoff exponencial (max 5 tentativas) |
| **Cron Sync** | Sincronização automática via Vercel Cron |
| **Config por Local** | Store ID e Register ID configurados por restaurante via admin |

**Painel Admin:** `/admin/vendus/` (dashboard, locations, sync, invoices, mapping)

**Testes:** 131 testes nos módulos Vendus (88% cobertura)

Ver documentação completa em [docs/VENDUS_SYNC.md](docs/VENDUS_SYNC.md).

### Twilio (Verificação SMS)

| Funcionalidade | Descrição |
|----------------|-----------|
| **Verificação de Telefone** | Código SMS para validar número de telefone |
| **Registo Progressivo** | Integrado no fluxo de fidelização (Tier 2+) |

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
# (via Supabase Dashboard SQL Editor ou CLI com Docker)

# Iniciar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

---

## Variáveis de Ambiente

Ver `.env.local.example` para a lista completa. Resumo:

```env
# Site
NEXT_PUBLIC_SITE_URL=https://seudominio.pt

# Autenticacao
AUTH_SECRET=chave-secreta-mudar-em-producao

# Supabase (producao)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Supabase (desenvolvimento - opcional, projecto separado)
# NEXT_PUBLIC_SUPABASE_URL_DEV=https://yyyyy.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV=eyJhbGciOi...
# SUPABASE_SERVICE_ROLE_KEY_DEV=eyJhbGciOi...

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=reservas@seudominio.pt

# Vendus POS (opcional)
VENDUS_API_KEY=sua_api_key

# Twilio SMS (verificacao de telefone)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Cron Jobs
CRON_SECRET=secret-para-cron-jobs
```

---

## Scripts Disponíveis

| Comando | Ambiente | Descrição |
|---------|----------|-----------|
| `npm run dev` | development | Dev server com legacy auth e DB de dev (DEV badge visível) |
| `npm run dev:prod` | production | Dev server com Supabase Auth e DB de prod |
| `npm run build` | production | Corre testes + build de producao |
| `npm start` | production | Iniciar servidor de producao |
| `npm run lint` | - | Verificar codigo com ESLint |
| `npm test` | - | Executar testes (watch mode) |
| `npm run test:run` | - | Executar todos os testes |
| `npm run test:coverage` | - | Testes com relatorio de cobertura |

---

## Estrutura do Projecto

```
src/
├── domain/                      # Camada de Domínio (PURA)
│   ├── entities/                # 20 entidades de negócio
│   ├── repositories/            # 17 interfaces de repositório
│   ├── services/                # 7 domain services
│   └── value-objects/           # 6 value objects (enums, configs)
│
├── application/                 # Camada de Aplicação
│   ├── use-cases/               # 88+ use cases organizados por feature
│   │   ├── orders/              # 4 use cases
│   │   ├── sessions/            # 5 use cases
│   │   ├── tables/              # 4 use cases
│   │   ├── staff/               # 6 use cases
│   │   ├── reservations/        # 9 use cases
│   │   ├── customers/           # 7 use cases
│   │   ├── closures/            # 6 use cases
│   │   ├── waiter-calls/        # 5 use cases
│   │   ├── staff-time-off/      # 5 use cases
│   │   ├── restaurants/         # 6 use cases
│   │   ├── games/               # 7 use cases
│   │   ├── kitchen-metrics/     # 2 use cases
│   │   ├── cart/                # 1 use case
│   │   ├── device-profiles/     # 2 use cases
│   │   ├── session-customers/   # 3 use cases
│   │   └── reservation-settings/# 2 use cases
│   └── dto/                     # Data Transfer Objects
│
├── infrastructure/              # Camada de Infraestrutura
│   ├── repositories/            # 17 implementações Supabase
│   ├── realtime/                # Handlers de real-time
│   └── services/                # Serviços (ApiActivityLogger)
│
├── presentation/                # Camada de Apresentação
│   ├── contexts/                # DependencyContext (DI)
│   ├── hooks/                   # 24+ hooks
│   └── providers/               # Layout providers
│
├── app/                         # Next.js App Router
│   ├── [locale]/                # Páginas públicas (i18n)
│   ├── admin/                   # Painel administrativo
│   │   ├── page.tsx             # Dashboard
│   │   ├── chamadas/            # Chamadas de empregado
│   │   ├── reservas/            # Gestão de reservas
│   │   ├── folgas/              # Gestão de folgas
│   │   ├── sessoes/             # Gestão de sessões
│   │   ├── produtos/            # Gestão de produtos
│   │   ├── staff/               # Gestão de funcionários
│   │   ├── clientes/            # Gestão de clientes
│   │   ├── jogos/               # Gestão de jogos + analytics
│   │   ├── definicoes/          # Configurações (5 tabs)
│   │   ├── vendus/              # Integração Vendus POS (dashboard, sync, invoices, locations, mapping)
│   │   ├── qrcodes/             # Geração de QR codes
│   │   └── exportar/            # Exportação de dados
│   ├── cozinha/                 # Ecrã de cozinha
│   ├── waiter/                  # Interface empregado
│   ├── mesa/[numero]/           # Pedidos por mesa (6 tabs)
│   ├── login/                   # Página de login
│   └── api/                     # 35+ API Routes
│
├── components/                  # Componentes React
│   ├── ui/                      # Componentes base
│   ├── mesa/                    # Componentes de mesa (jogos, ratings)
│   └── ...                      # Componentes de página
│
├── __tests__/                   # 1691 testes (Vitest)
│   ├── application/use-cases/   # Testes de todos os use cases
│   ├── domain/services/         # Testes de domain services
│   ├── infrastructure/          # Testes de repositórios
│   └── presentation/hooks/      # Testes de hooks
│
├── lib/                         # Utilitários
│   ├── auth.ts                  # Autenticação
│   ├── supabase/                # Clientes Supabase (dual env: dev/prod)
│   ├── vendus/                  # Integração Vendus POS (131 testes)
│   └── email/                   # Serviço de email
│
├── types/                       # Tipos TypeScript
├── messages/                    # Traduções i18n (6 idiomas)
└── middleware.ts                # Middleware Next.js
```

---

## Documentação Adicional

| Ficheiro | Descrição |
|----------|-----------|
| [CLAUDE.md](CLAUDE.md) | Convenções de desenvolvimento e arquitectura detalhada |
| [GAMES_FEATURE.md](GAMES_FEATURE.md) | Documentação completa da feature de jogos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Clean Architecture em detalhe |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Optimizações de performance |
| [docs/TESTING.md](docs/TESTING.md) | Guia de testes |
| [docs/VENDUS_SYNC.md](docs/VENDUS_SYNC.md) | Integração Vendus POS (setup, sync, faturação) |

---

## Estado Actual (2026-02-20)

- Clean Architecture 100% implementada (20 entidades, 88+ use cases, 17 repositórios)
- **1691 testes passando** (100% use cases, 100% domain services, 131 testes Vendus)
- Performance optimizada (React Query + Hooks optimizados + 18 índices DB)
- **Vendus POS Integration** — Faturação certificada AT, sync bidireccional de produtos/categorias, retry queue
- **Dual Auth System** — Legacy (dev) e Supabase Auth (prod) com selecção automática por ambiente
- **Kitchen Workflow Optimization** — Fluxo da cozinha termina em "Pronto para servir" (view-only), empregados avançam para "Entregue"
- **Waiter Display** — Nomes de empregados exibidos nos cartões da cozinha via repositório optimizado
- **"Sair da Mesa"** — Clientes podem sair quando não consumiram, com fecho atómico de sessão + libertação de mesa
- **Painel do Waiter corrigido** — Sessões `pending_payment` visíveis, filtro correcto de mesas de outros waiters
- **Status Uniformizado** — Status de mesas calculado dinamicamente baseado em sessões activas
- Sistema de jogos interactivos completo (Quiz, Preference, Swipe)
- Kitchen Staff Tracking — identidade individual de quem prepara cada pedido com métricas de performance
- Avaliações per-order-item — mesmo produto pedido 2x gera 2 cartões de avaliação independentes
- Programa de fidelização progressivo com 4 tiers + verificação SMS (Twilio)
- Gestão multi-restaurante dinâmica
- Suporte a 6 idiomas
- 35+ API routes
- Real-time em pedidos, carrinho, jogos e chamadas
- 53 migrations de base de dados
