# Alterações Recentes - Sushi in Sushi

## 📅 Data: 2026-03-07

### Stripe Self-Checkout na Mesa

**Objectivo:** Permitir que clientes paguem diretamente no telemovel via Stripe, sem precisar de esperar pelo empregado. O empregado continua a poder fechar sessoes manualmente (cash, Multibanco, etc.).

**Ficheiros criados:**
- `src/lib/stripe.ts` — Singleton server-side Stripe client
- `src/app/api/payments/create-intent/route.ts` — Cria Stripe PaymentIntent com idempotencia (reutiliza PI existente)
- `src/app/api/webhooks/stripe/route.ts` — Webhook handler: payment_intent.succeeded (fatura Vendus + close session) e payment_failed
- `src/app/api/payments/[sessionId]/status/route.ts` — Polling endpoint para cliente verificar estado
- `src/presentation/components/mesa/PaymentSheet.tsx` — Componente 5-step: choice→tip→NIF→payment→success
- `src/__tests__/integration/api/stripe-payments.test.ts` — 13 testes (create-intent, webhook, status)

**Alteracoes em ficheiros existentes:**
- `src/app/mesa/[numero]/page.tsx` — Substituido bill modal por PaymentSheet. Novo handler `requestBillViaWaiter` (fallback) e `handlePaymentSuccess`
- `next.config.js` — CSP headers atualizados: `js.stripe.com` (script-src), `api.stripe.com` (connect-src), `js.stripe.com` (frame-src)
- `package.json` — Adicionados: `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`

**Principio Webhook-First:**
- Pagamento so confirmado via webhook `payment_intent.succeeded`, nunca client-side
- Fatura Vendus criada no webhook (subtotal sem gorjeta)
- Sessao fechada via RPC `close_session_transactional`
- Gorjeta nao entra na fatura (nao e tributavel)

**Idempotencia:** PaymentIntent reutilizado se existir pending/processing para a sessao. Webhook verifica status antes de reprocessar.

---

### Payment Methods Admin CRUD

**Objectivo:** Permitir ao admin gerir metodos de pagamento (Dinheiro, Multibanco, MB Way, etc.) diretamente do painel de definicoes, sem necessidade de acesso direto a base de dados.

**Clean Architecture completa:**
- **Domain:** `PaymentMethod` entity + `IPaymentMethodRepository` interface
- **Infrastructure:** `SupabasePaymentMethodRepository` com mapeamento snake_case/camelCase
- **Application:** 4 use cases — `GetAllPaymentMethodsUseCase`, `CreatePaymentMethodUseCase`, `UpdatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`
- **API:** `GET/POST /api/payment-methods`, `PATCH/DELETE /api/payment-methods/[id]` (admin-only writes)
- **Presentation:** `usePaymentMethods` hook + tab "Metodos de Pagamento" em `/admin/definicoes`
- **Testes:** 17 testes unitarios para todos os use cases

**Funcionalidades UI:**
- Lista com toggle ativo/inativo inline
- CRUD modal com nome, slug (auto-gerado), Vendus ID, ordem, estado
- Validacao de slug unico
- Confirmacao de eliminacao

---

### Offline/PWA System (Service Worker + IndexedDB + Background Sync)

**Objectivo:** Implementar resiliencia offline para o sistema web, permitindo que pedidos feitos sem internet sejam guardados e reenviados automaticamente quando a conectividade regressa. Arquitectura preparada para portabilidade para React Native.

**Mudancas:**
- `public/sw.js` — Service Worker com Background Sync, 3 cache strategies:
  - Stale-while-revalidate para `/api/products` e `/api/categories`
  - Cache-first para assets estaticos (JS, CSS, imagens, fontes)
  - Network-first com fallback offline para navegacao
- `src/infrastructure/offline/OfflineQueue.ts` — Fila de requests offline com `StorageAdapter` interface (IndexedDB na web, swappable para AsyncStorage/SQLite no React Native)
- `src/infrastructure/offline/offlineFetch.ts` — Drop-in `fetch()` replacement que enfileira mutacoes quando offline
- `src/presentation/hooks/useOfflineQueue.ts` — Hook React com `useSyncExternalStore` para estado online/offline e contagem da fila
- `src/presentation/components/ui/OfflineBanner.tsx` — Banner fixo top-of-page: vermelho quando offline, amber quando tem pedidos pendentes
- `src/presentation/components/ServiceWorkerRegistrar.tsx` — Registo do SW (apenas em producao)
- `src/app/offline/page.tsx` — Pagina fallback offline com detecao automatica de idioma, contagem de fila, e auto-reload ao reconectar
- `src/presentation/providers/Providers.tsx` — Adicionados `OfflineBanner` e `ServiceWorkerRegistrar`

**Documentacao:**
- `docs/PLANO_MOBILE.md` — Nova seccao 9 "Comunicacao Offline e Alternativas de Rede" com analise de BLE, Wi-Fi Aware, Multipeer Connectivity, Nearby Connections, Local MQTT, e implementacao faseada

---

### Realtime Store (useSyncExternalStore + Broadcast + Postgres Changes)

