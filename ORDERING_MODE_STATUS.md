# Funcionalidade de Controlo de Pedidos (Ordering Mode) - Status

## 📊 Estado da Implementação: **95% COMPLETO** ✅

Data: 2026-02-13
Feature: Controlo avançado do waiter sobre quem pode fazer pedidos

---

## ✅ Componentes Implementados

### 1. Database Layer (100% ✅)

**Migration:** `/supabase/migrations/039_session_ordering_mode.sql`
- ✅ Coluna `ordering_mode` adicionada à tabela `sessions`
- ✅ Valores: `'client'` (padrão) | `'waiter_only'`
- ✅ CHECK constraint para validar valores
- ✅ Index criado: `idx_sessions_ordering_mode`
- ✅ RLS policy: apenas staff pode atualizar
- ⚠️ **Status:** Migration criada, pendente aplicação no Supabase

**Verificação:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'ordering_mode';
```

---

### 2. Domain Layer (100% ✅)

#### **Value Object:** `/src/domain/value-objects/OrderingMode.ts`
- ✅ Tipo `OrderingMode = 'client' | 'waiter_only'`
- ✅ Labels em português: "Cliente pode pedir" | "Apenas empregado"
- ✅ Ícones: 🔓 | 🔒
- ✅ Funções de validação: `isValidOrderingMode()`, `toOrderingMode()`

#### **Entity:** `/src/domain/entities/Session.ts`
- ✅ Campo `orderingMode: OrderingMode` adicionado
- ✅ `CreateSessionData` com `orderingMode?: OrderingMode` (opcional)
- ✅ `UpdateSessionData` com `orderingMode?: OrderingMode`

#### **Domain Service:** `/src/domain/services/SessionService.ts`
- ✅ `canClientOrder(session)` - Valida se cliente pode fazer pedidos
- ✅ `canChangeOrderingMode(session, newMode)` - Valida mudança de modo
- ✅ Testes: 100% cobertura (10 testes no SessionService.test.ts linhas 367-469)

---

### 3. Application Layer (100% ✅)

#### **Use Case:** `/src/application/use-cases/sessions/UpdateSessionOrderingModeUseCase.ts`
- ✅ Input: `sessionId`, `orderingMode`, `staffId`
- ✅ Output: `Result<Session>` com success/error/code
- ✅ Validações: sessão existe, não está fechada, modo é diferente
- ✅ Activity logging (opcional)
- ✅ Testes: 8 testes completos (UpdateSessionOrderingModeUseCase.test.ts)
  - Atualizar client → waiter_only ✅
  - Atualizar waiter_only → client ✅
  - Registar atividade ✅
  - Sessão não encontrada ✅
  - Sessão fechada ✅
  - Já no modo pretendido ✅
  - Erro do repositório ✅
  - Funcionar sem logger ✅

**Test Results:** 8/8 passing ✅

---

### 4. Infrastructure Layer (100% ✅)

#### **Repository:** `/src/infrastructure/repositories/SupabaseSessionRepository.ts`
- ✅ `DatabaseSession` inclui `ordering_mode?: string`
- ✅ `create()` aceita e armazena `ordering_mode` (default: 'client')
- ✅ `update()` permite atualizar `ordering_mode`
- ✅ `toDomain()` mapeia `ordering_mode` → `orderingMode` com `toOrderingMode()`
- ✅ Mapeamento snake_case ↔ camelCase correto

---

### 5. Presentation Layer (100% ✅)

#### **Hook:** `/src/presentation/hooks/useSessionOrderingMode.ts`
- ✅ `orderingMode: OrderingMode | null` - Estado atual
- ✅ `canClientOrder: boolean` - Se clientes podem pedir
- ✅ `updateMode(newMode)` - Atualizar modo
- ✅ `isUpdating: boolean` - Loading state
- ✅ Integrado com DependencyContext ✅

#### **Dependency Context:** `/src/presentation/contexts/DependencyContext.tsx`
- ✅ `updateSessionOrderingMode` use case injetado (linhas 65, 146, 429-431, 458)

#### **Waiter Interface:** `/src/app/waiter/mesa/[id]/page.tsx`
- ✅ Import do hook `useSessionOrderingMode`
- ✅ Estado `showOrderingModeModal`
- ✅ Botão para alternar modo (linha 363)
  - 🔓 Verde quando `'client'`
  - 🔒 Vermelho quando `'waiter_only'`
- ✅ Modal de confirmação (linhas 742-753)
  - Título diferente conforme ação
  - Mensagem explicativa
- ✅ Handler `handleToggleOrderingMode` (linha 285-300)
  - Alterna entre modos
  - Registra activity log
- ✅ Real-time: Suporte já existe via subscription

#### **Client Interface:** `/src/app/mesa/[numero]/page.tsx`
- ✅ Real-time subscription para `ordering_mode` (linha 507-544)
  - Atualiza estado local quando muda
  - Mostra notificação quando bloqueado
- ✅ Banner de bloqueio (linha 1715-1721)
  - 🔒 Background vermelho
  - Texto: "Pedidos Bloqueados"
  - Explicação clara
- ✅ Botões desabilitados (linhas 1859, 1875, 1890, 3423)
  - "Adicionar ao carrinho" desabilitado
  - "Enviar Pedido" desabilitado
  - UI feedback: "🔒 Bloqueado"
- ✅ Validação no submit (linha 1115)
  - Previne envio se `waiter_only`
  - Mensagem de erro clara

---

### 6. API Layer (100% ✅)

#### **API Route:** `/src/app/api/sessions/[id]/ordering-mode/route.ts`
- ✅ Endpoint: `PATCH /api/sessions/[id]/ordering-mode`
- ✅ Validação de input: `isValidOrderingMode()`
- ✅ **Autenticação CORRIGIDA:** Usa `getAuthUser()` (legacy JWT) ✅
  - ⚠️ **FIX APLICADO:** Mudado de `supabase.auth.getUser()` para `getAuthUser()`
  - Mesmo padrão do `/api/tables/[id]/assign-waiter`
- ✅ Verificação de staff ativo
- ✅ Permissão: apenas admin/waiter
- ✅ Usa `UpdateSessionOrderingModeUseCase`
- ✅ Retorna session atualizada

---

## 🧪 Cobertura de Testes

### **Status Geral:** 951/952 testes passing (99.9%) ✅

**Testes da Feature:**
- ✅ **Domain Service:** 10 testes (SessionService.test.ts)
  - `canClientOrder()` - 4 testes
  - `canChangeOrderingMode()` - 6 testes
- ✅ **Use Case:** 8 testes (UpdateSessionOrderingModeUseCase.test.ts)
- ✅ **Total:** 18 testes específicos da feature

**Teste Falhando (não relacionado):**
- ❌ ReservationForm.test.tsx (1 teste) - Issue com mock de fetch

**Novos Testes Necessários:**
- ⚠️ **Hook:** useSessionOrderingMode.test.ts (recomendado)
- ⚠️ **E2E:** Playwright para fluxo completo (opcional)

---

## 📋 Checklist de Deployment

### Crítico (Fazer Antes de Usar Feature)

- [ ] **1. Aplicar Migration 039**
  ```bash
  # Opção 1: Supabase Dashboard SQL Editor
  # https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new
  # Cole o conteúdo de: supabase/migrations/039_session_ordering_mode.sql

  # Opção 2: Se Docker estiver a correr
  npx supabase db push
  ```

- [ ] **2. Verificar Coluna Criada**
  ```sql
  SELECT id, ordering_mode FROM sessions LIMIT 5;
  -- Deve mostrar 'client' para sessões existentes
  ```

- [ ] **3. Testar API de Atualização**
  ```bash
  # Como waiter autenticado:
  curl -X PATCH https://[seu-dominio]/api/sessions/[session-id]/ordering-mode \
    -H "Content-Type: application/json" \
    -H "Cookie: [cookie-de-auth]" \
    -d '{"orderingMode":"waiter_only"}'
  ```

### Importante (Testar em Produção)

- [ ] **4. Testar Fluxo Waiter**
  1. Login como waiter
  2. Abrir mesa com sessão ativa
  3. Clicar no botão de ordering mode (🔓 ou 🔒)
  4. Confirmar mudança no modal
  5. Verificar mudança visual (cor do botão)
  6. Verificar activity log registado

- [ ] **5. Testar Fluxo Cliente**
  1. Cliente em mesa com sessão ativa
  2. Waiter ativa modo `waiter_only`
  3. Cliente vê banner vermelho "Pedidos Bloqueados"
  4. Botões de adicionar ao carrinho ficam desabilitados
  5. Botão "Enviar Pedido" fica desabilitado
  6. Waiter desativa modo bloqueio
  7. Cliente volta a poder fazer pedidos

- [ ] **6. Testar Real-time Sync**
  1. Abrir mesa em 2 dispositivos (cliente + waiter)
  2. Waiter alterna modo
  3. Cliente vê mudança instantaneamente (banner aparece/desaparece)

### Opcional (Melhorias Futuras)

- [ ] **7. Criar Testes de Hook**
  - `/src/__tests__/presentation/hooks/useSessionOrderingMode.test.ts`
  - Seguir padrão de `useActivityLog.test.ts`

- [ ] **8. E2E Tests com Playwright**
  - Fluxo completo waiter ↔ cliente
  - Real-time sync

- [ ] **9. Adicionar Métricas**
  - Quantas vezes modo bloqueio é usado
  - Duração média de bloqueio
  - Impact no tempo médio de pedidos

---

## 🔧 Troubleshooting

### Problema: "Não autenticado" ao alterar modo

**Sintoma:** Erro 401 ao fazer PATCH para API
**Causa:** Cookies httpOnly não estão a ser enviados
**Solução:**
- ✅ Verificar que API usa `getAuthUser()` (JÁ CORRIGIDO)
- Verificar que fetch inclui `credentials: "include"`
- Verificar que waiter está realmente logado

### Problema: Cliente ainda consegue fazer pedidos

**Sintoma:** Botões não ficam desabilitados
**Causa:** Estado local não atualizado ou subscription não ativa
**Solução:**
1. Verificar que `session.ordering_mode` está correto no estado
2. Verificar console para erros de subscription
3. Forçar refresh da página

### Problema: Mudança não aparece instantaneamente

**Sintoma:** Waiter muda mas cliente não vê
**Causa:** Real-time subscription não conectada
**Solução:**
1. Verificar que Supabase realtime está ativo no projeto
2. Verificar logs de subscription no console
3. Verificar que filtro de subscription está correto: `id=eq.${session.id}`

### Problema: Migration falha ao aplicar

**Sintoma:** Erro ao executar 039_session_ordering_mode.sql
**Causa:** Coluna já existe ou RLS policy já existe
**Solução:**
```sql
-- Verificar se coluna existe
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'ordering_mode';

