# Integração Vendus - Sincronização de Produtos e Categorias

Este documento descreve o fluxo de sincronização bidirecional entre o sistema local (Supabase) e o Vendus POS.

## Índice

1. [Visão Geral](#visão-geral)
2. [Configuração](#configuração)
3. [Fluxos Disponíveis](#fluxos-disponíveis)
4. [Modo de Pré-visualização](#modo-de-pré-visualização)
5. [Resolução de Conflitos](#resolução-de-conflitos)
6. [APIs](#apis)
7. [Testes](#testes)

---

## Visão Geral

A integração suporta:

- **Exportar (Push)**: Produtos e categorias locais → Vendus
- **Importar (Pull)**: Produtos do Vendus → Local (cria novos, atualiza existentes)
- **Sincronização bidirecional** com deteção de conflitos e modo de confirmação

### Ordem de Sincronização

Ao exportar produtos, as **categorias são sempre exportadas primeiro**, garantindo que existam no Vendus antes de associar produtos.

---

## Configuração

### Variáveis de Ambiente

```
VENDUS_API_KEY=           # API key do Vendus (obrigatória)
```

Store ID e Register ID são configurados **por localização no admin** (Admin > Vendus > Locais).
Isto permite adicionar mais restaurantes sem alterar variáveis de ambiente.

### Migração

Execute a migração para adicionar as colunas Vendus:

```bash
supabase db push
# ou
supabase migration up
```

---

## Fluxos Disponíveis

### 1. Exportar Categorias

Exporta apenas as categorias locais para o Vendus. Necessário antes da primeira exportação de produtos.

- **UI**: Botão "Exportar categorias"
- **API**: `POST /api/vendus/sync/categories`

### 2. Exportar para Vendus (Push)

Envia produtos pendentes para o Vendus. Inclui automaticamente as categorias.

- **UI**: Botão "Exportar para Vendus"
- **Produtos**: Apenas os com `vendus_sync_status` = `pending` ou `null`

### 3. Exportar Tudo

Envia **todos** os produtos, independentemente do estado de sincronização. Útil para testes ou conta Vendus vazia.

- **UI**: Botão "Exportar tudo"
- **Parâmetro**: `pushAll: true`

### 4. Importar do Vendus (Pull)

Importa produtos do Vendus para o sistema local:

- **Produtos existentes** (match por `vendus_id` ou nome): atualiza campos Vendus + `name`, `price`, `description`, `is_available`
- **Produtos novos**: cria no Supabase usando a **primeira categoria** (ou `defaultCategoryId`)

### 5. Sincronização Completa (Both)

Executa push + pull numa única operação. Recomendado apenas após validação manual.

---

## Modo de Pré-visualização

Antes de alterar dados locais (Pull), é possível **pré-visualizar** as alterações:

1. Clicar em **"Pré-visualizar importação"**
2. O sistema analisa os produtos do Vendus e devolve:
   - Quantos seriam **criados**
   - Quantos seriam **atualizados**
   - **Conflitos** (ambos alterados desde a última sync)
3. Clicar em **"Confirmar importação"** para aplicar, ou **"Cancelar"** para desistir

### Parâmetros da API

```json
{
  "locationSlug": "circunvalacao",
  "direction": "pull",
  "previewOnly": true,
  "defaultCategoryId": "uuid-opcional"
}
```

---

## Resolução de Conflitos

Quando **produto local** e **produto Vendus** foram alterados desde a última sincronização:

- **Regra**: O mais recente ganha (baseado em `updated_at` / `vendus_updated_at`)
- **Avisos**: Cada conflito resolvido gera um aviso em `result.warnings`
- **Registo**: Inclui timestamps e qual fonte foi usada (`vendus_wins` ou `local_wins`)

### Exemplo de Aviso

```
Conflito em "Coca-Cola": ambos alterados. Usado: Vendus (mais recente)
```

---

## APIs

### `POST /api/vendus/sync/products`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `locationSlug` | string | `circunvalacao` ou `boavista` |
| `direction` | string | `push`, `pull` ou `both` |
| `pushAll` | boolean | Enviar todos os produtos (ignorar status) |
| `previewOnly` | boolean | Não aplicar alterações, devolver preview |
| `defaultCategoryId` | string | Categoria para novos produtos (pull) |
| `syncCategoriesFirst` | boolean | Exportar categorias antes (default: true) |

### `POST /api/vendus/sync/categories`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `locationSlug` | string | Localização |

---

## Testes

### Executar

```bash
npm run test          # Modo watch
npm run test:run      # Single run
npm run test:coverage # Com cobertura
```

### Cobertura

- **Produtos**: Criação, atualização, conflitos, preview, ausência de categoria
- **Categorias**: Criação, match por nome, lista vazia, config inválida

### Estrutura

```
src/lib/vendus/
├── __tests__/
│   ├── products.test.ts
│   └── categories.test.ts
├── products.ts
├── categories.ts
├── client.ts
└── types.ts
```
