# Games Feature - Estado de Implementacao

## Resumo

O sistema de jogos permite aos clientes na mesa interagir com jogos divertidos durante a refeicao, ganhar pontos e competir por premios. Suporta 3 tipos de jogos: **Tinder** (avaliar produtos com swipe), **Quiz** (perguntas sobre sushi/culinaria) e **Preference** (escolhas A vs B).

---

## O que foi feito

### 1. Domain Layer (100%)

| Ficheiro | Descricao |
|----------|-----------|
| `src/domain/entities/GameQuestion.ts` | Entidade com GameType (tinder, quiz, preference), opcoes, pontos, dificuldade |
| `src/domain/entities/GameSession.ts` | Sessao de jogo com status (active, completed, abandoned), rondas |
| `src/domain/entities/GameAnswer.ts` | Respostas individuais com score |
| `src/domain/entities/GamePrize.ts` | Premios com PrizeType (discount_percentage, free_product, free_dinner) |
| `src/domain/repositories/IGameQuestionRepository.ts` | Interface: findAll, findById, findRandom, create, update, delete |
| `src/domain/repositories/IGameSessionRepository.ts` | Interface: create, findById, findBySessionId, complete, abandon |
| `src/domain/repositories/IGameAnswerRepository.ts` | Interface: create, findByGameSession, getLeaderboard, getSessionLeaderboard |
| `src/domain/repositories/IGamePrizeRepository.ts` | Interface: create, findBySession, findById, redeem |
| `src/domain/services/GameService.ts` | Nomes anonimos engraçados, calculo de score, leaderboard, logica de premios |
| `src/domain/value-objects/GameConfig.ts` | Config: gamesEnabled, prizeType, prizeValue, minRounds, questionsPerRound |

Todos exportados nos respetivos `index.ts`.

---

### 2. Application Layer - Use Cases (100%)

7 use cases em `src/application/use-cases/games/`:

| Use Case | Descricao |
|----------|-----------|
| `GetGameQuestionsUseCase` | Buscar perguntas aleatorias filtradas por tipo e restaurante |
| `StartGameSessionUseCase` | Criar sessao de jogo, calcular ronda, devolver perguntas |
| `SubmitGameAnswerUseCase` | Submeter resposta, calcular score via GameService |
| `CompleteGameSessionUseCase` | Completar sessao, gerar leaderboard, atribuir premio se elegivel |
| `GetGameLeaderboardUseCase` | Obter leaderboard da sessao com rankings |
| `GetGameConfigUseCase` | Buscar config de jogos do restaurante |
| `RedeemGamePrizeUseCase` | Marcar premio como resgatado |

Todos usam Result pattern para tratamento de erros tipado.

---

### 3. Infrastructure Layer (100%)

4 repositorios Supabase em `src/infrastructure/repositories/`:

| Repositorio | Detalhes |
|-------------|----------|
| `SupabaseGameQuestionRepository` | CRUD completo, mapeamento snake_case/camelCase, findRandom com shuffle |
| `SupabaseGameSessionRepository` | Criar, ler, transicoes de status |
| `SupabaseGameAnswerRepository` | Upsert, leaderboard agregado por jogador, nomes de session_customers |
| `SupabaseGamePrizeRepository` | Criar premios, buscar por sessao, redeem com timestamp |

Todos exportados em `src/infrastructure/repositories/index.ts`.

---

### 4. Base de Dados (100%)

**Migration 028** (`028_product_ratings_for_mesa.sql`):
- Tabela `product_ratings` para ratings do swipe game
- Indexes em session_id e product_id
- RLS policies para insert e select

**Migration 029** (`029_games.sql`):
- 4 tabelas: `game_questions`, `game_sessions`, `game_answers`, `game_prizes`
- 6 colunas adicionadas a `restaurants`: games_enabled, games_prize_type, games_prize_value, games_prize_product_id, games_min_rounds_for_prize, games_questions_per_round
- Indexes de performance
- RLS policies
- Foreign keys com CASCADE

**Migration 030** (`030_game_questions_seed.sql`):
- 20 perguntas de quiz (cultura sushi, ingredientes)
- 15 perguntas de preferencia (escolhas A vs B)
- Todas globais (restaurant_id = NULL)

---

### 5. API Routes (100%)