-- Se existir, migration já foi aplicada ✅
-- Se não existir, aplicar migration manualmente
```

---

## 📈 Próximos Passos Após Deployment

1. **Monitorizar Uso**
   - Ver quantas vezes feature é usada
   - Feedback dos waiters
   - Feedback dos clientes

2. **Otimizações Possíveis**
   - Cache de ordering_mode no client
   - Notificação push quando modo muda (em vez de polling)

3. **Features Relacionadas**
   - Modo "waiter_verify": Cliente pode pedir mas waiter aprova
   - Histórico de mudanças de modo
   - Regras automáticas (ex: modo bloqueio após 10 pedidos)

---

## 🎯 Resumo Executivo

### O Que Está Pronto
✅ **100% do código implementado**
✅ **18 testes passando**
✅ **Autenticação corrigida** (legacy JWT)
✅ **UI completa** (waiter + cliente)
✅ **Real-time sync implementado**

### O Que Falta
⚠️ **Aplicar migration 039 no Supabase**
⚠️ **Testar em produção**

### Impacto
- **Performance:** Sem impacto (apenas 1 coluna extra)
- **Segurança:** Melhorada (RLS policy implementada)
- **UX:** Significativamente melhorada para waiters
- **Complexidade:** Baixa (feature bem isolada)

---

## 📚 Documentação Relacionada

- **Plano Original:** `/Users/sofiaferreira/.claude/plans/vast-percolating-peacock.md`
- **Alterações Recentes:** `/RECENT_CHANGES.md`
- **Fluxos:** `/README_WAITER_CLIENT_FLOWS.md`
- **Deployment:** `/DEPLOYMENT_CHECKLIST.md`
- **Arquitetura:** `/CLAUDE.md`

---

**Data:** 2026-02-13
**Feature:** Ordering Mode Control
**Status:** ✅ Implementação Completa, Pendente Deployment
**Build Status:** 951/952 testes passando (99.9%)
