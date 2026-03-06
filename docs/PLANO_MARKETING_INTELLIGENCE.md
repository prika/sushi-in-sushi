# Plano: Marketing Intelligence & Strategy Hub

> Sistema de inteligencia de marketing com segmentacao de audiencia, geracao AI contextualizada, campanhas automatizadas, e insights preditivos. Inspirado no melhor do HubSpot, Klaviyo, Lightspeed Marketing, e Toast Marketing Suite — mas construido nativamente para restauracao.

**Data:** 2026-03-06
**Estado:** Planeamento
**Localizacao:** `/admin/seo` (tabs: Estrategia, Segmentos, Sugestoes AI, Campanhas)

---

## 1. Visao Geral — O Que Existe vs O Que Vamos Construir

### O que o mercado oferece (e onde ficam curtos)

| Plataforma | Forca | Fraqueza para restaurantes |
|------------|-------|-----------------------------|
| HubSpot | CRM + segmentacao + automacao | Generico, nao entende reservas/mesas/pedidos |
| Klaviyo | Email segmentado + flows | Focado em e-commerce, sem dados operacionais |
| Toast Marketing | Feito para restaurantes | Segmentacao basica, sem AI generativa, sem multi-canal |
| Lightspeed | POS + marketing basico | Sugestoes manuais, sem inteligencia preditiva |
| OpenTable | Reservas + CRM basico | Fechado, nao integra com o teu site/menu |

### O nosso diferencial

Temos algo que **nenhuma** destas plataformas tem: **dados operacionais completos em tempo real**.

Sabemos:
- O que cada cliente come (pedidos por sessao)
- Quando vem e com que frequencia (sessoes + reservas)
- Quanto gasta por visita (ticket medio individual)
- Se faz no-show (historico de reservas)
- Que tier tem (Novo→VIP, 5 niveis)
- Como interage digitalmente (QR code, pedidos, jogos)
- Performance de cada produto (vendas, combinacoes)
- Ocupacao real por hora/dia (sessoes + mesas)

**Isto permite segmentacao e sugestoes que nenhum SaaS generico consegue.**

---

## 2. Arquitetura de 8 Fases

```
Fase 0: Auditoria e Recolha de Dados (inventario + gaps + setup externo)
Fase 1: Objetivos Estrategicos (checklist + questionario)
Fase 2: Segmentacao de Audiencia (segmentos dinamicos baseados em dados reais)
Fase 3: Motor de Sugestoes AI (contextualizado com objetivos + segmentos + metricas)
Fase 4: Campanhas & Automacoes (email/sms flows baseados em segmentos)
Fase 5: Integracao com Geracao Existente (descricoes, metadata, traducoes)
Fase 6: Insights Externos (GA4, Instagram, Google Business)
Fase 7: Intelligence Dashboard (preditivo, tendencias, anomalias)
```

---

## 2.1 Fase 0 — Auditoria e Recolha de Dados

> Antes de construir inteligencia, garantimos que recolhemos TUDO o que precisamos.

### A. Dados Ja Disponiveis (recolha ativa)

Estes dados ja estao a ser recolhidos e armazenados. Estao prontos para alimentar segmentacao e sugestoes AI.

#### Clientes e Perfil (`customers` + `session_customers`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Perfil base | `customers` | email, name, phone, birth_date, preferred_location | Ativo |
| Tier dinamico | computado | via `computeCustomerTier()` (5 niveis) | Ativo |
| Fidelizacao | `customers` | points, total_spent, visit_count | Ativo |
| Consentimento marketing | `customers` / `session_customers` | marketing_consent, preferred_contact | Ativo |
| Alergenos | `customers` + `session_customers` | allergens TEXT[] | Ativo |
| Companheiros de mesa | `customer_companions` | shared_sessions, last_shared_session_at | Ativo |
| Interacao games | `customers` | games_played, total_score, prizes_won, prizes_redeemed | Ativo |
| Ratings dados | `customers` | ratings_given, ratings_sum, avg_rating_given | Ativo |
| Clientes de sessao | `session_customers` | display_name, email, phone, birth_date, customer_id | Ativo |

#### Pedidos e Sessoes (`orders` + `sessions`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Items pedidos | `orders` | product_id, quantity, unit_price, notes, status | Ativo |
| Atribuicao a cliente | `orders` | session_customer_id | Ativo |
| Tempos de cozinha | `orders` | preparing_started_at, ready_at, delivered_at | Ativo |
| Quem preparou | `orders` | prepared_by (staff UUID) | Ativo |
| Sessao completa | `sessions` | table_id, is_rodizio, num_people, total_amount | Ativo |
| Modo de servico | `sessions` | ordering_mode (client/waiter_only) | Ativo |
| Duracao | `sessions` | time_to_first_order, time_ordering, total_duration | Ativo |
| Timestamps | `sessions` | started_at, closed_at, first_order_at, last_order_at | Ativo |

#### Reservas (`reservations`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Detalhes reserva | `reservations` | date, time, party_size, location, is_rodizio | Ativo |
| Ocasiao | `reservations` | occasion (birthday/anniversary/business/other) | Ativo |
| Lifecycle | `reservations` | status (pending→confirmed→completed/no_show/cancelled) | Ativo |
| Cancelamento | `reservations` | cancelled_at, cancellation_reason, cancelled_by, cancellation_source | Ativo |
| Link a cliente | `reservations` | customer_id FK → customers | Ativo |
| Link a sessao | `reservations` | session_id, seated_at | Ativo |
| Mesas atribuidas | `reservation_tables` | table_id, is_primary, assigned_by | Ativo |

#### Email Engagement (`email_events` + colunas em `reservations`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Eventos de email | `email_events` | event_type (sent/delivered/opened/clicked/bounced/complained) | Ativo |
| Tipo de email | `email_events` | email_type (customer_confirmation/confirmed/notification) | Ativo |
| Tracking por reserva | `reservations` | customer_email_*, confirmation_email_* (sent/delivered/opened) | Ativo |
| Lembretes | `reservations` | day_before_reminder_*, same_day_reminder_* | Ativo |
| Webhook payload | `email_events` | raw_data JSONB | Ativo |

#### Produtos e Ratings (`products` + `product_ratings`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Catalogo | `products` | name, description, price, category_id, is_available, is_rodizio | Ativo |
| Multi-preco | `products` | service_prices JSONB (dine_in/delivery/takeaway) | Ativo |
| Porcoes | `products` | quantity (pecas por produto) | Ativo |
| SEO por produto | `products` | seo_titles, seo_descriptions (JSONB por locale) | Ativo |
| Ratings | `product_ratings` | session_id, customer_id, product_id, rating (1-5) | Ativo |
| Ingredientes | `product_ingredients` | product_id, ingredient_id (+ allergens via ingredients) | Ativo |