**Objectivo:** Sistema de notificacoes real-time sem useEffect para estado, platform-agnostic (portavel para React Native), com dual delivery (broadcast instantaneo + postgres_changes persistente).

**Mudancas:**
- `src/infrastructure/realtime/RealtimeStore.ts` — Store reativo com subscribe/getSnapshot (zero React imports)
- `src/infrastructure/realtime/events.ts` — 15 eventos tipados: TableEvent (5), OrderEvent (3), WaiterCallEvent (3) + RealtimeEnvelope generic wrapper
- `src/infrastructure/realtime/channels/table.ts` — Config para canal de mesas (postgres_changes em tables+sessions, broadcasts)
- `src/infrastructure/realtime/channels/order.ts` — Config para canal de pedidos (com filtro por status)
- `src/infrastructure/realtime/channels/waiter-call.ts` — Config para canal de chamadas
- `src/presentation/hooks/useRealtimeStore.ts` — 3 variantes: useRealtimeStore, useRealtimeStoreEvents, useRealtimeStoreRef
- `src/presentation/hooks/useRealtimeTable.ts` — broadcastOpenRequest, broadcastPreferences, auto-invalidacao React Query
- `src/presentation/hooks/useRealtimeOrders.ts` — broadcastNewOrder, callbacks onNewOrder/onStatusChange
- `src/presentation/hooks/useRealtimeWaiterCalls.ts` — broadcastCall, callback onNewCall
- Testes: 22 tests RealtimeStore, 23 tests channels (table, order, waiter-call)

---

### Image Resize On-the-fly (Supabase Storage Transformations)

**Objectivo:** Servir imagens de produtos redimensionadas automaticamente via Supabase Storage Transformations, melhorando performance sem duplicar ficheiros.

**Mudancas:**
- Utility `src/lib/image.ts` — `getOptimizedImageUrl()` converte URLs `/object/public/` para `/render/image/public/` com query params (width, height, quality, resize)
- 3 presets: `thumbnail` (400px, q75), `detail` (800px, q80), `adminPreview` (200px, q70)
- `next.config.js` — `remotePatterns` alargado para `/storage/v1/**` (suporta `/render/image/`)
- Componentes atualizados:
  - `ProductCard.tsx` — thumbnail preset
  - `MenuContent.tsx` — thumbnail preset (static + hover)
  - `ImageCarousel.tsx` — detail preset (single + multi)
  - `admin/produtos/page.tsx` — adminPreview (table + grid + modal), removido `unoptimized`
- URLs nao-Supabase passam inalteradas (fallback seguro)
- CDN cache automatico apos primeiro request

---

## 📅 Data: 2026-03-06

### Marketing Intelligence - Fase 1: Estrategia de Marketing

**Objectivo:** Implementar a tab "Estrategia" no admin SEO com objetivos estrategicos (26 objetivos em 6 categorias) e questionario de contexto do negocio. Esta e a base para futuras sugestoes AI e segmentacao.

**Mudancas:**
- Migration `097_business_strategy.sql` — Tabela singleton `business_strategy` com RLS
- API route `GET/PATCH /api/admin/business-strategy` — CRUD com auth admin
- Componente `src/app/admin/seo/StrategyTab.tsx` — Interface completa:
  - 6 categorias de objetivos (Aquisicao, Retencao, Reservas, Reputacao, Operacional, Revenue)
  - 26 objetivos com checkboxes, prioridade 1-5, e notas por objetivo
  - Questionario: publico-alvo, tom de comunicacao, tipo cozinha, diferencial competitivo
  - Campos: faixa etaria, capacidade almoco/jantar, preco medio, orcamento marketing
  - Canais ativos com prioridade (principal/secundario)
  - Concorrentes diretos (tag-style input)
  - Datas-chave do ano (com flag "anual")
- Tab "Estrategia" adicionada a `/admin/seo` (lazy-loaded)

**Plano completo:** `docs/PLANO_MARKETING_INTELLIGENCE.md` (8 fases, da auditoria de dados ao dashboard preditivo)

### GTM DataLayer Events & Reservation Source

**GTM Events:**
- Hook `useGTMEvent()` + funcao `pushGTMEvent()` em `src/presentation/hooks/useGTMEvent.ts`
- Eventos: `reservation_started`, `reservation_completed`, `menu_view`, `qr_scan`, `order_placed`, `login`, `signup`
- Type-safe via `GTMEventMap`, so dispara se GTM carregado

**Reservation Source:**
- Migration `098_reservation_source.sql` — `source TEXT DEFAULT 'website'` em reservations
- Tipo `ReservationSource` no domain (website/phone/walkin/thefork/instagram/google/other)
- Admin: dropdown editavel no detalhe + badge nos cards

---

### Presentation Layer Consolidation

**Objectivo:** Eliminar diretórios legados (`src/components/`, `src/hooks/`, `src/contexts/`) e consolidar toda a camada de apresentação React em `src/presentation/`, alinhando com a Clean Architecture.

**Mudanças estruturais:**
- `src/components/*` migrado para `src/presentation/components/` com subpastas semânticas
- `src/hooks/*` (4 ficheiros) consolidado em `src/presentation/hooks/`
- `src/contexts/*` (2 ficheiros) consolidado em `src/presentation/contexts/`
- Diretórios legados eliminados

