# Supabase Migrations - Sushi in Sushi

Esta pasta contém todas as migrations de base de dados prontas para produção, numeradas sequencialmente.

---

## 📋 Índice Completo de Migrations

### Core System (001-016)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **001** | `user_management.sql` | Staff, roles, autenticação legada | - |
| **002** | `table_management.sql` | Tables, sessions, orders, products | 001 |
| **003** | `reservations.sql` | Sistema de reservas | 001, 002 |
| **004** | `email_tracking.sql` | Tracking de emails enviados | - |
| **005** | `restaurant_closures.sql` | Dias de fecho do restaurante | 001 |
| **007** | `waiter_calls.sql` | Chamadas de assistência | 001, 002 |
| **008** | `session_customers.sql` | Participantes em sessões | 002 |
| **009** | `waiter_calls_order_id.sql` | Link chamadas → pedidos | 007, 002 |
| **010** | `orders_update_policy.sql` | Fix RLS de pedidos | 002 |
| **011** | `supabase_auth_integration.sql` | Integração Supabase Auth | 001 |
| **012** | `update_rls_policies_supabase_auth.sql` | RLS para Supabase Auth | 011 |
| **013** | `auth_security_enhancements.sql` | Melhorias de segurança | 011, 012 |
| **014** | `location_based_rls_policies.sql` | RLS por localização | 001, 002 |
| **015** | `reservation_reminders.sql` | Lembretes de reservas | 003 |
| **016** | `enable_missing_rls.sql` | Enable RLS em tabelas | - |

### Advanced Features (020-023)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **020** | `staff_time_off.sql` | Férias e folgas de staff | 001 |
| **022** | `performance_indexes.sql` | 18 indexes para performance | 002 |
| **023** | `restaurants_table.sql` | Multi-restaurantes dinâmicos | 001, 002 |

### Product & Order Enhancements (024-028)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **024** | `order_cooldown.sql` | Cooldown entre pedidos | 002 |
| **025** | `progressive_registration.sql` | Registo progressivo de clientes | 001 |
| **026** | `product_images_multiple.sql` | Múltiplas imagens por produto | 002 |
| **027** | `products_rls_allow_admin_update.sql` | RLS produtos (admin) | 002 |
| **028** | `product_ratings_for_mesa.sql` | Avaliações de produtos | 002 |

### Games & Gamification (029-033)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **029** | `games.sql` | Sistema de jogos base | 002, 008 |
| **030** | `game_questions_seed.sql` | Perguntas iniciais | 029 |
| **031** | `game_answers_realtime.sql` | Respostas em tempo real | 029 |
| **032** | `unified_game_scoring.sql` | Sistema de pontuação | 029 |
| **033** | `games_mode.sql` | Modos de jogo | 029 |

### Order & Staff Management (034-038)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **034** | `order_prepared_by.sql` | Rastreio de quem preparou | 002 |
| **035** | `order_item_ratings.sql` | Avaliações por item | 002 |
| **036** | `order_delivered_at.sql` | Timestamp de entrega | 002 |
| **037** | `waiter_calls_customer.sql` | Link chamadas → customers | 007, 008 |
| **038** | `identity_verification.sql` | Verificação de identidade | 001 |

### Session & Table Control (039-045)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **039** | `session_ordering_mode.sql` | Controlo de pedidos (waiter/client) | 002 |
| **040** | `waiter_location_filter.sql` | Filtro de localização para waiters | 001, 002 |
| **041** | `fix_waiter_assignments.sql` | Fix de atribuições de waiters | 001, 002 |
| **042** | `enable_auto_assignment.sql` | Auto-atribuição de mesas | 002 |
| **043** | `close_session_update_table.sql` | Função fechar sessão e liberar mesa | 002 |
| **044** | `fix_close_session_function.sql` | Fix tipo UUID na função | 043 |
| **045** | `fix_product_ratings_constraints.sql` | Fix constraints para upsert | 028, 035 |

### Vendus POS Integration (046-049)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **046** | `vendus_integration.sql` | Core Vendus: sync log, retry queue, invoices, payment methods | 002 |
| **047** | `vendus_categories.sql` | `vendus_id` em categorias | 046 |
| **048** | `locations_flexible.sql` | `is_active` em localizações | 046 |
| **049** | `products_location.sql` | `location_id` em produtos | 046 |

### Product Service Modes (050-053)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **050** | `products_service_modes.sql` | Array `service_modes` (dine_in, delivery, takeaway) | 002 |
| **051** | `import_vendus_products.sql` | Import de produtos Vendus (6K linhas, executar separadamente) | 046 |
| **052** | `products_service_prices.sql` | JSONB `service_prices` por modo | 050 |
| **053** | `products_vendus_ids.sql` | JSONB `vendus_ids` por modo de serviço | 046 |

### Kitchen, Ingredients & Billing (054-058)

