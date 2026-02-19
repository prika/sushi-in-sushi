# Testes Pós-Migrations 039 e 043 ✅

Data: 2026-02-17
Migrations aplicadas: 039 (ordering_mode) e 043 (close_session)

---

## 📋 Checklist de Testes

### 1️⃣ Verificação Técnica (Database)

**Script criado:** [`/supabase/scripts/verify_migrations.sql`](supabase/scripts/verify_migrations.sql)

**Como executar:**
1. Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new)
2. Copiar conteúdo de `verify_migrations.sql`
3. Executar
4. Verificar que ambos retornam ✅:
   - ✅ Migration 039: ordering_mode column exists
   - ✅ Migration 043: close_session_and_free_table function exists

**Resultados Esperados:**
- ✅ Coluna `ordering_mode` existe em `sessions`
- ✅ Default é `'client'`
- ✅ Constraint CHECK aceita apenas `'client'` ou `'waiter_only'`
- ✅ Index `idx_sessions_ordering_mode` criado
- ✅ RLS policy criada para staff
- ✅ Função `close_session_and_free_table` existe
- ✅ Permissões EXECUTE para `authenticated` e `anon`

---

### 2️⃣ Funcionalidade: Controlo de Pedidos (Ordering Mode)

#### Teste 1: Waiter Alterna para Modo Bloqueio

**Setup:**
1. Login como waiter
2. Ir para `/waiter`
3. Clicar numa mesa com sessão ativa
4. Ir para `/waiter/mesa/[id]`

**Ações:**
1. Verificar botão de ordering mode aparece
   - Se `'client'`: Botão verde 🔓 "Cliente pode pedir"
   - Se `'waiter_only'`: Botão vermelho 🔒 "Apenas empregado"

2. Clicar no botão

3. Modal de confirmação aparece:
   - Título: "Ativar Modo Bloqueio?" ou "Desativar Modo Bloqueio?"
   - Mensagem explicativa
   - Botões: "Confirmar" e "Cancelar"

4. Clicar "Confirmar"

5. Verificar mudança visual:
   - Botão muda de cor (verde ↔ vermelho)
   - Ícone muda (🔓 ↔ 🔒)
   - Texto muda

**Resultado Esperado:**
- ✅ Modal aparece
- ✅ Após confirmar, botão muda instantaneamente
- ✅ Sem erros no console
- ✅ Activity log registado (verificar em `/admin`)

**Verificar no DB:**
```sql
SELECT id, table_id, ordering_mode, started_at
FROM sessions
WHERE status = 'active'
ORDER BY started_at DESC
LIMIT 1;
-- ordering_mode deve ter mudado
```

---

#### Teste 2: Cliente Vê Banner de Bloqueio

**Setup:**
1. Waiter ativa modo `'waiter_only'` (Teste 1)
2. Cliente acede mesa via QR code `/mesa/[numero]`

**Resultado Esperado:**
- ✅ Banner vermelho aparece no topo:
  - Ícone: 🔒
  - Título: "Pedidos Bloqueados"
  - Mensagem: "O empregado está a gerir os pedidos..."

**Ações no Cliente:**
1. Navegar para tab "Menu"
2. Tentar clicar em "Adicionar ao Carrinho"

**Resultado Esperado:**
- ✅ Botões "Adicionar" estão desabilitados
- ✅ Mostram "🔒 Bloqueado"
- ✅ Cursor muda para `not-allowed`
- ✅ Click não faz nada

3. Navegar para tab "Carrinho" (se tiver itens de antes)
4. Tentar clicar "Enviar Pedido"

**Resultado Esperado:**
- ✅ Botão "Enviar Pedido" está desabilitado
- ✅ Mostra "🔒 Pedidos Bloqueados"
- ✅ Não consegue submeter

---

#### Teste 3: Real-time Sync (Waiter ↔ Cliente)

**Setup:**
1. Abrir 2 dispositivos/janelas:
   - Dispositivo A: Waiter em `/waiter/mesa/[id]`
   - Dispositivo B: Cliente em `/mesa/[numero]` (mesma mesa)

2. Estado inicial: `ordering_mode = 'client'`

**Ações:**
1. No Dispositivo A (Waiter): Ativar modo bloqueio
2. Observar Dispositivo B (Cliente)

**Resultado Esperado:**
- ✅ Dispositivo B atualiza INSTANTANEAMENTE (< 2 segundos)
- ✅ Banner vermelho aparece
- ✅ Botões ficam desabilitados
- ✅ Notificação toast aparece (opcional)