**Nova organização de `src/presentation/components/`:**
- `ui/` — Primitivos UI (Button, Modal, Card, Badge, Toast, Skeleton, etc.)
- `layout/` — Header, Footer, LanguageSwitcher
- `homepage/` — Hero, About, Gallery, Reviews, VideoSection, Locations, Contact, Team
- `orders/` — OrderStatusBadge, SessionSummary
- `products/` — ProductCard, CategoryTabs, Menu
- `reservations/` — ReservationForm
- `tables/` — TableSelector
- `admin/` — TableMap, TableDetailModal, Analytics sections
- `charts/` — Recharts wrappers
- `mesa/` — QR code mesa experience (games, carousel, providers)
- `calendar/` — StaffCalendar, ReservationsCalendar
- `seo/` — RestaurantSchema, MenuSchema, GoogleTagManager
- `menu/` — MenuContent
- `auth/` — SessionTimeoutWarning

**Imports atualizados:** ~69 imports em ~46 ficheiros, zero referências legadas restantes.

---

## 📅 Data: 2026-03-05

### Dynamic Site Configuration & Brand Removal

**Objectivo:** Tornar todo o conteúdo do site dinâmico via `site_settings` (singleton id=1), eliminando valores hardcoded de brand name, logo, metadata e imagens.

**Novos campos em `site_settings`:**
- `gtm_id` TEXT — Google Tag Manager Container ID
- `meta_titles` JSONB — Títulos por locale `{"pt":"...","en":"...",...}`
- `meta_descriptions` JSONB — Descrições meta por locale
- `meta_og_descriptions` JSONB — Descrições Open Graph por locale
- `meta_keywords` JSONB — Keywords por locale (array por idioma)
- `og_image_url` TEXT NOT NULL DEFAULT '/logo.png'
- `logo_url` TEXT NOT NULL DEFAULT '/logo.png'
- `favicon_url` TEXT NOT NULL DEFAULT '/favicon.png'
- `apple_touch_icon_url` TEXT NOT NULL DEFAULT '/apple-touch-icon.png'

**Ficheiros novos:**
- `src/lib/metadata/index.ts` — `getSiteMetadata()` com `unstable_cache` (24h, tag `site-metadata`)
- `src/components/seo/GoogleTagManager.tsx` — Server component para GTM dinâmico

**Ficheiros modificados (metadata):**
- `src/app/[locale]/layout.tsx` — `generateMetadata` totalmente dinâmico via `getSiteMetadata()`
- `src/app/layout.tsx` — `generateMetadata` dinâmico (brand_name no title template)
- `src/app/[locale]/menu/layout.tsx` — Títulos sem brand suffix (usa parent template)
- `src/app/[locale]/reservar/page.tsx` — Idem + descrições com brand dinâmico
- `src/app/[locale]/equipa/layout.tsx` — Idem
- `src/app/login/layout.tsx` — `generateMetadata` async com brand dinâmico
- `src/app/mesa/layout.tsx` — `generateMetadata` async com brand dinâmico

**Ficheiros modificados (brand name dinâmico):**
- `src/components/Header.tsx` — `brandName` via `useSiteSettings`, alt/aria-label dinâmicos
- `src/components/Footer.tsx` — alt/aria-label dinâmicos
- `src/app/admin/layout.tsx` — Sidebar brand via `useSiteSettings`
- `src/app/cozinha/page.tsx` — Brand name dinâmico
- `src/app/login/page.tsx` — Brand name e alt dinâmicos
- `src/app/mesa/[numero]/page.tsx` — Brand name e alt dinâmicos
- `src/app/mesa/verify/page.tsx` — Brand name dinâmico (VerifyContent)
- `src/app/[locale]/entrar/page.tsx` — Brand name e alt dinâmicos
- `src/app/[locale]/registar/page.tsx` — Idem
- `src/app/[locale]/recuperar-password/page.tsx` — Idem
- `src/app/[locale]/redefinir-password/page.tsx` — Idem
- `src/app/[locale]/equipa/page.tsx` — Idem
- `src/app/admin/qrcodes/page.tsx` — Brand dinâmico em QR cards e print
- `src/app/admin/mesas/page.tsx` — Brand dinâmico em QR modal
- `src/app/admin/definicoes/page.tsx` — Brand dinâmico em QR modal + campos SEO/imagens no admin
- `src/app/admin/agenda/page.tsx` — Brand dinâmico em ICS export

**Ficheiros modificados (emails):**
- `src/lib/email/index.ts` — `getBrandName()` cached, `from:` dinâmico, `ensureDynamicAssets()`
- `src/lib/email/templates.ts` — `BRAND_NAME` var + `initBrandName()`, todas as 30+ referências substituídas

