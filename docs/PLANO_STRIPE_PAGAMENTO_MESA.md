# Plano Stripe - Pagamento na Mesa

> **Data:** 2026-03-05
> **Versao:** 1.0
> **Estado:** Planeamento
> **Prioridade:** Alta (proximo desenvolvimento)

---

## 1. Contexto

### O que existe hoje

O pagamento e **100% presencial via empregado**:

1. Cliente pede conta (botao na `/mesa` ou chama empregado)
2. Empregado abre modal de billing no `/waiter/mesa/[id]`
3. Seleciona metodo de pagamento (Dinheiro, Multibanco, MB Way, Transferencia)
4. Opcionalmente insere NIF para fatura
5. Sistema cria fatura no Vendus POS (fiscal)
6. Sessao fecha, mesa fica livre

**Limitacao:** O cliente nao pode pagar sozinho — precisa sempre do empregado.

### O que queremos

Permitir que o cliente pague **diretamente no telemovel** via Stripe, sem precisar de esperar pelo empregado. O empregado continua a poder fechar sessoes manualmente (cash, Multibanco fisico, etc.).

```
HOJE:   Cliente → Chama empregado → Empregado processa → Pago
FUTURO: Cliente → Paga no telemovel (Stripe) → Auto-encerra
        Cliente → Chama empregado → Empregado processa → Pago (mantido)
```

---

## 2. Arquitetura

### Fluxo Stripe (Self-Checkout)

```
[/mesa/[numero]]
      │
      ├── Cliente clica "Pedir Conta"
      │
      ├── Ve resumo: items, total, gorjeta opcional
      │
      ├── Escolhe: "Pagar agora" (Stripe) ou "Chamar empregado" (presencial)
      │
      ├── [Se Stripe]
      │   ├── POST /api/payments/create-intent
      │   │   ├── Cria Stripe PaymentIntent (amount, currency, metadata)
      │   │   └── Retorna clientSecret
      │   │
      │   ├── Stripe Elements (card input no browser)
      │   │   └── stripe.confirmPayment({ clientSecret })
      │   │
      │   ├── Webhook: POST /api/webhooks/stripe
      │   │   ├── Evento: payment_intent.succeeded
      │   │   ├── Cria fatura Vendus (FS ou FR se NIF)
      │   │   ├── Fecha sessao via RPC close_session_transactional
      │   │   ├── Liberta mesa
      │   │   └── Atualiza customer visit (se customer_id)
      │   │
      │   └── Cliente ve confirmacao na /mesa
      │
      └── [Se empregado]
          └── Fluxo atual mantido (waiter billing modal)
```

### Principio: Webhook-First

O pagamento so e confirmado via **webhook do Stripe**, nunca pelo client-side. Isto garante:
- Pagamentos nao ficam pendentes se o cliente fechar o browser
- Fatura Vendus so e criada apos confirmacao real
- Sessao so fecha quando o dinheiro esta garantido

---

## 3. Base de Dados

### 3.1 Nova tabela: `payments`

```sql
-- Migration: 094_stripe_payments.sql
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referencia local
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id),

    -- Stripe
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_receipt_url TEXT,

    -- Valores
    subtotal DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

    -- Cliente (opcional)
    customer_nif VARCHAR(20),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

    -- Fatura Vendus (preenchida apos pagamento)
    invoice_id UUID REFERENCES invoices(id),

    -- Metadata
    payment_method_type VARCHAR(50),  -- 'card', 'apple_pay', 'google_pay', etc.
    error_message TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Anon pode criar (cliente na mesa) e ler os seus proprios
CREATE POLICY payments_anon_insert ON payments
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY payments_anon_select ON payments
    FOR SELECT TO anon
    USING (true);

-- Staff full access
CREATE POLICY payments_staff_all ON payments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
```

### 3.2 Alteracoes em tabelas existentes

```sql
-- Adicionar metodo 'stripe' a payment_methods
INSERT INTO payment_methods (name, slug, is_active, sort_order)
VALUES ('Stripe (Online)', 'stripe', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Adicionar campo opcional em sessions para tracking
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
    ADD COLUMN IF NOT EXISTS paid_via VARCHAR(20); -- 'stripe', 'cash', 'card', 'mbway', 'transfer'
```

---

## 4. Env Vars (Server-Only)

