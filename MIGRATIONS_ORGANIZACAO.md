# Organização de Migrations - Sumário ✅

Data: 2026-02-17

---

## 📊 O Que Foi Feito

### ✅ Estrutura Reorganizada

**ANTES:**
```
supabase/
├── migrations/
│   ├── 024-043_*.sql (20 files)
│   ├── CLEANUP_*.sql (2 files)
│   ├── CONSOLIDADO_*.sql (1 file)
│   ├── _prod/ (001-023)
│   └── _dev/
```

**DEPOIS:**
```
supabase/
├── migrations/                    ← Migrations de produção (001-043)
│   ├── README.md                 ← 📚 Documentação completa
│   ├── 001_user_management.sql
│   ├── 002_table_management.sql
│   ├── ... (38 migrations)
│   ├── 043_close_session_update_table.sql
│   ├── _archived_prod/           ← Backup da estrutura antiga
│   └── _archived_dev/            ← Backup da estrutura antiga
│
└── scripts/                       ← Scripts de ferramentas
    ├── README.md                 ← 📚 Guia de uso
    ├── CLEANUP_reset_all_tables.sql
    ├── CLEANUP_reset_location_tables.sql
    └── CONSOLIDADO_diagnostico_e_fixes.sql
```

---

## 📋 Inventário de Migrations

### Migrations de Produção: 38 ficheiros (001-043)

**Existem (38):**
- 001-005, 007-016, 020, 022-043

**Gaps (5):**
- 006, 017, 018, 019, 021 (normais - migrations descartadas ou nunca criadas)

**Sequência:**
```
001 → 002 → 003 → 004 → 005 → 007 → 008 → 009 → 010 →
011 → 012 → 013 → 014 → 015 → 016 → 020 → 022 → 023 →
024 → 025 → 026 → 027 → 028 → 029 → 030 → 031 → 032 →
033 → 034 → 035 → 036 → 037 → 038 → 039 → 040 → 041 →
042 → 043
```

### Scripts de Ferramentas: 3 ficheiros

1. **CLEANUP_reset_all_tables.sql**
   - Reset completo de todas as tabelas
   - ⚠️ DESTRUTIVO - apenas desenvolvimento

2. **CLEANUP_reset_location_tables.sql**
   - Reset de uma localização específica
   - ⚠️ CUIDADO - não reversível

3. **CONSOLIDADO_diagnostico_e_fixes.sql**
   - Diagnóstico de mesas e sessões
   - Correção de inconsistências
   - Remoção de duplicatas
   - 5 seções organizadas

---

## 📚 Documentação Criada

### `/supabase/migrations/README.md`

**Conteúdo:**
- ✅ Índice completo de todas as 38 migrations
- ✅ Descrição de cada migration
- ✅ Tabela de dependências
- ✅ Grafo visual de dependências
- ✅ Guia de aplicação (local + produção)
- ✅ Troubleshooting de erros comuns
- ✅ Como criar novas migrations
- ✅ Migrations pendentes de aplicação
- ✅ Rollback manual (sem down migrations)

### `/supabase/scripts/README.md`

**Conteúdo:**
- ✅ Descrição detalhada de cada script
- ✅ Quando usar cada um
- ✅ Como usar (Dashboard + CLI)
- ✅ Exemplos práticos
- ✅ ⚠️ Avisos de segurança
- ✅ Ordem de execução recomendada
- ✅ Troubleshooting

---

## 🎯 Migrations Críticas Pendentes

### Para Aplicar em Produção AGORA

**1. Migration 039: session_ordering_mode**
```sql
-- Adiciona controlo de pedidos (waiter/client)
-- Feature: Ordering Mode (95% completo)
-- Ficheiro: 039_session_ordering_mode.sql
```

**Verificar se aplicada:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'ordering_mode';
```

**2. Migration 043: close_session_update_table**
```sql
-- Função para fechar sessão e liberar mesa atomicamente
-- Fix: Cliente "Sair da Mesa" não libera mesa
-- Ficheiro: 043_close_session_update_table.sql
```

**Verificar se aplicada:**
```sql
SELECT proname FROM pg_proc
WHERE proname = 'close_session_and_free_table';
```

---

## 🚀 Como Aplicar Migrations em Produção

### Via Supabase Dashboard (Recomendado)

1. **Aceder ao SQL Editor:**
   ```
   https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new
   ```

2. **Verificar quais estão aplicadas:**
   ```sql
   -- Ver todas as tabelas
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Ver colunas de sessions
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'sessions'
   ORDER BY ordinal_position;
   ```

3. **Aplicar migration 039:**
   - Abrir `/supabase/migrations/039_session_ordering_mode.sql`
   - Copiar todo o conteúdo
   - Colar no SQL Editor
   - Executar (Run)
   - Verificar sucesso

4. **Aplicar migration 043:**
   - Abrir `/supabase/migrations/043_close_session_update_table.sql`
   - Copiar todo o conteúdo
   - Colar no SQL Editor
   - Executar (Run)
   - Verificar sucesso

5. **Verificar:**
   ```sql
   -- Migration 039 OK?
   SELECT id, ordering_mode FROM sessions LIMIT 3;
   -- Deve mostrar coluna ordering_mode

   -- Migration 043 OK?
   SELECT proname FROM pg_proc WHERE proname = 'close_session_and_free_table';
   -- Deve retornar 1 linha
   ```

---

## 🔧 Scripts de Diagnóstico

### Quando Usar

**CONSOLIDADO_diagnostico_e_fixes.sql:**

Use quando:
- Mesa mostra status errado
- Cliente não consegue sair da mesa
- Mesas duplicadas aparecem
- `current_session_id` inconsistente

**Como usar:**
1. Abrir Supabase SQL Editor
2. Copiar APENAS a seção necessária (1-5)
3. Seções 1-2: Executar diretamente (SELECT)
4. Seções 3-4: Fazer BACKUP primeiro, descomentar, depois executar

**Exemplo - Ver estado de todas as mesas:**
```sql
-- Copiar SEÇÃO 2.4 do CONSOLIDADO e executar
SELECT
  t.number as mesa,
  t.location,
  s.status as session_status,
  st.name as waiter_name,
  CASE
    WHEN NOT t.is_active THEN '⚫ Inativa'
    WHEN s.status IN ('active', 'pending_payment') THEN '🔴 Ocupada'
    ELSE '🟢 Livre'
  END as estado