**Ficheiros modificados (outros):**
- `src/components/seo/RestaurantSchema.tsx` — `logo_url` e `og_image_url` de settings
- `src/components/seo/MenuSchema.tsx` — `restaurantName` obrigatório (sem default)
- `src/app/[locale]/menu/page.tsx` — Passa `restaurantName` do `getSiteMetadata()`
- `src/app/api/admin/site-settings/route.ts` — Novos campos no `allowed` + `revalidateTag`
- `src/app/api/verification/send/route.ts` — Brand dinâmico em emails e SMS
- `src/app/api/reservation-cancel/send-code/route.ts` — Brand dinâmico
- `src/app/api/products/generate-description/route.ts` — Brand dinâmico no AI prompt
- `src/app/api/products/generate-description/batch/route.ts` — Idem
- `src/app/api/calendar/timeoff/[id]/route.ts` — Brand dinâmico em ICS
- `src/presentation/hooks/useSiteSettings.ts` — Interface expandida com campos de imagens
- `next.config.js` — CSP headers para GTM

**Metadata de sub-paginas (`page_meta`):**
- `page_meta` JSONB column — titulos e descricoes por pagina (menu, reservar, equipa) e locale
- Sub-page layouts leem de `meta.pageMeta?.{page}` em vez de maps hardcoded
- Admin panel: card "Metadata de Paginas" com inputs por pagina/locale
- API: `page_meta` no array `allowed` do PATCH

**SQL migration consolidada:**
- `supabase/migrations/094_site_settings_dynamic_branding.sql` — Todos os campos + seed de `page_meta`

---

## 📅 Data: 2026-03-01 (Atualização 2)

### 🎯 Funcionalidades Implementadas

#### 1. **Reserva → Cliente Automático (Visit Tracking)** ✅

**Arquivos criados:**
- `/supabase/migrations/075_reservation_customer_id.sql` — FK `customer_id` em reservations

**Arquivos modificados:**
- `/src/domain/entities/Reservation.ts` — campo `customerId: string | null`
- `/src/infrastructure/repositories/SupabaseReservationRepository.ts` — mapeamento `customer_id` ↔ `customerId`
- `/src/app/api/reservations/route.ts` — POST: após upsert customer, guarda `customer_id` na reserva
- `/src/app/api/reservations/[id]/route.ts` — PATCH: ao completar reserva, chama `RecordCustomerVisitUseCase`
- `/src/app/api/reservation-cancel/[id]/route.ts` — mapeamento legacy atualizado
- `/src/types/database.ts` — `customer_id` em Row/Insert/Update
- `/src/types/supabase.ts` — `customer_id` em Row/Insert/Update

**O que faz:**
- Quando o cliente faz uma reserva, é criado/atualizado na tabela `customers` e o `customer_id` é guardado na reserva
- Quando a reserva é marcada como "completed" (cliente sentou-se), `RecordCustomerVisitUseCase` incrementa `visit_count`
- Isto provoca a progressão automática de tier: Tier 2 (Identificado) → Tier 3 (Cliente)
- `spent=0` no momento de sentar — o `totalSpent` será atualizado quando a sessão fechar (futuro)
- Fallback: se `customer_id` não existir na reserva, procura cliente por email

**Fluxo:**
```
POST /api/reservations  → upsert customer + customer_id na reserva → Tier 2
PATCH status=completed  → RecordCustomerVisitUseCase → visitCount++ → Tier 3
```

---

#### 2. **Session Customers no Admin Clientes** ✅

**Arquivos criados:**
- `/src/app/api/admin/session-customers/route.ts` — Lista com stats de jogos, paginação e pesquisa
- `/src/app/api/admin/session-customers/[id]/route.ts` — Detalhe com game answers, prizes e orders

**Arquivos modificados:**
- `/src/app/admin/clientes/page.tsx` — Tabs "Fidelizados" + "Sessão", painel lateral com detalhes

**O que faz:**
- Tab "Sessão" mostra todos os `session_customers` (utilizadores de mesa via QR code)
- Tabela: Nome | Patamar | Mesa | Jogos | Score | Prémios | Data
- Stats: Total, Com Email, Com Jogos, Prémios
- Painel lateral com histórico de jogos, prémios e pedidos
- Tier computado dinamicamente via `computeCustomerTier()` (não usa valor guardado)
- Paginação para > 200 registos

---

#### 3. **Revisão de Lógica de Tiers** ✅

**Arquivos modificados:**
- `/src/domain/value-objects/CustomerTier.ts` — Tier 3 agora requer contacto **e** visitas
- `/src/domain/services/CustomerTierService.ts` — `getMissingFieldsForNextTier` atualizado
- `/src/__tests__/domain/services/CustomerTierService.test.ts` — 30 testes
- `/src/__tests__/application/use-cases/session-customers/SessionCustomersUseCases.test.ts` — corrigido para novo tier
- `/src/__tests__/application/use-cases/device-profiles/DeviceProfilesUseCases.test.ts` — corrigido para novo tier

**Alteração principal:**
- **Antes:** Tier 3 = (email **e** phone) **ou** visitas
- **Depois:** Tier 3 = (email **ou** phone) **e** >= 1 visita concluída
- Ter email+phone sem visitas agora resulta em Tier 2, não Tier 3

---

### 🗄️ Migrações de Base de Dados

