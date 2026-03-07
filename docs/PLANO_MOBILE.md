# Plano Apps Mobile (React Native) - RestoHub

> **Data:** 2026-03-05
> **Versao:** 2.0
> **Estado:** Planeamento

---

## Planos Relacionados

| Plano | Ficheiro | Prioridade |
|-------|----------|------------|
| **Stripe (Pagamento Mesa)** | [PLANO_STRIPE_PAGAMENTO_MESA.md](PLANO_STRIPE_PAGAMENTO_MESA.md) | 1 (proximo) |
| **Feature Flags + PWA** | [PLANO_FEATURE_FLAGS_PWA.md](PLANO_FEATURE_FLAGS_PWA.md) | 2 |
| **Modularizacao** | [PLANO_MODULARIZACAO.md](PLANO_MODULARIZACAO.md) | 3 (pre-requisito) |
| **Apps Mobile** | Este documento | 4 |

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [App Mesa (Cliente)](#2-app-mesa-cliente)
3. [App Waiter](#3-app-waiter)
4. [App Kitchen (KDS)](#4-app-kitchen-kds)
5. [Publicacao nas Stores](#5-publicacao-nas-stores)
6. [Custos](#6-custos)
7. [Cronograma](#7-cronograma)
8. [Riscos e Mitigacoes](#8-riscos-e-mitigacoes)
9. [Comunicacao Offline e Alternativas de Rede](#9-comunicacao-offline-e-alternativas-de-rede)

---

## 1. Visao Geral

3 apps React Native (Expo) para os perfis do ecossistema RestoHub:
- **App Mesa** — Cliente faz pedidos e paga na mesa (substitui QR web)
- **App Waiter** — Empregado gere mesas, pedidos e impressao Bluetooth
- **App Kitchen** — Tablet da cozinha com Kanban, alertas e keep-awake

**Pre-requisitos:** Stripe, Feature Flags + PWA, e Modularizacao (monorepo + packages) implementados.

**Abordagem:** Monorepo Expo com `@restohub/domain` e `@restohub/application` partilhados (ver [PLANO_MODULARIZACAO.md](PLANO_MODULARIZACAO.md)). As mesmas API routes servem web e mobile.

---

## 2. App Mesa (Cliente)

### 2.1 Visao Geral

App para clientes fazerem pedidos na mesa, substituindo/complementando a experiencia web via QR code.

**Nome sugerido:** "Sushi in Sushi" (App Store) / "Sushi in Sushi - Pedidos" (se precisar diferenciar)

### 2.2 Ecras e Navegacao

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

### 2.3 Features Nativas

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

### 2.4 Fluxo de Dados

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
- `GET /api/sessions?tableNumber=X&location=Y` — Verificar sessao
- `POST /api/sessions` — Criar sessao
- `POST /api/orders` — Criar pedidos
- `GET /api/mesa/games/*` — Jogos
- `POST /api/mesa/games/answer` — Submeter resposta
- `GET /api/mesa/product-ratings` — Ratings

**Defense-in-Depth (obrigatorio):**
- **Middleware:** validacao de auth (JWT) antes do handler
- **Route handlers:** validacao de ownership (mesa/sessao) antes de mutar estado
- **Data access layer:** RLS no Supabase ou checks explicitos

### 2.5 Tarefas

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 2.1 | Setup app no monorepo Expo | 2d | Modularizacao concluida |
| 2.2 | Integracao Supabase (auth + realtime) | 2d | 2.1 |
| 2.3 | Navegacao (React Navigation + tabs) | 2d | 2.1 |
| 2.4 | QR Scanner screen | 1d | 2.3 |
| 2.5 | Welcome/session flow | 2d | 2.2 |
| 2.6 | Menu screen (categorias + produtos) | 3d | 2.2 |
| 2.7 | Product detail bottom sheet | 2d | 2.6 |
| 2.8 | Cart (state + UI) | 2d | 2.6 |
| 2.9 | Submit order (+ cooldown) | 1d | 2.8 |
| 2.10 | Orders tab (real-time status) | 2d | 2.2 |
| 2.11 | Push notifications setup | 2d | 2.2 |
| 2.12 | Call waiter feature | 1d | 2.2 |
| 2.13 | Bill request screen | 1d | 2.2 |
| 2.14 | Games hub + Quiz | 3d | 2.2 |
| 2.15 | Swipe Rating game | 2d | 2.14 |
| 2.16 | Preference game + leaderboard | 2d | 2.14 |
| 2.17 | Language picker (6 idiomas) | 1d | 2.1 |
| 2.18 | Customer auth flow (login/registo) | 2d | 2.2 |
| 2.19 | Offline support (menu cache) | 2d | 2.6 |
| 2.20 | Testes (unit + integration) | 3d | Todos |
| 2.21 | Polish UI/UX + animacoes | 3d | Todos |
| 2.22 | Build iOS + Android + submit | 3d | Todos |
| **Total** | | **~42 dias (~8-9 semanas)** | |

---

## 3. App Waiter

### 3.1 Visao Geral

App para empregados de mesa gerirem mesas, pedidos e sessoes. Substitui `/waiter` com capacidades nativas (impressao Bluetooth, notificacoes push, haptics).

**Nome sugerido:** "Sushi in Sushi Staff" (internal distribution ou Store)

> **Requisito de build:** A dependencia de impressao termica exige development builds (expo prebuild / EAS Build). O App Waiter **nao pode usar Expo Go**. Ver [Apendice A](#apendice-a-dependencias-react-native).

### 3.2 Ecras e Navegacao

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

### 3.3 Features Nativas

| Feature | Biblioteca | Descricao |
|---------|------------|-----------|
| Push Notifications | `expo-notifications` | Chamadas de clientes, pedidos prontos |
| Bluetooth Printing | `@haroldtran/react-native-thermal-printer` | BLE, USB, Network (alt: Star, Epson) |
| Haptic Feedback | `expo-haptics` | Alertas de chamada, novo pedido |
| Badge Count | `expo-notifications` | Chamadas pendentes no icone |
| Background Fetch | `expo-background-fetch` | Verificar chamadas em background |
| Secure Storage | `expo-secure-store` | JWT token do staff |
| Keep Awake | `expo-keep-awake` | Ecra ligado durante servico |

### 3.4 Fluxo de Impressao (Bluetooth)

```
Waiter pede conta
     │
     ├──> POST /api/sessions/[id]/close (action: "request_bill")
     ├──> Calcular total no backend
     ├──> Retornar dados do recibo (items, totais, NIF)
     └──> App formata ESC/POS commands
          ├──> Bluetooth scan → conectar
          └──> Imprimir recibo termal
```

**Impressoras recomendadas:**
- Epson TM-T20III (WiFi + Bluetooth) - ~€250
- Star Micronics mC-Print3 (WiFi + Bluetooth + USB) - ~€350
- Sunmi Cloud Printer (Android embedded) - ~€150

### 3.5 Tarefas

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 3.1 | App setup no monorepo | 1d | App Mesa (monorepo) |
| 3.2 | Login screen + auth flow | 2d | 3.1 |
| 3.3 | Dashboard layout + stats bar | 2d | 3.2 |
| 3.4 | Table grid (ativas/disponiveis) | 2d | 3.3 |
| 3.5 | Table detail screen (orders list) | 3d | 3.4 |
| 3.6 | Mark order delivered action | 1d | 3.5 |
| 3.7 | Start session modal | 1d | 3.4 |
| 3.8 | Billing flow (3 passos) | 3d | 3.5 |
| 3.9 | Ready-to-serve section (real-time) | 2d | 3.3 |
| 3.10 | Waiter calls (push notifications) | 2d | 3.3 |
| 3.11 | Reservation alerts + assignment | 3d | 3.3 |
| 3.12 | Bluetooth printer integration | 4d | 3.8 |
| 3.13 | Settings screen (printer, prefs) | 1d | 3.12 |
| 3.14 | Ordering mode switch | 1d | 3.5 |
| 3.15 | Offline fallback (cached tables/sessions) | 2d | 3.3 |
| 3.16 | Testes | 3d | Todos |
| 3.17 | Polish + animacoes | 2d | Todos |
| 3.18 | Build + submit | 2d | Todos |
| **Total** | | **~35 dias (~7 semanas)** | |

---

## 4. App Kitchen (KDS)

### 4.1 Visao Geral

App dedicada para o Kitchen Display System. Desenhada para tablets fixos na cozinha. Foco em velocidade, clareza e fiabilidade.

**Nome sugerido:** "Sushi in Sushi Kitchen" (internal distribution)

### 4.2 Ecras e Navegacao

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

### 4.3 Features Nativas

| Feature | Biblioteca | Descricao |
|---------|------------|-----------|
| Keep Awake | `expo-keep-awake` | Ecra sempre ligado (obrigatorio) |
| Sound Alerts | `expo-av` | Som de novo pedido |
| Haptic Alerts | `expo-haptics` | Vibracao no tablet ao novo pedido |
| Push Notifications | `expo-notifications` | Backup quando app em background |
| Drag & Drop | `react-native-gesture-handler` + custom | Arrastar entre colunas |
| Network Printing | `react-native-tcp-socket` | Impressora de cozinha via rede |
| Landscape Lock | `expo-screen-orientation` | Forcar horizontal em tablet |
| Fullscreen/Kiosk | Config nativa (Android) | Modo quiosque para tablet dedicado |
| Background Audio | `expo-av` | Som mesmo com app em segundo plano |

### 4.4 Hardware Recomendado

- Samsung Galaxy Tab A8 (10.5") - ~€230 (boa relacao qualidade/preco)
- Samsung Galaxy Tab S6 Lite (10.4") - ~€350 (melhor performance)
- iPad 10th gen (10.9") - ~€400 (se ja usam iOS)

**Setup:** Instalar app → Kiosk mode → Desativar auto-sleep → WiFi fixo → Suporte de parede

### 4.5 Tarefas

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 4.1 | App setup no monorepo | 1d | App Mesa (monorepo) |
| 4.2 | Login screen (kitchen role) | 1d | 4.1 |
| 4.3 | Kanban board layout (3 colunas) | 3d | 4.2 |
| 4.4 | Order card component | 2d | 4.3 |
| 4.5 | Drag-and-drop entre colunas | 3d | 4.3 |
| 4.6 | Real-time order updates (Supabase) | 2d | 4.3 |
| 4.7 | Sound + notification alerts | 1d | 4.6 |
| 4.8 | Location filter | 1d | 4.3 |
| 4.9 | Network printer integration | 3d | 4.3 |
| 4.10 | Settings sheet | 1d | 4.3 |
| 4.11 | Keep-awake + landscape lock | 0.5d | 4.1 |
| 4.12 | Kiosk mode setup (Android) | 1d | 4.1 |
| 4.13 | Offline fallback (cached orders) | 2d | 4.6 |
| 4.14 | Testes | 2d | Todos |
| 4.15 | Polish + performance | 2d | Todos |
| 4.16 | Build + distribute | 1d | Todos |
| **Total** | | **~25.5 dias (~5 semanas)** | |

---

## 5. Publicacao nas Stores

### 5.1 Apple App Store (iOS)

**Pre-requisitos:** Conta Apple Developer ($99/ano), certificados via EAS, App Store Connect.

**Assets:**
- [ ] Icone 1024x1024 (sem transparencia)
- [ ] Screenshots iPhone 6.7" + 6.5" (min 3 cada)
- [ ] Screenshots iPad 12.9" (se suportar)
- [ ] Descricao curta (30 chars) + longa (4000 chars)
- [ ] Privacy Policy URL
- [ ] Categoria: Food & Drink > Restaurants

**Privacy Nutrition Labels:** Email, Nome, Numero Mesa. Sem tracking de terceiros.

**Build:** `eas build --platform ios --profile production` → `eas submit --platform ios`

**Review:** 24-48h tipico. Preparar conta demo com dados reais.

**TestFlight:** Internal (100 testers, imediato), External (10K, requer review). Builds expiram em 90 dias.

**OTA:** `eas update` para JS-only changes (segundos, sem review).

### 5.2 Google Play Store (Android)

**Pre-requisitos:** Conta Google Play ($25 one-time), verificacao identidade, Firebase para FCM.

**Assets:**
- [ ] Icone 512x512
- [ ] Feature graphic 1024x500
- [ ] Screenshots phone (min 2)
- [ ] Data safety form + content rating

**Closed Testing (OBRIGATORIO para novas contas):** 20 testers, 14 dias minimo antes de producao.

**Build:** `eas build --platform android --profile production` → `eas submit --platform android`

**Review:** Poucas horas a 7 dias (novas contas).

### 5.3 Distribuicao Staff (Waiter + Kitchen)

| App | iOS | Android |
|-----|-----|---------|
| **Mesa (Cliente)** | App Store (publica) | Google Play (publica) |
| **Waiter (Staff)** | TestFlight | Google Play Private ou sideload |
| **Kitchen (KDS)** | TestFlight / Guided Access | Google Play Private ou sideload |

---

## 6. Custos

### 6.1 Fixos

| Item | Custo | Frequencia |
|------|-------|------------|
| Apple Developer Program | €91/ano | Anual |
| Google Play Developer | €23 | Unico |

### 6.2 Servicos

| Servico | Free Tier | Plano Pago |
|---------|-----------|------------|
| EAS Build | 30 builds/mes | $19/mes |
| Expo Push | Ilimitado | $0 |
| Firebase FCM | Ilimitado | $0 |

### 6.3 Hardware (por restaurante)

| Item | Custo |
|------|-------|
| Tablet Samsung Galaxy Tab A8 | ~€230 |
| Suporte parede | ~€25 |
| Impressora termica (cozinha) | ~€250 |
| Impressora termica (waiter, opcional) | ~€150 |

### 6.4 Desenvolvimento

| App | Duracao | 1 dev | 2 devs |
|-----|---------|-------|--------|
| App Mesa | ~9 semanas | €14,400 | €10,000 |
| App Waiter | ~7 semanas | €11,200 | €8,000 |
| App Kitchen | ~5 semanas | €8,000 | €5,600 |
| **Total** | **~21 semanas** | **€33,600** | **€23,600** |

> *Rate medio: €400/dia. Com 2 devs, fases podem ser parcialmente paralelizadas.*

---

## 7. Cronograma

> Assume Stripe, Feature Flags, PWA e Modularizacao ja implementados.

```
Semanas
S1      S3      S5      S7      S9      S11     S13     S15
│       │       │       │       │       │       │       │
├───────────────── App Mesa ────────────────────┤       │
│  Setup   Menu    Cart   Orders  Games  Polish │       │
│       │       │       │       │       │       │       │
│       │       │       ├──── App Waiter ───────┤       │
│       │       │       │  Dashboard  Billing   │ Print │
│       │       │       │       │       │       │       │
│       │       │       │       │  ├── App Kitchen ──┤  │
│       │       │       │       │  │  Kanban  RT     │  │
│       │       │       │       │       │       │       │
```

| Fase | Inicio | Fim | Dependencias |
|------|--------|-----|--------------|
| **App Mesa** | S1 | S9 | Modularizacao concluida |
| **App Waiter** | S5 | S12 | App Mesa (monorepo) |
| **App Kitchen** | S8 | S13 | App Mesa (monorepo) |
| **Store Review** | S9+ | S15 | Builds completos |

**Total: ~3.5 meses com 2 developers**

### Milestones

| Marco | Semana | Criterio |
|-------|--------|----------|
| Mesa Beta | S6 | TestFlight + Internal Testing |
| Mesa Store | S9 | Publicada em ambas as stores |
| Waiter Beta | S10 | TestFlight para staff |
| Waiter Deploy | S12 | TestFlight/sideload |
| Kitchen Beta | S11 | Testada em tablet |
| Kitchen Deploy | S13 | Instalada nos restaurantes |
| Sistema Completo | S15 | Tudo em producao |

---

## 8. Riscos e Mitigacoes

### Tecnicos

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Bluetooth printing falha | Media | Alto | Testar impressoras especificas; fallback para rede |
| Apple rejeita app | Media | Medio | Conta demo com dados reais |
| Realtime falha em mobile | Baixa | Alto | Retry + polling fallback + React Query cache |
| Performance Android low-end | Media | Medio | Testar dispositivos baratos; `React.memo` |
| OTA incompativel com native | Baixa | Medio | Separar JS de native updates; EAS channels |

### Negocio

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Clientes nao instalam app | Alta | Alto | PWA como alternativa; QR abre web |
| Custo manutencao 3 apps | Media | Alto | Monorepo; minimizar divergencias |
| Staff resiste | Media | Medio | Treino; transicao web+app paralela |

### Projeto

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Scope creep | Alta | Alto | MVP rigido; so features que web ja tem |
| Inconsistencia web vs mobile | Media | Medio | Mesmos use cases e DTOs; API unica |

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

> **Nota:** `react-native-thermal-receipt-printer-image-qr` requer development builds (incompativel com Expo Go). Baixa manutencao (~Set 2024). Alternativas: `@haroldtran/react-native-thermal-printer`, `react-native-star-io10`, `react-native-esc-pos-printer`.

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
- [ ] Privacy Policy URL
- [ ] Screenshots (6.7" + 6.5" + iPad opcional)
- [ ] Icone 1024x1024
- [ ] Descricao PT + EN
- [ ] Classificacao etaria + Privacy Labels
- [ ] Build via EAS → TestFlight → App Review

### Google Play (Android)

- [ ] Google Play Developer account ativa
- [ ] Verificacao de identidade
- [ ] Firebase para FCM
- [ ] Data Safety form + Content rating
- [ ] Screenshots + Feature graphic
- [ ] Closed testing (20 testers, 14 dias)
- [ ] Build via EAS → Internal → Production

---

## Apendice C: Comandos EAS

```bash
# Build
eas build --platform all --profile development
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit
eas submit --platform ios
eas submit --platform android

# OTA update
eas update --channel production --message "Fix: bug no carrinho"

# Dev
npx expo start --dev-client
```

---

---

## 9. Comunicacao Offline e Alternativas de Rede

### 9.1 Visao Geral

A arquitetura do projeto ja inclui suporte offline na web (Service Worker + IndexedDB + Background Sync). Para as apps nativas, existem opcoes adicionais de comunicacao que nao dependem de internet.

### 9.2 Arquitetura Offline Atual (Web)

```
[Browser] ─── fetch() falha ───> [OfflineQueue (IndexedDB)]
                                        │
                                        ├── Service Worker Background Sync
                                        │   (replay automatico quando online)
                                        │
                                        └── Manual retry (botao "enviar agora")
```

**Componentes implementados:**
- `public/sw.js` — Service Worker com Background Sync, cache strategies
- `src/infrastructure/offline/OfflineQueue.ts` — Fila com `StorageAdapter` interface (swappable)
- `src/infrastructure/offline/offlineFetch.ts` — Drop-in `fetch()` replacement
- `src/presentation/hooks/useOfflineQueue.ts` — Hook React (useSyncExternalStore)
- `src/presentation/components/ui/OfflineBanner.tsx` — Indicador visual offline
- `src/app/offline/page.tsx` — Pagina fallback offline

**StorageAdapter pattern:**
```typescript
// Web: IndexedDBStorageAdapter (implementado)
// React Native: AsyncStorageAdapter ou SQLiteAdapter (a implementar)
export interface StorageAdapter {
  getAll(): Promise<QueuedRequest[]>;
  add(request: QueuedRequest): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
```

### 9.3 Opcoes de Comunicacao Local (Sem Internet)

Para cenarios onde o WiFi do restaurante falha completamente, existem protocolos de comunicacao local entre dispositivos.

#### 9.3.1 Bluetooth Low Energy (BLE)

**Cenario:** Tablet da cozinha e telemovel do waiter comunicam via BLE quando WiFi cai.

| Aspeto | Detalhe |
|--------|---------|
| **Range** | ~10-30m (suficiente num restaurante) |
| **Latencia** | ~50-100ms |
| **Throughput** | ~1 Mbps (mais que suficiente para JSON) |
| **Biblioteca RN** | `react-native-ble-plx` |
| **iOS** | Core Bluetooth (background mode disponivel) |
| **Android** | Bluetooth LE API (Level 18+) |

**Implementacao sugerida:**
```
[App Waiter (BLE Central)] ←──BLE──→ [App Kitchen (BLE Peripheral)]
         │                                      │
         └── Envia pedido como JSON ────────────┘
         └── Recebe confirmacao ────────────────┘
```

**Limitacoes:** Requer pairing manual; nao funciona em background no iOS sem entitlements especificos.

#### 9.3.2 Wi-Fi Aware (Neighbor Awareness Networking)

**Cenario:** Dispositivos Android descobrem-se e comunicam via Wi-Fi Direct sem router.

| Aspeto | Detalhe |
|--------|---------|
| **Range** | ~50-100m |
| **Latencia** | ~10-30ms |
| **Throughput** | ~250 Mbps |
| **Requisitos** | Android 8.0+ com hardware Wi-Fi Aware |
| **Biblioteca RN** | Modulo nativo customizado (nao ha lib pronta) |
| **iOS** | Nao suportado |

**Nota:** Bom para Android-only (tablets de cozinha), mas requer hardware recente e modulo nativo.

#### 9.3.3 Apple Multipeer Connectivity

**Cenario:** Dispositivos Apple comunicam via combinacao automatica de WiFi/BLE/WiFi Direct.

| Aspeto | Detalhe |
|--------|---------|
| **Range** | ~30-50m |
| **Latencia** | ~10-50ms |
| **Throughput** | Ate ~100 Mbps |
| **Biblioteca RN** | `react-native-multipeer` (pouca manutencao) |
| **iOS** | Framework nativo `MultipeerConnectivity` |
| **Android** | Nao suportado |

**Ideal se:** Restaurante usa apenas dispositivos Apple (iPads na cozinha, iPhones para waiters).

#### 9.3.4 Google Nearby Connections

**Cenario:** Framework cross-platform da Google para comunicacao P2P.

| Aspeto | Detalhe |
|--------|---------|
| **Range** | ~30-100m |
| **Protocolos** | BLE + WiFi Hotspot + NFC (automatico) |
| **Biblioteca RN** | `react-native-nearby-connections` (experimental) |
| **iOS** | Sim (via Google Play Services equivalent) |
| **Android** | Sim (requer Google Play Services) |

**Vantagem:** Multiplataforma, abstrai BLE/WiFi, discovery automatico.
**Desvantagem:** Depende de Google Play Services; libs RN imaturas.

#### 9.3.5 Local MQTT Broker (Raspberry Pi)

**Cenario:** Raspberry Pi no restaurante corre broker MQTT local. Todos os dispositivos publicam/subscrevem via MQTT sobre WiFi local (ou hotspot do RPi).

| Aspeto | Detalhe |
|--------|---------|
| **Range** | Rede local do restaurante |
| **Latencia** | ~5-10ms (LAN) |
| **Throughput** | Ilimitado (LAN) |
| **Custo** | ~€40 (Raspberry Pi 4) |
| **Biblioteca RN** | `react-native-paho-mqtt` ou `mqtt.js` |
| **Broker** | Mosquitto (open-source, configuracao minima) |

```
[App Waiter] ──MQTT──> [Raspberry Pi (Mosquitto)] ──MQTT──> [App Kitchen]
                               │
                               └── Syncs com Supabase quando internet regressa
```

**Vantagens:**
- Funciona sem internet (WiFi local ou hotspot do RPi)
- Latencia ultra-baixa (~5ms)
- Pub/sub nativo (topics: `orders/new`, `orders/status`, `calls/new`)
- Barato e fiavel
- Sync bidirecional com Supabase quando internet volta

**Recomendado como solucao enterprise para restaurantes que precisam de uptime 100%.**

### 9.4 Recomendacao por App

| App | Offline Storage | Comunicacao Local | Prioridade |
|-----|-----------------|-------------------|------------|
| **Mesa (Cliente)** | AsyncStorage + React Query persistence | Nenhuma (depende de WiFi) | Baixa |
| **Waiter** | SQLite + OfflineQueue (StorageAdapter) | BLE para Kitchen, MQTT se disponivel | Media |
| **Kitchen** | SQLite + OfflineQueue (StorageAdapter) | BLE Peripheral, MQTT subscriber | Alta |

### 9.5 Implementacao Faseada

**Fase 1 (MVP - incluida nas apps):**
- `AsyncStorageAdapter` para `OfflineQueue` (drop-in replacement para IndexedDB)
- React Query `persistQueryClient` para cache de menu/produtos offline
- Indicador visual de estado offline (reutilizar pattern do `OfflineBanner`)
- Retry automatico com exponential backoff

**Fase 2 (Resiliencia - apos lancamento):**
- BLE bridge entre App Waiter e App Kitchen
- Pedidos ficam na fila local do waiter, chegam a cozinha via BLE
- Sync com Supabase quando internet regressa

**Fase 3 (Enterprise - opcional):**
- Raspberry Pi com Mosquitto no restaurante
- MQTT bridge para todos os dispositivos
- Modo "LAN-only" sem internet (rede local do RPi)
- Dashboard de status da rede local

### 9.6 StorageAdapter para React Native

```typescript
// packages/infrastructure/src/offline/AsyncStorageAdapter.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageAdapter, QueuedRequest } from "./OfflineQueue";

const QUEUE_KEY = "sushi-offline-queue";

export class AsyncStorageAdapter implements StorageAdapter {
  async getAll(): Promise<QueuedRequest[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: QueuedRequest[] = JSON.parse(raw);
    return items.sort((a, b) => a.priority - b.priority);
  }

  async add(request: QueuedRequest): Promise<void> {
    const items = await this.getAll();
    const idx = items.findIndex((i) => i.id === request.id);
    if (idx >= 0) items[idx] = request;
    else items.push(request);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  }

  async remove(id: string): Promise<void> {
    const items = await this.getAll();
    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(items.filter((i) => i.id !== id)),
    );
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  async count(): Promise<number> {
    return (await this.getAll()).length;
  }
}
```

> **Pre-requisitos:** [Stripe](PLANO_STRIPE_PAGAMENTO_MESA.md) → [Feature Flags + PWA](PLANO_FEATURE_FLAGS_PWA.md) → [Modularizacao](PLANO_MODULARIZACAO.md) → Este plano.