3. No Dispositivo A (Waiter): Desativar modo bloqueio
4. Observar Dispositivo B (Cliente)

**Resultado Esperado:**
- ✅ Dispositivo B atualiza INSTANTANEAMENTE
- ✅ Banner desaparece
- ✅ Botões voltam a funcionar
- ✅ Notificação toast aparece (opcional)

**Se falhar:**
- Verificar console para erros de subscription
- Verificar que Supabase Realtime está ativo
- Verificar filtro: `id=eq.${session.id}`

---

#### Teste 4: Validação API

**Setup:**
1. Obter `session_id` de uma sessão ativa
2. Login como waiter (obter cookie de auth)

**Teste 4.1: Update para waiter_only**
```bash
curl -X PATCH https://[seu-dominio]/api/sessions/[session-id]/ordering-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie-de-auth]" \
  -d '{"orderingMode":"waiter_only"}'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "session": {
    "id": "...",
    "orderingMode": "waiter_only",
    ...
  }
}
```

**Teste 4.2: Update para client**
```bash
curl -X PATCH https://[seu-dominio]/api/sessions/[session-id]/ordering-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie-de-auth]" \
  -d '{"orderingMode":"client"}'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "session": {
    "id": "...",
    "orderingMode": "client",
    ...
  }
}
```

**Teste 4.3: Modo inválido**
```bash
curl -X PATCH https://[seu-dominio]/api/sessions/[session-id]/ordering-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie-de-auth]" \
  -d '{"orderingMode":"invalid"}'
```

**Resultado Esperado:**
```json
{
  "error": "Invalid ordering mode. Must be \"client\" or \"waiter_only\""
}
```
**Status:** 400

**Teste 4.4: Sem autenticação**
```bash
curl -X PATCH https://[seu-dominio]/api/sessions/[session-id]/ordering-mode \
  -H "Content-Type: application/json" \
  -d '{"orderingMode":"waiter_only"}'
```

**Resultado Esperado:**
```json
{
  "error": "Não autenticado"
}
```
**Status:** 401

---

### 3️⃣ Funcionalidade: Sair da Mesa (Close Session)

#### Teste 5: Cliente Sai da Mesa (Sem Consumo)

**Setup:**
1. Cliente acede mesa via QR code
2. Waiter inicia sessão walk-in (ou sessão já existe)
3. Cliente NÃO fez nenhum pedido
4. Total da conta: €0.00

**Ações:**
1. No cliente, navegar para tab "Conta"
2. Verificar botão "Sair da Mesa" aparece
3. Clicar em "Sair da Mesa"
4. Modal de confirmação aparece
5. Clicar "Confirmar"

**Resultado Esperado:**
- ✅ Modal aparece com aviso
- ✅ Após confirmar: mensagem de sucesso
- ✅ Cliente é redirecionado para tela inicial
- ✅ Sessão é fechada (`status = 'closed'`)
- ✅ Mesa fica livre (`current_session_id = NULL`)

**Verificar no DB:**
```sql
-- Verificar sessão fechada
SELECT id, status, closed_at
FROM sessions
WHERE id = '[session-id]';
-- status deve ser 'closed'
-- closed_at deve estar preenchido

-- Verificar mesa livre
SELECT id, number, current_session_id
FROM tables
WHERE id = '[table-id]';
-- current_session_id deve ser NULL
```

**Verificar no Admin:**
1. Ir para `/admin/mesas`
2. Ver mesa em questão
3. Status deve ser "🟢 Livre"

---

#### Teste 6: Cliente NÃO Pode Sair (Com Consumo)

**Setup:**
1. Cliente em mesa com sessão ativa
2. Cliente fez pedidos
3. Total da conta: > €0.00

**Ações:**
1. Navegar para tab "Conta"
2. Verificar se botão "Sair da Mesa" aparece

**Resultado Esperado:**
- ✅ Botão NÃO aparece
- ✅ Apenas botão "Pedir Conta" visível

**Teste Adicional (API):**
```bash
# Tentar forçar saída via API (não deve funcionar)
curl -X POST https://[seu-dominio]/api/sessions/[session-id]/close \
  -H "Content-Type: application/json"
```

**Resultado Esperado:**
- Erro: "Não pode sair da mesa com pedidos"
- Status: 400

---

#### Teste 7: Cliente NÃO Pode Sair (Pedidos Pendentes)

**Setup:**
1. Cliente em mesa
2. Total: €0.00
3. Mas há pedidos com status `'pending'` ou `'preparing'`