#### Migration 075: `reservation_customer_id`
- `ALTER TABLE reservations ADD COLUMN customer_id UUID REFERENCES customers(id)`
- `CREATE INDEX idx_reservations_customer_id ON reservations(customer_id)`
- Status: Pendente aplicação via SQL Editor

---

## 📅 Data: 2026-03-01

### 🎯 Funcionalidades Implementadas

#### 1. **Sistema de Tiers de Clientes (Comportamental)** ✅

**Arquivos criados/modificados:**
- `/src/domain/value-objects/CustomerTier.ts` — 5 tiers com critérios comportamentais
- `/src/domain/services/CustomerTierService.ts` — Insights comportamentais + computação de tier
- `/src/app/admin/clientes/page.tsx` — Badges de tier, dots de completude de perfil
- `/src/app/admin/clientes/[id]/page.tsx` — Secções "Dados recolhidos" e "Perfil comportamental"
- `/src/app/api/customers/[id]/history/route.ts` — Stats comportamentais na API
- `/src/__tests__/domain/services/CustomerTierService.test.ts` — 25 testes

**O que faz:**
- Tier 1 (Novo): sem email nem phone (só dados estatísticos)
- Tier 2 (Identificado): tem email **ou** phone
- Tier 3 (Cliente): tem email ou phone **e** >= 1 visita concluída
- Tier 4 (Regular): perfil completo (email+phone+birthDate) **e** >= 3 visitas
- Tier 5 (VIP): perfil completo **e** >= 10 visitas **e** >= 500€ gasto
- Insights: reserva frequente, no-show, grupos grandes, alto valor, cliente fiável
- Cores por tier (cinza, azul, âmbar, esmeralda, roxo)

---

#### 2. **Emails de Reserva — Auto-confirmação + Lembretes na UI** ✅

**Arquivos modificados:**
- `/src/lib/email/index.ts` — Nova `sendRestaurantNotificationEmail()` separada
- `/src/app/api/reservations/route.ts` — Auto-reserva envia "Reserva Confirmada" (não "recebemos o pedido")
- `/src/app/admin/reservas/page.tsx` — Secção de emails redesenhada com 4 tipos

**O que faz:**
- **Auto-confirmação:** quando `auto_reservations` está ativo, envia email "Reserva Confirmada" diretamente
- **Fluxo manual:** envia "Recebemos o seu pedido" → admin confirma → "Reserva Confirmada"
- **UI admin mostra 4 emails:** Receção do pedido, Confirmação (auto/manual), Lembrete 24h, Lembrete 2h
- Badge "Auto" verde distingue confirmação automática de manual
- Cada email mostra estado: Enviado/Entregue/Lido/Rejeitado com timestamps

---

#### 3. **Cron de Lembretes — Horários Atualizados** ✅

**Arquivos modificados:**
- `/vercel.json` — Cron alterado de `0 8-21 * * *` para `0 8,16 * * *`

**O que faz:**
- Lembretes enviados às 8h (manhã, para reservas do dia) e 16h (tarde, para jantares)
- Anteriormente: corria a cada hora das 8h às 21h

---

#### 4. **Segurança — RLS de Cancel Tokens** ✅

**Arquivos criados:**
- `/supabase/migrations/072_lock_cancel_tokens_rls.sql`

**O que faz:**
- Removeu política RLS permissiva (`FOR ALL USING (true)`) da tabela `reservation_cancel_tokens`
- Revogou privilégios de `anon` e `authenticated`
- API routes usam `createAdminClient()` (service role) que bypassa RLS

---

#### 5. **Correções de Email Templates** ✅

**Arquivos modificados:**
- `/src/lib/email/templates.ts` — Texto do lembrete 2h corrigido, link de cancelamento removido do farewell
- `/src/app/[locale]/cancelar-reserva/page.tsx` — Fix memory leak no timer de cooldown (useEffect)

---

#### 6. **E2E Tests — Melhorias** ✅

**Arquivos modificados:**
- `/e2e/reservation-flow.spec.ts` — Email de teste (`example.com`), assertion corrigida

---

### 🗄️ Migrações de Base de Dados

#### Migration 072: `lock_cancel_tokens_rls`
- Drop policy `cancel_tokens_all` (acesso irrestrito)
- Revoke ALL de anon e authenticated
- Status: Pendente aplicação via SQL Editor

---

## 📅 Data: 2026-02-23

### 🎯 Funcionalidades Implementadas

#### 1. **Alerta de Reservas para Empregados + Atribuição de Mesas** ✅

**Contexto:**
Quando uma reserva confirmada se aproxima, o empregado de mesa é alertado para preparar mesas. O empregado seleciona uma mesa principal (numero da reserva) e mesas adicionais que ficam em modo "reservado" para junção física.

**Arquivos criados:**
- `/supabase/migrations/058_reservation_table_assignment.sql`

**Arquivos modificados:**
- `/src/domain/entities/ReservationSettings.ts` — campo `waiterAlertMinutes`
- `/src/infrastructure/repositories/SupabaseReservationSettingsRepository.ts` — mapeamento DB `waiter_alert_minutes`
- `/src/app/api/reservation-settings/route.ts` — GET/PATCH com novo campo
- `/src/app/admin/definicoes/page.tsx` — card "Alerta para Empregados" no NotificationsTab
- `/src/app/waiter/page.tsx` — secção "Reservas Proximas" + modal de atribuição de mesas

