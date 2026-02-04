# Análise: Tipos Supabase vs tipos manuais

Resumo do que está em duplicado, o que está a mais e o que deves resolver para usar os tipos gerados pelo Supabase como fonte de verdade.

---

## 1. Estado atual

| Ficheiro | Origem | Conteúdo |
|----------|--------|----------|
| **`src/types/supabase.ts`** | Gerado por `npm run supabase:types` | Schema real da BD: `Database`, todas as tabelas/views com Row/Insert/Update, helpers (`Tables<>`, etc.). |
| **`src/types/database.ts`** | Manual (~913 linhas) | Outra definição de `Database` + tipos de aplicação (AuthUser, Reservation, WaiterCall, etc.). |
| **`src/types/tables.ts`** | Manual | `Table`, `TableInsert`, `TableUpdate`, `TableLocation`, `LOCATION_LABELS`. Só usado em `lib/qrcode.ts`. |
| **`src/types/api.ts`** | Manual | Tipos de API/hooks; importa de `database.ts`. |

Os clientes Supabase usam **`Database` de `@/types/database`**, não de `supabase.ts`:

- `src/lib/supabase/client.ts` → `import type { Database } from "@/types/database"`
- `src/lib/supabase/server.ts` → idem

Ou seja: o tipo do cliente não está alinhado com o schema real (supabase.ts).

---

## 2. O que está duplicado / a mais

### 2.1 Duplicado entre `supabase.ts` e `database.ts`

- **`Json`** – igual nos dois; basta exportar de um sítio.
- **`Database`** – definição completa da BD está nos dois. A versão em `database.ts` é manual e **não reflete** todas as tabelas/views do Supabase (ex.: views como `reservations_with_details`, `waiter_calls_with_details`). A fonte de verdade deve ser `supabase.ts`.
- **Tabelas base** – em `database.ts` tens helpers que espelham tabelas:
  - `Category`, `CategoryInsert`, `CategoryUpdate`
  - `TableBase`, `TableInsert`, `TableUpdate`, `Table` (com extensões)
  - `Product`, `ProductInsert`, `ProductUpdate`
  - `SessionBase`, `SessionInsert`, `SessionUpdate`, `Session` (com extensões)
  - `Order`, `OrderInsert`, `OrderUpdate`
  - `Tables<T>` (helper genérico)

No schema gerado (`supabase.ts`) já tens `Database["public"]["Tables"]["X"]["Row"]` (e Insert/Update) para todas as tabelas. Ou seja: a definição “base” das tabelas está **duplicada**; o que faz sentido é derivar estes tipos a partir de `supabase.ts`.

### 2.2 Duplicado com `tables.ts`

- **`Table`**, **`TableInsert`**, **`TableUpdate`** – existem em `database.ts` (derivados do `Database` manual) e de forma muito parecida em `tables.ts` (com campos como `qr_code_*`).
- **`TableLocation`** em `tables.ts` é o mesmo conceito que **`Location`** em `database.ts` (`"circunvalacao" | "boavista"`).

Ou seja: há dois sítios a definir “mesa” e “localização”; convém ter **uma única fonte** (idealmente a partir do schema gerado + extensões só onde precisares).

### 2.3 Enums

- **`database.ts`** define manualmente: `SessionStatus`, `OrderStatus`, `TableStatus` e usa-os em `Database["public"]["Enums"]`.
- **`supabase.ts`** gerado tem `Enums: { [_ in never]: never }` (vazio). Isso costuma acontecer quando os enums na BD estão como `text`/`varchar` em vez de tipo ENUM do Postgres. Os teus valores (“active”, “pending”, etc.) continuam corretos; só não estão como tipo ENUM na BD.

Não precisas de “remover” estes enums; faz sentido **manter** `SessionStatus` e `OrderStatus` na aplicação (em `database.ts` ou noutro ficheiro de tipos de app), possivelmente derivando ou alinhando com os valores que a BD realmente usa.

---

## 3. Diferença crítica: tipos de IDs (string vs number)

No **schema gerado** (`supabase.ts`), a BD real usa:

- **`id: number`** em: `activity_log`, `cart_items`, `categories`, `orders`, `products`, `tables`, `waiter_tables`, `restaurant_closures`, `session_participants`, etc.
- **`id: string`** em: `customers`, `email_events`, `reservations`, `session_customers`, `sessions`, `staff`, `waiter_calls`.

No **`database.ts`** manual:

- Várias tabelas estão com **`id: string`** onde a BD tem **number** (ex.: `categories`, `tables`, `products`, `orders`).

Consequência: se o código (e hooks/API) foram escritos a assumir `table.id` ou `order.id` como `string`, ao passares a usar os tipos de `supabase.ts` vais encontrar erros de tipo (esperado `string`, recebido `number`). Para “resolver no projeto” tens duas vias:

1. **Ajustar o código** – Onde a BD tem `id: number`, passar a usar `number` (ex.: `table.id`, `order.id`) e converter para string só quando for para UI/URLs se fizer sentido.
2. **Ou** confirmar na BD se realmente queres UUID/string nalgumas tabelas e alterar a BD (e voltar a gerar tipos); aí o `supabase.ts` passaria a refletir string.

Recomendação: **tratar o `supabase.ts` como verdade** e alterar o código para os tipos corretos (number onde a BD é number).

---

## 4. O que deve ficar em cada ficheiro

### 4.1 `src/types/supabase.ts` (gerado – não editar à mão)

- Manter como está.
- Ser a **única** fonte para o tipo `Database` e para Row/Insert/Update das tabelas/views.
- Regerar com `npm run supabase:types` sempre que alterares o schema na BD.

### 4.2 `src/types/database.ts` – o que **remover** e o que **manter**

**Remover (está em `supabase.ts` ou é redundante):**

- Definição manual completa de `Database` (todo o bloco `export type Database = { ... }`).
- Definição de `Json` (pode ser re-exportada de `supabase.ts`).
- Definições manuais de Row/Insert/Update para tabelas que já existem no schema gerado (categories, tables, products, sessions, orders, staff, roles, waiter_tables, customers, activity_log) – substituir por tipos derivados de `supabase.ts`.

**Manter em `database.ts` (tipos de aplicação / extensões):**

- Enums de app: `SessionStatus`, `OrderStatus`, `TableStatus` (ou alinhar com a BD).
- **Tipos derivados do `Database` de supabase**, por exemplo:
  - `Category = Database["public"]["Tables"]["categories"]["Row"]` (e Insert/Update), e o mesmo para tables, products, sessions, orders, etc., usando o `Database` importado de `@/types/supabase`.
- Extensões que não são só “cópia” da BD:
  - `Table` = tipo base de tabela + `status?`, `status_note?`, `current_session_id?`, etc.
  - `TableFullStatus`, `Session` (com campos de métricas), `SessionWithOrders`, `ProductWithCategory`, `OrderWithProduct`.
- Tudo o que é **só da aplicação** (não espelhado na BD):
  - `RoleName`, `Location`, `AuthUser`, `Staff`, `StaffWithRole`, `WaiterCall`, `WaiterCallWithDetails`, `Reservation`, `ReservationWithDetails`, `RestaurantClosure`, `SessionCustomer`, `SessionWithCustomers`, `WaiterCallType`, `WaiterCallStatus`, etc.

Ou seja: `database.ts` deixa de definir o schema da BD e passa a **importar `Database` (e eventualmente `Json`) de `supabase.ts`** e a exportar helpers + tipos de domínio/extensões.

### 4.3 `src/types/tables.ts`

- **Opção A (recomendada):** Unificar com `database.ts`.
  - Remover definições duplicadas de `Table`, `TableInsert`, `TableUpdate`.
  - Manter só `TableLocation` (ou renomear para `Location` e usar o de `database.ts`) e `LOCATION_LABELS`.
  - Ou mover `LOCATION_LABELS` para um ficheiro de constants/i18n e deixar só o tipo `TableLocation`/`Location` num sítio.
- **Opção B:** Manter `tables.ts` só com `TableLocation` e `LOCATION_LABELS`, e garantir que `Table`/`TableInsert`/`TableUpdate` vêm todos de `database.ts` (que por sua vez derivam de `supabase.ts`).

