# Plano de Deployment

## Indice

1. [Pre-requisitos](#1-pre-requisitos)
2. [Dominio e DNS](#2-dominio-e-dns)
3. [Vercel (Hosting)](#3-vercel-hosting)
4. [Supabase (Base de Dados)](#4-supabase-base-de-dados)
5. [Autenticacao (Staff/Admin)](#5-autenticacao-staffadmin)
6. [Variaveis de Ambiente](#6-variaveis-de-ambiente)
7. [Resend (Email)](#7-resend-email)
8. [Twilio (SMS)](#8-twilio-sms)
9. [Vendus (POS)](#9-vendus-pos)
10. [QR Codes das Mesas](#10-qr-codes-das-mesas)
11. [Cron Jobs](#11-cron-jobs)
12. [Testes Pre-Deploy](#12-testes-pre-deploy)
13. [Deploy](#13-deploy)
14. [Verificacao Pos-Deploy](#14-verificacao-pos-deploy)
15. [Checklist Final](#15-checklist-final)

---

## 1. Pre-requisitos

### Contas necessarias

| Servico | URL | Plano | Para que serve |
|---------|-----|-------|----------------|
| **Vercel** | vercel.com | **Pro ($20/mes)** | Hosting Next.js |
| **Supabase** | supabase.com | Free ou Pro | Base de dados PostgreSQL + Auth + Realtime |
| **Resend** | resend.com | Free (100 emails/dia) ou Pro | Emails de reservas/confirmacao |
| **Twilio** | twilio.com | Pay-as-you-go | SMS de verificacao (opcional) |
| **Vendus** | vendus.pt | Conta existente | POS/faturacao (opcional) |
| **OVHcloud** | ovhcloud.com | **Dominio registado** | Dominio sushinsushi.pt + DNS |

### Confirmar antes de comecar

- [x] Tenho acesso ao painel DNS do dominio sushinsushi.pt (OVHcloud)
- [x] Tenho conta Vercel Pro
- [x] Tenho o projeto Supabase com acesso admin
- [x] Tenho as credenciais Supabase (URL, Anon Key, Service Role Key)
- [ ] Sei as passwords que quero usar para admin/cozinha/empregados

---

## 2. Dominio e DNS

### 2.1 Adicionar dominio no Vercel

1. Ir a **Vercel Dashboard** > Projeto > **Settings** > **Domains**
2. Adicionar: `sushinsushi.pt`
3. Adicionar: `www.sushinsushi.pt`
4. O Vercel vai mostrar os registos DNS necessarios

### 2.2 Configurar DNS na OVHcloud

Ir a **OVHcloud Manager** > **Dominios** > `sushinsushi.pt` > **Zona DNS** e adicionar:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | 300 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 300 |

> Os IPs exatos serao mostrados pelo Vercel. Usar os que o Vercel indicar.

### 2.3 Verificar propagacao

- [ ] Esperar 5-30 minutos pela propagacao DNS
- [ ] Verificar em: https://dnschecker.org/#A/sushinsushi.pt
- [ ] HTTPS e gerado automaticamente pelo Vercel (Let's Encrypt)
- [ ] Redirecionar www -> sem www (ou vice-versa) nas settings do Vercel

### 2.4 Registos DNS para email (necessario para Resend)

Para enviares emails a partir de `reservas@sushinsushi.pt` (e nao acabarem no spam), o Resend precisa de provar que tu autorizas o envio. Isso faz-se adicionando registos DNS no dominio.

**Quando adicionares `sushinsushi.pt` no Resend** (resend.com/domains > Add Domain), ele gera 3 registos para adicionar no painel DNS do registar:

| Tipo | Nome | Para que serve |
|------|------|----------------|
| **TXT** (SPF) | `sushinsushi.pt` | Diz "o Resend esta autorizado a enviar emails por mim" |
| **CNAME** (DKIM) | `resend._domainkey.sushinsushi.pt` | Assinatura digital que prova que o email nao foi alterado |
| **CNAME** (DMARC) | `_dmarc.sushinsushi.pt` | Politica que diz ao Gmail/Outlook o que fazer com emails nao autenticados |

**Passo a passo:**

1. Ir a **resend.com/domains** > **Add Domain** > escrever `sushinsushi.pt`
2. O Resend mostra uma tabela com os registos exatos (nomes e valores)
3. Copiar cada registo e adicionar no painel DNS do registar de dominio
4. Voltar ao Resend e clicar **Verify** — verifica se os registos estao corretos
5. Pode demorar 5 minutos a 48 horas (normalmente e rapido)

**Sem estes registos:** emails vao para spam ou sao bloqueados.
**Com estes registos:** emails chegam ao inbox, remetente verificado, tracking funciona.

### 2.5 Email hosting (OVHcloud Zimbra Starter) — Para receber emails @sushinsushi.pt

O projeto precisa de duas coisas diferentes para email:

| Funcao | Servico | O que faz |
|--------|---------|-----------|
| **Enviar** emails automaticos (reservas, lembretes) | **Resend** | Envia via API, so precisa de registos DNS |
| **Receber** emails em `@sushinsushi.pt` | **OVHcloud Zimbra Starter** | Mailbox real para ler/responder emails |

> **Ja tens Zimbra Starter contratado na OVHcloud!** (incluido na encomenda do dominio)

#### Configurar contas de email no Zimbra

1. Ir a **OVHcloud Manager** > **Emails** > `sushinsushi.pt` > **Zimbra**
2. Criar as contas de email necessarias:

| Endereco | Para que serve |
|----------|----------------|
| `reservas@sushinsushi.pt` | Receber respostas de clientes a emails de reserva |
| `circunvalacao@sushinsushi.pt` | Notificacoes da localizacao Circunvalacao |
| `boavista@sushinsushi.pt` | Notificacoes da localizacao Boavista |
| `info@sushinsushi.pt` | Contacto geral (opcional) |

3. Aceder ao webmail: **https://webmail.mail.ovh.net** (Zimbra)
4. Configurar num cliente de email (Gmail, Outlook, Apple Mail) via IMAP/SMTP:
   - **IMAP:** `ssl0.ovh.net` porta 993 (SSL)
   - **SMTP:** `ssl0.ovh.net` porta 465 (SSL)

> **Zimbra Starter** inclui webmail completo com calendario, contactos e tarefas. Pode tambem ser ligado ao Gmail ou Outlook como conta externa.

---

## 3. Vercel (Hosting)

### 3.1 Ligar repositorio

1. Ir a **vercel.com/new**
2. Importar repositorio Git (GitHub/GitLab)
3. Framework: **Next.js** (detetado automaticamente)
4. Root directory: `.` (raiz)
5. Build command: `npm run build` (ja configurado no package.json)
6. Output directory: `.next` (automatico)

### 3.2 Branch de deploy

| Branch | Ambiente | URL |
|--------|----------|-----|
| `main` | Production | sushinsushi.pt |

### 3.3 Configuracoes do projeto Vercel

- **Node.js Version:** 20.x
- **Framework Preset:** Next.js
- **Build & Development Settings:** Deixar defaults
- **Regions:** Escolher `cdg1` (Paris) ou `lis1` (se disponivel) para menor latencia em Portugal

### 3.4 Plano Pro (ativo)

- 1 TB bandwidth/mes
- Serverless functions: **60s timeout** (importante para Vendus sync)
- Cron jobs: **ilimitados**
- Dominios custom ilimitados
- Preview deployments por branch
- Analytics incluidos
- Firewall (WAF) basico

---

## 4. Supabase (Base de Dados)

### 4.1 Projeto atual

- **URL:** `https://xrmzhvpkvkgoryvfozfy.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/xrmzhvpkvkgoryvfozfy
- **Regiao:** Verificar (idealmente EU West para Portugal)

### 4.2 Migracoes pendentes

Confirmar que TODAS as migracoes estao aplicadas na base de dados de producao.
Ir ao **SQL Editor** no Supabase Dashboard e verificar:

```sql
-- Verificar tabelas existentes
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Migracoes criticas (verificar que existem):**

| # | Migracao | O que faz |
|---|----------|-----------|
| 001 | user_management | Staff, roles, waiter_assignments view |
| 002 | table_management | Tables, sessions, orders |
| 003 | reservations | Reservas, customers |
| 004 | email_tracking | Tracking de emails |
| 005 | restaurant_closures | Dias de fecho |
| 007 | waiter_calls | Chamadas de empregados |
| 022 | performance_indexes | 18 indexes de performance |
| 043 | close_session_fn | Funcao atomica close_session_and_free_table |
| 046-049 | vendus_integration | Tabelas Vendus (sync, config) |
| 050 | products_service_modes | Modos de servico |
| 051 | import_vendus_products | Import produtos CSV |
| 052 | products_service_prices | Precos por modo servico |
| 053 | products_vendus_ids | JSONB vendus_ids multi-mode |

### 4.3 RLS (Row Level Security)

Verificar que RLS esta ativo nas tabelas criticas:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

> **IMPORTANTE:** Algumas API routes usam `createAdminClient()` (service role) para bypass RLS. Isto e intencional para endpoints publicos como criacao de sessoes.

### 4.4 Supabase Auth - Configuracao

1. Ir a **Authentication** > **Providers**
2. Garantir que **Email** esta ativo
3. Ir a **Authentication** > **URL Configuration**:
   - **Site URL:** `https://sushinsushi.pt`
   - **Redirect URLs:** `https://sushinsushi.pt/**`

4. Ir a **Authentication** > **Email Templates**:
   - Personalizar se desejado (confirm, reset password, etc.)

5. Ir a **Authentication** > **Rate Limiting**:
   - Ajustar se necessario (default: 30 requests/hora)

### 4.5 Supabase Realtime

O projeto usa Realtime para:
- Pedidos da cozinha (atualizacao em tempo real)
- Sync de carrinho entre dispositivos na mesa
- Chamadas de empregados
- Tracking de participantes na sessao

Verificar que Realtime esta ativo:
1. **Dashboard** > **Database** > **Replication**
2. Confirmar que as tabelas `orders`, `sessions`, `waiter_calls` estao na lista

### 4.6 Supabase Storage

Usado para imagens de produtos. Verificar:
1. **Dashboard** > **Storage**
2. Bucket `product-images` existe e e publico
3. Politica de acesso permite leitura publica

---

## 5. Autenticacao (Staff/Admin)

### 5.1 Sistema dual de auth

| Ambiente | Modo | Como funciona |
|----------|------|---------------|
| Development | Legacy | Compara password na tabela `staff` |
| **Production** | **Supabase Auth** | Login via Supabase Auth + JWT cookie |

### 5.2 Criar utilizadores no Supabase Auth

Para CADA membro do staff que precisa de acesso ao admin/cozinha/waiter:

1. Ir a **Supabase Dashboard** > **Authentication** > **Users**
2. Clicar **Add user** > **Create new user**
3. Preencher:
   - Email: (deve coincidir com email na tabela `staff`)
   - Password: password segura
   - Auto Confirm: **Yes**

4. Depois de criar, copiar o **User UID**

5. Ligar ao staff no SQL Editor:
```sql
UPDATE staff
SET auth_user_id = 'uuid-do-user-auth-aqui'
WHERE email = 'email@sushinsushi.pt';
```

### 5.3 Staff necessario (minimo)

| Role | Email sugerido | Acesso |
|------|---------------|--------|
| admin | evandro@sushinsushi.pt | /admin/* |
| kitchen | cozinha@sushinsushi.pt | /cozinha |
| waiter | empregado@sushinsushi.pt | /waiter/* |

### 5.4 Verificar roles

```sql
SELECT s.id, s.name, s.email, r.name as role, s.auth_user_id, s.is_active
FROM staff s
JOIN roles r ON s.role_id = r.id
WHERE s.is_active = true
ORDER BY r.name;
```

### 5.5 Se houver problemas de rate limiting

```sql
-- Limpar rate limits bloqueados
DELETE FROM auth.rate_limits
WHERE identifier LIKE '%email-do-user%';
```

---

## 6. Variaveis de Ambiente

### 6.1 Onde configurar

**Vercel Dashboard** > Projeto > **Settings** > **Environment Variables**

### 6.2 Todas as variaveis necessarias

#### Obrigatorias

```env
# ---- Site ----
NEXT_PUBLIC_SITE_URL=https://sushinsushi.pt
NEXT_PUBLIC_APP_URL=https://sushinsushi.pt

# ---- Supabase (Production) ----
NEXT_PUBLIC_SUPABASE_URL=https://xrmzhvpkvkgoryvfozfy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  (copiar do Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=eyJ...      (copiar do Dashboard > Settings > API)

# ---- Autenticacao ----
AUTH_SECRET=<gerar-com-openssl-rand-hex-64>
ADMIN_PASSWORD=<password-segura-admin>
COZINHA_PASSWORD=<password-segura-cozinha>

# ---- Cron Jobs ----
CRON_SECRET=<gerar-com-openssl-rand-hex-32>
```

#### Email (Resend)

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=reservas@sushinsushi.pt
RESTAURANT_EMAIL_1=circunvalacao@sushinsushi.pt
RESTAURANT_EMAIL_2=boavista@sushinsushi.pt
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
# NAO incluir TEST_EMAIL_OVERRIDE em producao!
```

#### SMS (Twilio) - Opcional

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+351xxxxxxxxx
```

#### Vendus POS - Opcional

```env
VENDUS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Session

```env
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30
```

### 6.3 Gerar secrets

```bash
# AUTH_SECRET (64 hex chars)
openssl rand -hex 64

# CRON_SECRET (32 hex chars)
openssl rand -hex 32

# ADMIN_PASSWORD (sugestao)
openssl rand -base64 16
```

### 6.4 Ambientes no Vercel

Configurar as variaveis para os 3 ambientes:

| Variavel | Production | Preview | Development |
|----------|-----------|---------|-------------|
| NEXT_PUBLIC_SITE_URL | https://sushinsushi.pt | (auto) | http://localhost:3000 |
| SUPABASE_SERVICE_ROLE_KEY | prod key | prod key | dev key |
| AUTH_SECRET | secret forte | secret forte | dev secret |
| RESEND_API_KEY | prod key | prod key | test key |

> **IMPORTANTE:** `NEXT_PUBLIC_*` variaveis sao expostas ao browser. Nunca colocar secrets nelas.

---

## 7. Resend (Email)

O sistema envia emails para:
- Confirmacao de reservas (cliente + restaurante)
- Lembretes dia anterior e mesmo dia (cron)
- Cancelamento de reservas
- Email de despedida/agradecimento

### 7.1 Configurar dominio no Resend

1. Ir a **resend.com/domains**
2. Adicionar dominio: `sushinsushi.pt`
3. O Resend vai pedir para adicionar registos DNS:

| Tipo | Nome | Valor |
|------|------|-------|
| **MX** | `send.sushinsushi.pt` | `feedback-smtp.us-east-1.amazonses.com` |
| **TXT** | `send.sushinsushi.pt` | `v=spf1 include:amazonses.com ~all` |
| **CNAME** | `resend._domainkey.sushinsushi.pt` | (valor dado pelo Resend) |

> Os valores exatos serao mostrados pelo Resend. Usar os que eles indicarem.

4. Esperar verificacao (pode demorar ate 48h, normalmente minutos)
5. Testar enviando email de teste no painel Resend

### 7.2 Configurar Webhook (tracking de emails)

1. Ir a **resend.com/webhooks**
2. Criar webhook:
   - **URL:** `https://sushinsushi.pt/api/webhooks/resend`
   - **Eventos:** email.sent, email.delivered, email.opened, email.clicked, email.bounced
3. Copiar o **Signing Secret** -> variavel `RESEND_WEBHOOK_SECRET`

### 7.3 Emails do restaurante

Configurar quem recebe notificacoes de novas reservas (contas criadas na OVHcloud, secao 2.5):
- `RESTAURANT_EMAIL_1` = `circunvalacao@sushinsushi.pt`
- `RESTAURANT_EMAIL_2` = `boavista@sushinsushi.pt`

> Estes emails vao receber notificacao cada vez que um cliente faz uma reserva. Precisam de ser contas reais criadas na OVHcloud (secao 2.5) para poderem ler e responder.

### 7.4 Verificar

- [ ] Dominio verificado no Resend
- [ ] DNS records adicionados (SPF, DKIM, MX)
- [ ] Webhook configurado e secret guardado
- [ ] `FROM_EMAIL` usa dominio verificado (ex: `reservas@sushinsushi.pt`)
- [ ] `TEST_EMAIL_OVERRIDE` **NAO** esta definido em producao

---

## 8. Twilio (SMS) - Opcional

Usado para verificacao de telefone dos clientes na mesa.

### 8.1 Se quiser ativar SMS

1. Criar conta em **twilio.com**
2. Comprar numero portugues (+351)
3. Copiar credenciais:
   - Account SID
   - Auth Token
   - Phone Number

### 8.2 Se NAO quiser SMS

Nao definir as variaveis `TWILIO_*`. O sistema deteta automaticamente e desativa a funcionalidade de verificacao por SMS. A verificacao por email continua a funcionar.

---

## 9. Vendus (POS) - Opcional

Integracao com o sistema de faturacao Vendus.

### 9.1 Se quiser ativar Vendus

1. Obter API Key em **vendus.pt/dashboard/settings/api**
2. Definir variavel `VENDUS_API_KEY`
3. No admin (`/admin/vendus/locations`), configurar por localidade:
   - **Store ID** (encontrar em Vendus > Settings > Stores)
   - **Register ID** (encontrar em Vendus > Settings > Registers)
   - **Vendus Enabled:** ativar

### 9.2 Sync de produtos

Executar apos configuracao:
1. Ir a `/admin/vendus/sync`
2. Fazer "Pull" para importar produtos do Vendus
3. Verificar mapeamento de categorias
4. Testar criacao de fatura

### 9.3 Se NAO quiser Vendus

Nao definir `VENDUS_API_KEY`. A integracao fica inativa automaticamente.

---

## 10. QR Codes das Mesas

### 10.1 Formato dos URLs

Os QR codes apontam para:
```
https://sushinsushi.pt/mesa/{numero}?loc={localizacao}
```

Exemplo: `https://sushinsushi.pt/mesa/5?loc=circunvalacao`

### 10.2 Gerar QR codes

1. Entrar no admin: `https://sushinsushi.pt/admin/definicoes`
2. Tab: **Gestao de Mesas**
3. Selecionar localizacao
4. Clicar **Imprimir QR Codes** (gera PDF com todos os QR codes)

### 10.3 Confirmar

- [ ] `NEXT_PUBLIC_APP_URL` esta definido como `https://sushinsushi.pt`
- [ ] Os QR codes gerados apontam para o dominio correto
- [ ] Testar scan de QR code num telemovel -> abre pagina da mesa

---

## 11. Cron Jobs

### 11.1 Configuracao no Vercel

O ficheiro `vercel.json` ja configura:

```json
{
  "crons": [
    {
      "path": "/api/cron/reservation-reminders",
      "schedule": "0 8-21 * * *"
    }
  ]
}
```

Isto executa lembretes de reservas a cada hora, das 8h as 21h.

### 11.2 Autenticacao dos cron jobs

Os cron jobs sao autenticados com `CRON_SECRET`:
- O Vercel envia automaticamente: `Authorization: Bearer {CRON_SECRET}`
- A variavel tem de estar definida no Vercel

### 11.3 Vendus sync (se aplicavel)

O sync do Vendus pode ser configurado como cron adicional.
Adicionar ao `vercel.json` se quiser sync automatico:

```json
{
  "crons": [
    {
      "path": "/api/cron/reservation-reminders",
      "schedule": "0 8-21 * * *"
    },
    {
      "path": "/api/cron/vendus-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

> **Nota:** Plano Hobby do Vercel limita a 2 cron jobs. Plano Pro permite mais.

---

## 12. Testes Pre-Deploy

### 12.1 Testes automatizados

```bash
# Correr todos os testes
npm run test:run

# Verificar build de producao
npm run build

# Verificar lint
npm run lint
```

### 12.2 Testar localmente em modo producao

```bash
# Correr em modo producao (usa Supabase Auth)
npm run dev:prod
```

Testar:
- [ ] Login admin funciona (`/login`)
- [ ] Dashboard admin carrega (`/admin`)
- [ ] Pagina da cozinha carrega (`/cozinha`)
- [ ] Pagina do waiter carrega (`/waiter`)
- [ ] Pagina da mesa carrega (`/mesa/1?loc=circunvalacao`)
- [ ] Criar sessao funciona
- [ ] Fazer pedido funciona
- [ ] Pedido aparece na cozinha em tempo real
- [ ] Reservas funcionam
- [ ] Email de reserva e enviado

---

## 13. Deploy

### 13.1 Primeiro deploy

1. **Push para o branch `main`** (ou o branch configurado)
2. O Vercel deteta automaticamente e inicia o build
3. O build executa:
   - `vitest run` (testes)
   - `next build` (compilacao)
4. Se o build passa, o deploy e feito automaticamente
5. O site fica disponivel em `sushinsushi.pt`

### 13.2 Se o build falhar

Verificar nos logs do Vercel:
- Erros TypeScript
- Testes a falhar
- Variaveis de ambiente em falta

### 13.3 Deploy manual (alternativa)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy para producao
vercel --prod
```

---

## 14. Verificacao Pos-Deploy

### 14.1 Verificar paginas publicas

- [ ] `https://sushinsushi.pt` -> pagina inicial carrega
- [ ] `https://sushinsushi.pt/pt/reservas` -> formulario de reservas
- [ ] `https://sushinsushi.pt/mesa/1?loc=circunvalacao` -> pagina da mesa

### 14.2 Verificar autenticacao

- [ ] `https://sushinsushi.pt/login` -> pagina de login
- [ ] Login com credenciais admin -> redireciona para `/admin`
- [ ] Login com credenciais cozinha -> redireciona para `/cozinha`
- [ ] Login com credenciais waiter -> redireciona para `/waiter`
- [ ] Acesso direto a `/admin` sem login -> redireciona para `/login`

### 14.3 Verificar funcionalidades

- [ ] **Admin:** Dashboard carrega com dados
- [ ] **Admin:** Gestao de restaurantes funciona
- [ ] **Admin:** Gestao de reservas funciona
- [ ] **Admin:** Gestao de staff funciona
- [ ] **Cozinha:** Pedidos aparecem em tempo real
- [ ] **Waiter:** Mesas atribuidas aparecem
- [ ] **Mesa:** Scan QR code -> abre pagina correta
- [ ] **Mesa:** Iniciar sessao funciona
- [ ] **Mesa:** Fazer pedido funciona
- [ ] **Mesa:** Pedido aparece na cozinha
- [ ] **Mesa:** Pedir conta funciona

### 14.4 Verificar emails

- [ ] Criar reserva teste -> email enviado ao cliente
- [ ] Email enviado ao restaurante
- [ ] Verificar no Resend Dashboard que emails sao entregues
- [ ] Webhook funciona (verificar eventos no Resend)

### 14.5 Verificar realtime

- [ ] Abrir cozinha num browser
- [ ] Fazer pedido noutro browser/telemovel
- [ ] Pedido aparece na cozinha sem refresh

### 14.6 Verificar HTTPS e seguranca

- [ ] Site carrega com HTTPS (cadeado verde)
- [ ] HTTP redireciona para HTTPS
- [ ] Headers de seguranca presentes (verificar em securityheaders.com)
- [ ] `X-Powered-By` nao aparece nos headers

### 14.7 Verificar cron jobs

- [ ] No Vercel Dashboard > **Cron Jobs** -> aparece o job configurado
- [ ] Proxima execucao agendada corretamente
- [ ] Testar manualmente: `curl -H "Authorization: Bearer $CRON_SECRET" https://sushinsushi.pt/api/cron/reservation-reminders`

---

## 15. Checklist Final — Guia Passo a Passo

> Seguir esta checklist por ordem. Cada passo depende do anterior.

---

### PASSO 1: Vercel — Importar projeto

- [ ] Ir a **vercel.com/new**
- [ ] Clicar **Import Git Repository**
- [ ] Selecionar o repositorio do projeto (GitHub/GitLab)
- [ ] Framework Preset: **Next.js** (detetado automaticamente)
- [ ] Root Directory: `.` (raiz, default)
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `.next` (default)
- [ ] **NAO fazer deploy ainda** — clicar em "Cancel" ou simplesmente nao definir variaveis de ambiente (o build vai falhar sem elas, mas o projeto fica criado)
- [ ] Ir a **Settings** > **General** > **Node.js Version**: selecionar `20.x`
- [ ] Ir a **Settings** > **Functions** > **Region**: selecionar `cdg1` (Paris, France) para menor latencia em Portugal

---

### PASSO 2: Vercel — Adicionar dominio

- [ ] Ir a **Settings** > **Domains**
- [ ] Adicionar: `sushinsushi.pt`
- [ ] Adicionar: `www.sushinsushi.pt`
- [ ] **ANOTAR** os registos DNS que o Vercel mostra:
  - Registo **A** para `@` → IP (ex: `76.76.21.21`)
  - Registo **CNAME** para `www` → valor (ex: `cname.vercel-dns.com`)
- [ ] Escolher redirecao: `www.sushinsushi.pt` → `sushinsushi.pt` (recomendado)

---

### PASSO 3: OVHcloud — Configurar DNS para Vercel

- [ ] Ir a **OVHcloud Manager** (ovh.com/manager)
- [ ] Menu lateral: **Nomes de dominio** > `sushinsushi.pt`
- [ ] Clicar no separador **Zona DNS**
- [ ] **Apagar** qualquer registo A existente para `@` (se houver um default da OVH)
- [ ] **Adicionar registo** tipo **A**:
  - Subdominio: _(vazio, ou `@`)_
  - Alvo: IP do Vercel (ex: `76.76.21.21`)
  - TTL: `300` (ou Default)
- [ ] **Adicionar registo** tipo **CNAME**:
  - Subdominio: `www`
  - Alvo: `cname.vercel-dns.com.` (com ponto final)
  - TTL: `300`
- [ ] Esperar 5-30 minutos pela propagacao
- [ ] Verificar propagacao em: https://dnschecker.org/#A/sushinsushi.pt
- [ ] Voltar ao **Vercel** > **Domains** → confirmar que aparece "Valid Configuration" a verde
- [ ] Confirmar que HTTPS (Let's Encrypt) foi emitido automaticamente pelo Vercel

---

### PASSO 4: OVHcloud Zimbra — Criar contas de email

- [ ] Ir a **OVHcloud Manager** > **Emails** > `sushinsushi.pt`
- [ ] Entrar na interface **Zimbra** (pode demorar ate 24h apos ativacao)
- [ ] Criar conta: `reservas@sushinsushi.pt`
  - Nome: Reservas Sushi in Sushi
  - Password: escolher password forte
- [ ] Criar conta: `circunvalacao@sushinsushi.pt`
  - Nome: Circunvalacao Sushi in Sushi
  - Password: escolher password forte
- [ ] Criar conta: `boavista@sushinsushi.pt`
  - Nome: Boavista Sushi in Sushi
  - Password: escolher password forte
- [ ] Criar conta: `info@sushinsushi.pt` (opcional)
  - Nome: Info Sushi in Sushi
  - Password: escolher password forte
- [ ] Testar login em **https://webmail.mail.ovh.net** com `reservas@sushinsushi.pt`
- [ ] Enviar email teste de `reservas@sushinsushi.pt` para um email pessoal
- [ ] Confirmar que o email chega (nao vai para spam)
- [ ] (Opcional) Configurar num cliente de email:
  - **IMAP:** Servidor `ssl0.ovh.net`, porta `993`, SSL/TLS
  - **SMTP:** Servidor `ssl0.ovh.net`, porta `465`, SSL/TLS
  - Utilizador: endereco de email completo
  - Password: a que definiu ao criar a conta

---

### PASSO 5: Resend — Verificar dominio para envio de emails

- [ ] Ir a **resend.com** > fazer login (ou criar conta)
- [ ] Ir a **Domains** (resend.com/domains)
- [ ] Clicar **Add Domain**
- [ ] Escrever: `sushinsushi.pt`
- [ ] O Resend mostra uma tabela com 3-4 registos DNS. **ANOTAR TODOS:**
  - Registo **TXT** (SPF) — nome e valor
  - Registo **CNAME** (DKIM) — nome e valor
  - Registo **TXT** ou **CNAME** (DMARC) — nome e valor
  - Registo **MX** (opcional) — nome e valor
- [ ] Ir a **OVHcloud Manager** > **Zona DNS** de `sushinsushi.pt`
- [ ] Adicionar CADA registo que o Resend pediu:
  - Para **TXT**: tipo TXT, subdominio e valor exatos do Resend
  - Para **CNAME**: tipo CNAME, subdominio e valor exatos do Resend (com ponto final)
  - Para **MX** (se pedido): tipo MX, subdominio e valor do Resend
- [ ] Voltar ao **Resend** > **Domains** > clicar **Verify** no dominio `sushinsushi.pt`
- [ ] Esperar verificacao (normalmente 5-15 minutos, pode demorar ate 48h)
- [ ] Status do dominio fica **Verified** a verde
- [ ] Ir a **API Keys** (resend.com/api-keys)
- [ ] Clicar **Create API Key**
  - Nome: `sushinsushi-production`
  - Permissoes: **Full Access**
- [ ] **COPIAR** a API key (so aparece uma vez!) → `RESEND_API_KEY`

---

### PASSO 6: Resend — Configurar webhook de tracking

- [ ] Ir a **resend.com/webhooks**
- [ ] Clicar **Add Webhook**
- [ ] URL: `https://sushinsushi.pt/api/webhooks/resend`
- [ ] Selecionar eventos:
  - [x] `email.sent`
  - [x] `email.delivered`
  - [x] `email.opened`
  - [x] `email.clicked`
  - [x] `email.bounced`
  - [x] `email.complained`
- [ ] Clicar **Create**
- [ ] **COPIAR** o Signing Secret → `RESEND_WEBHOOK_SECRET`

---

### PASSO 7: Gerar secrets de seguranca

Correr no terminal (ou em qualquer computador):

```bash
# AUTH_SECRET (128 caracteres hex)
openssl rand -hex 64

# CRON_SECRET (64 caracteres hex)
openssl rand -hex 32

# ADMIN_PASSWORD (sugestao — ou escolher manualmente)
openssl rand -base64 16
```

- [ ] Gerar `AUTH_SECRET` → **GUARDAR**
- [ ] Gerar `CRON_SECRET` → **GUARDAR**
- [ ] Escolher `ADMIN_PASSWORD` (password para login admin em producao)
- [ ] Escolher `COZINHA_PASSWORD` (password para login da cozinha)
- [ ] Guardar todas as passwords num local seguro (gestor de passwords recomendado)

---

### PASSO 8: Supabase — Verificar base de dados

- [ ] Ir a **supabase.com/dashboard** > projeto `xrmzhvpkvkgoryvfozfy`
- [ ] Ir a **SQL Editor**
- [ ] Verificar que todas as tabelas existem:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
- [ ] Confirmar que existem (minimo): `categories`, `customers`, `orders`, `products`, `reservations`, `reservation_settings`, `restaurants`, `restaurant_closures`, `roles`, `sessions`, `staff`, `staff_time_off`, `tables`, `waiter_calls`, `waiter_tables`
- [ ] Se faltarem tabelas, aplicar migracoes no SQL Editor (ver secao 4.2)
- [ ] Verificar que RLS esta ativo:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
```
- [ ] Ir a **Database** > **Replication** > confirmar que Realtime esta ativo para: `orders`, `sessions`, `waiter_calls`
- [ ] Ir a **Storage** > confirmar que bucket `product-images` existe e e publico

---

### PASSO 9: Supabase — Configurar autenticacao

- [ ] Ir a **Authentication** > **Providers** > confirmar que **Email** esta ativo
- [ ] Ir a **Authentication** > **URL Configuration**:
  - Site URL: `https://sushinsushi.pt`
  - Redirect URLs: adicionar `https://sushinsushi.pt/**`
- [ ] Ir a **Authentication** > **Users** > **Add user** > **Create new user**
- [ ] Criar utilizador **admin**:
  - Email: `evandro@sushinsushi.pt` (ou email do admin real)
  - Password: password forte
  - Auto Confirm User: **Yes**
  - **COPIAR o UUID** do user criado
- [ ] No **SQL Editor**, ligar ao staff:
```sql
UPDATE staff SET auth_user_id = 'UUID-DO-ADMIN-AQUI'
WHERE email = 'evandro@sushinsushi.pt';
```
- [ ] Criar utilizador **cozinha**:
  - Email: `cozinha@sushinsushi.pt`
  - Password: password forte
  - Auto Confirm User: **Yes**
  - **COPIAR o UUID**
- [ ] Ligar ao staff:
```sql
UPDATE staff SET auth_user_id = 'UUID-DA-COZINHA-AQUI'
WHERE email = 'cozinha@sushinsushi.pt';
```
- [ ] Criar utilizador **waiter** (repetir para cada empregado):
  - Email: `empregado@sushinsushi.pt` (ou email real do empregado)
  - Password: password forte
  - Auto Confirm User: **Yes**
  - **COPIAR o UUID**
- [ ] Ligar ao staff:
```sql
UPDATE staff SET auth_user_id = 'UUID-DO-EMPREGADO-AQUI'
WHERE email = 'empregado@sushinsushi.pt';
```
- [ ] Verificar que todos os links estao corretos:
```sql
SELECT s.id, s.name, s.email, r.name as role, s.auth_user_id, s.is_active
FROM staff s JOIN roles r ON s.role_id = r.id
WHERE s.is_active = true ORDER BY r.name;
```
- [ ] Confirmar que TODOS os staff ativos tem `auth_user_id` preenchido (nao NULL)
- [ ] Copiar credenciais de **Settings** > **API**:
  - **COPIAR** Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - **COPIAR** `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **COPIAR** `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

---

### PASSO 10: Vercel — Configurar variaveis de ambiente

- [ ] Ir a **Vercel Dashboard** > Projeto > **Settings** > **Environment Variables**
- [ ] Adicionar cada variavel abaixo (Environment: **Production + Preview + Development**):

**Site:**
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://sushinsushi.pt`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://sushinsushi.pt`
- [ ] `NEXT_PUBLIC_APP_ENV` = `production`

**Supabase:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = _(copiado do Passo 9)_
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = _(copiado do Passo 9)_
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = _(copiado do Passo 9)_

**Autenticacao:**
- [ ] `AUTH_SECRET` = _(gerado no Passo 7)_
- [ ] `ADMIN_PASSWORD` = _(escolhido no Passo 7)_
- [ ] `COZINHA_PASSWORD` = _(escolhido no Passo 7)_
- [ ] `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` = `30`

**Cron Jobs:**
- [ ] `CRON_SECRET` = _(gerado no Passo 7)_

**Email (Resend):**
- [ ] `RESEND_API_KEY` = _(copiado no Passo 5)_
- [ ] `FROM_EMAIL` = `reservas@sushinsushi.pt`
- [ ] `RESTAURANT_EMAIL_1` = `circunvalacao@sushinsushi.pt`
- [ ] `RESTAURANT_EMAIL_2` = `boavista@sushinsushi.pt`
- [ ] `RESEND_WEBHOOK_SECRET` = _(copiado no Passo 6)_
- [ ] Confirmar que **`TEST_EMAIL_OVERRIDE` NAO esta definido** (apagar se existir!)

**Vendus (opcional — so se quiser faturacao):**
- [ ] `VENDUS_API_KEY` = _(da conta Vendus, se aplicavel)_

**Twilio (opcional — so se quiser SMS):**
- [ ] `TWILIO_ACCOUNT_SID` = _(da conta Twilio, se aplicavel)_
- [ ] `TWILIO_AUTH_TOKEN` = _(da conta Twilio, se aplicavel)_
- [ ] `TWILIO_PHONE_NUMBER` = _(numero Twilio +351..., se aplicavel)_

- [ ] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` **NAO** tem prefixo `NEXT_PUBLIC_` (nunca expor ao browser!)
- [ ] Contar: pelo menos **12 variaveis obrigatorias** configuradas

---

### PASSO 11: Testar localmente em modo producao

Antes de fazer deploy, testar no computador:

```bash
npm run dev:prod
```

- [ ] Build inicia sem erros
- [ ] Abrir `http://localhost:3000/login`
- [ ] Login com email e password do admin → redireciona para `/admin`
- [ ] Dashboard admin carrega com dados
- [ ] Abrir `/cozinha` → display da cozinha carrega
- [ ] Abrir `/waiter` → painel do empregado carrega
- [ ] Abrir `/mesa/1?loc=circunvalacao` → pagina da mesa carrega
- [ ] Criar sessao numa mesa → funciona sem erros
- [ ] Fazer pedido → pedido aparece na cozinha em tempo real
- [ ] Criar reserva → email enviado (verificar no Resend dashboard)

---

### PASSO 12: Correr testes e build

```bash
# Testes automatizados
npm run test:run

# Build de producao
npm run build

# Lint
npm run lint
```

- [ ] Todos os testes passam (598+ testes)
- [ ] Build completa sem erros
- [ ] Lint passa sem erros criticos

---

### PASSO 13: Deploy

- [ ] Fazer merge/push para branch `main`
- [ ] Ir ao **Vercel Dashboard** > **Deployments**
- [ ] Verificar que o build inicia automaticamente
- [ ] Esperar que o build complete (2-5 minutos)
- [ ] Status: **Ready** a verde
- [ ] Se o build falhar:
  - Verificar logs no Vercel > **Deployments** > clicar no deploy > **Build Logs**
  - Erros comuns: variavel de ambiente em falta, erro TypeScript, teste a falhar
  - Corrigir, fazer push novamente

---

### PASSO 14: Verificacao pos-deploy — Paginas publicas

- [ ] Abrir `https://sushinsushi.pt` → pagina inicial carrega
- [ ] Abrir `https://www.sushinsushi.pt` → redireciona para `sushinsushi.pt`
- [ ] Abrir `https://sushinsushi.pt/pt/reservas` → formulario de reservas funciona
- [ ] Abrir `https://sushinsushi.pt/mesa/1?loc=circunvalacao` → pagina da mesa
- [ ] Verificar cadeado HTTPS verde no browser
- [ ] Verificar headers de seguranca: abrir https://securityheaders.com e testar `sushinsushi.pt`
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security: presente
  - [ ] Content-Security-Policy: presente

---

### PASSO 15: Verificacao pos-deploy — Autenticacao

- [ ] Abrir `https://sushinsushi.pt/login`
- [ ] Login com credenciais **admin** → redireciona para `/admin`
- [ ] Verificar que o dashboard carrega com dados
- [ ] Logout
- [ ] Login com credenciais **cozinha** → redireciona para `/cozinha`
- [ ] Verificar que pedidos aparecem
- [ ] Logout
- [ ] Login com credenciais **waiter** → redireciona para `/waiter`
- [ ] Verificar que mesas atribuidas aparecem
- [ ] Logout
- [ ] Tentar aceder `https://sushinsushi.pt/admin` sem login → redireciona para `/login`

---

### PASSO 16: Verificacao pos-deploy — Funcionalidades core

**Mesa (QR code):**
- [ ] Scan QR code num telemovel → abre pagina correta (`/mesa/{numero}?loc=...`)
- [ ] Iniciar sessao → funciona
- [ ] Ver menu → produtos carregam com imagens
- [ ] Adicionar items ao carrinho → funciona
- [ ] Fazer pedido → confirmacao aparece
- [ ] Pedir conta → estado muda para "pending_payment"

**Cozinha (tempo real):**
- [ ] Abrir `/cozinha` num browser
- [ ] Fazer pedido noutro browser/telemovel
- [ ] Pedido aparece na cozinha **sem refresh** (tempo real)
- [ ] Avançar pedido: "Na fila" → "A preparar" → "Pronto para servir"
- [ ] Nome do empregado aparece no cartao (👤 icon)

**Waiter:**
- [ ] Abrir `/waiter` → mesas atribuidas aparecem
- [ ] Clicar numa mesa → ver pedidos
- [ ] Pedidos "Pronto para servir" aparecem
- [ ] Marcar como entregue → funciona

**Admin:**
- [ ] Dashboard carrega com estatisticas
- [ ] Gestao de restaurantes funciona
- [ ] Gestao de mesas funciona
- [ ] Gestao de reservas funciona
- [ ] Gestao de staff funciona
- [ ] Gestao de categorias/produtos funciona
- [ ] Settings carregam

**Reservas:**
- [ ] Criar reserva de teste via formulario publico
- [ ] Email de confirmacao chega ao cliente
- [ ] Email de notificacao chega ao restaurante (`circunvalacao@` ou `boavista@`)
- [ ] Verificar no **Resend Dashboard** que emails foram entregues (status: "Delivered")
- [ ] Apagar reserva de teste

---

### PASSO 17: Verificacao pos-deploy — Cron jobs

- [ ] Ir ao **Vercel Dashboard** > **Cron Jobs**
- [ ] Confirmar que `reservation-reminders` aparece
- [ ] Proxima execucao agendada corretamente (a cada hora, 8h-21h)
- [ ] Testar manualmente (no terminal):
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://sushinsushi.pt/api/cron/reservation-reminders
```
- [ ] Resposta: 200 OK (sem erros)

---

### PASSO 18: Vendus POS (opcional — so se aplicavel)

- [ ] Definir `VENDUS_API_KEY` nas variaveis do Vercel (se ainda nao foi feito)
- [ ] Ir a `/admin/vendus/locations` no site
- [ ] Para cada localizacao, configurar:
  - **Store ID** (encontrar em Vendus > Settings > Stores)
  - **Register ID** (encontrar em Vendus > Settings > Registers)
  - Ativar **Vendus Enabled**
- [ ] Ir a `/admin/vendus/sync`
- [ ] Testar **Pull** (importar produtos do Vendus)
- [ ] Verificar que produtos importados aparecem corretamente
- [ ] Testar criacao de fatura (fazer pedido teste + fechar sessao)

---

### PASSO 19: Twilio SMS (opcional — so se aplicavel)

- [ ] Criar conta em **twilio.com** (se ainda nao tem)
- [ ] Comprar numero portugues (+351)
- [ ] Definir no Vercel:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` (formato: `+351xxxxxxxxx`)
- [ ] Testar: iniciar sessao numa mesa com verificacao por telefone
- [ ] SMS chega ao telemovel com codigo de verificacao

---

### PASSO 20: Backup e monitorizacao

- [ ] (Recomendado) Criar conta gratuita em **uptimerobot.com**
- [ ] Adicionar monitor HTTP para `https://sushinsushi.pt` (verifica a cada 5 min)
- [ ] Configurar alerta por email se site ficar offline
- [ ] (Opcional) Se usar Supabase Pro: verificar que backups automaticos estao ativos
- [ ] (Opcional) Agendar export manual semanal dos dados criticos:
```sql
-- No SQL Editor do Supabase, exportar como CSV:
SELECT * FROM reservations WHERE created_at > NOW() - INTERVAL '7 days';
SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days';
SELECT * FROM customers;
```

---

### RESUMO: O que ja tens vs o que falta

**Ja tens (pago):**
- [x] Dominio `sushinsushi.pt` (OVHcloud)
- [x] DNS Zone (OVHcloud)
- [x] Zimbra Starter — email hosting (OVHcloud)
- [x] Vercel Pro ($20/mes)
- [x] Supabase (projeto ativo)
- [x] Codigo do projeto pronto

**Falta configurar (gratis):**
- [ ] Conta Resend (gratis ate 100 emails/dia)
- [ ] Registos DNS na OVHcloud (A, CNAME para Vercel + SPF, DKIM para Resend)
- [ ] Contas de email no Zimbra
- [ ] Utilizadores no Supabase Auth
- [ ] Variaveis de ambiente no Vercel
- [ ] Deploy para `main`

**Opcional:**
- [ ] Conta Twilio (se quiser SMS)
- [ ] Configuracao Vendus (se quiser faturacao POS)

---

## Notas Importantes

### Custos estimados (mensal)

| Servico | Plano | Custo |
|---------|-------|-------|
| **Vercel Pro** | Ativo | **$20/mes** |
| **OVHcloud** | Dominio sushinsushi.pt | **~10 EUR/ano** |
| **OVHcloud Zimbra Starter** | Email @sushinsushi.pt | **Ja contratado** (~2 EUR/mes) |
| Supabase Free | 500 MB, 50k rows | 0 EUR |
| Supabase Pro | Se precisar (backups, mais storage) | $25/mes |
| Resend Free | 100 emails/dia | 0 EUR |
| Resend Pro | Se precisar mais volume | $20/mes |
| Twilio | Pay-as-you-go (opcional) | ~0.05 EUR/SMS |

**Custo atual: ~$20/mes** (Vercel Pro) + ~10 EUR/ano (dominio OVH) + ~2 EUR/mes (Zimbra Starter)

### Backup

- Supabase Free nao tem backups automaticos
- Supabase Pro tem backups diarios (7 dias retencao)
- Considerar export manual periodico dos dados criticos

### Monitorizacao

- **Vercel:** Logs e analytics no dashboard
- **Supabase:** Logs no dashboard > Logs
- **Resend:** Dashboard mostra emails enviados/bounced
- Considerar adicionar monitoring externo (ex: UptimeRobot gratis)

### Rollback

Se algo correr mal apos deploy:
1. **Vercel:** Ir a Deployments > clicar num deploy anterior > "Promote to Production"
2. O rollback e instantaneo

### Atualizacoes futuras

1. Push para `main` -> deploy automatico
2. Usar branches para features/fixes
3. Preview deployments em branches nao-main
4. Testar na preview URL antes de merge para main