**O que faz:**
- Setting configurável no admin: minutos de antecedência para alertar (default: 60min, range: 15-180)
- Waiter dashboard mostra reservas confirmadas de hoje que estão dentro da janela de alerta
- Secção roxa "Reservas Proximas" entre "Prontos para Servir" e "Chamadas de Clientes"
- Cada reserva mostra: nome, pessoas, hora, countdown, tipo (Rodízio/À Carta), notas especiais
- Botão "Atribuir Mesa" abre modal com grelha de todas as mesas da localização
- Modal de atribuição: 1º clique = mesa principal (dourado), cliques seguintes = mesas adicionais (azul)
- Mesas ocupadas/inativas ficam desabilitadas
- Ao confirmar: insere `reservation_tables`, marca mesas como "reserved", atualiza `tables_assigned = true`
- Real-time subscription na tabela `reservations` para updates automáticos

**Testes:** ❌ Não há testes automatizados (funcionalidade visual + DB)

---

#### 2. **Vendus Invoice — Suporte Multi-Modo** ✅

**Arquivos modificados:**
- `/src/lib/vendus/invoices.ts` (linhas 54-118)

**O que faz:**
- Faturas agora resolvem o `vendus_id` correto por modo de serviço (dine_in, delivery, takeaway)
- Usa `vendus_ids` JSONB (migração 053) em vez do legado `vendus_id`
- Cadeia de fallback: `vendus_ids[orderingMode]` → `vendus_id` → `product_id`
- Campo `ordering_mode` lido da sessão (default: `dine_in`)

---

#### 3. **"Encerrar Mesa" vs "Pedir Conta"** ✅

**Arquivos modificados:**
- `/src/app/waiter/mesa/[id]/page.tsx`

**O que faz:**
- Se não há pedidos na mesa: botão "Encerrar Mesa" (fecho direto com `close_session_and_free_table`)
- Se há pedidos: botão "Pedir Conta" (abre modal de faturação)
- Diálogo de confirmação antes de encerrar mesa sem pedidos

---

#### 4. **Reestruturação do Dashboard do Waiter** ✅

**Arquivos modificados:**
- `/src/app/waiter/page.tsx`

**O que faz:**
- Nova ordem: Stats → Prontos para Servir → Reservas Proximas → Chamadas → Tabs (Ativas/Disponíveis) → Cozinha
- Tabs "Mesas Ativas" / "Disponíveis" para melhor organização
- Mesas ativas mostram badge "Conta" para `pending_payment`
- Pedidos na cozinha movidos para o fundo da página

---

#### 5. **Notificações Desaparecem ao Concluir** ✅

**Arquivos modificados:**
- `/src/app/waiter/page.tsx`
- `/src/app/waiter/mesa/[id]/page.tsx`

**O que faz:**
- `handleCompleteCall` remove a chamada do estado local imediatamente após sucesso no DB
- `handleAcknowledgeCall` atualiza o estado local para "acknowledged" sem esperar refetch
- Polling de 15s como fallback caso Realtime não esteja ativo

---

### 🗄️ Migrações de Base de Dados

#### Migration 058: `reservation_table_assignment`
**Arquivo:** `/supabase/migrations/058_reservation_table_assignment.sql`

**Alterações:**
1. **`reservation_settings.waiter_alert_minutes`** — INTEGER DEFAULT 60, minutos de antecedência para alerta
2. **Tabela `reservation_tables`** — Junção reserva → múltiplas mesas
   - `reservation_id` (FK → reservations)
   - `table_id` (FK → tables)
   - `is_primary` (BOOLEAN) — mesa principal da reserva
   - `assigned_by` (FK → staff)
   - `assigned_at` (TIMESTAMPTZ)
   - UNIQUE(reservation_id, table_id)
3. **`reservations.tables_assigned`** — BOOLEAN DEFAULT false, flag de filtragem rápida
4. **Indexes:** `idx_reservation_tables_reservation`, `idx_reservation_tables_table`, `idx_reservations_unassigned` (partial)
5. **RLS:** Políticas SELECT, INSERT, DELETE habilitadas
6. **Grants:** anon + authenticated

**Status:** ⚠️ Pendente aplicação via Supabase Dashboard SQL Editor

---

### ⚠️ Problemas Identificados e Resolvidos

#### Problema: Chamadas de clientes não desaparecem ao concluir
**Causa:** `handleCompleteCall` atualizava DB mas não o estado React local
**Solução:** `setWaiterCalls(prev => prev.filter(c => c.id !== callId))` imediato ✅

#### Problema: Vendus fatura com vendus_id errado para produtos multi-modo
**Causa:** Código usava `vendus_id` singular, ignorando `vendus_ids` JSONB por modo
**Solução:** Fallback chain `vendus_ids[orderingMode] || vendus_id || product_id` ✅

---

### 📈 Impacto
- **UX Waiter:** Dashboard reestruturado, alertas de reservas proativos
- **Operações:** Atribuição de mesas para reservas com junção de mesas
- **Faturação:** Vendus IDs corretos por modo de serviço
- **Performance:** Sem impacto negativo, real-time + polling fallback