5 endpoints em `src/app/api/mesa/`:

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/mesa/games` | GET | Leaderboard da sessao |
| `/api/mesa/games` | POST | Iniciar nova sessao de jogo, devolver perguntas |
| `/api/mesa/games/answer` | POST | Submeter resposta, calcular score |
| `/api/mesa/games/complete` | POST | Completar jogo, devolver leaderboard + premio |
| `/api/mesa/games/redeem` | POST | Resgatar premio |
| `/api/mesa/ratings` | GET | Table leader + contagem de ratings do utilizador |
| `/api/mesa/ratings` | POST | Guardar rating na tabela product_ratings |

---

### 6. Frontend - Jogo Tinder/Swipe (100%)

**Componente:** `src/components/mesa/SwipeRatingGame.tsx`
- Interface de swipe estilo Tinder com drag gestures
- Animacoes Framer Motion (spring physics, exit animations)
- Indicadores visuais "NOPE" (esquerda, rating 2) e "LIKE" (direita, rating 5)
- Progresso em direcao a bebida gratis (threshold: 5 ratings)
- Table leader (produto mais votado)
- Botoes manuais para acessibilidade
- Ecra de conclusao

**Integracao:** `src/app/mesa/[numero]/page.tsx`
- Tab "Avaliar" com SwipeRatingGame integrado
- Apenas mostra produtos servidos na sessao (delivered/ready)
- Fetch de stats de ratings (table leader, contagem)

---

### 7. Testes (100%)

| Ficheiro | Testes | Cobertura |
|----------|--------|-----------|
| `src/__tests__/application/use-cases/games/GamesUseCases.test.ts` | ~40 testes | Todos os 7 use cases, happy paths, edge cases, validacoes |
| `src/__tests__/domain/services/GameService.test.ts` | ~25 testes | Todos os metodos do service, calculo score por tipo, leaderboard, premios |

---

## O que falta

### Prioridade Alta

#### ~~1. Presentation Hooks~~ CONCLUIDO
- **`useGameSession`** (`src/presentation/hooks/useGameSession.ts`) - Gestao de sessoes de jogo: `startGame()`, `submitAnswer()`, `completeGame()`, `redeemPrize()`, `refreshLeaderboard()`, `reset()` + estados (`gameSession`, `questions`, `answers`, `leaderboard`, `currentPrize`, `isLoading`, `error`)
- **`useGameConfig`** (`src/presentation/hooks/useGameConfig.ts`) - Configuracao de jogos por restaurante: `config`, `isLoading`, `error`, `refresh()`

#### ~~2. DependencyContext~~ CONCLUIDO
**Localizacao:** `src/presentation/contexts/DependencyContext.tsx`

Registados 4 repositorios (`gameQuestionRepository`, `gameSessionRepository`, `gameAnswerRepository`, `gamePrizeRepository`) e 6 use cases (`startGameSession`, `submitGameAnswer`, `completeGameSession`, `getGameLeaderboard`, `getGameConfig`, `redeemGamePrize`).

#### ~~3. Componente de Quiz~~ CONCLUIDO
**Localizacao:** `src/components/mesa/QuizGame.tsx`

- Pergunta com 4 opcoes (A, B, C, D)
- Feedback visual (verde correto, vermelho errado, amarelo timeout)
- Pontuacao em tempo real no header
- Temporizador de 15s por pergunta com barra animada
- Animacoes de transicao entre perguntas (slide)
- Barra de progresso global
- Categoria + dificuldade (estrelas)
- Ecra final com resultado e botao "Ver Leaderboard"

#### ~~4. Componente de Preference (A vs B)~~ CONCLUIDO
**Localizacao:** `src/components/mesa/PreferenceGame.tsx`

- Layout VS com duas opcoes lado a lado
- Animacao de selecao (scale + highlight dourado)
- Opcao nao escolhida dimmed com opacity
- Pontos animados na opcao escolhida
- Suporte a imagens opcionais
- Sem resposta errada (sempre ganha pontos)

#### ~~5. Componente de Leaderboard~~ CONCLUIDO
**Localizacao:** `src/components/mesa/GameLeaderboard.tsx`

- Ranking de jogadores da mesa
- Destaque para o lider
- Animacoes de subida/descida no ranking
- Integracao real-time via Supabase subscriptions (game_answers)

#### ~~6. Componente de Premio~~ CONCLUIDO
**Localizacao:** `src/components/mesa/GamePrize.tsx`

- Revelacao do premio com animacao (spring, trofeu/check)
- Botao de resgatar
- QR code (SUSHI-PRIZE-{id}) e codigo alfanumerico para o empregado validar
- Estado de premio resgatado (check + "Ja resgatado")

---

### Prioridade Media

#### ~~7. Admin - Configuracao de Jogos~~ CONCLUIDO
**Localizacao:** Integrado no modal de edicao de restaurante em `/admin/definicoes`

- Toggle ativar/desativar jogos por restaurante
- Dropdown tipo de premio (sem premio, desconto %, produto gratis, jantar gratis)
- Input condicional para valor do premio
- Perguntas por ronda (3-20) e rondas minimas para premio
- Badge "Jogos ativos + Premio" nos cards de restaurante

#### ~~8. Admin - Gestao de Perguntas~~ CONCLUIDO
**Localizacao:** `/admin/jogos` + API `/api/admin/game-questions`

- Pagina admin com tabs Quiz / Preferencia
- CRUD completo de perguntas de quiz (texto, 4 opcoes, resposta correta, categoria, dificuldade, pontos)
- CRUD completo de perguntas de preferencia (texto, opcao A/B com label + imagem opcional)
- Toggle ativar/desativar perguntas inline
- Pre-visualizacao inline com estilo dark (simula aparencia no telemovel)
- Dialogo de confirmacao para eliminar
- API route com autenticacao admin (GET, POST, PUT, DELETE)
- Link "Jogos" adicionado ao sidebar do admin

#### ~~9. Traducoes i18n~~ CONCLUIDO (jogos mesa)
**Localizacao:** `src/messages/{pt,en,fr,de,it,es}.json`

Adicionadas traducoes em `mesa.games`:
- Labels: viewLeaderboard, startGame, quizLabel, preferenceLabel, swipeLabel
- Leaderboard: leaderboard, close, leaderboardEmpty, points
- Quiz: title, correct, wrong, timeout, scoreMaster, scoreGood, scoreTry
- Preference: title, preferencesRegistered, noWrongAnswer
- Premio: prize.title, default, staffCode, redeemed, showStaff, redeem, redeeming, revealing

QuizGame e PreferenceGame atualizados para receber prop `t` e usar i18n.
Perguntas de quiz vêm da BD (game_questions) — multi-idioma requeriria schema com locale.
UI do admin para jogos: por implementar (sem traducoes ainda).

#### ~~10. Pagina de Jogo Completa na Mesa~~ CONCLUIDO
**Localizacao:** `src/components/mesa/GameHub.tsx` + tab "Jogos" em `src/app/mesa/[numero]/page.tsx`

- Componente `GameHub` com fluxo completo: selecao -> jogo -> leaderboard -> premio
- Seletor de tipo de jogo (Quiz / A vs B) com icones e descricoes
- Integracao via API routes (sem DependencyProvider na mesa)
- Tab "Jogos" adicionada ao bottom tab bar (7 tabs total)
- Botoes "Jogar Outra Vez" e "Ver Premio" no leaderboard
- Traducoes i18n em 6 idiomas (mesa.games.hub + mesa.tabs.games)
- Usa sessionCustomerId para tracking de pontuacao individual
- Transicoes animadas entre estados com Framer Motion

---

### Prioridade Baixa

#### ~~11. Real-time Multiplayer~~ CONCLUIDO
- Supabase subscriptions para leaderboard em tempo real (ja integrado no GameLeaderboard)
- Notificacao toast quando alguem ultrapassa no ranking (movedUp, overtaken, droppedRank)
- Traducoes i18n em 6 idiomas para `mesa.games.realtime.*`

#### ~~12. Analytics de Jogos~~ CONCLUIDO
**Localizacao:** `/api/admin/game-stats` + tab Analytics em `/admin/jogos` + ratings em `/admin/produtos`

- API route completa com 6 queries paralelas: sessoes, respostas, premios, ratings, pergunta stats, atividade diaria
- Dashboard admin com cards de overview (sessoes, mesas, taxa conclusao, respostas, precisao quiz, score medio)
- Seccao de premios (total, resgatados, taxa, breakdown por tipo)
- Seccao de ratings (top 5 / bottom 5 produtos avaliados)
- Seccao de perguntas (mais dificeis / mais faceis por taxa de acerto)
- Grafico de atividade diaria (ultimos 30 dias)
- Resolve nomes de produtos e textos de perguntas via APIs auxiliares
- Ratings de produtos integrados na pagina `/admin/produtos` (tabela e grid) com estrela + media + contagem
- Database types atualizados com tabelas de jogos (game_questions, game_sessions, game_answers, game_prizes, product_ratings)

#### ~~13. Testes de Infraestrutura~~ CONCLUIDO
**Localizacao:** `src/__tests__/infrastructure/repositories/SupabaseGame*.test.ts`

- `SupabaseGameQuestionRepository.test.ts` - 25 testes (findAll com 5 filtros, findById, findRandom, create, update, delete, mapeamento)
- `SupabaseGameSessionRepository.test.ts` - 16 testes (create, findById, findBySessionId, complete, abandon, mapeamento)
- `SupabaseGameAnswerRepository.test.ts` - 15 testes (create/upsert, findByGameSession, findBySessionCustomer, getLeaderboard com agregacao JS, getSessionLeaderboard multi-sessao, mapeamento)
- `SupabaseGamePrizeRepository.test.ts` - 12 testes (create, findBySession, findById, redeem, mapeamento)
- Padrão: mock Supabase client com fluent API, helpers factory, PGRST116, happy paths + erros

#### ~~14. Testes de Hooks~~ CONCLUIDO
**Localizacao:** `src/__tests__/presentation/hooks/useGame*.test.ts`

- `useGameSession.test.ts` - 18 testes (estado inicial, startGame 5 cenarios, submitAnswer 3 cenarios, completeGame 3 cenarios, redeemPrize 2, refreshLeaderboard 2, reset, estabilidade useCallback)
- `useGameConfig.test.ts` - 7 testes (carregamento inicial, DEFAULT_CONFIG sem slug, erro fallback, excepção fallback, refresh, loading state, mudança de slug)
- Padrão: mock DependencyContext, renderHook + waitFor + act, Result pattern

---

## Arquitetura do Fluxo

```
Cliente na Mesa                    API                          Base de Dados
     |                              |                               |
     |-- Abre tab "Avaliar" ------->|                               |
     |                              |-- GET /games?sessionId ------>|
     |<-- Config + Leaderboard -----|<-- game config + scores ------|
     |                              |                               |
     |-- Escolhe tipo de jogo ----->|                               |
     |-- "Iniciar Jogo" ----------->|-- POST /games --------------->|
     |<-- Perguntas da ronda -------|<-- game_session + questions --|
     |                              |                               |
     |-- Responde pergunta -------->|-- POST /games/answer -------->|
     |<-- Score calculado ----------|<-- score + answer saved ------|
     |                              |                               |
     |-- Ultima pergunta ---------->|-- POST /games/complete ------>|
     |<-- Leaderboard + Premio -----|<-- leaderboard + prize? ------|
     |                              |                               |
     |-- Resgatar premio ---------->|-- POST /games/redeem -------->|
     |<-- Confirmacao --------------|<-- prize redeemed ------------|