**Ações:**
1. Navegar para tab "Conta"
2. Verificar botão

**Resultado Esperado:**
- ✅ Botão NÃO aparece (ou está desabilitado)
- ✅ Se tentar forçar: erro "Não pode sair da mesa com pedidos"

---

### 4️⃣ Diagnóstico de Mesas (Opcional)

**Se encontrar problemas, executar:**

```sql
-- Copiar SEÇÃO 2.4 do CONSOLIDADO_diagnostico_e_fixes.sql
SELECT
  t.number as mesa,
  t.location,
  t.current_session_id,
  s.status as session_status,
  st.name as waiter_name,
  CASE
    WHEN NOT t.is_active THEN '⚫ Inativa'
    WHEN s.id IS NOT NULL AND s.status IN ('active', 'pending_payment') THEN '🔴 Com sessão ativa'
    WHEN t.current_session_id IS NOT NULL THEN '⚠️ Tem current_session_id mas sem sessão ativa'
    ELSE '🟢 Livre'
  END as estado
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
LEFT JOIN waiter_tables wt ON wt.table_id = t.id
LEFT JOIN staff st ON wt.staff_id = st.id
WHERE t.is_active = true
ORDER BY t.location, t.number;
```

**Resultado Esperado:**
- ✅ Nenhuma mesa com estado "⚠️ Tem current_session_id mas sem sessão ativa"
- ✅ Mesas livres mostram "🟢 Livre"
- ✅ Mesas ocupadas mostram "🔴 Com sessão ativa"

---

## 📊 Resultados de Testes

### Checklist Rápido

**Migrations:**
- [ ] ✅ Migration 039 aplicada (verificar com `verify_migrations.sql`)
- [ ] ✅ Migration 043 aplicada (verificar com `verify_migrations.sql`)

**Ordering Mode:**
- [ ] ✅ Waiter alterna modo (botão funciona)
- [ ] ✅ Cliente vê banner de bloqueio
- [ ] ✅ Botões ficam desabilitados
- [ ] ✅ Real-time sync funciona (< 2s)
- [ ] ✅ API retorna sucesso
- [ ] ✅ API valida input
- [ ] ✅ API valida autenticação

**Close Session:**
- [ ] ✅ Cliente sai da mesa (sem consumo)
- [ ] ✅ Sessão fecha corretamente
- [ ] ✅ Mesa fica livre
- [ ] ✅ Admin mostra mesa livre
- [ ] ✅ Botão NÃO aparece com consumo
- [ ] ✅ Botão NÃO aparece com pedidos pendentes

**Diagnóstico:**
- [ ] ✅ Sem mesas com status inconsistente
- [ ] ✅ Sem mesas duplicadas

---

## 🐛 Troubleshooting

### Ordering Mode: Banner não aparece

**Causa:** Real-time subscription não conectada
**Solução:**
1. Verificar console do browser
2. Procurar erros de subscription
3. Verificar que `session.id` está correto
4. Forçar refresh da página

### Close Session: Mesa não fica livre

**Causa:** Função não foi aplicada corretamente
**Solução:**
1. Verificar com `verify_migrations.sql`
2. Se função não existe, reaplicar migration 043
3. Verificar logs do servidor

### API: "Não autenticado"

**Causa:** Cookie de auth não está a ser enviado
**Solução:**
1. Verificar que API usa `getAuthUser()` ✅ (já corrigido)
2. Verificar que frontend usa `credentials: "include"`
3. Verificar que waiter está logado

---

## 📞 Se Algo Falhar

1. **Verificar migrations:**
   ```bash
   # Executar verify_migrations.sql
   ```

2. **Verificar diagnóstico:**
   ```bash
   # Executar SEÇÃO 2 do CONSOLIDADO
   ```

3. **Verificar logs:**
   ```bash
   # Console do browser (F12)
   # Terminal do servidor (npm run dev)
   ```

4. **Documentação:**
   - [ORDERING_MODE_STATUS.md](ORDERING_MODE_STATUS.md)
   - [README_WAITER_CLIENT_FLOWS.md](README_WAITER_CLIENT_FLOWS.md)
   - [CONSOLIDADO_diagnostico_e_fixes.sql](supabase/scripts/CONSOLIDADO_diagnostico_e_fixes.sql)

---

**Testes preparados por:** Claude Sonnet 4.5
**Data:** 2026-02-17
**Features:** Ordering Mode + Close Session
**Status:** ✅ Pronto para testar
