# Supabase Scripts - Ferramentas e Diagnóstico

Esta pasta contém scripts SQL para diagnóstico, manutenção e desenvolvimento. **NÃO são migrations** e não devem ser executados automaticamente.

---

## 📋 Índice

1. [Scripts de Diagnóstico](#scripts-de-diagnóstico)
2. [Scripts de Cleanup](#scripts-de-cleanup)
3. [Como Usar](#como-usar)
4. [⚠️ Avisos Importantes](#️-avisos-importantes)

---

## Scripts de Diagnóstico

### `CONSOLIDADO_diagnostico_e_fixes.sql`

**Propósito:** Diagnóstico completo e correção de problemas de mesas e sessões

**Conteúdo:**
- **Seção 1:** Diagnóstico de mesa específica (dados, sessões, waiters, customers)
- **Seção 2:** Diagnóstico global (inconsistências, duplicatas, estado geral)
- **Seção 3:** Fixes de sincronização `current_session_id` ↔ sessões
- **Seção 4:** Remoção de mesas duplicadas (COM PREVIEW)
- **Seção 5:** Verificação final após correções

**Quando Usar:**
- Mesa mostra status errado (ocupada mas está livre, ou vice-versa)
- `current_session_id` não corresponde a sessão ativa
- Mesas duplicadas aparecendo no sistema
- Após mudanças na lógica de sessões

**Como Usar:**
1. Abrir Supabase Dashboard SQL Editor
2. Copiar APENAS a seção necessária
3. Seções 1-2: Executar diretamente (apenas SELECT)
4. Seções 3-4: DESCOMENTAR primeiro, fazer BACKUP, depois executar
5. Seção 5: Executar após fixes para verificar sucesso

**Exemplo - Diagnosticar mesa 5:**
```sql
-- Copiar seção 1.1 e trocar número:
SELECT * FROM tables WHERE number = 5;

-- Copiar seção 2.3 para ver duplicatas:
SELECT number, location, COUNT(*) as quantidade
FROM tables WHERE is_active = true
GROUP BY number, location
HAVING COUNT(*) > 1;
```

**⚠️ ATENÇÃO:**
- Seções 3-4 MODIFICAM dados permanentemente
- SEMPRE fazer backup antes
- Usar preview (4.1) antes de executar delete (4.2)
- Testar em ambiente de desenvolvimento primeiro

---

## Scripts de Cleanup

### `CLEANUP_reset_all_tables.sql`

**Propósito:** Reset COMPLETO de todas as tabelas do sistema (DESTRUTIVO)

**O Que Faz:**
- Deleta TODOS os dados de TODAS as tabelas
- Reinicia sequences (IDs voltam para 1)
- Mantém estrutura (tabelas, colunas, RLS policies)
- Mantém usuários do Supabase Auth

**Tabelas Afetadas:**
- `order_item_ratings` → `orders` → `sessions` → `tables`
- `reservations` → `restaurant_closures`
- `waiter_tables` → `waiter_calls`
- `session_customers`
- `customers` → `visits` → `points_transactions`
- `game_sessions` → `game_answers` → `game_questions`
- `email_events`
- `activity_log`

**Quando Usar:**
- Ambiente de desenvolvimento local
- Testes de integração que precisam de estado limpo
- Recomeçar do zero com dados seed

**Como Usar:**
```bash
# 1. BACKUP PRIMEIRO!
pg_dump database_url > backup_$(date +%Y%m%d).sql

# 2. Executar no Supabase SQL Editor ou terminal
psql database_url < supabase/scripts/CLEANUP_reset_all_tables.sql

# 3. Re-seed dados iniciais (se tiver)
npm run seed
```

**⚠️ NUNCA EXECUTAR EM PRODUÇÃO!**

---

### `CLEANUP_reset_location_tables.sql`

**Propósito:** Reset apenas de mesas e sessões de UMA localização específica

**O Que Faz:**
- Deleta dados apenas de uma localização (ex: 'circunvalacao')
- Mantém dados de outras localizações
- Remove: sessões, pedidos, chamadas, atribuições de waiter
- Mantém: produtos, categorias, staff, configurações

**Quando Usar:**
- Limpar dados de testes de uma localização
- Reset de uma localização sem afetar outras
- Desenvolvimento/staging de multi-localização

**Como Usar:**
1. Editar variável `target_location` no início do script:
   ```sql
   DO $$
   DECLARE
     target_location VARCHAR := 'circunvalacao'; -- MUDAR AQUI
   ```

2. Executar no SQL Editor

**Exemplo:**
```sql
-- Para limpar Boavista:
target_location VARCHAR := 'boavista';

-- Para limpar Circunvalação:
target_location VARCHAR := 'circunvalacao';
```

**⚠️ CUIDADO:**
- Operação NÃO pode ser revertida
- Fazer backup primeiro
- Testar em desenvolvimento

---

## Como Usar

### Via Supabase Dashboard (Recomendado)

1. **Aceder ao SQL Editor:**
   ```
   https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new
   ```

2. **Copiar script desejado**

3. **Para scripts de diagnóstico (SEÇÕES 1-2):**
   - Copiar e colar diretamente
   - Executar com "Run"
   - Analisar resultados

4. **Para scripts de fixes (SEÇÕES 3-4) ou cleanup:**
   - ⚠️ **FAZER BACKUP PRIMEIRO!**
   - Descomentar código (remover `/*` e `*/`)
   - Rever comandos cuidadosamente
   - Executar com "Run"
   - Verificar resultados com SEÇÃO 5

### Via CLI (Desenvolvimento Local)

```bash
# 1. Certifique-se que Docker está a correr
docker ps

# 2. Conectar ao Supabase local
npx supabase db reset  # Reset completo com migrations

# 3. Ou executar script específico
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/scripts/CLEANUP_reset_all_tables.sql
```

---

## ⚠️ Avisos Importantes

### NUNCA Execute em Produção (Sem Pensar!)

❌ **NÃO FAÇA:**
```sql
-- Executar CLEANUP em produção sem backup
-- Descomentar SEÇÃO 4 sem verificar preview
-- Executar fixes sem diagnosticar primeiro
```

✅ **FAÇA:**
```sql
-- 1. BACKUP PRIMEIRO
-- 2. Diagnosticar com SEÇÃO 1-2
-- 3. Preview com SEÇÃO 4.1
-- 4. Executar fix em desenvolvimento primeiro
-- 5. Verificar com SEÇÃO 5
-- 6. SÓ DEPOIS aplicar em produção
```

### Ordem de Execução Recomendada

Para resolver problemas de mesas:

1. **Diagnóstico:**
   ```sql
   -- Executar SEÇÃO 2.4 do CONSOLIDADO
   -- Ver estado geral de todas as mesas
   ```

2. **Identificar Problema:**
   - Mesas duplicadas? → SEÇÃO 2.3
   - Sessões órfãs? → SEÇÃO 2.1 e 2.2
   - Mesa específica? → SEÇÃO 1

3. **Fix:**
   ```sql
   -- Se duplicatas: SEÇÃO 4.1 (preview) → 4.2 (execução)
   -- Se inconsistências: SEÇÃO 3
   ```

4. **Verificação:**
   ```sql
   -- Executar SEÇÃO 5
   -- Deve retornar "✅ Tudo OK"
   ```

### Backup Antes de Modificar

```bash
# Backup completo via Supabase Dashboard:
# Settings → Database → Backups → Create Backup

# Ou via CLI (produção):
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup se necessário:
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📚 Scripts Relacionados

### Migrations de Produção
Migrations prontas para produção estão em `/supabase/migrations/`
- Numeradas sequencialmente: 001-043
- Executadas automaticamente via `npx supabase db push`
- Ver: `/supabase/migrations/README.md`

### Dados Seed
Scripts de seed para popular tabelas estão em `/src/scripts/`
- `seed-products.ts` - Produtos do menu
- `seed-staff.ts` - Funcionários iniciais

---

## 🆘 Troubleshooting

### "relation does not exist"
**Problema:** Tabela não existe
**Solução:** Aplicar migrations primeiro (`npx supabase db push`)

### "permission denied"
**Problema:** RLS bloqueando operação
**Solução:** Scripts devem ser executados como `postgres` (superuser) via SQL Editor

### "duplicate key value violates unique constraint"
**Problema:** Já existe registo com mesmo ID/constraint
**Solução:** Usar CLEANUP primeiro ou modificar dados para evitar conflito

### "deadlock detected"
**Problema:** Múltiplos processos a aceder mesma tabela
**Solução:** Fechar todas conexões, aguardar 30s, tentar novamente

---

## 📞 Suporte

**Encontrou problemas?**
1. Ver [RECENT_CHANGES.md](../../RECENT_CHANGES.md) para problemas conhecidos
2. Ver [README_WAITER_CLIENT_FLOWS.md](../../README_WAITER_CLIENT_FLOWS.md) para troubleshooting de fluxos
3. Executar diagnóstico: `CONSOLIDADO_diagnostico_e_fixes.sql` SEÇÃO 1-2

**Projeto:** Sushi in Sushi
**Database:** https://xrmzhvpkvkgoryvfozfy.supabase.co
**Última atualização:** 2026-02-17