#### Operacional
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Metricas diarias | `daily_metrics` | sessions, covers, revenue, avg_ticket, no_shows, walk_ins (por location) | Ativo |
| Historico mesas | `table_status_history` | old_status, new_status, changed_by, reason | Ativo |
| Horarios | `restaurant_hours` | day_of_week, opens_at, closes_at (por restaurante) | Ativo |
| Fechos | `restaurant_closures` | date, location, reason, is_recurring | Ativo |
| Chamadas waiter | `waiter_calls` | table_id, type, status, responded_by | Ativo |
| Staff assignments | `waiter_tables` | staff_id, table_id | Ativo |

#### Games e Engagement
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Sessoes de jogo | `game_sessions` | session_id, status, round_number, total_questions | Ativo |
| Respostas | `game_answers` | customer_id, question_id, answer, score_earned | Ativo |
| Premios | `game_prizes` | customer_id, prize_type, prize_value, redeemed | Ativo |

#### Branding e SEO (`site_settings`)
| Dado | Tabela | Campos | Estado |
|------|--------|--------|--------|
| Marca | `site_settings` | brand_name, descriptions JSONB, price_range | Ativo |
| Redes sociais | `site_settings` | facebook_url, instagram_url | Ativo |
| Review links | `site_settings` | google_reviews_url, tripadvisor_url, thefork_url, zomato_url | Ativo |
| GTM | `site_settings` | gtm_id | Ativo |
| Imagens | `site_settings` | logo_url, favicon_url, og_image_url | Ativo |
| Metadata SEO | `site_settings` | meta_titles, meta_descriptions, meta_keywords (JSONB por locale) | Ativo |
| Metadata sub-paginas | `site_settings` | page_meta JSONB (menu, reservar, equipa por locale) | Ativo |

#### APIs de Analytics ja existentes
| API | O que retorna | Estado |
|-----|---------------|--------|
| `/api/admin/dashboard-analytics` | KPIs, revenue trend, orders por hora, comparacao localizacoes | Ativo |
| `/api/admin/product-analytics` | Top 10 por revenue/qty, categorias, ratings, scatter | Ativo |
| `/api/admin/reservation-analytics` | Volume, no-show trend, heatmap hora x dia, conversao funnel | Ativo |
| `/api/admin/customer-analytics` | Distribuicao tiers, spending brackets, frequencia, aquisicao | Ativo |
| `/api/admin/game-stats` | Completion rate, quiz accuracy, prize distribution, top products | Ativo |

---

### B. Dados Que Precisam de Novas Colunas/Tabelas (pequenas alteracoes na BD)

Dados que podemos comecar a recolher com migrations simples, sem integracoes externas.

| Dado em Falta | Onde Adicionar | Migration Necessaria | Para que serve |
|---------------|---------------|---------------------|----------------|
| **Preferencia de pagamento** | `sessions` | `ADD COLUMN payment_method TEXT` (card/cash/mbway) | Segmento por tipo pagamento |
| **Fonte da reserva** | `reservations` | `ADD COLUMN source TEXT DEFAULT 'website'` (website/phone/walkin/thefork/instagram) | Atribuicao de canal |
| **NPS/satisfacao pos-visita** | Nova tabela `customer_feedback` | `CREATE TABLE customer_feedback (id, customer_id, session_id, nps_score 0-10, comment, created_at)` | Segmento por satisfacao |
| **Desconto/promo aplicado** | `sessions` | `ADD COLUMN promo_code TEXT, ADD COLUMN discount_amount DECIMAL` | ROI de campanhas |
| **Customer acquisition source** | `customers` | `ADD COLUMN acquisition_source TEXT` (organic/social/referral/ad/walkin) | Atribuicao |
| **Last email sent at** | `customers` | `ADD COLUMN last_email_sent_at TIMESTAMPTZ, ADD COLUMN email_sends_count INTEGER DEFAULT 0` | Email fatigue control |
| **Unsubscribed** | `customers` | `ADD COLUMN email_unsubscribed BOOLEAN DEFAULT FALSE, ADD COLUMN unsubscribed_at TIMESTAMPTZ` | Compliance RGPD |

**Prioridade:** Fonte da reserva e preferencia de pagamento sao quick wins — podem comecar a recolher imediatamente.

---

### C. Dados Que Precisam de GTM + Setup Externo

Estes dados nao estao no nosso sistema e requerem configuracao de servicos externos.

#### C.1 Google Analytics 4 (via GTM — ja temos o container)

**O que ja temos:** `gtm_id` configuravel no admin, `GoogleTagManager.tsx` server component carregado em paginas publicas.

**O que falta configurar no GTM:**

