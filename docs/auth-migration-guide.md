# Guia de Migração de Autenticação

Este documento descreve como completar a migração de JWT custom para Supabase Auth e as melhorias de segurança implementadas.

## Estado Atual

O sistema atualmente suporta dois modos de autenticação, controlados pela feature flag:

```env
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
```

## Passos para Migração Completa

### 1. Migrar Utilizadores para Supabase Auth

Execute o script de migração para criar utilizadores no Supabase Auth:

```bash
npx ts-node scripts/migrate-staff-to-supabase-auth.ts
```

Este script:
- Cria utilizadores no `auth.users` do Supabase
- Liga cada staff record via `auth_user_id`
- Preserva as passwords existentes (hash bcrypt)

### 2. Ativar Supabase Auth

```env
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
```

### 3. Aplicar Migrações de Base de Dados

```bash
npx supabase db push
```

Migrações incluídas:
- `011_supabase_auth_integration.sql` - Funções helper para Supabase Auth
- `012_update_rls_policies_supabase_auth.sql` - RLS policies atualizadas
- `013_auth_security_enhancements.sql` - Audit log, rate limiting, MFA
- `014_location_based_rls_policies.sql` - Restrições por localização

### 4. Remover Sistema Legado

Após verificar que tudo funciona:

#### Ficheiros a remover:
```
src/lib/auth/token.ts        # JWT token creation/verification
src/lib/auth/cookie.ts       # Legacy cookie management
src/lib/auth/login.ts        # Legacy login function
```

#### Variáveis de ambiente a remover:
```
AUTH_SECRET
ADMIN_PASSWORD
COZINHA_PASSWORD
```

#### Código a limpar no AuthContext:
- Remover `loginLegacy` e `refreshUserLegacy`
- Remover `USE_SUPABASE_AUTH` feature flag
- Simplificar `login` e `logout` functions

## Funcionalidades de Segurança Implementadas

### 1. Rate Limiting

Previne ataques de brute force:
- **Por IP**: 5 tentativas / 15 minutos
- **Por Email**: 10 tentativas / 30 minutos
- **Bloqueio**: 30-60 minutos após exceder limites

### 2. Audit Log

Regista todos os eventos de autenticação:
- `login_success` / `login_failed`
- `logout`
- `mfa_enrolled` / `mfa_verified` / `mfa_failed`
- `new_ip_login` (alerta para IPs novos)
- `account_locked` / `account_unlocked`

### 3. MFA (Multi-Factor Authentication)

- **Obrigatório** para admins
- **Opcional** para outros roles
- Usa TOTP (Google Authenticator, Authy, etc.)

### 4. Session Timeout por Role

| Role     | Session | Inatividade |
|----------|---------|-------------|
| Admin    | 4h      | 30min       |
| Kitchen  | 12h     | 2h          |
| Waiter   | 12h     | 2h          |
| Customer | 24h     | 1h          |

### 5. RLS Policies por Localização

- Staff só vê dados da sua localização
- Waiters só veem mesas atribuídas
- Kitchen só vê pedidos pending/preparing
- Admins veem tudo

## Compatibilidade com React Native

### O Que Funciona Sem Alterações

A arquitetura com Supabase Auth é **ideal para React Native**:

1. **Supabase SDK para React Native**
   ```bash
   npm install @supabase/supabase-js @react-native-async-storage/async-storage
   ```

2. **Autenticação Funciona Igual**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import AsyncStorage from '@react-native-async-storage/async-storage'

   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false, // Importante para RN
     },
   })
   ```

3. **Login Idêntico**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password,
   })
   ```

4. **RLS Policies Funcionam Automaticamente**
   - As mesmas policies aplicam-se
   - `auth.uid()` funciona igual no SDK mobile

5. **Real-time Funciona**
   ```typescript
   supabase
     .channel('orders')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
     .subscribe()
   ```

### O Que Precisa de Adaptação

1. **APIs Server-Side** (`/api/*`)
   - As APIs de rate limiting e audit log estão no Next.js
   - Para React Native, há duas opções:

   **Opção A: Usar as mesmas APIs (Recomendado)**
   ```typescript
   // App React Native chama APIs do backend Next.js
   const response = await fetch('https://sushinsushi.pt/api/auth/secure-login', {
     method: 'POST',
     body: JSON.stringify({ email, password }),
   })
   ```

   **Opção B: Duplicar lógica no Supabase Edge Functions**
   ```typescript
   // Criar Edge Function para login seguro
   // supabase/functions/secure-login/index.ts
   ```

2. **MFA com TOTP**
   - Funciona igual, mas precisa de UI diferente
   - Usar `expo-camera` ou `react-native-camera` para QR code

3. **Biometria (Recomendado para Mobile)**
   ```typescript
   import * as LocalAuthentication from 'expo-local-authentication'

   // Após login inicial, guardar refresh token com biometria
   const result = await LocalAuthentication.authenticateAsync({
     promptMessage: 'Autenticar com Face ID',
   })
   ```

### Estrutura Recomendada para React Native

```
apps/
├── web/                 # Next.js (site + reservas)
│   └── src/
│       ├── app/
│       └── lib/supabase/
│
├── mobile/              # React Native (staff apps)
│   └── src/
│       ├── lib/
│       │   └── supabase.ts   # Config com AsyncStorage
│       ├── contexts/
│       │   └── AuthContext.tsx  # Versão adaptada
│       └── screens/
│
└── shared/              # Código partilhado (opcional)
    └── types/           # TypeScript types
```

### Vantagens da Arquitetura Atual

1. **Uma única fonte de verdade** - Supabase Auth
2. **RLS automático** - Segurança no nível da base de dados
3. **Real-time built-in** - Mesmo sistema web e mobile
4. **Tokens JWT standard** - Funcionam em qualquer cliente
5. **Offline support** - AsyncStorage persiste sessão

### Migração Gradual

Podes migrar para React Native gradualmente:

1. **Fase 1**: Manter Next.js, adicionar app React Native
2. **Fase 2**: App RN usa APIs existentes do Next.js
3. **Fase 3**: Mover lógica crítica para Edge Functions (se necessário)

O site público e sistema de reservas podem continuar em Next.js enquanto as apps de staff (cozinha, waiter) migram para React Native.