---

---

## 📅 Data: 2026-02-13

### 🎯 Funcionalidades Implementadas

#### 1. **Nomes de Waiter no Admin** ✅
**Arquivos modificados:**
- `/src/components/admin/TableMap.tsx` (linhas 100-110)
- `/src/app/admin/mesas/page.tsx` (linhas 421-428)

**O que faz:**
- Mostra o nome do waiter atribuído em cada mesa no mapa do admin
- Ícone de pessoa + nome do waiter
- Aparece tanto no "Mapa em Tempo Real" quanto na "Configuração"

**Testes:** ❌ Não há testes automatizados (componente visual)

---

#### 2. **Funcionalidade "Sair da Mesa"** ✅
**Arquivos modificados:**
- `/src/app/mesa/[numero]/page.tsx` (linhas 1221-1263, 2701-2722, 3003-3068)
- `/supabase/migrations/043_close_session_update_table.sql` (NEW)

**O que faz:**
- Clientes podem sair da mesa quando não consumiram nada (€0.00 + sem pedidos)
- Botão "Sair da Mesa" só aparece quando `total_amount === 0 && orders.length === 0`
- Modal de confirmação antes de sair
- Chama função SQL `close_session_and_free_table` que:
  - Fecha a sessão (status = 'closed')
  - Libera a mesa (current_session_id = NULL)
  - Tudo em transação atômica

**Validações:**
- Não permite sair se houver consumo (total > 0)
- Não permite sair se houver pedidos pendentes
- Mostra mensagem de erro clara

**Testes:** ❌ Não há testes automatizados

---

#### 3. **Uniformização de Status de Mesas** ✅
**Arquivos modificados:**
- `/src/app/admin/mesas/page.tsx` (linhas 89-123, 392-450)

**O que faz:**
- Status calculado dinamicamente baseado em sessões ativas
- Busca sessões com status `['active', 'pending_payment']`
- Determina status real:
  - `inactive` se `is_active = false`
  - `occupied` se tem sessão ativa/pending_payment
  - `available` caso contrário
- Badges visuais com cores e ícones:
  - 🟢 Livre (verde)
  - 🔴 Ocupada (vermelho)
  - 🟡 Reservada (amarelo)
  - ⚫ Inativa (cinza)

**Testes:** ❌ Não há testes automatizados

---

#### 4. **Correções no Painel do Waiter** ✅

##### 4.1 Buscar Sessões `pending_payment`
**Arquivos modificados:**
- `/src/app/waiter/page.tsx` (linha 132)
- `/src/app/waiter/mesa/[id]/page.tsx` (linha 110)

**O que faz:**
- Waiter agora vê mesas com sessões `pending_payment` (conta pedida) como ativas
- Antes: só via mesas com status `active`
- Depois: vê mesas com `['active', 'pending_payment']`

**Testes:** ❌ Não há testes automatizados

---

##### 4.2 Filtrar Mesas de Outros Waiters
**Arquivos modificados:**
- `/src/app/waiter/page.tsx` (linhas 224-240)

**O que faz:**
- Seção "Mesas Disponíveis para Comandar" agora filtra corretamente
- Antes: mostrava mesas de outros waiters como disponíveis
- Depois: só mostra mesas SEM nenhuma atribuição
- Busca TODAS as atribuições (não só do waiter atual) e filtra

**Testes:** ❌ Não há testes automatizados

---

##### 4.3 Fix Autenticação API assign-waiter
**Arquivos modificados:**
- `/src/app/api/tables/[id]/assign-waiter/route.ts` (linhas 1-3, 21-37, 206-213)
- `/src/app/waiter/page.tsx` (linha 382)

**O que faz:**
- API route agora usa autenticação legada (`getAuthUser()`) em vez de Supabase Auth
- Adicionado `credentials: "include"` no fetch do frontend
- Corrigido erro "Não autenticado" ao comandar mesas

**Motivo:**
- Sistema usa autenticação legada (JWT em cookies httpOnly)
- API estava tentando usar `supabase.auth.getUser()` que espera Supabase Auth
- Solução: usar `getAuthUser()` do sistema legado

**Testes:** ❌ Não há testes automatizados

---

### 🗄️ Migrações de Base de Dados

#### Migration 043: `close_session_and_free_table`
**Arquivo:** `/supabase/migrations/043_close_session_update_table.sql`

**Função SQL:**
```sql
CREATE OR REPLACE FUNCTION close_session_and_free_table(session_id_param UUID)
RETURNS VOID
```

**O que faz:**
1. Busca `table_id` da sessão
2. Atualiza sessão: `status = 'closed'`, `closed_at = NOW()`
3. Libera mesa: `current_session_id = NULL`
4. Tudo em transação atômica

**Permissões:**
- `GRANT EXECUTE TO authenticated`
- `GRANT EXECUTE TO anon`

**Status:** ✅ Criado, ⚠️ Pendente aplicação no banco

---

### 🛠️ Scripts SQL de Diagnóstico e Correção