FROM tables t
LEFT JOIN sessions s ON t.current_session_id = s.id
LEFT JOIN waiter_tables wt ON wt.table_id = t.id
LEFT JOIN staff st ON wt.staff_id = st.id
WHERE t.is_active = true
ORDER BY t.location, t.number;
```

---

## 📊 Estatísticas

### Migrations

| Categoria | Quantidade |
|-----------|------------|
| Total | 38 |
| Core System (001-016) | 15 |
| Advanced Features (020-023) | 4 |
| Product/Order (024-028) | 5 |
| Games (029-033) | 5 |
| Order/Staff (034-038) | 5 |
| Session/Table (039-043) | 5 |

### Scripts de Ferramentas

| Script | Tipo | Risco |
|--------|------|-------|
| CLEANUP_reset_all_tables | Reset | 🔴 Alto |
| CLEANUP_reset_location_tables | Reset | 🟠 Médio |
| CONSOLIDADO_diagnostico_e_fixes | Diagnóstico/Fix | 🟢 Baixo (SEÇÕESSection 1-2) / 🟠 Médio (SEÇÕES 3-4) |

### Tamanho

```
Migrations: 38 ficheiros, ~250 KB
Scripts: 3 ficheiros, ~45 KB
Documentação: 2 README, ~35 KB
Total: ~330 KB
```

---

## ✅ Checklist de Organização

- [x] Consolidar migrations 001-043 numa pasta
- [x] Mover scripts para `/supabase/scripts/`
- [x] Criar `/supabase/migrations/README.md`
- [x] Criar `/supabase/scripts/README.md`
- [x] Arquivar pastas antigas (_prod, _dev)
- [x] Documentar migrations críticas pendentes
- [x] Documentar como aplicar em produção
- [x] Identificar gaps na numeração (normais)
- [ ] **Aplicar migration 039 em produção** ⚠️
- [ ] **Aplicar migration 043 em produção** ⚠️
- [ ] Testar features após migrations

---

## 📞 Próximos Passos

### Imediato (Fazer Agora)

1. **Aplicar migrations pendentes em produção:**
   - Migration 039 (ordering_mode)
   - Migration 043 (close_session function)

2. **Testar features:**
   - Waiter alterna modo de pedidos
   - Cliente vê banner de bloqueio
   - Cliente sai da mesa e mesa fica livre

3. **Verificar diagnóstico:**
   - Executar SEÇÃO 2.4 do CONSOLIDADO
   - Confirmar que não há mesas duplicadas
   - Confirmar que não há inconsistências

### Futuro (Quando Necessário)

1. **Criar nova migration 044:**
   - Seguir template em `/supabase/migrations/README.md`
   - Adicionar ao índice
   - Documentar dependências

2. **Manutenção regular:**
   - Executar diagnóstico mensalmente
   - Verificar índices não utilizados
   - Limpar dados antigos (sessions fechadas > 6 meses)

---

## 🎉 Resultado Final

### Antes da Organização
- ❌ Migrations espalhadas em múltiplas pastas
- ❌ Scripts misturados com migrations
- ❌ Sem documentação de dependências
- ❌ Difícil saber o que aplicar em produção

### Depois da Organização
- ✅ Todas as 38 migrations numa pasta clara (001-043)
- ✅ Scripts separados em `/supabase/scripts/`
- ✅ Documentação completa com índice e dependências
- ✅ Guias de aplicação para desenvolvimento e produção
- ✅ Troubleshooting e exemplos práticos
- ✅ Identificação clara de migrations pendentes

---

## 📚 Documentação Relacionada

- **Migrations:** [/supabase/migrations/README.md](supabase/migrations/README.md)
- **Scripts:** [/supabase/scripts/README.md](supabase/scripts/README.md)
- **Ordering Mode:** [/ORDERING_MODE_STATUS.md](ORDERING_MODE_STATUS.md)
- **Alterações Recentes:** [/RECENT_CHANGES.md](RECENT_CHANGES.md)
- **Fluxos:** [/README_WAITER_CLIENT_FLOWS.md](README_WAITER_CLIENT_FLOWS.md)
- **Deployment:** [/DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

**Organizado por:** Claude Sonnet 4.5
**Data:** 2026-02-17
**Status:** ✅ Organização Completa
**Próximo:** Aplicar migrations 039 e 043 em produção