| # | Nome | Descrição | Dependências |
|---|------|-----------|--------------|
| **054** | `kitchen_zones.sql` | Zonas de cozinha (Quentes, Frios, Bar) | 002 |
| **055** | `ingredients_catalog.sql` | Catálogo de ingredientes + product_ingredients | 002 |
| **056** | `fix_session_status_constraint.sql` | Fix constraint status sessões | 002 |
| **057** | `billing_fields.sql` | Campo `customer_nif` em sessões | 002 |
| **058** | `reservation_table_assignment.sql` | Atribuição de mesas a reservas + alerta waiter | 003 |

---

## 🎯 Migrations Críticas para Produção

### Must-Have (Sistema não funciona sem estas)

✅ **001-002:** Core do sistema (staff, tables, sessions, orders)
✅ **003:** Reservas online
✅ **007-009:** Chamadas de waiter
✅ **022:** Performance indexes (40-60% mais rápido)
✅ **023:** Multi-restaurantes
✅ **043-044:** Fechar sessão corretamente (função close_session_and_free_table)
✅ **056:** Fix constraint de status de sessões

### Important (Features principais)

⚠️ **020:** Gestão de férias
⚠️ **039:** Controlo de pedidos waiter/client
⚠️ **046-049:** Vendus POS integration (faturação)
⚠️ **053:** Vendus IDs por modo de serviço
⚠️ **057:** Campo NIF para faturação
⚠️ **058:** Atribuição de mesas a reservas

### Optional (Gamificação e extras)

🎮 **029-033:** Sistema de jogos
⭐ **028, 035:** Avaliações de produtos
📧 **004, 015:** Email tracking e reminders
🍽️ **054-055:** Zonas de cozinha e ingredientes

---

## 🚀 Como Aplicar Migrations

### Ambiente Local (com Docker)

```bash
# 1. Certifique-se que Docker está a correr
docker ps

# 2. Reset completo (aplica todas migrations)
npx supabase db reset

# 3. Ou push apenas novas migrations
npx supabase db push

# 4. Verificar status
npx supabase migration list
```

### Produção (via Dashboard)

**Método Recomendado:** Supabase Dashboard SQL Editor

1. **Aceder:**
   ```
   https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy/sql/new
   ```

2. **Para cada migration não aplicada:**
   - Abrir ficheiro da migration
   - Copiar conteúdo completo
   - Colar no SQL Editor
   - Clicar "Run"
   - Verificar sucesso (sem erros vermelhos)

3. **Ordem de aplicação:**
   - SEMPRE aplicar em ordem numérica (001 → 002 → 003 → ...)
   - Verificar dependências na tabela acima
   - NÃO saltar números

4. **Verificação:**
   ```sql
   -- Ver todas as tabelas criadas
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Ver indexes criados (após 022)
   SELECT indexname, tablename FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

---

## 📦 Aplicar Migrations Pendentes

### Script Consolidado (RECOMENDADO)

Usar o script consolidado que inclui tudo de 024 a 058 (idempotente, seguro para executar múltiplas vezes):

```
/supabase/scripts/apply-pending-to-prod.sql
```

**Como usar:**
1. Abrir Supabase Dashboard SQL Editor
2. Copiar o conteúdo do script (ou secção por secção se houver timeout)
3. Executar
4. Verificar com as queries no final do script

### Verificação Rápida

```sql
-- Verificar se migrations principais foram aplicadas
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name IN ('ordering_mode', 'customer_nif');

SELECT proname FROM pg_proc WHERE proname = 'close_session_and_free_table';

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('reservation_tables', 'invoices', 'kitchen_zones');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'reservation_settings' AND column_name = 'waiter_alert_minutes';
```

### Nota sobre 051_import_vendus_products.sql

Este ficheiro (6K linhas) contém dados de importação de produtos Vendus. **NÃO está incluído** no script consolidado. Executar separadamente se necessário.

---

## 🔄 Ordem de Dependências (Grafo)

```
001 (Staff/Roles)
 ├─→ 002 (Tables/Sessions/Orders/Products)
 │    ├─→ 003 (Reservations)
 │    │    └─→ 058 (Reservation Table Assignment)
 │    ├─→ 007 (Waiter Calls)
 │    │    ├─→ 009 (Calls → Orders)
 │    │    └─→ 037 (Calls → Customers)
 │    ├─→ 008 (Session Customers)
 │    │    └─→ 029-033 (Games)
 │    ├─→ 022 (Performance Indexes)
 │    ├─→ 023 (Restaurants Table)
 │    ├─→ 024-028 (Order/Product Enhancements)
 │    ├─→ 034-036 (Order Tracking)
 │    ├─→ 039 (Ordering Mode)
 │    ├─→ 040-042 (Waiter Management)
 │    ├─→ 043-044 (Close Session Function)
 │    ├─→ 046-049 (Vendus POS Integration)
 │    │    ├─→ 050-053 (Service Modes & Vendus IDs)
 │    │    └─→ 051 (Import Data - separado)
 │    ├─→ 054-055 (Kitchen Zones & Ingredients)
 │    └─→ 056-057 (Session Fixes & Billing)
 ├─→ 005 (Restaurant Closures)
 ├─→ 011 (Supabase Auth)
 │    ├─→ 012 (RLS Policies)
 │    └─→ 013 (Security)
 ├─→ 014 (Location RLS)
 ├─→ 020 (Staff Time Off)
 └─→ 038 (Identity Verification)