#### 1. `debug_mesa_3.sql`
**O que faz:** Diagnostica estado de uma mesa específica
- Dados da mesa
- Sessões recentes
- Atribuições de waiter
- Session customers
- Inconsistências (sessões ativas sem current_session_id)

**Uso:** Diagnóstico manual, não executar em produção

---

#### 2. `fix_table_session_sync.sql`
**O que faz:** Corrige inconsistências entre `tables` e `sessions`
- Atualiza `current_session_id` para sessões ativas
- Limpa `current_session_id` para sessões fechadas
- Remove referências órfãs
- Mostra verificação final

**Status:** ⚠️ Para uso sob demanda, não aplicar automaticamente

---

#### 3. `investigate_mesa_3_duplicates.sql`
**O que faz:** Investiga mesas duplicadas
- Lista todas as mesas com mesmo número
- Mostra duplicatas por localização
- Histórico de sessões

**Uso:** Diagnóstico manual

---

#### 4. `fix_duplicate_tables.sql`
**O que faz:** Remove mesas duplicadas automaticamente
- Identifica duplicatas (mesmo número + localização)
- Mantém mesa com sessão ativa (ou mais recente)
- Migra sessões e atribuições
- Deleta duplicatas

**Modo:**
- Preview (padrão): mostra o que será feito
- Execução: descomentar comandos SQL

**Status:** ⚠️ Executar apenas se houver duplicatas confirmadas

---

### ⚠️ Problemas Identificados e Resolvidos

#### Problema 1: Mesa mostra "livre" mas tem sessão ativa
**Causa:** Painel do waiter só buscava sessões `active`, ignorando `pending_payment`
**Solução:** Buscar `['active', 'pending_payment']` ✅

#### Problema 2: Waiter vê mesas de outros waiters como disponíveis
**Causa:** Filtro só verificava mesas do waiter atual
**Solução:** Buscar TODAS as atribuições e filtrar ✅

#### Problema 3: Erro "Não autenticado" ao comandar mesa
**Causa:** API usava Supabase Auth, mas sistema usa autenticação legada
**Solução:** Usar `getAuthUser()` do sistema legado ✅

#### Problema 4: Mesa não fica livre quando cliente sai
**Causa:** Não havia atualização de `current_session_id`
**Solução:** Função SQL `close_session_and_free_table` ✅

#### Problema 5: Mesas duplicadas na base de dados
**Causa:** Criação acidental de múltiplas mesas com mesmo número
**Solução:** Script `fix_duplicate_tables.sql` ⚠️ Pendente execução

#### Problema 6: Status inconsistente entre admin e realidade
**Causa:** Status não era recalculado baseado em sessões
**Solução:** Calcular status dinamicamente baseado em sessões ativas ✅

---

### 📊 Cobertura de Testes

**Total de testes:** 952 (sem alteração)
**Novos testes:** 0 ❌

**Componentes sem testes:**
- ❌ TableMap.tsx (waiter names)
- ❌ TableCard (admin mesas)
- ❌ Leave table functionality
- ❌ Status uniformization
- ❌ Waiter panel filters
- ❌ API assign-waiter (com nova autenticação)

**Recomendação:** Criar testes de integração para fluxos críticos

---

### 📝 Próximos Passos

#### Imediato:
1. ✅ **Aplicar Migration 043** no Supabase
2. ⚠️ **Executar fix_duplicate_tables.sql** (se houver duplicatas)
3. ❌ **Testar "Sair da Mesa"** em ambiente real
4. ❌ **Verificar se mesa fica livre** após cliente sair

#### Futuro:
1. ❌ Criar testes E2E com Playwright
2. ❌ Adicionar testes de integração para API routes
3. ❌ Documentar fluxos no README
4. ❌ Remover logs de debug da API assign-waiter
5. ❌ Considerar migrar para Supabase Auth completo

---

### 🔐 Segurança

**Validações implementadas:**
- ✅ Cliente só pode sair se não consumiu nada
- ✅ API verifica autenticação (legada)
- ✅ Waiter só vê suas mesas + disponíveis
- ✅ Waiter só pode comandar mesas da sua localização
- ✅ Função SQL tem permissões corretas

**Nenhuma vulnerabilidade introduzida** ✅

---

### 📚 Arquivos de Documentação

**Criados:**
- ❌ README atualizado (pendente)
- ✅ RECENT_CHANGES.md (este arquivo)

**A atualizar:**
- ❌ CLAUDE.md (adicionar novas funcionalidades)
- ❌ README.md (fluxos de waiter e cliente)

---

## 🎉 Resumo Executivo

### ✅ Funcionalidades Completas
- Nomes de waiter no admin
- Funcionalidade "Sair da Mesa"
- Status uniformizado
- Painel do waiter corrigido
- API de atribuição corrigida

### ⚠️ Ações Pendentes
- Aplicar migration 043
- Executar fix de duplicatas (se necessário)
- Criar testes E2E
- Atualizar documentação principal

### 📈 Impacto
- **Performance:** Sem impacto negativo
- **Segurança:** Mantida/melhorada
- **UX:** Significativamente melhorada
- **Manutenibilidade:** Scripts de diagnóstico facilitam debug
