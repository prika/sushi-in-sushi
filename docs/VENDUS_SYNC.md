# Integracao Vendus POS - Guia Completo

Guia de configuracao, setup e utilizacao da integracao com o Vendus POS para faturacao certificada, sincronizacao de produtos/categorias e impressao de cozinha.

## Indice

1. [Visao Geral](#visao-geral)
2. [Pre-requisitos](#pre-requisitos)
3. [Configuracao Passo a Passo](#configuracao-passo-a-passo)
4. [Onde Encontrar Store ID e Register ID](#onde-encontrar-store-id-e-register-id)
5. [Migracoes de Base de Dados](#migracoes-de-base-de-dados)
6. [Exportar Produtos para o Vendus](#exportar-produtos-para-o-vendus)
7. [Importar Produtos do Vendus](#importar-produtos-do-vendus)
8. [Faturacao](#faturacao)
9. [Impressao de Cozinha](#impressao-de-cozinha)
10. [Sincronizacao Automatica (Cron)](#sincronizacao-automatica-cron)
11. [Resolucao de Problemas](#resolucao-de-problemas)
12. [Arquitetura Tecnica](#arquitetura-tecnica)
13. [Testes](#testes)

---

## Visao Geral

A integracao Vendus suporta:

| Funcionalidade | Descricao |
|----------------|-----------|
| **Produtos/Categorias** | Sincronizacao bidirecional (push/pull) com preview e conflitos |
| **Faturacao** | Emissao de faturas certificadas AT via Vendus (FR, FS) |
| **Mesas** | Importacao de rooms/tables do Vendus |
| **Impressao Cozinha** | Envio de pedidos para impressoras da cozinha |
| **Retry Queue** | Reprocessamento automatico de operacoes falhadas |

### Principio de Separacao

- **Produtos/Categorias**: Sync bidirecional (o sistema local e o Vendus podem ter ambos produtos)
- **Faturacao**: O sistema local **nunca cria faturas** — envia os dados ao Vendus que gera a fatura certificada (numeracao AT, hash SAFT). Localmente so guardamos a referencia.
- **Impressao Cozinha**: Feature opcional e nao-bloqueante. Erros nao afetam o fluxo principal.

---

## Pre-requisitos

1. **Conta Vendus** ativa em [vendus.pt](https://www.vendus.pt)
2. **API Key** do Vendus (ver secao abaixo)
3. **Store ID** e **Register ID** por localizacao (ver secao abaixo)
4. **Migracoes 046-049** aplicadas na base de dados Supabase
5. **CRON_SECRET** configurado (para sincronizacao automatica)
6. **Supabase Auth user** ligado ao staff (apenas em modo producao)

---

## Configuracao Passo a Passo

### Passo 1: Obter a API Key do Vendus

1. Acede a [vendus.pt](https://www.vendus.pt) e faz login
2. Vai a **Definicoes** > **API** (ou diretamente: `vendus.pt/dashboard/settings/api`)
3. Copia a API Key

### Passo 2: Adicionar a API Key ao `.env.local`

```bash
# Unica variavel de ambiente necessaria para o Vendus
VENDUS_API_KEY=a_tua_api_key_aqui

# Opcional: para cron jobs de sincronizacao automatica
CRON_SECRET=string_aleatoria_segura
```

> **Nota**: Store ID e Register ID **NAO sao variaveis de ambiente**. Sao configurados por localizacao na base de dados, via painel admin.

### Passo 3: Aplicar as Migracoes

Ver secao [Migracoes de Base de Dados](#migracoes-de-base-de-dados).

Para producao, usar o script consolidado: `supabase/scripts/apply-vendus-to-prod.sql`

### Passo 4: Configurar Store ID e Register ID por Local

1. Acede ao **Admin** do sistema: `/admin/vendus/locations`
2. Para cada restaurante, clica em **Editar**
3. Preenche:
   - **Vendus Ativo**: Sim
   - **Store ID**: ID da loja no Vendus
   - **Register ID**: ID do terminal/caixa no Vendus
4. Clica em **Guardar**

### Passo 5: Verificar a Configuracao

Vai a `/admin/vendus` — o dashboard mostra o estado de cada localizacao:
- Verde: Vendus configurado e ativo
- Cinzento: Vendus nao configurado

---

## Onde Encontrar Store ID e Register ID

Os IDs de Store e Register encontram-se no **dashboard do Vendus**:

### Store ID (ID da Loja)

1. Faz login em [vendus.pt](https://www.vendus.pt)
2. Vai a **Definicoes** > **Lojas** (ou **Estabelecimentos**)
3. Seleciona a loja pretendida
4. O **Store ID** aparece no URL da pagina: `vendus.pt/dashboard/stores/{STORE_ID}`
   - Tambem pode aparecer como campo "ID" ou "Codigo" nos detalhes da loja
5. Exemplo: se o URL e `vendus.pt/dashboard/stores/12345`, o Store ID e `12345`

### Register ID (ID do Terminal/Caixa)

1. No dashboard Vendus, vai a **Definicoes** > **Terminais** (ou **Caixas Registadoras**)
2. Seleciona o terminal pretendido
3. O **Register ID** aparece no URL: `vendus.pt/dashboard/registers/{REGISTER_ID}`
   - Tambem pode aparecer como campo "ID" nos detalhes do terminal
4. Exemplo: se o URL e `vendus.pt/dashboard/registers/67890`, o Register ID e `67890`

### Alternativa: Via API

Podes obter os IDs via API:

```bash
# Listar lojas
curl -u API_KEY: https://www.vendus.pt/ws/v1.2/stores/

# Listar terminais de uma loja
curl -u API_KEY: https://www.vendus.pt/ws/v1.2/stores/{STORE_ID}/registers/
```

> **Importante**: Cada restaurante/localizacao pode ter um Store ID e Register ID diferentes. Por isso, estes valores sao configurados **por local** no admin, e nao como variavel de ambiente global.

---

## Migracoes de Base de Dados

Precisas de aplicar 4 migracoes pela seguinte ordem:

| # | Ficheiro | O que faz |
|---|----------|-----------|
| 046 | `046_vendus_integration.sql` | Tabelas core: `payment_methods`, `invoices`, `vendus_sync_log`, `vendus_retry_queue`. Colunas vendus em `products`, `tables`, `locations` |
| 047 | `047_vendus_categories.sql` | Coluna `vendus_id` em `categories` |
| 048 | `048_locations_flexible.sql` | Remove constraint de slugs fixos (permite mais restaurantes) |
| 049 | `049_products_location.sql` | Coluna `location_id` em `products`, view `products_with_vendus_status` |

### Como Aplicar

**Opcao A: Script consolidado (recomendado para producao)**

1. Abre o [SQL Editor do Supabase](https://supabase.com/dashboard/project/_/sql/new)
2. Cola o conteudo de `supabase/scripts/apply-vendus-to-prod.sql`
3. Executa — e idempotente e seguro para correr varias vezes


**Opcao B: Via Supabase CLI (requer Docker)**

```bash
npx supabase db push
```

### Verificacao

Apos aplicar, verifica que as tabelas existem:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('payment_methods', 'invoices', 'vendus_sync_log', 'vendus_retry_queue', 'locations');

-- Verificar colunas vendus em products
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name LIKE 'vendus_%';

-- Verificar colunas vendus em locations
SELECT column_name FROM information_schema.columns
WHERE table_name = 'locations' AND column_name LIKE 'vendus_%';
```

---

## Exportar Produtos para o Vendus

### Primeiro Export (Recomendado)

1. Vai a `/admin/vendus/sync`
2. Seleciona a localizacao
3. Clica em **"Exportar tudo"** — envia TODOS os produtos e categorias para o Vendus
4. Acompanha o progresso no log de sincronizacao

### Exports Seguintes

- **"Exportar para Vendus"**: Envia apenas produtos com status `pending` ou `null`
- **"Exportar categorias"**: Envia apenas categorias (util antes do primeiro export de produtos)

### Ordem de Sincronizacao

1. Categorias sao **sempre exportadas primeiro** (automaticamente)
2. Produtos sao exportados depois, ja com a referencia da categoria no Vendus

### API

```
POST /api/vendus/sync/products
```

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `locationSlug` | string | `circunvalacao`, `boavista`, etc. |
| `direction` | `push` | Exportar para Vendus |
| `pushAll` | boolean | `true` para enviar todos (ignorar status) |
| `syncCategoriesFirst` | boolean | Default: `true` |

```
POST /api/vendus/sync/categories
```

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `locationSlug` | string | Localizacao |

---

## Importar Produtos do Vendus

### Pre-visualizacao

1. Vai a `/admin/vendus/sync`
2. Seleciona **"Pre-visualizar importacao"**
3. O sistema mostra quantos produtos seriam criados, atualizados, e conflitos
4. Confirma ou cancela

### Resolucao de Conflitos

Quando um produto foi alterado tanto localmente como no Vendus desde a ultima sync:
- **Regra**: O mais recente ganha (baseado em `updated_at`)
- **Avisos**: Cada conflito gera um aviso com detalhes

### API

```
POST /api/vendus/sync/products
```

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `locationSlug` | string | Localizacao |
| `direction` | `pull` | Importar do Vendus |
| `previewOnly` | boolean | `true` para ver sem aplicar |
| `defaultCategoryId` | string | Categoria para novos produtos |

---

## Faturacao

### Fluxo de Faturacao

```
Sistema Local                         Vendus
    |                                    |
    |  1. Fechar conta (dados sessao)    |
    | ---------------------------------> |
    |                                    |  2. Cria fatura certificada AT
    |                                    |     (numeracao, hash SAFT)
    |  3. Recebe referencia              |
    | <--------------------------------- |
    |                                    |
    |  4. Guarda referencia local        |
    |     (vendus_id, doc_number, etc.)  |
    |                                    |
```

### Tipos de Documento

| Tipo | Codigo | Quando |
|------|--------|--------|
| Fatura Simplificada | `FS` | Sem NIF do cliente |
| Fatura-Recibo | `FR` | Com NIF do cliente |

### Metodos de Pagamento

Configurados na tabela `payment_methods`:
- Dinheiro (cash)
- Multibanco (card)
- MB Way (mbway)
- Transferencia (transfer)

Cada metodo pode ter um `vendus_id` para mapear com o Vendus.

### API

```
POST /api/vendus/invoices
```

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `sessionId` | string | ID da sessao a faturar |
| `locationSlug` | string | Localizacao |
| `paymentMethodId` | number | Metodo de pagamento |
| `customerNif` | string | NIF do cliente (opcional) |
| `customerName` | string | Nome do cliente (opcional) |

### Retry Queue

Operacoes falhadas (erros de rede, timeout, etc.) sao automaticamente colocadas numa fila de retry:
- Backoff exponencial (1s, 2s, 4s, 8s, 16s)
- Maximo 5 tentativas
- Apos 5 falhas: marcado como `failed`

---

## Impressao de Cozinha

Feature **opcional e nao-bloqueante**. Se o Vendus nao estiver configurado, a funcao retorna sucesso sem fazer nada.

### Funcionalidades

- Envio de pedidos para impressoras de cozinha via Vendus
- Listagem de impressoras disponiveis
- Erros sao capturados e logged, nunca bloqueiam o fluxo

### API

Chamado internamente quando pedidos sao enviados para a cozinha.

---

## Sincronizacao Automatica (Cron)

### Configuracao no Vercel

1. Adiciona `CRON_SECRET` nas Environment Variables do Vercel
2. O ficheiro `vercel.json` ja inclui a configuracao do cron
3. O endpoint `/api/cron/vendus-sync` e chamado automaticamente

### O que o Cron faz

1. Busca todas as localizacoes com Vendus ativo
2. Para cada localizacao:
   - Processa a retry queue (operacoes falhadas)
   - Pode executar sync incremental (produtos alterados)

---

## Ambientes e Autenticacao

### Gestao de Ambientes

O ambiente e controlado por `NEXT_PUBLIC_APP_ENV` (definido via npm scripts):

| Comando | Ambiente | Auth | Supabase |
|---------|----------|------|----------|
| `npm run dev` | development | Legacy (staff table) | _DEV credentials |
| `npm run dev:prod` | production | Supabase Auth | Standard credentials |
| `npm run build` | production | Supabase Auth | Standard credentials |
| `npm run start` | production | Supabase Auth | Standard credentials |

### Setup de Autenticacao para Producao

Em modo producao, o login usa **Supabase Auth**. Cada utilizador precisa de:

1. **User no Supabase Auth** — Criar em Authentication > Users no dashboard
2. **Ligacao ao staff** — `staff.auth_user_id` = UUID do auth user

```sql
-- 1. Verificar auth user criado
SELECT id, email FROM auth.users WHERE email = 'user@restaurante.pt';

-- 2. Ligar ao staff
UPDATE staff SET auth_user_id = 'UUID-DO-AUTH-USER'
WHERE email = 'user@restaurante.pt';
```

### Indicador DEV

Em modo development, aparece um badge "DEV" no canto inferior esquerdo do admin.

---

## Resolucao de Problemas

### "VENDUS_API_KEY not configured"

- Verifica que `VENDUS_API_KEY` esta no `.env.local`
- Reinicia o servidor Next.js (`npm run dev`)

### "Store ID ou Register ID em falta"

- Vai a `/admin/vendus/locations`
- Edita a localizacao e preenche os campos
- Verifica que "Vendus Ativo" esta marcado

### "Vendus API error 401 (Unauthorized)"

- API Key invalida ou expirada
- Gera uma nova em `vendus.pt/dashboard/settings/api`

### "Vendus API error 429 (Rate Limited)"

- Muitas chamadas por minuto (limite: 60/min)
- O sistema tem rate limiting integrado — aguarda automaticamente
- Se persistir, reduz a frequencia de operacoes

### "Utilizador nao tem permissoes de staff"

- Login via Supabase Auth funcionou, mas `staff.auth_user_id` nao corresponde ao UUID do auth user
- Verifica: `SELECT auth_user_id FROM staff WHERE email = '...'`
- Verifica: `SELECT id FROM auth.users WHERE email = '...'`
- Os UUIDs tem de ser iguais

### "Demasiadas tentativas" (Rate Limited)

- Limpar rate limits: `DELETE FROM auth_rate_limits WHERE identifier LIKE '%email%'`

### "Nao autenticado" nas API routes (401)

- Em modo producao, o login precisa de criar o cookie JWT
- Faz logout e login novamente (corrigido em secure-login/route.ts)

### "HTTP 403" ao exportar para Vendus

- A API key nao tem permissao de escrita
- Verifica permissoes em vendus.pt/dashboard/settings/api
- Importacao (pull) so precisa de leitura; exportacao (push) precisa de escrita

### "product.id.substring is not a function"

- O `product.id` e INTEGER (nao UUID) — corrigido com `String(product.id)`

### Produtos nao aparecem no Vendus apos export

1. Verifica o sync log em `/admin/vendus`
2. Verifica se ha erros na retry queue
3. Confirma que a categoria existe no Vendus (exportar categorias primeiro)

### Faturas com erro

1. Verifica o status em `/admin/vendus/invoices`
2. Erros de rede sao automaticamente colocados na retry queue
3. Erros de validacao (400) nao sao retried — corrige os dados e tenta novamente

---

## Arquitetura Tecnica

### Modulos

```
src/lib/vendus/
├── __tests__/              # 131 testes (88% cobertura)
│   ├── client.test.ts      # 35 testes - HTTP client, retry, errors
│   ├── config.test.ts      # 21 testes - Configuracao, constantes
│   ├── invoices.test.ts    # 27 testes - Faturacao, retry queue
│   ├── tables.test.ts      # 17 testes - Import de mesas
│   ├── kitchen.test.ts     # 12 testes - Impressao cozinha
│   ├── products.test.ts    # 15 testes - Sync push/pull
│   └── categories.test.ts  #  4 testes - Sync categorias
├── client.ts               # HTTP client com retry e rate limiting
├── config.ts               # Configuracao e constantes (taxas IVA, etc.)
├── invoices.ts             # Criacao/anulacao de faturas
├── products.ts             # Sync bidirecional de produtos
├── categories.ts           # Sync de categorias
├── tables.ts               # Import de mesas/rooms
├── kitchen.ts              # Impressao de cozinha
├── index.ts                # Re-exports
└── types.ts                # Tipos TypeScript
```

### Paginas Admin

```
/admin/vendus/              # Dashboard principal
/admin/vendus/locations     # Configuracao por local (Store ID, Register ID)
/admin/vendus/sync          # Sincronizacao de produtos
/admin/vendus/invoices      # Listagem de faturas
/admin/vendus/mapping       # Mapeamento de mesas
```

### API Routes

```
POST /api/vendus/sync/products      # Sync produtos (push/pull/both)
POST /api/vendus/sync/categories    # Sync categorias
POST /api/vendus/sync/tables        # Import mesas
POST /api/vendus/invoices           # Criar fatura
GET  /api/vendus/invoices           # Listar faturas
GET  /api/cron/vendus-sync          # Cron job automatico
GET  /api/locations                 # Listar localizacoes
PATCH /api/locations/:slug          # Atualizar localizacao
```

### Tabelas de Base de Dados

| Tabela | Descricao |
|--------|-----------|
| `locations` | Localizacoes com `vendus_store_id`, `vendus_register_id`, `vendus_enabled` |
| `products` | Colunas `vendus_id`, `vendus_reference`, `vendus_tax_id`, `vendus_sync_status` |
| `categories` | Coluna `vendus_id` para mapeamento |
| `tables` | Colunas `vendus_table_id`, `vendus_room_id` |
| `payment_methods` | Metodos de pagamento com `vendus_id` opcional |
| `invoices` | Faturas com referencia Vendus (`vendus_id`, `vendus_document_number`, etc.) |
| `vendus_sync_log` | Log de todas as operacoes de sincronizacao |
| `vendus_retry_queue` | Fila de retry para operacoes falhadas |

### Constantes

| Constante | Valor | Descricao |
|-----------|-------|-----------|
| IVA Normal | 23% | Taxa `1` no Vendus |
| IVA Intermedio | 13% | Taxa `2` no Vendus |
| IVA Reduzido | 6% | Taxa `3` no Vendus |
| IVA Isento | 0% | Taxa `4` no Vendus |
| Rate Limit | 60/min | Limite de chamadas API |
| Retry Max | 5 | Tentativas maximas na retry queue |
| Timeout | 30s | Timeout por chamada API |

---

## Testes

### Executar

```bash
# Todos os testes
npm run test:run

# Apenas testes Vendus
npx vitest run src/lib/vendus/__tests__/

# Com cobertura
npx vitest run --coverage
```

### Cobertura Atual

- **131 testes** nos modulos Vendus
- **88% cobertura** (statements)
- Todos os modulos testados: client, config, invoices, products, categories, tables, kitchen

---

**Ultima atualizacao:** 2026-02-19