004 (Email Tracking) - Standalone
015 (Reservation Reminders) - Requires 003
016 (Enable Missing RLS) - Standalone
```

---

## 🛠️ Resolução de Problemas

### Migration Falha ao Aplicar

**Sintoma:** Erro ao executar migration
**Causas comuns:**

1. **"relation already exists"**
   - Migration já foi aplicada
   - Verificar com: `\dt` (tabelas) ou `\di` (indexes)
   - Solução: Saltar esta migration

2. **"relation does not exist"**
   - Dependência não aplicada
   - Verificar ordem de migrations
   - Solução: Aplicar migrations anteriores primeiro

3. **"column already exists"**
   - Coluna foi adicionada manualmente
   - Verificar estrutura: `\d+ table_name`
   - Solução: Comentar linha `ADD COLUMN`, manter resto

4. **"permission denied"**
   - RLS a bloquear operação
   - Solução: Executar como postgres (superuser via SQL Editor)

### Rollback de Migration

**⚠️ Migrations NÃO têm rollback automático!**

**Opções:**

1. **Rollback Manual:**
   ```sql
   -- Para migration 039 (ordering_mode):
   ALTER TABLE sessions DROP COLUMN ordering_mode;
   DROP INDEX IF EXISTS idx_sessions_ordering_mode;
   DROP POLICY IF EXISTS "Staff can update session ordering mode" ON sessions;
   ```

2. **Restore Backup:**
   ```bash
   # Se tiver backup antes da migration:
   psql $DATABASE_URL < backup_antes_da_migration.sql
   ```

3. **Reset Completo (⚠️ CUIDADO!):**
   ```bash
   # Apenas desenvolvimento local:
   npx supabase db reset
   ```

---

## 📝 Criar Nova Migration

**Processo:**

1. **Criar ficheiro:**
   ```bash
   # Próximo número: 059
   touch supabase/migrations/059_nome_descritivo.sql
   ```

2. **Template:**
   ```sql
   -- =============================================
   -- Migration: 044_nome_descritivo
   -- Description: [Descrição clara do que faz]
   -- Dependencies: [002, 039, etc]
   -- =============================================

   -- Add column / Create table / etc

   -- RLS Policies

   -- Indexes (se necessário)

   -- Comments for documentation
   COMMENT ON TABLE/COLUMN IS 'Descrição';

   -- =============================================
   -- Verification Query
   -- =============================================
   -- SELECT ... para verificar migration foi aplicada
   ```

3. **Testar localmente:**
   ```bash
   npx supabase db reset
   npm test
   ```

4. **Documentar:**
   - Adicionar linha neste README (seção "Índice Completo")
   - Adicionar ao grafo de dependências
   - Atualizar `RECENT_CHANGES.md`

---

## 📚 Documentação Relacionada

- **Scripts de Diagnóstico:** [/supabase/scripts/README.md](../scripts/README.md)
- **Alterações Recentes:** [/docs/RECENT_CHANGES.md](../../docs/RECENT_CHANGES.md)
- **Script Consolidado Prod:** [/supabase/scripts/apply-pending-to-prod.sql](../scripts/apply-pending-to-prod.sql)
- **Vendus Prod (046-049):** [/supabase/scripts/apply-vendus-to-prod.sql](../scripts/apply-vendus-to-prod.sql)
- **Fluxos:** [/docs/README_WAITER_CLIENT_FLOWS.md](../../docs/README_WAITER_CLIENT_FLOWS.md)
- **Arquitetura:** [/CLAUDE.md](../../CLAUDE.md)

---

## 🔒 Segurança

**Migrations devem sempre:**
- ✅ Manter RLS (Row Level Security) ativo
- ✅ Adicionar policies apropriadas
- ✅ Usar `IF NOT EXISTS` quando possível
- ✅ Documentar com COMMENT ON
- ✅ Incluir query de verificação

**NUNCA:**
- ❌ Desativar RLS sem boa razão
- ❌ Expor dados sensíveis
- ❌ Permitir acesso público sem validação
- ❌ Esquecer indexes em foreign keys

---

**Projeto:** Sushi in Sushi
**Database:** PostgreSQL via Supabase
**Total Migrations:** 58 (000-058, excluindo gaps 006/017-019/021)
**Última atualização:** 2026-02-23