```env
# Stripe (server-only — nunca NEXT_PUBLIC_)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Chave publica (unica excecao — necessaria para Stripe Elements no browser)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

> **Nota:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e a unica `NEXT_PUBLIC_` necessaria — e a publishable key do Stripe, desenhada para ser publica. Todas as operacoes sensiveis usam `STRIPE_SECRET_KEY` no servidor.

---

## 5. API Routes

### 5.1 POST /api/payments/create-intent

Cria um Stripe PaymentIntent para a sessao.

```typescript
// src/app/api/payments/create-intent/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const { sessionId, tipAmount = 0, customerEmail, customerNif } = await request.json();

  // 1. Validar sessao existe e esta ativa
  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, total_amount, table_id, ordering_mode')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'closed') {
    return NextResponse.json({ error: 'Sessao invalida' }, { status: 400 });
  }

  // 2. Calcular total (subtotal + gorjeta)
  const subtotal = session.total_amount || 0;
  const total = subtotal + tipAmount;

  if (total <= 0) {
    return NextResponse.json({ error: 'Valor invalido' }, { status: 400 });
  }

  // 3. Criar PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100), // centimos
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: {
      session_id: sessionId,
      table_id: session.table_id,
      subtotal: String(subtotal),
      tip_amount: String(tipAmount),
      customer_nif: customerNif || '',
    },
    receipt_email: customerEmail || undefined,
  });

  // 4. Guardar payment record localmente
  await supabase.from('payments').insert({
    session_id: sessionId,
    stripe_payment_intent_id: paymentIntent.id,
    subtotal,
    tip_amount: tipAmount,
    total,
    currency: 'eur',
    customer_nif: customerNif,
    customer_email: customerEmail,
    status: 'pending',
  });

  // 5. Retornar client secret
  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentId: paymentIntent.id,
    total,
  });
}
```

### 5.2 POST /api/webhooks/stripe

Processa eventos do Stripe (payment_intent.succeeded, etc.).

```typescript
// src/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { createInvoice } from '@/lib/vendus/invoices';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  // 1. Verificar assinatura do webhook
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
  }

  // 2. Processar evento
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(pi);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(pi);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(pi: Stripe.PaymentIntent) {
  const sessionId = pi.metadata.session_id;
  const subtotal = parseFloat(pi.metadata.subtotal);
  const tipAmount = parseFloat(pi.metadata.tip_amount);
  const customerNif = pi.metadata.customer_nif || undefined;

  // 1. Atualizar payment record
  await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: pi.latest_charge as string,
      stripe_receipt_url: pi.charges?.data?.[0]?.receipt_url,
      payment_method_type: pi.payment_method_types?.[0] || 'card',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', pi.id);

  // 2. Obter sessao + restaurante para fatura
  const { data: session } = await supabase
    .from('sessions')
    .select('*, tables!inner(restaurant_id, restaurants!inner(slug))')
    .eq('id', sessionId)
    .single();

  const locationSlug = session?.tables?.restaurants?.slug;

  // 3. Criar fatura Vendus (se configurado)
  if (locationSlug) {
    const stripePaymentMethodId = await getOrCreateStripePaymentMethod();

    const invoiceResult = await createInvoice({
      sessionId,
      locationSlug,
      paymentMethodId: stripePaymentMethodId,
      paidAmount: subtotal, // Fatura sem gorjeta (gorjeta nao e tributavel)
      customerNif,
      issuedBy: 'system', // Auto-checkout
    });

    if (invoiceResult.success) {
      await supabase
        .from('payments')
        .update({ invoice_id: invoiceResult.invoiceId })
        .eq('stripe_payment_intent_id', pi.id);
    }
  }

  // 4. Fechar sessao
  await supabase.rpc('close_session_transactional', {
    p_session_id: sessionId,
    p_cancel_orders: false,
    p_close_reason: 'Pagamento online (Stripe)',
  });

  // 5. Atualizar sessao com referencia ao pagamento
  await supabase
    .from('sessions')
    .update({ paid_via: 'stripe' })
    .eq('id', sessionId);

  // 6. Limpar atribuicao de empregado
  if (session?.table_id) {
    await supabase
      .from('waiter_tables')
      .delete()
      .eq('table_id', session.table_id);
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      error_message: pi.last_payment_error?.message || 'Pagamento falhou',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', pi.id);
}
```

### 5.3 GET /api/payments/[sessionId]/status

Polling endpoint para o cliente verificar estado do pagamento.

```typescript
// src/app/api/payments/[sessionId]/status/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { data: payment } = await supabase
    .from('payments')
    .select('status, stripe_receipt_url, invoice_id')
    .eq('session_id', params.sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    status: payment?.status || 'not_found',
    receiptUrl: payment?.stripe_receipt_url,
    invoiceId: payment?.invoice_id,
  });
}
```

---

## 6. Frontend — /mesa/[numero]

### 6.1 Componente de Pagamento

```typescript
// src/components/mesa/PaymentSheet.tsx
'use client';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentSheetProps {
  sessionId: string;
  subtotal: number;
  onSuccess: () => void;
  onCallWaiter: () => void;
}