1. **Criar propriedade GA4**
   - Ir a [analytics.google.com](https://analytics.google.com) → Admin → Create Property
   - Tipo: Web, URL do site
   - Copiar o Measurement ID (formato: `G-XXXXXXXXXX`)

2. **Adicionar GA4 tag no GTM**
   - No GTM ([tagmanager.google.com](https://tagmanager.google.com)) → Tags → New
   - Tipo: Google Analytics: GA4 Configuration
   - Colar Measurement ID
   - Trigger: All Pages
   - Publicar container

3. **Eventos personalizados (recomendados)**
   Para recolher dados alem de pageviews, precisamos de `dataLayer.push()` no codigo:

   | Evento | Onde disparar | dataLayer |
   |--------|--------------|-----------|
   | `reservation_started` | Ao abrir formulario de reserva | `{event: 'reservation_started', location: slug}` |
   | `reservation_completed` | Submit com sucesso | `{event: 'reservation_completed', party_size, location}` |
   | `menu_view` | Pagina /menu | `{event: 'menu_view', locale}` |
   | `product_click` | Click num produto do menu | `{event: 'product_click', product_name, category}` |
   | `qr_scan` | Pagina /mesa/[numero] carregada | `{event: 'qr_scan', table_number, location}` |
   | `order_placed` | Pedido submetido via QR | `{event: 'order_placed', items_count, is_rodizio}` |
   | `login` | Login de cliente | `{event: 'login', method: 'email'}` |
   | `signup` | Registo de cliente | `{event: 'signup'}` |

   **Implementacao:** Adicionar `<Script>` tags ou hook `useGTMEvent()` que faz `window.dataLayer?.push(event)`.

4. **Dados que ficam disponiveis apos setup:**
   - Pageviews por pagina e locale
   - Bounce rate por pagina
   - Tempo na pagina
   - Fontes de trafego (organic, social, direct, referral, paid)
   - Dispositivo (mobile vs desktop)
   - Localizacao geografica dos visitantes
   - Conversion rate (visita → reserva)
   - User flow (caminho no site)

5. **Para ler estes dados via API (Fase 6):**
   - Criar Service Account no Google Cloud Console
   - Ativar Google Analytics Data API v1
   - Dar acesso de Viewer ao Service Account na propriedade GA4
   - Guardar chave JSON como env var `GOOGLE_ANALYTICS_CREDENTIALS`
   - Guardar Property ID como `GA4_PROPERTY_ID`

#### C.2 Instagram Insights (via Meta Graph API)

**O que ja temos:** `instagram_url` no site_settings.

**O que falta:**

1. **Converter para Conta Business/Creator**
   - Instagram → Settings → Account → Switch to Professional Account

2. **Criar Meta App**
   - Ir a [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
   - Tipo: Business
   - Adicionar produto: Instagram Graph API

3. **Obter Long-Lived Token**
   - Gerar User Token com permissoes: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`
   - Trocar por Long-Lived Token (60 dias)
   - Guardar como `META_INSTAGRAM_TOKEN`
   - **Nota:** Precisa de renovacao a cada 60 dias (pode ser automatizado via cron)

4. **Dados que ficam disponiveis:**
   - Seguidores (total, novos por dia)
   - Impressoes e alcance
   - Engagement rate (likes + comments / followers)
   - Top posts por engagement
   - Demographics dos seguidores (idade, genero, localizacao)
   - Melhor hora para publicar
   - Stories views e completion rate
   - Hashtag performance (limitado)

5. **Limitacoes:**
   - API so funciona com contas Business/Creator
   - Dados de 90 dias maximo
   - Rate limit: 200 calls/hour
   - Nao da acesso a posts de outros (competidores)

#### C.3 Google Business Profile API

**O que ja temos:** `google_reviews_url` e `google_maps_url` no site_settings.

**O que falta:**

1. **Verificar que o Business Profile esta claimed**
   - Ir a [business.google.com](https://business.google.com)
   - Garantir que ambas as localizacoes estao verificadas

2. **Ativar Google My Business API**
   - Google Cloud Console → APIs → Enable "Google My Business API" (ou "Business Profile API")
   - Usar o mesmo Service Account do GA4

3. **Dados que ficam disponiveis:**
   - Reviews (rating, texto, data, resposta)
   - Rating medio e total de reviews
   - Pesquisas que encontram o negocio (keywords)
   - Acoes (cliques em direcoes, telefone, website)
   - Fotos (views, quantidade)
   - Perguntas pendentes (Q&A)

4. **Limitacoes:**
   - API em transicao (My Business API → Business Profile API)
   - Algumas metricas requerem Owner access
   - Rate limit: 60 QPM

#### C.4 Meta Pixel (Facebook/Instagram Ads) — Opcional

Se o restaurante fizer publicidade paga:

1. **Criar Meta Pixel** em [business.facebook.com](https://business.facebook.com) → Events Manager
2. **Adicionar no GTM:** Tag → Meta Pixel → Colar Pixel ID → Trigger: All Pages
3. **Eventos de conversao:** Mesmos do GA4 (reservation_completed, etc.)
4. **Dados:** Performance de anuncios, custo por reserva, ROAS

**Guardar:** `META_PIXEL_ID` no site_settings (ou GTM trata de tudo)

---

### D. Resumo de Gaps e Prioridades

| Prioridade | Acao | Esforco | Impacto |
|------------|------|---------|---------|
| **P0** | Configurar GA4 no GTM existente | 15 min no GTM | Desbloqueia trafego, bounce rate, fontes |
| **P0** | Adicionar dataLayer events no codigo | 2-3h dev | Desbloqueia conversion tracking |
| **P1** | Migration: `source` em reservations | 30 min | Atribuicao de canal imediata |
| **P1** | Migration: `payment_method` em sessions | 30 min | Segmento por pagamento |
| **P1** | Migration: `email_unsubscribed` em customers | 30 min | Compliance RGPD para campanhas |
| **P2** | Migration: `customer_feedback` (NPS) | 1h | Segmento por satisfacao |
| **P2** | Migration: `promo_code` em sessions | 30 min | ROI de campanhas futuras |
| **P2** | Setup Instagram Business + Meta App | 1-2h | Dados sociais para Fase 6 |
| **P3** | Setup GA4 Data API (service account) | 1h | Leitura programatica para Fase 6 |
| **P3** | Setup Google Business Profile API | 1h | Reviews automaticos para Fase 6 |
| **P3** | Meta Pixel no GTM | 15 min | Tracking de ads (so se fizer ads) |

**Nota:** P0 e P1 devem ser feitos ANTES de comecar a Fase 1. P2 pode ser paralelo. P3 e necessario so na Fase 6.

---

### E. O Que NAO Precisamos Recolher (e porquê)

| Dado | Razao para ignorar |
|------|---------------------|
| Custo de ingredientes | Fora do scope de marketing (scope operacional) |
| Dados meteorologicos | Correlacao fraca, complexidade alta |
| Gorjetas | Nao recolhidas no sistema atual, privacidade staff |
| Dados de competidores | APIs nao disponíveis, scraping e fragil |
| Call tracking | Volume baixo, custo de setup alto |
| Accuracy de pedidos | Nao ha mecanismo de report (futuro: customer_feedback) |

---

## 3. Fase 1 — Objetivos Estrategicos

### 3.1 Tabs da pagina SEO

```typescript
type SubTab = "brand" | "metadata" | "images" | "gtm" | "strategy" | "segments" | "suggestions" | "campaigns";
```

### 3.2 Categorias de Objetivos (6 areas, 26 objetivos)

#### A. Aquisicao de Clientes
| ID | Objetivo | Descricao | KPIs automaticos |
|----|----------|-----------|------------------|
| `acq_new_customers` | Atrair novos clientes | Aumentar visibilidade e trazer pessoas que nunca visitaram | Clientes tier 1 novos/mes |
| `acq_tourists` | Captar turistas | Atrair visitantes internacionais | % sessoes com locale != pt |
| `acq_local_seo` | Dominar pesquisa local | Top Google Maps "sushi perto de mim" | Trafego organico (GA4) |
| `acq_social_discovery` | Descoberta via redes sociais | Instagram, TikTok | Trafego social (GA4) |
| `acq_delivery_platforms` | Presenca em plataformas | UberEats, Glovo, TheFork | Pedidos delivery/mes |

#### B. Retencao e Fidelizacao
| ID | Objetivo | KPIs automaticos |
|----|----------|------------------|
| `ret_repeat_visits` | Aumentar visitas repetidas | % clientes com 2+ visitas/mes |
| `ret_loyalty_engagement` | Engagement do programa | % clientes tier 3+ |
| `ret_avg_ticket` | Aumentar ticket medio | Ticket medio vs mes anterior |
| `ret_reactivation` | Reativar clientes inativos | Clientes inativos >30d reativados |
| `ret_lifetime_value` | Valor do cliente a longo prazo | LTV medio por tier |

#### C. Reservas e Comparencia
| ID | Objetivo | KPIs automaticos |
|----|----------|------------------|
| `res_increase_bookings` | Mais reservas | Reservas/semana vs anterior |
| `res_reduce_noshow` | Reduzir no-shows | Taxa no-show % |
| `res_fill_quiet_times` | Preencher horarios mortos | Ocupacao em horarios fracos |
| `res_advance_booking` | Reservas antecipadas | Dias medio de antecedencia |
| `res_group_bookings` | Grupos e eventos | Reservas 6+ pessoas/mes |

#### D. Presenca Online e Reputacao
| ID | Objetivo | KPIs automaticos |
|----|----------|------------------|
| `rep_google_reviews` | Melhorar reviews Google | Rating medio + novas/mes |
| `rep_tripadvisor` | Ranking TripAdvisor | Posicao na zona |
| `rep_instagram_growth` | Crescer no Instagram | Seguidores + engagement rate |
| `rep_brand_awareness` | Notoriedade da marca | Pesquisas branded (GA4) |

#### E. Operacional e Experiencia
| ID | Objetivo | KPIs automaticos |
|----|----------|------------------|
| `ops_table_turnover` | Rotacao de mesas | Tempo medio sessao |
| `ops_digital_ordering` | Pedidos digitais | % pedidos via QR code |
| `ops_satisfaction` | Satisfacao | (futuro: NPS/rating post-visita) |

#### F. Revenue e Crescimento
| ID | Objetivo | KPIs automaticos |
|----|----------|------------------|
| `rev_weekend_max` | Maximizar fim-de-semana | Receita Sex-Dom vs target |
| `rev_weekday_growth` | Crescer dias uteis | Receita Seg-Qui vs anterior |
| `rev_special_events` | Eventos especiais | Receita em eventos vs normal |
| `rev_new_channels` | Novos canais de receita | Receita delivery + takeaway |

**Diferenca vs plano anterior:** Cada objetivo tem agora **KPIs automaticos** que o sistema calcula a partir dos dados existentes. Isto permite medir progresso real.

### 3.3 Questionario de Contexto (expandido)

| Pergunta | Tipo | Opcoes |
|----------|------|--------|
| Publico-alvo principal | Multi-select | Familias, Casais, Amigos, Corporate, Turistas, Estudantes, Foodies/Influencers |
| Diferencial competitivo | Texto livre | — |
| Tom de comunicacao | Single-select | Premium/Sofisticado, Casual/Moderno, Divertido/Irreverente, Tradicional/Autentico, Minimalista/Clean |
| Faixa etaria dominante | Range slider | 18-65 (range) |
| Momentos-chave do ano | Multi-select + datas | Aniversario restaurante, Dia dos Namorados, Natal, Santos Populares, Ferias verao, Outro (custom) |
| Orcamento marketing/mes | Slider | 0-2000 EUR |
| Canais ativos | Multi-select com score | Instagram (principal), Facebook (secundario), TikTok, Google Business, Email, SMS, WhatsApp |
| Concorrentes diretos | Texto livre (lista) | Ex: "Sushi Cafe, Noz, Subenshi" |
| Tipo de cozinha/especialidade | Multi-select | Rodizio, A la carte, Omakase, Fusion, Tradicional japones |
| Capacidade por turno | Numero | Ex: 60 almoço, 80 jantar |
| Preco medio por pessoa | Range | Ex: 15-35 EUR |

### 3.4 Armazenamento

```sql
CREATE TABLE IF NOT EXISTS business_strategy (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Objetivos: [{id, priority(1-5), notes, target_kpi_value}]
  objectives JSONB NOT NULL DEFAULT '[]',
  -- Contexto
  target_audience TEXT[] DEFAULT '{}',
  competitive_edge TEXT,
  communication_tone TEXT,
  age_range_min INTEGER DEFAULT 25,
  age_range_max INTEGER DEFAULT 45,
  differentiators TEXT,
  key_dates JSONB DEFAULT '[]',  -- [{label, date, recurring}]
  marketing_budget_monthly INTEGER DEFAULT 0,
  active_channels JSONB DEFAULT '[]',  -- [{channel, priority: 'primary'|'secondary'}]
  competitors TEXT[] DEFAULT '{}',
  cuisine_types TEXT[] DEFAULT '{}',
  capacity_lunch INTEGER,
  capacity_dinner INTEGER,
  avg_price_min NUMERIC(10,2),
  avg_price_max NUMERIC(10,2),
  -- Tracking
  objectives_score NUMERIC(5,2),  -- Score geral calculado (0-100)
  last_score_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Fase 2 — Segmentacao de Audiencia

**Esta e a feature killer.** Nenhum sistema de marketing para restaurantes tem segmentacao com esta profundidade.

### 4.1 Conceito

Segmentos sao **filtros dinamicos** sobre os dados de clientes, sessoes, pedidos e reservas. Atualizam automaticamente — nao sao listas estaticas.

### 4.2 Segmentos Pre-Definidos (Smart Segments)

O sistema vem com segmentos prontos a usar:

#### Por Comportamento de Visita
| Segmento | Definicao | Tamanho estimado |
|----------|-----------|-----------------|
| **Novos (ultima semana)** | Primeira visita nos ultimos 7 dias | Dinamico |
| **Regulares fieis** | 3+ visitas nos ultimos 60 dias | Dinamico |
| **Em risco de churn** | Tier 3+ mas sem visita ha 30-60 dias | Dinamico |
| **Perdidos** | Tier 3+ mas sem visita ha 60+ dias | Dinamico |
| **VIPs** | Tier 5 (perfil completo + 10 visitas + 500 EUR) | Dinamico |
| **Dormentes** | Tinha tier 3+ mas desceu | Dinamico |

#### Por Valor
| Segmento | Definicao |
|----------|-----------|
| **High spenders** | Ticket medio > 40 EUR |
| **Low spenders** | Ticket medio < 15 EUR |
| **Crescentes** | Ticket medio a subir mes a mes |
| **Big groups** | Reservas habituais para 6+ pessoas |

#### Por Padrao de Reserva
| Segmento | Definicao |
|----------|-----------|
| **No-show recorrente** | 2+ no-shows nos ultimos 90 dias |
| **Reserva antecipada** | Media de antecedencia > 3 dias |
| **Last minute** | Media de antecedencia < 24h |
| **Weekend warriors** | 80%+ visitas ao fim-de-semana |
| **Weekday regulars** | 80%+ visitas em dias uteis |
| **Lunch crowd** | 70%+ visitas ao almoco |
| **Dinner crowd** | 70%+ visitas ao jantar |

#### Por Preferencias de Menu
| Segmento | Definicao |
|----------|-----------|
| **Rodizio lovers** | 80%+ sessoes em modo rodizio |
| **A la carte** | 80%+ sessoes em a la carte |
| **Sashimi fans** | Top categoria pedida = sashimi |
| **Experimentadores** | 15+ produtos diferentes pedidos |
| **Criaturas de habito** | Pedem os mesmos 3-5 items sempre |

#### Por Engagement Digital
| Segmento | Definicao |
|----------|-----------|
| **Digital natives** | Usam QR code + fazem pedidos digitais |
| **Email engagers** | Abrem 80%+ dos emails |
| **Email ignorers** | Abrem < 20% dos emails |
| **App potential** | Visitas frequentes + digital native (candidatos a app) |

#### Por Localizacao
| Segmento | Definicao |
|----------|-----------|
| **So Circunvalacao** | 100% visitas nesta localizacao |
| **So Boavista** | 100% visitas nesta localizacao |
| **Multi-location** | Visitou ambas as localizacoes |

### 4.3 Segmentos Customizados (Segment Builder)

Interface visual para criar segmentos com regras combinadas:

```
+----------------------------------------------------------+
|  Novo Segmento                                           |
|  Nome: [Casais VIP de fim-de-semana]                    |
|                                                          |
|  Regras (todas devem ser verdadeiras):                   |
|                                                          |
|  + [Tier]        [>=]   [4 (Regular)]        [x]       |
|  + [Reservas]    [>=]   [3 ultimos 90 dias]  [x]       |
|  + [Dia semana]  [in]   [Sex, Sab, Dom]      [x]       |
|  + [Grupo]       [=]    [2 pessoas]          [x]       |
|  + [Ticket med]  [>=]   [30 EUR]             [x]       |
|                                                          |
|  [+ Adicionar regra]                                     |
|                                                          |
|  OU (qualquer uma):                                      |
|  + [Tag]         [=]    [vip_event]          [x]       |
|                                                          |
|  Preview: ~45 clientes correspondem                     |
|  [Guardar Segmento]  [Cancelar]                         |
+----------------------------------------------------------+
```

**Operadores disponiveis:**
- Numeros: `=`, `!=`, `>`, `>=`, `<`, `<=`, `between`
- Texto: `=`, `!=`, `contains`, `starts_with`
- Lista: `in`, `not_in`
- Data: `before`, `after`, `in_last_days`, `between`
- Boolean: `is`, `is_not`

**Campos filtráveis:**

| Categoria | Campos |
|-----------|--------|
| Cliente | tier, visit_count, total_spent, avg_ticket, created_at, has_email, has_phone, has_birthdate |
| Reserva | count_last_90d, noshow_count, avg_advance_days, avg_party_size, preferred_day, preferred_time |
| Pedidos | top_category, unique_products_tried, avg_items_per_order, ordering_mode (rodizio/carte) |
| Sessao | avg_duration, preferred_location, last_visit_at, days_since_last_visit |
| Digital | uses_qr_code, email_open_rate, email_click_rate |
| Tags | custom tags (manual ou auto) |

### 4.4 Tags Automaticas

O sistema atribui tags automaticamente baseado em comportamento:

| Tag | Trigger |
|-----|---------|
| `birthday_month` | Mes de aniversario do cliente |
| `high_value` | Top 10% por gasto total |
| `at_risk` | Padrao de visitas a diminuir |
| `new_this_month` | Primeira visita neste mes |
| `noshow_risk` | Historico de no-shows |
| `promoter` | Avaliacao positiva ou referral |
| `celebrates_here` | 2+ reservas em datas especiais |
| `group_organizer` | Quem faz reservas para 6+ |
| `lunch_regular` | 3+ almocos/mes |
| `dinner_regular` | 3+ jantares/mes |

### 4.5 Segment Analytics

Cada segmento tem um mini-dashboard:

```
+----------------------------------------------------------+
|  Segmento: "Regulares fieis"          [234 clientes]    |
|                                                          |
|  Metricas                                                |
|  Ticket medio: 28.50 EUR (+12% vs geral)                |
|  Visitas/mes: 3.2 (media)                               |
|  Revenue contribuicao: 42% do total                      |
|  No-show rate: 2% (vs 8% geral)                        |
|  Preferencia: 65% rodizio, 35% carte                    |
|  Dia favorito: Sabado (38%)                             |
|  Hora favorita: 20:00-21:00 (45%)                       |
|                                                          |
|  Tendencia (30 dias)                                     |
|  [grafico sparkline: tamanho do segmento ao longo tempo]|
|                                                          |
|  Acoes rapidas                                           |
|  [Enviar Email] [Gerar Sugestao] [Exportar CSV]        |
+----------------------------------------------------------+
```

### 4.6 Modelo de Dados

```sql
-- Definicao de segmentos
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('smart', 'custom')),
  -- Regras de segmentacao como JSON
  rules JSONB NOT NULL DEFAULT '{}',
  -- {
  --   "all": [  -- AND conditions
  --     {"field": "tier", "op": ">=", "value": 4},
  --     {"field": "days_since_last_visit", "op": "<=", "value": 30}
  --   ],
  --   "any": [  -- OR conditions (opcional)
  --     {"field": "tag", "op": "=", "value": "vip_event"}
  --   ]
  -- }
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,  -- Smart segments nao podem ser apagados
  -- Cache de resultados
  cached_count INTEGER DEFAULT 0,
  cached_at TIMESTAMPTZ,
  -- Tracking
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de membros do segmento (atualizado periodicamente)
CREATE TABLE IF NOT EXISTS customer_segment_members (
  segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (segment_id, customer_id)
);

CREATE INDEX idx_segment_members_customer ON customer_segment_members(customer_id);

-- Tags de clientes
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'campaign')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Tags temporarias (ex: birthday_month)
  PRIMARY KEY (customer_id, tag)
);

CREATE INDEX idx_customer_tags_tag ON customer_tags(tag);
```

### 4.7 Motor de Segmentacao (Segment Engine)

```typescript
// Domain service que avalia segmentos
class SegmentEngine {
  // Avalia um segmento e retorna customer IDs
  async evaluate(segment: CustomerSegment): Promise<string[]>;

  // Re-calcula todos os segmentos (chamado por cron ou on-demand)
  async refreshAll(): Promise<Map<string, number>>;

  // Verifica se um cliente pertence a um segmento
  async belongsTo(customerId: string, segmentId: string): Promise<boolean>;

  // Retorna todos os segmentos de um cliente
  async getSegmentsFor(customerId: string): Promise<CustomerSegment[]>;
}
```

**Implementacao:** Query builder que traduz regras JSON em queries SQL otimizadas com JOINs sobre `customers`, `reservations`, `sessions`, `orders`.

**Refresh strategy:**
- Smart segments: re-calculados a cada 6h (cron)
- Custom segments: re-calculados on-demand + cache 1h
- Trigger de refresh apos eventos importantes (nova reserva, nova sessao, etc.)

---

## 5. Fase 3 — Motor de Sugestoes AI (Contextualizado)

### 5.1 O que muda vs plano anterior

Agora as sugestoes sao **segmento-aware**. O AI nao so sabe os objetivos, mas tambem:
- Quantos clientes estao em cada segmento
- Que segmentos estao a crescer ou encolher
- Que segmentos tem maior valor
- Que segmentos estao em risco

### 5.2 Tipos de Sugestoes (expandido)

| Tipo | Icone | Exemplo com segmentacao |
|------|-------|------------------------|
| `seo` | Lupa | "Tens 40 clientes 'turistas' — as tuas meta descriptions em EN/FR/DE nao mencionam 'all you can eat'" |
| `content` | Texto | "O segmento 'sashimi fans' (89 clientes) cresceu 23% — cria conteudo destacando a qualidade do peixe" |
| `social` | Instagram | "67% dos 'digital natives' tem 25-34 anos — formato ideal: Reels curtos do chef" |
| `retention` | Coracao | "45 clientes 'em risco de churn' — envia oferta 10% antes que passem a 'perdidos'" |
| `reservation` | Calendario | "'Weekend warriors' (156 clientes) lotam sabados — sugere quinta como 'novo sabado' com promo" |
| `upsell` | Seta | "'Low spenders' pedem media 2.1 items — sugere combo 'Trio Especial' na mesa deles" |
| `reactivation` | Refresh | "78 clientes 'perdidos' — campanha 'Sentimos a tua falta' com 15% off reativa ~20%" |
| `review` | Estrela | "Pede reviews aos 'regulares fieis' — taxa de conversao esperada: 25% (vs 5% geral)" |
| `email` | Email | "Segmento 'email engagers' tem 82% open rate — perfeito para lancar novo menu sazonal" |
| `event` | Calendario | "34 clientes tem aniversario este mes — campanha 'Parabens' com sobremesa gratis" |
| `pricing` | Euro | "'High spenders' pedem 40% mais quando ha menu degustacao — lanca um novo" |
| `operational` | Engrenagem | "'Lunch crowd' espera em media 4min mais que 'dinner crowd' — staffing issue?" |

### 5.3 Sugestoes Proativas (Anomaly Detection)

O sistema deteta automaticamente anomalias e gera alertas:

| Anomalia | Trigger | Sugestao |
|----------|---------|----------|
| Queda subita | Revenue caiu >20% vs semana anterior | "Receita caiu 25% esta semana. Possivel causa: [evento local]. Acao: campanha flash" |
| Segmento a encolher | Segmento perdeu >15% membros em 30d | "'Regulares fieis' encolheu 18% — investiga causas e ativa retencao" |
| No-show spike | No-show rate subiu >50% vs media | "No-shows dobraram. 60% sao 'last minute' — implementa deposito para reservas <24h" |
| Produto em declinio | Top product caiu >30% em vendas | "'Dragon Roll' caiu 35% nas vendas — verifica se ha issue de qualidade ou substitui no menu" |
| Novo padrao | Cluster emergente detetado | "Grupo emergente: 23 clientes que pedem so vegetariano — cria segmento e menu dedicado" |

### 5.4 Estrutura da Sugestao (enriquecida)

```typescript
interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  reasoning: string;
  actionItems: ActionItem[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'instant' | 'quick' | 'medium' | 'large';
  impactEstimate: string;           // "~12% aumento em reservas"
  relatedObjective: string;
  relatedSegments: string[];         // IDs dos segmentos envolvidos
  affectedCustomerCount: number;     // Quantos clientes impacta
  status: 'new' | 'saved' | 'in_progress' | 'done' | 'dismissed';
  // Auto-apply
  canAutoApply: boolean;
  autoApplyAction?: AutoApplyAction;
  // Tracking
  createdAt: Date;
  savedAt?: Date;
  completedAt?: Date;
  // Resultado (pos-aplicacao)
  outcome?: {
    measuredAt: Date;
    metric: string;
    before: number;
    after: number;
    improvement: string;
  };
}

interface ActionItem {
  step: string;
  type: 'manual' | 'auto' | 'link';
  link?: string;        // Deep link para a acao (ex: /admin/seo?tab=metadata)
  autoAction?: string;  // ID da acao automatica
}

type AutoApplyAction =
  | { type: 'update_metadata'; field: string; locale: string; value: string }
  | { type: 'send_email'; segmentId: string; templateId: string }
  | { type: 'feature_product'; productId: number }
  | { type: 'create_promo'; details: PromoDetails }
  | { type: 'update_description'; productId: number; description: string };
```

### 5.5 Outcome Tracking

Quando uma sugestao e aplicada, o sistema **mede o resultado**:

```
Sugestao: "Envia email de reativacao ao segmento 'Perdidos'"
Aplicada: 5 Mar 2026
Resultado (medido 15 Mar 2026):
  - Emails enviados: 78
  - Abertos: 45 (57%)
  - Cliques: 23 (29%)
  - Reservas resultantes: 12
  - Revenue gerado: ~360 EUR
  - ROI estimado: Excelente
```

Isto alimenta o AI para gerar melhores sugestoes no futuro (feedback loop).

---

## 6. Fase 4 — Campanhas & Automacoes

### 6.1 Campanhas Manuais

Enviar comunicacao a um segmento:

```
+----------------------------------------------------------+
|  Nova Campanha                                           |
|                                                          |
|  Nome: [Reativacao Marco]                               |
|  Segmento: [Perdidos (78 clientes)]    [v]              |
|  Canal: [Email] [SMS] [WhatsApp]                        |
|                                                          |
|  Template:                                               |
|  [Gerar com AI]  [Escolher existente]                   |
|                                                          |
|  +----------------------------------------------------+ |
|  | Ola {nome}!                                         | |
|  |                                                     | |
|  | Ja la vao {dias_ausencia} dias desde a tua ultima   | |
|  | visita ao {brand_name}. Temos novidades no menu!    | |
|  |                                                     | |
|  | Usa o codigo VOLTEI15 para 15% de desconto na tua  | |
|  | proxima reserva.                                    | |
|  |                                                     | |
|  | [Reservar Agora]                                    | |
|  +----------------------------------------------------+ |
|                                                          |
|  Variaveis: {nome}, {dias_ausencia}, {brand_name},     |
|             {tier_label}, {produto_favorito},            |
|             {localizacao_preferida}                      |
|                                                          |
|  Agendar: [Agora] [Data/hora]                           |
|  [Enviar Preview] [Lancar Campanha]                     |
+----------------------------------------------------------+
```

### 6.2 Automacoes (Flows)

Campanhas que correm automaticamente quando um cliente entra/sai de um segmento:

| Flow | Trigger | Acoes |
|------|---------|-------|
| **Welcome** | Cliente entra em "Novos" | Email boas-vindas → espera 7d → email "Como foi?" |
| **Reativacao** | Cliente entra em "Em risco" | Email "Sentimos falta" → espera 7d → SMS com oferta |
| **Birthday** | Tag `birthday_month` aplicada | Email parabens + sobremesa gratis → lembrete reserva |
| **VIP upgrade** | Cliente sobe para tier 5 | Email "Es VIP" + beneficios + convite evento exclusivo |
| **Post-visit** | Sessao concluida | Espera 24h → email "Obrigado" + pedir review |
| **No-show follow-up** | No-show registado | Espera 1h → SMS "Lamentamos" + facilitar re-agendamento |
| **Win-back** | Cliente entra em "Perdidos" | Sequencia de 3 emails em 30 dias com ofertas crescentes |
| **Group thank you** | Reserva 6+ pessoas concluida | Email agradecimento + desconto proxima reserva grupo |

```
+----------------------------------------------------------+
|  Flow: Reativacao Automatica                             |
|  Trigger: Cliente entra no segmento "Em risco de churn" |
|  Status: Ativo (12 clientes em flow atualmente)         |
|                                                          |
|  [Trigger] → [Espera 1d] → [Email "Novidades"]         |
|     → [Espera 7d] → [Abriu email?]                     |
|         Sim → [Fim]                                      |
|         Nao → [SMS "15% off"] → [Espera 14d]           |
|              → [Reservou?]                               |
|                   Sim → [Tag "reactivated"] → [Fim]     |
|                   Nao → [Email final "Ultima chance"]   |
|                        → [Fim]                           |
|                                                          |
|  Metricas do flow:                                       |
|  Entradas: 234 | Reativados: 89 (38%) | Revenue: 2.7k  |
|                                                          |
|  [Editar Flow] [Pausar] [Duplicar]                      |
+----------------------------------------------------------+
```

### 6.3 Modelo de Dados para Campanhas

```sql
-- Campanhas
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual', 'automation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  segment_id UUID REFERENCES customer_segments(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push')),
  -- Conteudo
  subject TEXT,
  body_template TEXT,          -- Com variaveis {nome}, {tier_label}, etc.
  body_html TEXT,              -- HTML renderizado
  -- Automacao
  trigger_type TEXT,            -- 'segment_enter', 'segment_exit', 'event', 'schedule'
  trigger_config JSONB,
  flow_steps JSONB,            -- Array de steps para automacoes
  -- Agendamento
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  -- Metricas
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,     -- Reservas/visitas resultantes
  revenue_attributed NUMERIC(10,2) DEFAULT 0,
  -- Tracking
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de envios individuais
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  variables JSONB,  -- Variaveis resolvidas para este cliente
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_customer ON campaign_sends(customer_id);
```

---

## 7. Fase 5 — Integracao com Geracao Existente

### 7.1 Descricoes de Produtos — Segment-Aware

```typescript
// O prompt de geracao de descricao agora recebe:
const context = {
  product: { name, ingredients, category, price },
  brand: { name: brandName, description, tone: communicationTone },
  objectives: topObjectives,
  // NOVO: dados de segmentacao
  segments: {
    topBuyers: "Sashimi fans (89 clientes, ticket medio 32 EUR)",
    growingSegment: "Experimentadores (+23% este mes)",
    targetAudience: "Casais 25-35, tom casual"
  }
};

// Resultado: descricao que ressoa com os segmentos mais valiosos
```

### 7.2 Metadata SEO — Objective-Driven

Se o objetivo #1 e `acq_tourists`, o sistema:
- Prioriza qualidade das traducoes EN/FR/DE
- Sugere keywords em ingles com volume de pesquisa turistico
- Meta descriptions que mencionam "Porto", "Portugal", "authentic"

Se o objetivo #1 e `res_reduce_noshow`:
- Sugere CTAs mais fortes na pagina de reservas
- Meta descriptions que enfatizam facilidade de cancelamento
- Keywords focadas em "reserva restaurante" locais

### 7.3 Translate com Contexto de Segmentos

Se o segmento `acq_tourists` esta a crescer, o sistema:
- Prioriza traducoes para os idiomas com mais trafego
- Ajusta o tom por cultura (mais formal para DE, mais casual para EN)
- Sugere metadata especifica por locale baseada em pesquisas locais

---

## 8. Fase 6 — Insights Externos

(Mantido do plano anterior com adicao de segment enrichment)

### 8.1 Google Analytics 4
- Trafego por locale → enriquece segmento `acq_tourists`
- Bounce rate por pagina → sugestoes de UX
- Conversion rate reservas → mede objetivo `res_increase_bookings`
- Sources → identifica canais que trazem clientes high-value

### 8.2 Instagram Insights
- Demographics → valida/ajusta `target_audience`
- Top performing content → sugere tipo de conteudo por segmento
- Reach por hashtag → otimiza estrategia social

### 8.3 Google Business Profile
- Reviews → trigger para flow de agradecimento
- Search queries → keywords para SEO
- Photo views → sugere tipos de conteudo visual

### 8.4 Enrichment Cruzado

A magia acontece quando cruzamos dados:

```
GA4 diz: "Pagina /menu tem 5000 views/mes mas so 200 reservas (4% conversao)"
Segmentacao diz: "70% dos visitantes do menu sao novos (sem sessao anterior)"
Sugestao AI: "Adiciona CTA 'Reserve com 10% primeira visita' na pagina do menu
             para converter os 3500 novos visitantes mensais. Se converter 2% mais,
             sao 70 reservas adicionais/mes (~2100 EUR)"
```

---

## 9. Fase 7 — Intelligence Dashboard

### 9.1 Overview

```
+----------------------------------------------------------+
|  Marketing Intelligence                                  |
|                                                          |
|  Score de Objetivos: 72/100 (+5 vs mes anterior)        |
|  [====================================------] 72%        |
|                                                          |
|  Objetivos em destaque:                                  |
|  [verde]  Dominar pesquisa local: 85/100 (+12)          |
|  [amarelo] Reduzir no-shows: 62/100 (-3) !!            |
|  [vermelho] Crescer Instagram: 34/100 (+1) !!!          |
|                                                          |
|  Segmentos em mudanca:                                   |
|  [seta cima]  "Regulares fieis" +23 clientes (30d)      |
|  [seta baixo] "Em risco" +15 clientes (30d) !!         |
|  [novo]       "Vegetarianos" — cluster detetado (23)    |
|                                                          |
|  Top sugestao pendente:                                  |
|  "78 clientes 'perdidos' — campanha reativacao pode     |
|   gerar ~1200 EUR. Quick win, 5 min setup."             |
|  [Aplicar Agora]                                         |
+----------------------------------------------------------+
```

### 9.2 Tendencias Preditivas

Baseado em historico + sazonalidade:

| Predicao | Confianca | Sugestao |
|----------|-----------|----------|
| "Proximo sabado vai estar lotado (baseado em reservas + tendencia)" | 92% | "Aumenta staff, prepara ingredientes extra" |
| "No-shows vao subir na proxima semana (padrao pre-feriado)" | 78% | "Envia lembretes extra, faz overbooking 10%" |
| "Segmento 'estudantes' vai crescer em Setembro" | 85% | "Prepara promo back-to-school" |
| "Dragon Roll vai atingir 1000 vendas este mes" | 70% | "Publica milestone no Instagram" |

---

## 10. Arquitetura Completa (Clean Architecture)

### Domain

```
src/domain/
  entities/
    BusinessStrategy.ts
    MarketingSuggestion.ts
    CustomerSegment.ts
    MarketingCampaign.ts
    CampaignSend.ts
  repositories/
    IBusinessStrategyRepository.ts
    IMarketingSuggestionRepository.ts
    ICustomerSegmentRepository.ts
    IMarketingCampaignRepository.ts
  value-objects/
    BusinessObjective.ts
    SuggestionType.ts
    SegmentRule.ts
    CampaignStatus.ts
    CampaignChannel.ts
  services/
    SegmentEngine.ts
    MarketingInsightService.ts
    CampaignService.ts
```

### Application

```
src/application/use-cases/
  marketing/
    -- Strategy
    GetBusinessStrategyUseCase.ts
    UpdateBusinessStrategyUseCase.ts
    -- Segments
    GetAllSegmentsUseCase.ts
    CreateSegmentUseCase.ts
    UpdateSegmentUseCase.ts
    DeleteSegmentUseCase.ts
    EvaluateSegmentUseCase.ts
    GetSegmentMembersUseCase.ts
    RefreshAllSegmentsUseCase.ts
    -- Suggestions
    GenerateSuggestionsUseCase.ts
    GetSuggestionsUseCase.ts
    UpdateSuggestionStatusUseCase.ts
    ApplySuggestionUseCase.ts
    TrackSuggestionOutcomeUseCase.ts
    -- Campaigns
    CreateCampaignUseCase.ts
    SendCampaignUseCase.ts
    GetCampaignAnalyticsUseCase.ts
    -- Automations
    ProcessAutomationTriggersUseCase.ts
```

### Infrastructure

```
src/infrastructure/repositories/
  SupabaseBusinessStrategyRepository.ts
  SupabaseMarketingSuggestionRepository.ts
  SupabaseCustomerSegmentRepository.ts
  SupabaseMarketingCampaignRepository.ts
```

### Presentation

```
src/presentation/hooks/
  useBusinessStrategy.ts
  useMarketingSuggestions.ts
  useCustomerSegments.ts
  useMarketingCampaigns.ts
  useMarketingIntelligence.ts  -- Dashboard agregado
```

### API Routes

```
src/app/api/admin/
  business-strategy/route.ts
  customer-segments/route.ts
  customer-segments/[id]/route.ts
  customer-segments/[id]/members/route.ts
  customer-segments/[id]/analytics/route.ts
  marketing-suggestions/route.ts
  marketing-suggestions/[id]/route.ts
  marketing-campaigns/route.ts
  marketing-campaigns/[id]/route.ts
  marketing-campaigns/[id]/send/route.ts
  marketing-intelligence/route.ts     -- Dashboard agregado
  analytics/ga4/route.ts
  analytics/instagram/route.ts
```

---

## 11. Fases de Implementacao (Revista)

### Fase 1 — Objetivos Estrategicos (~3 sessoes)
- [ ] Migration: `business_strategy`
- [ ] Domain + Infrastructure + Use cases
- [ ] API route + UI tab "Estrategia"
- [ ] KPI tracking automatico por objetivo
- [ ] Testes

### Fase 2 — Segmentacao (~5 sessoes)
- [ ] Migration: `customer_segments`, `customer_segment_members`, `customer_tags`
- [ ] Domain: SegmentEngine + regras
- [ ] Smart segments pre-definidos (15+)
- [ ] Segment builder UI
- [ ] Segment analytics mini-dashboard
- [ ] Cron de refresh de segmentos
- [ ] Testes

### Fase 3 — Sugestoes AI v2 (~4 sessoes)
- [ ] Migration: `marketing_suggestions` (v2 com segments)
- [ ] Prompt engineering segment-aware
- [ ] Anomaly detection basica
- [ ] UI com filtros, cards, backlog
- [ ] Outcome tracking
- [ ] Testes

### Fase 4 — Campanhas & Automacoes (~5 sessoes)
- [ ] Migration: `marketing_campaigns`, `campaign_sends`
- [ ] Campanhas manuais (email a segmento)
- [ ] Template builder com variaveis
- [ ] Automacoes/flows (visual builder simples)
- [ ] Integracao com Resend para envio
- [ ] Campaign analytics
- [ ] Testes

### Fase 5 — Integracao com Geracao (~2 sessoes)
- [ ] Context injection em generate-description
- [ ] Context injection em translate-metadata
- [ ] Auto-sugestao de metadata por objetivo
- [ ] Testes

### Fase 6 — Insights Externos (~4 sessoes)
- [ ] GA4 Data API integration
- [ ] Instagram Graph API
- [ ] Google Business Profile API
- [ ] Cross-enrichment engine
- [ ] Testes

### Fase 7 — Intelligence Dashboard (~3 sessoes)
- [ ] Objective score calculator
- [ ] Segment trend charts
- [ ] Predictive models basicos (sazonalidade + tendencia)
- [ ] Dashboard unificado
- [ ] Testes

---

## 12. Prompt Engineering — Template Enriquecido

```
Es um consultor de marketing especializado em restaurantes premium em Portugal.
Tens acesso a dados operacionais completos — usa-os para sugestoes ultra-especificas.

RESTAURANTE:
- Nome: {brandName}
- Descricao: {description}
- Localizacoes: {restaurants}
- Gama: {priceRange} | Tipo: {cuisineTypes}
- Tom: {communicationTone} | Publico: {targetAudience}

OBJETIVOS (por prioridade):
{objectives com KPIs atuais vs target}

SEGMENTOS ATIVOS:
{segments com tamanho, tendencia, metricas-chave}
Exemplo:
- "Regulares fieis": 234 clientes, ticket med 28.50 EUR, +12% (30d)
- "Em risco de churn": 45 clientes, sem visita 30-60d, -8% vs anterior
- "Weekend warriors": 156, 80%+ visitas Sex-Dom
- "Perdidos": 78, >60d sem visita, potencial reativacao ~20%

ANOMALIAS DETETADAS:
{anomalies com dados}

METRICAS:
{dashboard analytics completo}

CAMPANHAS RECENTES:
{campanhas enviadas com resultados — para feedback loop}

SUGESTOES ANTERIORES:
{ultimas 20 sugestoes com status e outcome — evitar repeticoes, aprender}

Gera 5-8 sugestoes. Para cada uma:
1. Tipo
2. Titulo (max 80 chars)
3. Descricao (2-3 frases, especifica — menciona segmentos e numeros)
4. Raciocinio baseado em dados
5. Passos (3-5), indicando se sao auto-aplicaveis
6. Segmentos envolvidos
7. Impacto estimado (EUR ou % de melhoria)
8. Prioridade + Esforco
9. Objetivo relacionado

Prioriza por ROI (impacto / esforco).
Se detetaste anomalias, a primeira sugestao deve aborda-las.
Menciona numeros concretos de clientes e EUR sempre que possivel.
```

---

## 13. Consideracoes Tecnicas

### Performance
- Segment evaluation: queries otimizadas com indices, cache agressivo
- Suggestion generation: max 10/hora, cooldown 30s
- Campaign sends: batch processing (100/batch), rate limit Resend
- Analytics snapshots: compactados apos 90 dias

### Privacidade e RGPD
- Segmentos usam dados agregados para AI (nunca nomes/emails no prompt)
- Campanhas respeitam opt-out / unsubscribe
- Customer tags podem ser eliminadas a pedido
- Export de dados pessoais disponivel (direito de acesso)
- Retencao: campaign_sends limpo apos 1 ano

### RLS
- `business_strategy`: admin read/write
- `customer_segments`: admin read/write
- `customer_segment_members`: admin read, system write
- `customer_tags`: admin read/write, system auto-write
- `marketing_suggestions`: admin read/write
- `marketing_campaigns`: admin read/write
- `campaign_sends`: admin read, system write

### AI Provider
- Claude via Anthropic API (ja configurado)
- Temperatura 0.7 para sugestoes, 0.3 para campanhas/templates
- Structured output (JSON) para parsing fiavel
- Fallback: retry com temperatura mais baixa se JSON invalido
