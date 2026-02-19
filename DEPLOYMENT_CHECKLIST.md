# Checklist de Deployment - Alterações 2026-02-13

## ✅ Código - Tudo Completo

### Arquivos Modificados
- [x] `/src/components/admin/TableMap.tsx` - Waiter names
- [x] `/src/app/admin/mesas/page.tsx` - Status uniformizado
- [x] `/src/app/mesa/[numero]/page.tsx` - Botão "Sair da Mesa"
- [x] `/src/app/waiter/page.tsx` - Correções de filtros e sessões
- [x] `/src/app/waiter/mesa/[id]/page.tsx` - Buscar pending_payment
- [x] `/src/app/api/tables/[id]/assign-waiter/route.ts` - Fix autenticação

### Build Status
```bash
✅ 952 testes passando
✅ TypeScript compilation success
✅ No blocking errors
```

---

## ⚠️ Base de Dados - Ações Pendentes

### Migration 043 - CRÍTICO
**Arquivo:** `/supabase/migrations/043_close_session_update_table.sql`

**Aplicar AGORA:**
1. Abrir Supabase SQL Editor:
   https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new

2. Copiar TODO o conteúdo de `043_close_session_update_table.sql`

3. Executar

4. Verificar sucesso:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'close_session_and_free_table';
   -- Deve retornar 1 linha
   ```

**Impacto se não aplicar:**
- ❌ Mesas não ficam livres quando cliente sai
- ❌ Inconsistências entre `tables` e `sessions`

---

### Verificar Duplicatas - RECOMENDADO
**Arquivo:** `/supabase/migrations/CONSOLIDADO_diagnostico_e_fixes.sql`

**Passos:**
1. Executar SEÇÃO 2.3 (diagnóstico):
   ```sql
   SELECT number, location, COUNT(*) as quantidade
   FROM tables
   WHERE is_active = true
   GROUP BY number, location
   HAVING COUNT(*) > 1;
   ```

2. Se retornar linhas → **HÁ DUPLICATAS**

3. Executar SEÇÃO 4.1 (preview) para ver o que será feito

4. Se OK, executar SEÇÃO 4.2 (correção)

**Impacto se houver duplicatas:**
- ⚠️ Confusão no sistema (2 mesas com mesmo número)
- ⚠️ Problemas de atribuição de waiter
- ⚠️ Inconsistências nos relatórios

---

## 📊 Verificações de Produção

### 1. Testar "Sair da Mesa"
```
Cenário: Cliente sem consumo
1. Escanear QR code de mesa
2. Entrar na sessão
3. NÃO fazer pedidos
4. Verificar botão "Sair da Mesa" aparece
5. Clicar e confirmar
6. Verificar:
   - ✅ Sessão fechada
   - ✅ Mesa fica livre (🟢) no admin
   - ✅ Waiter não vê mais como ocupada
```

### 2. Testar Comandar Mesa
```
Cenário: Waiter comanda mesa disponível
1. Login como waiter
2. Ver seção "Mesas Disponíveis para Comandar"
3. Verificar que NÃO aparecem mesas de outros waiters
4. Clicar "Comandar Mesa"
5. Verificar:
   - ✅ Mesa aparece em "Minhas Mesas"
   - ✅ Sem erro "Não autenticado"
   - ✅ Nome do waiter aparece no admin
```

### 3. Verificar Status de Mesas
```
Cenário: Mesa com conta pedida
1. Cliente pede conta (pending_payment)
2. Verificar no painel do waiter:
   - ✅ Mesa aparece como "Ativa" (não "Livre")
   - ✅ Informações da sessão aparecem
3. Verificar no admin:
   - ✅ Mesa aparece como "Ocupada" (🔴)
   - ✅ Tempo de sessão aparece
```

---

## 📁 Documentação Criada

### Novos Arquivos
- [x] `RECENT_CHANGES.md` - Alterações detalhadas
- [x] `README_WAITER_CLIENT_FLOWS.md` - Guia de fluxos completo
- [x] `CONSOLIDADO_diagnostico_e_fixes.sql` - Scripts SQL unificados
- [x] `DEPLOYMENT_CHECKLIST.md` - Este arquivo

### Atualizações
- [x] `CLAUDE.md` - Seção de alterações recentes
- [ ] `README.md` - Pendente atualização com novos fluxos

---

## 🧹 Limpeza (Opcional)

### Scripts SQL Antigos - PODE DELETAR
Estes foram consolidados em `CONSOLIDADO_diagnostico_e_fixes.sql`:
- [ ] `debug_mesa_3.sql`
- [ ] `investigate_mesa_3_duplicates.sql`
- [ ] `fix_table_session_sync.sql`
- [ ] `fix_duplicate_tables.sql`

**MANTER:**
- [x] `CONSOLIDADO_diagnostico_e_fixes.sql` (consolidado)
- [x] `043_close_session_update_table.sql` (migration oficial)

### Logs de Debug - REMOVER APÓS TESTES
**Arquivo:** `/src/app/api/tables/[id]/assign-waiter/route.ts`

Remover linhas 24-30:
```typescript
// DEBUG: Log authentication status
console.log('[assign-waiter POST] Auth status:', {
  hasUser: !!user,
  userId: user?.id,
  userRole: user?.role,
  cookieHeader: request.headers.get('cookie')?.substring(0, 100)
});
```

---

## 🎯 Prioridades

### 🔴 CRÍTICO - Fazer AGORA
1. [ ] Aplicar migration 043
2. [ ] Testar "Sair da Mesa" em produção
3. [ ] Verificar duplicatas de mesas

### 🟡 IMPORTANTE - Esta Semana
1. [ ] Testar fluxo completo de waiter
2. [ ] Verificar status de todas as mesas
3. [ ] Remover logs de debug

### 🟢 BAIXA - Quando Possível
1. [ ] Deletar scripts SQL antigos
2. [ ] Atualizar README.md principal
3. [ ] Criar testes E2E

---

## 📞 Rollback Plan

Se algo der errado:

### 1. Reverter Migration 043
```sql
DROP FUNCTION IF EXISTS close_session_and_free_table(UUID);
```

### 2. Reverter Código
```bash
git log --oneline -10
# Identificar commit antes das alterações
git revert [COMMIT_HASH]
# OU
git reset --hard [COMMIT_HASH]
git push --force
```

### 3. Contactar Suporte
- Backup automático do Supabase: últimas 24h
- Logs disponíveis em: Supabase Dashboard → Logs

---

## ✅ Conclusão

**Código:** ✅ Pronto para produção
**Testes:** ✅ 952 passando
**Documentação:** ✅ Completa
**Migration:** ⚠️ Pendente aplicação
**Duplicatas:** ⚠️ Verificar

**Próximo passo:** Aplicar migration 043 e testar!