export function PaymentSheet({ sessionId, subtotal, onSuccess, onCallWaiter }: PaymentSheetProps) {
  const [step, setStep] = useState<'choice' | 'tip' | 'nif' | 'payment' | 'success'>('choice');
  const [tipAmount, setTipAmount] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [wantsNif, setWantsNif] = useState(false);
  const [nif, setNif] = useState('');

  const total = subtotal + tipAmount;

  // Step 1: Escolha — pagar online ou chamar empregado
  // Step 2: Gorjeta opcional (0%, 5%, 10%, 15%, custom)
  // Step 3: NIF opcional
  // Step 4: Stripe Payment Element
  // Step 5: Confirmacao

  const createPaymentIntent = async () => {
    const res = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        tipAmount,
        customerNif: wantsNif ? nif : undefined,
      }),
    });
    const data = await res.json();
    setClientSecret(data.clientSecret);
    setStep('payment');
  };

  if (step === 'choice') {
    return (
      <div>
        <h2>Total: {subtotal.toFixed(2)}€</h2>
        <button onClick={() => setStep('tip')}>Pagar agora</button>
        <button onClick={onCallWaiter}>Chamar empregado</button>
      </div>
    );
  }

  if (step === 'payment' && clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm total={total} onSuccess={() => setStep('success')} />
      </Elements>
    );
  }

  // ... render other steps
}
```

### 6.2 Ecras do fluxo

```
PaymentSheet
├── [choice] "Como quer pagar?"
│   ├── Botao "Pagar agora" (Stripe) → vai para [tip]
│   └── Botao "Chamar empregado" → fluxo atual (waiter call)
│
├── [tip] "Quer deixar gorjeta?" (opcional)
│   ├── Chips: 0% | 5% | 10% | 15% | Outro
│   ├── Mostra: Subtotal + Gorjeta = Total
│   └── Botao "Continuar" → vai para [nif]
│
├── [nif] "Quer fatura com NIF?" (opcional)
│   ├── Toggle: Sim / Nao
│   ├── Se sim: input NIF (9 digitos) + nome
│   └── Botao "Pagar {total}€" → cria PaymentIntent → vai para [payment]
│
├── [payment] Stripe Payment Element
│   ├── Card input (ou Apple Pay / Google Pay)
│   ├── Botao "Confirmar pagamento"
│   └── Apos sucesso → vai para [success]
│
└── [success] "Pagamento confirmado!"
    ├── Checkmark animado
    ├── Numero da fatura (se criada)
    ├── Link para recibo Stripe
    └── "Obrigado pela visita!"
```

---

## 7. Integracao com Vendus

### Fluxo pos-pagamento (webhook)

```
Stripe webhook (payment_intent.succeeded)
    │
    ├── Atualizar payment record → status: 'succeeded'
    │
    ├── Criar fatura Vendus
    │   ├── payment_method: 'stripe' (novo slug)
    │   ├── document_type: 'FR' (se NIF) ou 'FS' (sem NIF)
    │   ├── paid_amount: subtotal (sem gorjeta — gorjeta nao entra na fatura)
    │   └── Se Vendus falhar → retry queue (comportamento existente)
    │
    ├── Fechar sessao → close_session_transactional RPC
    │
    └── Libertar mesa + limpar waiter assignment
```

### Gorjeta e faturacao

A gorjeta **nao entra na fatura Vendus** — e um pagamento adicional que vai diretamente para o Stripe. A fatura e emitida apenas pelo subtotal dos items consumidos, conforme legislacao fiscal portuguesa.

---

## 8. Seguranca

| Aspecto | Implementacao |
|---------|--------------|
| **Chaves Stripe** | `STRIPE_SECRET_KEY` server-only, nunca exposta |
| **Webhook** | Validacao de assinatura via `stripe.webhooks.constructEvent()` |
| **Idempotencia** | PaymentIntent ID como chave unica — webhook duplicado nao reprocessa |
| **Valor** | Calculado no server a partir da sessao, nunca confiado no client |
| **NIF** | Validado server-side (9 digitos) antes de enviar a Vendus |
| **Session locking** | PaymentIntent so criado se sessao ativa; webhook verifica antes de fechar |
| **CSRF** | Stripe Elements usa tokens proprios, sem cookies de sessao |

---

## 9. Dependencias

### Packages NPM

```json
{
  "stripe": "^17.0.0",
  "@stripe/stripe-js": "^5.0.0",
  "@stripe/react-stripe-js": "^3.0.0"
}
```

- `stripe` — SDK server-side (API routes, webhooks)
- `@stripe/stripe-js` — Loader client-side (Stripe Elements)
- `@stripe/react-stripe-js` — Componentes React (PaymentElement, Elements provider)

### Stripe Dashboard Setup

1. Criar conta Stripe (ou usar existente)
2. Ativar metodos de pagamento: Card, Apple Pay, Google Pay, MB Way (se disponivel)
3. Configurar webhook endpoint: `https://sushiinsushi.pt/api/webhooks/stripe`
4. Eventos subscritos: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copiar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 10. Tarefas de Implementacao