Assim evitas ter “mesa” e “localização” definidos em dois sítios.

### 4.4 `src/types/api.ts`

- Manter; continua a importar de `database.ts`.
- Quando `database.ts` passar a derivar de `supabase.ts`, os tipos que `api.ts` usa (Product, Order, Session, Table, OrderStatus, etc.) passarão a ser os corretos em relação à BD.

---

## 5. Passos concretos para resolver

1. **Clientes Supabase usarem o tipo gerado**
   - Em `src/lib/supabase/client.ts` e `server.ts`: trocar  
     `import type { Database } from "@/types/database"`  
     por  
     `import type { Database } from "@/types/supabase"`.
   - Isto alinha o cliente com o schema real. Pode expor erros de tipo (ex.: `id` number vs string); trata-os nesse momento.

2. **`database.ts` deixar de definir `Database` e `Json`**
   - Importar `Database` e `Json` de `@/types/supabase`.
   - Substituir os tipos de tabelas base por aliases ao `Database` gerado, por exemplo:
     - `Category = Database["public"]["Tables"]["categories"]["Row"]`
     - E o mesmo para Insert/Update e para as outras tabelas que usas.
   - Manter todos os tipos de aplicação (AuthUser, Reservation, WaiterCall, views, etc.) e extensões (Table com status, Session com métricas, etc.).

3. **Unificar `tables.ts` com `database.ts`**
   - Escolher um sítio para `TableLocation`/`Location` e para `LOCATION_LABELS`.
   - Em `lib/qrcode.ts` (e qualquer outro que use `tables.ts`) passar a importar de `database.ts` (ou do módulo de constantes, se moveres as labels).

4. **IDs: number vs string**
   - Onde o código assumir `string` e a BD for `number`, ajustar:
     - Tipos (usar o tipo de `supabase.ts`).
     - Código que passa ou compara `id` (ex.: URLs com `table.id` podem precisar de `String(table.id)` ou rotas com `[numero]` em vez de `[id]`).
   - Fazer uma passagem por ficheiros que usam `table.id`, `order.id`, `product.id`, `category.id` e alinhar com o schema gerado.

5. **Regenerar tipos**
   - Após mudanças no schema na BD, correr sempre `npm run supabase:types` e, se necessário, atualizar em `database.ts` apenas as extensões/views que dependam de colunas renomeadas ou novas.

---

## 6. Resumo

| O quê | Onde está a mais / repetido | O que fazer |
|------|-----------------------------|------------|
| `Database` | `database.ts` (manual) vs `supabase.ts` (gerado) | Usar só o de `supabase.ts`; clientes importam de `@/types/supabase`. |
| `Json` | Ambos | Manter só em `supabase.ts`; re-exportar em `database.ts` se precisares. |
| Row/Insert/Update das tabelas | `database.ts` (manual) | Derivar de `Database` de `supabase.ts` (aliases). |
| `Table` / `TableInsert` / `TableUpdate` | `database.ts` e `tables.ts` | Uma única fonte (derivada de supabase + extensões em `database.ts`); `tables.ts` só Location + labels ou remover. |
| `Location` / `TableLocation` | `database.ts` e `tables.ts` | Unificar num sítio. |
| Tipos de aplicação (AuthUser, Reservation, WaiterCall, etc.) | Só em `database.ts` | Manter em `database.ts`; não estão a mais. |
| IDs (string vs number) | Código assume string; BD tem number em várias tabelas | Alinhar código com `supabase.ts` (usar number onde a BD é number). |

Com isto ficas com:

- **Uma** fonte de verdade para o schema (supabase.ts).
- **Um** sítio para tipos de domínio e extensões (database.ts), sem duplicar a estrutura da BD.
- **Sem** duplicação entre tables.ts e database.ts para mesa/localização.
- Código e clientes Supabase alinhados com os tipos gerados.

Se quiseres, no próximo passo podemos fazer apenas a troca do `Database` nos clientes e a importação em `database.ts` (passos 1 e 2), e depois tratar dos IDs e de `tables.ts` em passos separados.