```

## Resumo de Progresso

| Camada | Progresso | Notas |
|--------|-----------|-------|
| Domain (Entidades, Interfaces, Services) | **100%** | Completo e testado |
| Application (Use Cases) | **100%** | 7 use cases com Result pattern |
| Infrastructure (Repositories) | **100%** | 4 repositorios Supabase |
| Base de Dados (Migrations) | **100%** | 3 migrations (028, 029, 030) |
| API Routes | **100%** | 5 endpoints funcionais |
| Testes | **100%** | 93 testes de jogos (68 infra + 25 hooks); 911 total no projeto |
| Frontend - Tinder/Swipe | **100%** | Componente completo e integrado |
| Frontend - Quiz | **100%** | QuizGame.tsx com timer, feedback, animacoes |
| Frontend - Preference | **100%** | PreferenceGame.tsx com layout VS e animacoes |
| Frontend - Leaderboard | **100%** | GameLeaderboard.tsx completo |
| Frontend - Premio | **100%** | GamePrize.tsx completo |
| Presentation Hooks | **100%** | useGameSession + useGameConfig |
| DependencyContext | **100%** | 4 repos + 6 use cases registados |
| Admin Config UI | **100%** | Integrado no modal de restaurante |
| Admin Gestao Perguntas | **100%** | /admin/jogos com CRUD, preview, toggle ativo |
| Pagina Jogo na Mesa | **100%** | GameHub com fluxo completo + tab Jogos |
| Real-time Multiplayer | **100%** | Subscriptions + toast notifications em 6 idiomas |
| Analytics Dashboard | **100%** | API stats + admin dashboard + ratings em produtos |
| Testes Infraestrutura | **100%** | 68 testes (Question 25 + Session 16 + Answer 15 + Prize 12) |
| Testes Hooks | **100%** | 25 testes (useGameSession 18 + useGameConfig 7) |
| Traducoes i18n | **90%** | mesa.games + realtime completo (6 idiomas); admin por traduzir |

**Estimativa global: ~99% concluido** - Feature completa. Faltam apenas traducoes do admin.
