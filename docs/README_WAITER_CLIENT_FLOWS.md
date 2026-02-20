# Fluxos de Waiter e Cliente - Guia Completo

## 📋 Índice

1. [Fluxo do Cliente](#fluxo-do-cliente)
2. [Fluxo do Waiter](#fluxo-do-waiter)
3. [Fluxo do Admin](#fluxo-do-admin)
4. [Status das Mesas](#status-das-mesas)
5. [Troubleshooting](#troubleshooting)

---

## 👤 Fluxo do Cliente

### 1. Entrar na Mesa via QR Code
- Cliente escaneia QR code na mesa
- Sistema redireciona para `/mesa/[numero]`
- Se mesa tiver sessão ativa, entra direto
- Se mesa estiver livre, aguarda waiter iniciar sessão

### 2. Fazer Pedidos
- Cliente navega pelo menu (tab "Menu")
- Adiciona itens ao carrinho
- Pode adicionar observações
- Envia pedido para cozinha

**Restrições:**
- Se `ordering_mode = 'waiter_only'`, botões ficam desabilitados
- Banner vermelho: "Pedidos Bloqueados - O empregado está a gerir os pedidos"
- Cliente pode visualizar menu mas não pode adicionar ao carrinho

### 3. Acompanhar Pedidos
- Tab "Pedidos" mostra todos os pedidos da sessão
- Status em tempo real:
  - 🟠 Pendente (aguardando cozinha)
  - 🔵 A preparar
  - 🟢 Pronto (aguardando entrega)
  - ✅ Entregue

### 4. Ver Conta
- Tab "Conta" mostra total acumulado
- Total atualiza em tempo real conforme pedidos
- Botão "Pedir Conta" chama waiter

### 5. Sair da Mesa (NOVO)
- Botão "Sair da Mesa" aparece APENAS se:
  - `total_amount === 0` (não consumiu nada)
  - `orders.length === 0` (sem pedidos)
- Confirmação antes de sair
- Fecha sessão e libera mesa automaticamente

**Validações:**
- Não pode sair se houver consumo
- Não pode sair se houver pedidos pendentes
- Mensagem de erro clara se tentar sair indevidamente

---

## 👨‍🍳 Fluxo do Waiter

### 1. Login
- Acesso via `/waiter`
- Email + senha
- Sistema usa autenticação legada (JWT em cookies httpOnly)

### 2. Dashboard Principal (`/waiter`)

**Visualização:**
- **Quick Stats:** Mesas ativas / Total, Pessoas, Pedidos prontos
- **Chamadas de Clientes:** Alertas em tempo real
- **Pedidos:** Organizados por status
  - 🟢 Prontos para Servir (prioritário)
  - 🔵 Na Cozinha
  - 🟠 Aguardam Cozinha
- **Mesas Disponíveis para Comandar:** (CORRIGIDO)
  - Mostra apenas mesas SEM atribuição
  - NÃO mostra mesas de outros waiters
- **Minhas Mesas:** Todas as mesas atribuídas

**Correções Aplicadas:**
- ✅ Busca sessões `['active', 'pending_payment']` (antes só `active`)
- ✅ Filtra mesas de outros waiters corretamente
- ✅ Autenticação API corrigida (usa `getAuthUser()` legado)

### 3. Comandar Mesa
- Waiter clica em "Comandar Mesa" na seção "Mesas Disponíveis"
- API valida:
  - Waiter está autenticado
  - Mesa é da mesma localização do waiter
  - Mesa não está atribuída a outro waiter
- Se sucesso: mesa aparece em "Minhas Mesas"
- Se falha: mensagem clara (ex: "Mesa já atribuída a João")

### 4. Gestão de Mesa Individual (`/waiter/mesa/[id]`)

**Ações disponíveis:**
- Iniciar sessão (walk-in)
- Ver pedidos ativos
- Fazer pedidos pelo cliente (modo tradicional)
- Alternar modo de pedidos:
  - `'client'` (padrão): Cliente pode pedir
  - `'waiter_only'`: Apenas waiter pode pedir
- Pedir conta
- Fechar sessão

---

## 👔 Fluxo do Admin

### 1. Gestão de Mesas (`/admin/mesas`)

**Tabs:**
- **Mapa em Tempo Real:** (NOVO)
  - Status badge: 🟢 Livre / 🔴 Ocupada / 🟡 Reservada / ⚫ Inativa
  - Nome do waiter atribuído (com ícone 👤)
  - Tempo de sessão (para mesas ocupadas)
  - Tooltip com detalhes completos
- **Configuração:** CRUD de mesas

**Status Uniformizado:**
- Status calculado dinamicamente:
  ```typescript
  if (!is_active) → 'inactive'
  if (hasActiveSession) → 'occupied'
  else → 'available'
  ```
- `hasActiveSession` verifica sessões com status `['active', 'pending_payment']`

---

## 📊 Status das Mesas

### Estados Possíveis

| Status | Ícone | Cor | Significado |
|--------|-------|-----|-------------|
| `available` | 🟢 | Verde | Livre, pode receber clientes |
| `occupied` | 🔴 | Vermelho | Com sessão ativa (`active` ou `pending_payment`) |
| `reserved` | 🟡 | Amarelo | Reservada para horário específico |
| `inactive` | ⚫ | Cinza | Fora de serviço (manutenção, etc.) |

### Status de Sessões

| Status | Descrição | Mesa fica |
|--------|-----------|-----------|
| `active` | Sessão normal | Ocupada (🔴) |
| `pending_payment` | Conta pedida, aguardando pagamento | Ocupada (🔴) |
| `paid` | Paga mas não fechada | Ocupada (🔴) |
| `closed` | Sessão encerrada | Livre (🟢) |

**IMPORTANTE:** Sessões `pending_payment` devem ser tratadas como ativas!

---

## 🛠️ Troubleshooting

### Problema: Mesa mostra "livre" mas tem clientes

**Diagnóstico:**
```bash
# No terminal do projeto:
npm run dev

# Em outra janela, acesse Supabase SQL Editor:
# https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new

# Cole e execute:
SELECT t.number, t.current_session_id, s.status
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
WHERE t.number = [NUMERO_DA_MESA];
```

**Causas comuns:**
1. `current_session_id` é NULL mas tem sessão `active`/`pending_payment`
2. Sessão está `closed` mas `current_session_id` ainda definido

**Solução:**
Execute o script consolidado:
```sql
-- Ver SEÇÃO 3 de:
/supabase/migrations/CONSOLIDADO_diagnostico_e_fixes.sql
```

---

### Problema: Waiter não consegue comandar mesa

**Sintomas:**
- Erro: "Não autenticado"
- Erro: "Mesa já atribuída a [nome]"
- Erro: "Não pode comandar mesas de [localização]"

**Soluções:**

1. **"Não autenticado":**
   - ✅ JÁ CORRIGIDO em 2026-02-13
   - API agora usa `getAuthUser()` do sistema legado
   - Certifique-se que está logado como waiter

2. **"Mesa já atribuída":**
   - Mesa está atribuída a outro waiter
   - Admin pode forçar reatribuição
   - Ou remover atribuição existente

3. **"Não pode comandar mesas de [localização]":**
   - Waiter só pode comandar mesas da sua localização
   - Verificar: `staff.location` deve ser igual a `table.location`

---

### Problema: Cliente não consegue sair da mesa

**Sintomas:**
- Botão "Sair da Mesa" não aparece
- Erro: "Não pode sair da mesa com pedidos"

**Soluções:**

1. **Botão não aparece:**
   - Verificar: `total_amount > 0`? → Cliente consumiu algo
   - Verificar: `orders.length > 0`? → Há pedidos pendentes
   - Botão só aparece quando AMBOS são 0

2. **Mesa não fica livre após sair:**
   - ✅ JÁ CORRIGIDO com migration 043
   - Função `close_session_and_free_table` fecha sessão E libera mesa
   - Aplicar migration: `/supabase/migrations/043_close_session_update_table.sql`

---

### Problema: Mesas duplicadas

**Diagnóstico:**
```sql
-- Execute no Supabase SQL Editor:
SELECT number, location, COUNT(*) as qtd
FROM tables
WHERE is_active = true
GROUP BY number, location
HAVING COUNT(*) > 1;
```

**Solução:**
```sql
-- Ver SEÇÃO 4 de:
/supabase/migrations/CONSOLIDADO_diagnostico_e_fixes.sql

-- ATENÇÃO: Executar apenas após confirmar duplicatas!
-- Fazer BACKUP antes!
```

---

### Problema: Status inconsistente

**Sintomas:**
- Admin mostra "Ocupada" mas não há clientes
- Admin mostra "Livre" mas há sessão ativa

**Solução:**
✅ JÁ CORRIGIDO em 2026-02-13
- Status agora é calculado dinamicamente
- Verificar ambos status `['active', 'pending_payment']`
- Atualizar página se ainda mostrar inconsistência

---

## 📁 Arquivos Importantes

### Migrações
- `/supabase/migrations/043_close_session_update_table.sql` - Função close session
- `/supabase/migrations/CONSOLIDADO_diagnostico_e_fixes.sql` - Diagnóstico completo

### Código
- `/src/app/mesa/[numero]/page.tsx` - Interface do cliente
- `/src/app/waiter/page.tsx` - Dashboard do waiter
- `/src/app/admin/mesas/page.tsx` - Gestão de mesas (admin)
- `/src/app/api/tables/[id]/assign-waiter/route.ts` - API de atribuição

### Componentes
- `/src/components/admin/TableMap.tsx` - Mapa de mesas (admin)

### Documentação
- `/RECENT_CHANGES.md` - Alterações recentes detalhadas
- `/CLAUDE.md` - Convenções e arquitetura
- Este arquivo - Guia de fluxos

---

## 🔒 Segurança

### Validações Implementadas

**Cliente:**
- ✅ Só pode sair se não consumiu nada
- ✅ Não pode fazer pedidos se `ordering_mode = 'waiter_only'`
- ✅ Não pode acessar sessão de outra mesa

**Waiter:**
- ✅ Só vê suas mesas + mesas disponíveis (sem atribuição)
- ✅ Só pode comandar mesas da sua localização
- ✅ Não pode comandar mesa de outro waiter (apenas admin)

**Admin:**
- ✅ Pode forçar reatribuição de mesas
- ✅ Pode ver todas as mesas de todas localizações

---

## 📈 Próximos Passos

### Imediato:
1. ⚠️ Aplicar migration 043 no banco de produção
2. ⚠️ Executar script de fix de duplicatas (se necessário)
3. ❌ Testar fluxo completo "Sair da Mesa" em produção

### Futuro:
1. ❌ Criar testes E2E com Playwright para fluxos críticos
2. ❌ Adicionar métricas de tempo médio de atendimento
3. ❌ Implementar notificações push para waiters
4. ❌ Considerar migração completa para Supabase Auth

---

## 📞 Suporte

**Problemas recorrentes?**
1. Ver [RECENT_CHANGES.md](RECENT_CHANGES.md) para problemas conhecidos
2. Executar diagnóstico: `CONSOLIDADO_diagnostico_e_fixes.sql` (SEÇÃO 1 e 2)
3. Verificar logs do servidor: `console.log` nas API routes

**Contato:**
- Projeto: Sushi in Sushi
- Última atualização: 2026-02-13
- Build status: 952 testes passando ✅