| # | Tarefa | Estimativa | Prioridade |
|---|--------|------------|------------|
| 1 | Migration `094_stripe_payments.sql` — tabela `payments`, novo payment_method | 1h | Alta |
| 2 | Instalar packages: `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` | 0.5h | Alta |
| 3 | `POST /api/payments/create-intent` — cria PaymentIntent | 2h | Alta |
| 4 | `POST /api/webhooks/stripe` — webhook handler (succeeded, failed) | 3h | Alta |
| 5 | Integracao Vendus no webhook (fatura apos pagamento) | 2h | Alta |
| 6 | Fecho de sessao automatico no webhook | 1h | Alta |
| 7 | `PaymentSheet` component — UI de pagamento na `/mesa` | 4h | Alta |
| 8 | Stripe Elements integration (PaymentElement) | 2h | Alta |
| 9 | Gorjeta UI (chips 0%/5%/10%/15% + custom) | 1h | Media |
| 10 | NIF input no fluxo de pagamento | 1h | Media |
| 11 | Ecra de sucesso + link para recibo | 1h | Media |
| 12 | `GET /api/payments/[sessionId]/status` — polling de estado | 1h | Media |
| 13 | Real-time update na mesa apos pagamento (Supabase subscription) | 1h | Media |
| 14 | Notificacao ao empregado quando pagamento online conclui | 1h | Media |
| 15 | Tratamento de erros e retry UX (pagamento falhou, tentar de novo) | 2h | Media |
| 16 | Testes: PaymentIntent creation, webhook handler, Vendus integration | 3h | Media |
| 17 | Setup Stripe Dashboard (webhook, metodos, chaves) | 1h | Alta |
| 18 | Teste end-to-end com Stripe test mode | 2h | Alta |
| **Total** | | **~29.5h (~4 dias)** | |

---

## 11. Preparacao para o Futuro

Este design ja suporta evolucoes futuras sem grandes alteracoes:

| Feature Futura | Ja Preparado |
|----------------|-------------|
| **Split bill** | Tabela `payments` suporta multiplos pagamentos por sessao |
| **Pagamento parcial** | `subtotal` + `tip_amount` separados; fatura so sobre subtotal |
| **Apple Pay / Google Pay** | `automatic_payment_methods: { enabled: true }` no PaymentIntent |
| **MB Way via Stripe** | Ativavel no Stripe Dashboard, PaymentElement adapta-se automaticamente |
| **Refunds** | Campo `status: 'refunded'` + Stripe Refund API |
| **Subscricoes** | Stripe Customers + Payment Methods reutilizaveis |
| **Multi-currency** | Campo `currency` na tabela `payments` |
| **Feature flag** | Stripe ativo/inativo via `site_settings.feature_stripe_payments` (quando feature flags implementados) |
| **Mobile (React Native)** | Mesmos API routes; mobile usa Stripe SDK nativo em vez de Elements |

---

## 12. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Cliente paga mas webhook falha | Baixa | Alto | Stripe retenta webhooks ate 3 dias; polling fallback no client |
| Duplo pagamento (webhook duplicado) | Baixa | Alto | Idempotencia via `stripe_payment_intent_id` UNIQUE |
| Fatura Vendus falha apos pagamento | Media | Medio | Retry queue existente; pagamento ja confirmado |
| Cliente fecha browser durante pagamento | Media | Baixo | PaymentIntent persiste no Stripe; webhook processa quando confirma |
| Stripe indisponivel | Muito Baixa | Alto | Fallback: "Chamar empregado" (fluxo atual) sempre disponivel |
| Gorjeta causa confusao fiscal | Baixa | Medio | Gorjeta separada do subtotal; fatura so sobre consumo |

---

> **Proximo passo:** Implementar tarefas 1-8 (core) seguidas de 9-18 (polish + testes).
