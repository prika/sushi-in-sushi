# Plano de Implementacao: Modulo de Delivery

> **Data:** 2026-03-05
> **Estado:** Aprovado para implementacao
> **Estimativa:** ~44 ficheiros novos + 3 modificacoes

---

## Indice

1. [Contexto e Decisoes](#1-contexto-e-decisoes)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Fase 0 - Base de Dados](#3-fase-0---base-de-dados)
4. [Fase 1 - Domain Layer](#4-fase-1---domain-layer)
5. [Fase 2 - Application Layer](#5-fase-2---application-layer)
6. [Fase 3 - Infrastructure Layer](#6-fase-3---infrastructure-layer)
7. [Fase 4 - Integracoes Externas](#7-fase-4---integracoes-externas)
8. [Fase 5 - API Routes e Webhooks](#8-fase-5---api-routes-e-webhooks)
9. [Fase 6 - Presentation Layer](#9-fase-6---presentation-layer)
10. [Fase 7 - Frontend Pages](#10-fase-7---frontend-pages)
11. [Fase 8 - Integracao Cozinha](#11-fase-8---integracao-cozinha)
12. [Fase 9 - Testes](#12-fase-9---testes)
13. [Variaveis de Ambiente](#13-variaveis-de-ambiente)
14. [Dependencias npm](#14-dependencias-npm)
15. [Lista Completa de Ficheiros](#15-lista-completa-de-ficheiros)
16. [Fluxo Completo End-to-End](#16-fluxo-completo-end-to-end)
17. [Verificacao e Testes](#17-verificacao-e-testes)

---

## 1. Contexto e Decisoes

### O que ja existe
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + Realtime) configurado
- Vercel (deploy) configurado
- Vendus integrado para faturacao e gestao de produtos/precos
- Clean Architecture completa (Domain → Application → Infrastructure → Presentation)
- Produtos ja tem `service_modes: string[]` e `service_prices: Record<string, number>` para precos por modo
- Sistema de pedidos baseado em sessoes de mesa (orders → sessions → tables)

### Decisoes tomadas

| Decisao | Escolha | Razao |
|---------|---------|-------|
| Modelo de dados | Tabela `delivery_orders` separada | Ciclo de vida diferente (pagamento primeiro, morada, estafeta) |
| Faturacao | InvoiceXpress + Vendus configuraveis | Env var `INVOICE_PROVIDER` seleciona o provider |
| Stripe | Conta unica (sem Connect) | Empresa unica, sem split de pagamentos |
| Frontend | Nova pagina publica `/[locale]/encomendar` | Integrada no site existente |

### Regras fundamentais
- NAO alterar codigo existente (so adicionar)
- TypeScript estrito em tudo
- RLS no Supabase para novas tabelas
- Tratar todos os erros das APIs externas
- Guardar logs de erros no Supabase

---

## 2. Arquitetura Geral

### Fluxo de dependencias (Clean Architecture)

```
Frontend Pages (/[locale]/encomendar, /cozinha)
    |
Presentation Hooks (useDeliveryOrder, useDeliveryTracking)
    |
Application Use Cases (CreateDeliveryOrderUseCase, ConfirmPaymentUseCase, ...)
    |
Domain Entities + Interfaces (DeliveryOrder, IDeliveryOrderRepository)
    ^
Infrastructure (SupabaseDeliveryOrderRepository, DeliveryOrderRealtimeHandler)
    |
External Integrations (src/lib/stripe, src/lib/stuart, src/lib/invoicexpress)
```

### Fluxo completo do pedido

```
1. Cliente faz pedido → POST /api/delivery-orders
   → Cria order (status: pending_payment)
   → Cria Stripe Payment Intent
   → Retorna clientSecret ao frontend

2. Cliente paga → Stripe processa pagamento
   → Stripe envia webhook payment_intent.succeeded

3. Webhook Stripe → POST /api/webhooks/stripe
   → Atualiza order: status → paid → confirmed
   → Cria fatura (InvoiceXpress ou Vendus)
   → Envia PDF por email

4. Cozinha confirma → PATCH /api/delivery-orders/[id]/status
   → status: confirmed → preparing → ready_for_pickup
   → Ao marcar ready_for_pickup: chama Stuart API (so para delivery)

5. Stuart despacha estafeta → POST /api/webhooks/stuart
   → Atualiza delivery: driver info, tracking_url
   → Atualiza order: status → in_transit

6. Entrega confirmada → Stuart webhook
   → delivery status → delivered
   → order status → delivered

7. Cliente ve tracking em tempo real
   → Supabase Realtime na tabela delivery_orders + deliveries
```

### Status flow: Delivery Orders

```
pending_payment ──→ paid ──→ confirmed ──→ preparing ──→ ready_for_pickup ──→ in_transit ──→ delivered
       |              |          |             |                |                  |
       └──→ cancelled ←──────────←─────────────←──────────────←──────────────────←
```

**Takeaway (sem transito):**
```
pending_payment → paid → confirmed → preparing → ready_for_pickup → delivered
```

---

## 3. Fase 0 - Base de Dados

### Ficheiro: `supabase/migrations/094_delivery_orders.sql`

Aplicar via Supabase SQL Editor (sem Docker).

```sql
-- =============================================
-- Migration 094: Delivery & Takeaway Orders Module
-- =============================================

-- 1. DELIVERY_ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  customer_id UUID REFERENCES customers(id),
  customer_auth_id UUID,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'confirmed', 'preparing',
      'ready_for_pickup', 'in_transit', 'delivered', 'cancelled'
    )),
  service_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK (service_type IN ('delivery', 'takeaway')),

  -- Items (JSONB imutavel apos pagamento)
  -- Schema: [{product_id: int, name: string, quantity: int, unit_price: numeric, notes: string|null}]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Precos
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Contacto cliente (desnormalizado para uso operacional)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Morada de entrega (NULL para takeaway)
  -- Schema: {street: string, city: string, postal_code: string, country: string, lat: number|null, lng: number|null}
  delivery_address JSONB,
  delivery_notes TEXT,

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_payment_method_type TEXT, -- card, mb_way, multibanco
  stripe_payment_status TEXT,      -- requires_payment_method, requires_action, processing, succeeded, cancelled
  paid_at TIMESTAMPTZ,

  -- Preparacao
  estimated_prep_minutes INTEGER DEFAULT 30,
  prepared_at TIMESTAMPTZ,

  -- Faturacao (provider-agnostic)
  invoice_provider TEXT CHECK (invoice_provider IN ('vendus', 'invoicexpress')),
  invoice_id TEXT,
  invoice_number TEXT,
  invoice_pdf_url TEXT,
  invoice_status TEXT,
  invoice_issued_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_orders_restaurant ON delivery_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_auth ON delivery_orders(customer_auth_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_stripe ON delivery_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_service_type ON delivery_orders(service_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delivery_orders_updated_at ON delivery_orders;
CREATE TRIGGER delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_orders_updated_at();


-- 2. DELIVERIES TABLE (Stuart tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,

  -- Stuart
  stuart_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'picking', 'delivering', 'delivered', 'cancelled')),
  tracking_url TEXT,

  -- Estafeta
  driver_name TEXT,
  driver_phone TEXT,
  driver_photo_url TEXT,

  -- Tempos
  estimated_pickup_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_stuart ON deliveries(stuart_job_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

DROP TRIGGER IF EXISTS deliveries_updated_at ON deliveries;
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_orders_updated_at();


-- 3. DELIVERY_ERROR_LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID REFERENCES delivery_orders(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'stuart', 'invoicexpress', 'vendus')),
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_order ON delivery_error_logs(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_provider ON delivery_error_logs(provider);
CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_created ON delivery_error_logs(created_at DESC);


-- 4. RLS POLICIES
-- =============================================
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_error_logs ENABLE ROW LEVEL SECURITY;

-- delivery_orders: customer le os seus
CREATE POLICY delivery_orders_customer_read ON delivery_orders
  FOR SELECT TO authenticated
  USING (customer_auth_id = auth.uid());

-- delivery_orders: admin le todos
CREATE POLICY delivery_orders_admin_read ON delivery_orders
  FOR SELECT TO authenticated
  USING (is_current_user_admin());

-- delivery_orders: admin escreve
CREATE POLICY delivery_orders_admin_insert ON delivery_orders
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY delivery_orders_admin_update ON delivery_orders
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY delivery_orders_admin_delete ON delivery_orders
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- delivery_orders: anon insert (guest checkout - API usa createAdminClient)
CREATE POLICY delivery_orders_anon_insert ON delivery_orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- deliveries: admin full access
CREATE POLICY deliveries_admin_all ON deliveries
  FOR ALL TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- deliveries: customer le os seus (via delivery_order)
CREATE POLICY deliveries_customer_read ON deliveries
  FOR SELECT TO authenticated
  USING (
    delivery_order_id IN (
      SELECT id FROM delivery_orders WHERE customer_auth_id = auth.uid()
    )
  );

-- delivery_error_logs: admin only
CREATE POLICY delivery_error_logs_admin ON delivery_error_logs
  FOR ALL TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());


-- 5. ENABLE REALTIME
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE delivery_orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime publication setup skipped: %', SQLERRM;
END $$;
```

### Verificacao Fase 0

```sql
-- Verificar tabelas
SELECT * FROM delivery_orders LIMIT 0;
SELECT * FROM deliveries LIMIT 0;
SELECT * FROM delivery_error_logs LIMIT 0;

-- Verificar RLS
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'delivery_orders';

-- Verificar realtime
SELECT * FROM pg_publication_tables WHERE tablename IN ('delivery_orders', 'deliveries');
```

---

## 4. Fase 1 - Domain Layer

### 4.1 Value Objects

#### `src/domain/value-objects/DeliveryOrderStatus.ts`

```typescript
export type DeliveryOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export const DELIVERY_ORDER_STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  pending_payment: 'Aguarda pagamento',
  paid: 'Pago',
  confirmed: 'Confirmado',
  preparing: 'A preparar',
  ready_for_pickup: 'Pronto para recolha',
  in_transit: 'Em transito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const DELIVERY_ORDER_STATUS_TRANSITIONS: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['in_transit', 'delivered', 'cancelled'], // delivered para takeaway (sem transito)
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canDeliveryOrderTransitionTo(
  from: DeliveryOrderStatus,
  to: DeliveryOrderStatus
): boolean {
  return DELIVERY_ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalDeliveryOrderStatus(status: DeliveryOrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}
```

#### `src/domain/value-objects/DeliveryStatus.ts`

```typescript
export type DeliveryStatus = 'pending' | 'picking' | 'delivering' | 'delivered' | 'cancelled';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendente',
  picking: 'A recolher',
  delivering: 'A entregar',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
```

#### `src/domain/value-objects/ServiceType.ts`

```typescript
export type ServiceType = 'delivery' | 'takeaway';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  delivery: 'Entrega',
  takeaway: 'Take Away',
};
```

### 4.2 Entities

#### `src/domain/entities/DeliveryOrder.ts`

```typescript
import { DeliveryOrderStatus } from '../value-objects/DeliveryOrderStatus';
import { ServiceType } from '../value-objects/ServiceType';

export interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export interface DeliveryOrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
}

export interface DeliveryOrder {
  id: string;
  restaurantId: string;
  customerId: string | null;
  customerAuthId: string | null;
  status: DeliveryOrderStatus;
  serviceType: ServiceType;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress | null;
  deliveryNotes: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentMethodType: string | null;
  stripePaymentStatus: string | null;
  paidAt: Date | null;
  estimatedPrepMinutes: number;
  preparedAt: Date | null;
  invoiceProvider: 'vendus' | 'invoicexpress' | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  invoiceStatus: string | null;
  invoiceIssuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryOrderData {
  restaurantId: string;
  customerId?: string | null;
  customerAuthId?: string | null;
  serviceType: ServiceType;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee?: number;
  taxAmount: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: DeliveryAddress | null;
  deliveryNotes?: string | null;
  estimatedPrepMinutes?: number;
}

export interface UpdateDeliveryOrderData {
  status?: DeliveryOrderStatus;
  stripePaymentIntentId?: string;
  stripePaymentMethodType?: string;
  stripePaymentStatus?: string;
  paidAt?: Date;
  preparedAt?: Date;
  estimatedPrepMinutes?: number;
  invoiceProvider?: 'vendus' | 'invoicexpress';
  invoiceId?: string;
  invoiceNumber?: string;
  invoicePdfUrl?: string;
  invoiceStatus?: string;
  invoiceIssuedAt?: Date;
}

export interface DeliveryOrderFilter {
  restaurantId?: string;
  status?: DeliveryOrderStatus;
  statuses?: DeliveryOrderStatus[];
  serviceType?: ServiceType;
  customerAuthId?: string;
  fromDate?: Date;
  toDate?: Date;
}
```

#### `src/domain/entities/Delivery.ts`

```typescript
import { DeliveryStatus } from '../value-objects/DeliveryStatus';

export interface Delivery {
  id: string;
  deliveryOrderId: string;
  stuartJobId: string | null;
  status: DeliveryStatus;
  trackingUrl: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverPhotoUrl: string | null;
  estimatedPickupAt: Date | null;
  estimatedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryData {
  deliveryOrderId: string;
  stuartJobId?: string;
  estimatedPickupAt?: Date;
  estimatedDeliveryAt?: Date;
}

export interface UpdateDeliveryData {
  status?: DeliveryStatus;
  stuartJobId?: string;
  trackingUrl?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhotoUrl?: string;
  estimatedPickupAt?: Date;
  estimatedDeliveryAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
}
```

### 4.3 Repository Interfaces

#### `src/domain/repositories/IDeliveryOrderRepository.ts`

```typescript
import {
  DeliveryOrder,
  CreateDeliveryOrderData,
  UpdateDeliveryOrderData,
  DeliveryOrderFilter,
} from '../entities/DeliveryOrder';
import { DeliveryOrderStatus } from '../value-objects/DeliveryOrderStatus';

export interface IDeliveryOrderRepository {
  findById(id: string): Promise<DeliveryOrder | null>;
  findAll(filter?: DeliveryOrderFilter): Promise<DeliveryOrder[]>;
  findByStripePaymentIntentId(paymentIntentId: string): Promise<DeliveryOrder | null>;
  create(data: CreateDeliveryOrderData): Promise<DeliveryOrder>;
  update(id: string, data: UpdateDeliveryOrderData): Promise<DeliveryOrder>;
  updateStatus(id: string, status: DeliveryOrderStatus): Promise<DeliveryOrder>;
  delete(id: string): Promise<void>;
  countByStatus(restaurantId?: string): Promise<Record<DeliveryOrderStatus, number>>;
}
```

#### `src/domain/repositories/IDeliveryRepository.ts`

```typescript
import {
  Delivery,
  CreateDeliveryData,
  UpdateDeliveryData,
} from '../entities/Delivery';

export interface IDeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
  findByDeliveryOrderId(deliveryOrderId: string): Promise<Delivery | null>;
  findByStuartJobId(stuartJobId: string): Promise<Delivery | null>;
  create(data: CreateDeliveryData): Promise<Delivery>;
  update(id: string, data: UpdateDeliveryData): Promise<Delivery>;
}
```

### 4.4 Domain Service

#### `src/domain/services/DeliveryService.ts`

```typescript
import { DeliveryOrder, DeliveryOrderItem } from '../entities/DeliveryOrder';
import {
  DeliveryOrderStatus,
  canDeliveryOrderTransitionTo,
  isTerminalDeliveryOrderStatus,
} from '../value-objects/DeliveryOrderStatus';
import { ServiceType } from '../value-objects/ServiceType';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class DeliveryService {
  /** Valida transicao de status */
  static canChangeStatus(
    order: DeliveryOrder,
    newStatus: DeliveryOrderStatus
  ): ValidationResult {
    if (order.status === newStatus) {
      return { isValid: false, error: 'Encomenda ja esta neste estado' };
    }
    if (!canDeliveryOrderTransitionTo(order.status, newStatus)) {
      return {
        isValid: false,
        error: `Nao e possivel mudar de '${order.status}' para '${newStatus}'`,
      };
    }
    if (order.serviceType === 'takeaway' && newStatus === 'in_transit') {
      return { isValid: false, error: 'Encomendas takeaway nao tem transito' };
    }
    return { isValid: true };
  }

  /** Calcula totais a partir dos items */
  static calculateTotals(
    items: DeliveryOrderItem[],
    deliveryFee: number,
    taxRate: number
  ): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0
    );
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount + deliveryFee;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  /** Valida que items tem quantidades e precos validos */
  static validateItems(items: DeliveryOrderItem[]): ValidationResult {
    if (!items || items.length === 0) {
      return { isValid: false, error: 'Encomenda deve ter pelo menos 1 item' };
    }
    for (const item of items) {
      if (item.quantity <= 0) {
        return { isValid: false, error: `Quantidade invalida para ${item.name}` };
      }
      if (item.unitPrice < 0) {
        return { isValid: false, error: `Preco invalido para ${item.name}` };
      }
    }
    return { isValid: true };
  }

  /** Delivery requer morada, takeaway nao */
  static requiresDeliveryAddress(serviceType: ServiceType): boolean {
    return serviceType === 'delivery';
  }

  /** Verifica se e estado terminal */
  static isFinalStatus(status: DeliveryOrderStatus): boolean {
    return isTerminalDeliveryOrderStatus(status);
  }

  /** Proximo status no fluxo normal */
  static getNextStatus(order: DeliveryOrder): DeliveryOrderStatus | null {
    const deliverySequence: DeliveryOrderStatus[] = [
      'pending_payment', 'paid', 'confirmed', 'preparing',
      'ready_for_pickup', 'in_transit', 'delivered',
    ];
    const takeawaySequence: DeliveryOrderStatus[] = [
      'pending_payment', 'paid', 'confirmed', 'preparing',
      'ready_for_pickup', 'delivered',
    ];
    const sequence = order.serviceType === 'takeaway'
      ? takeawaySequence
      : deliverySequence;
    const idx = sequence.indexOf(order.status);
    if (idx === -1 || idx === sequence.length - 1) return null;
    return sequence[idx + 1];
  }
}
```

---

## 5. Fase 2 - Application Layer

### 5.1 DTOs

#### `src/application/dto/DeliveryOrderDTO.ts`

```typescript
import { DeliveryOrderStatus } from '@/domain/value-objects/DeliveryOrderStatus';
import { DeliveryStatus } from '@/domain/value-objects/DeliveryStatus';
import { ServiceType } from '@/domain/value-objects/ServiceType';

export interface DeliveryOrderDTO {
  id: string;
  restaurantId: string;
  status: DeliveryOrderStatus;
  serviceType: ServiceType;
  items: {
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    notes: string | null;
  }[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
  } | null;
  stripePaymentStatus: string | null;
  estimatedPrepMinutes: number;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDTO {
  id: string;
  deliveryOrderId: string;
  status: DeliveryStatus;
  trackingUrl: string | null;
  driverName: string | null;
  driverPhone: string | null;
  estimatedDeliveryAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface DeliveryOrderWithDeliveryDTO extends DeliveryOrderDTO {
  delivery: DeliveryDTO | null;
}
```

### 5.2 Use Cases

Todos seguem o Result pattern de `src/application/use-cases/Result.ts`.

#### `src/application/use-cases/delivery-orders/CreateDeliveryOrderUseCase.ts`

**Responsabilidade:** Resolve precos dos produtos via `IProductRepository`, valida items, calcula totais (IVA 13%), cria order em `pending_payment`.

```typescript
export interface CreateDeliveryOrderInput {
  restaurantId: string;
  customerId?: string | null;
  customerAuthId?: string | null;
  serviceType: ServiceType;
  items: { productId: number; quantity: number; notes?: string }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: {
    street: string; city: string; postalCode: string;
    country: string; lat?: number; lng?: number;
  } | null;
  deliveryNotes?: string;
  estimatedPrepMinutes?: number;
}

export class CreateDeliveryOrderUseCase {
  constructor(
    private deliveryOrderRepository: IDeliveryOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async execute(input: CreateDeliveryOrderInput): Promise<Result<DeliveryOrder>> {
    // 1. Validar morada para delivery
    // 2. Resolver precos dos produtos via service_prices[serviceType]
    // 3. Validar items (DeliveryService.validateItems)
    // 4. Calcular totais (DeliveryService.calculateTotals) - taxRate 0.13
    // 5. Criar order via repository
    // 6. Retornar Result.success(order)
  }
}
```

#### Outros Use Cases (mesma pasta)

| Ficheiro | Metodo | Logica |
|----------|--------|--------|
| `GetDeliveryOrderByIdUseCase.ts` | `execute(id: string)` | Busca order + delivery data |
| `GetDeliveryOrdersUseCase.ts` | `execute(filter?: DeliveryOrderFilter)` | Lista com filtros |
| `UpdateDeliveryOrderStatusUseCase.ts` | `execute({orderId, newStatus})` | Valida transicao via DeliveryService |
| `ConfirmPaymentUseCase.ts` | `execute({orderId, paymentIntentId, paymentMethodType})` | `pending_payment` → `paid` → `confirmed` |
| `CancelDeliveryOrderUseCase.ts` | `execute({orderId, reason?})` | Cancela + retorna info para refund |
| `index.ts` | — | Re-exports |

#### Use Cases de Deliveries

| Ficheiro | Logica |
|----------|--------|
| `src/application/use-cases/deliveries/CreateDeliveryUseCase.ts` | Cria record quando Stuart job e despachado |
| `src/application/use-cases/deliveries/UpdateDeliveryStatusUseCase.ts` | Atualiza via Stuart webhook |

---

## 6. Fase 3 - Infrastructure Layer

### 6.1 Supabase Repositories

#### `src/infrastructure/repositories/SupabaseDeliveryOrderRepository.ts`

Segue o padrao de `SupabaseReservationRepository.ts`:

```typescript
export class SupabaseDeliveryOrderRepository implements IDeliveryOrderRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  // Interface interna DatabaseDeliveryOrderRow (snake_case)
  // Metodo privado mapToEntity() para snake_case → camelCase
  // Metodo privado mapToDb() para camelCase → snake_case

  // findById, findAll (com filtros), findByStripePaymentIntentId
  // create, update, updateStatus, delete
  // countByStatus (aggregacao)
}
```

#### `src/infrastructure/repositories/SupabaseDeliveryRepository.ts`

Mesmo padrao, mais simples. CRUD para tabela `deliveries`.

### 6.2 Realtime Handler

#### `src/infrastructure/realtime/DeliveryOrderRealtimeHandler.ts`

Segue `OrderRealtimeHandler.ts`:

```typescript
export class DeliveryOrderRealtimeHandler {
  // Subscreve a mudancas na tabela delivery_orders
  // Mapeia rows DB → DeliveryOrder entities
  // Deteta: isNew, statusChanged, previousStatus
}

export class DeliveryOrderRealtimeHandlerFactory {
  static forKitchen(restaurantId?: string): DeliveryOrderRealtimeHandler;
  static forCustomer(orderId: string): DeliveryOrderRealtimeHandler;
}
```

### 6.3 Modificacao: `src/types/database.ts`

Adicionar interfaces para as novas tabelas (seguir padrao existente).

---

## 7. Fase 4 - Integracoes Externas

### 7.1 Stripe

#### `src/lib/stripe/client.ts`

```typescript
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is required');
    stripeInstance = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
  }
  return stripeInstance;
}

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}
```

#### `src/lib/stripe/payments.ts`

```typescript
export interface CreatePaymentIntentOptions {
  amount: number;        // em centimos (ex: 1250 = 12.50 EUR)
  currency: string;      // 'eur'
  deliveryOrderId: string;
  customerEmail: string;
  paymentMethodTypes?: string[]; // ['card', 'mb_way', 'multibanco']
}

export interface CreatePaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export async function createPaymentIntent(
  options: CreatePaymentIntentOptions
): Promise<CreatePaymentIntentResult> {
  const stripe = getStripeClient();
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(options.amount),
      currency: options.currency,
      payment_method_types: options.paymentMethodTypes || ['card'],
      metadata: { delivery_order_id: options.deliveryOrderId },
      receipt_email: options.customerEmail,
    });
    return {
      success: true,
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar pagamento',
    };
  }
}

export async function refundPaymentIntent(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripeClient();
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reembolsar',
    };
  }
}
```

#### `src/lib/stripe/webhooks.ts`

```typescript
import { getStripeClient } from './client';
import type Stripe from 'stripe';

export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
```

### 7.2 Stuart

#### `src/lib/stuart/client.ts`

```typescript
export interface StuartConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string; // https://api.stuart.com ou https://api.sandbox.stuart.com
}

export function getStuartConfig(): StuartConfig | null {
  const clientId = process.env.STUART_CLIENT_ID;
  const clientSecret = process.env.STUART_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    baseUrl: process.env.STUART_API_URL || 'https://api.stuart.com',
  };
}

// Cache do token OAuth2
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getStuartAccessToken(config: StuartConfig): Promise<string> {
  // Retorna token em cache se ainda valido (com 60s margem)
  // Senao faz POST /oauth/token com client_credentials
  // Guarda em cache com expires_in
}
```

#### `src/lib/stuart/jobs.ts`

```typescript
export interface CreateStuartJobOptions {
  pickupAddress: string;           // Morada do restaurante
  pickupComment?: string;          // "Pedido #123"
  pickupContactName: string;       // Nome restaurante
  pickupContactPhone: string;      // Telefone restaurante
  dropoffAddress: string;          // Morada cliente
  dropoffComment?: string;         // Notas de entrega
  dropoffContactName: string;      // Nome cliente
  dropoffContactPhone: string;     // Telefone cliente
  deliveryOrderId: string;         // Para metadata
  pickupAt?: string;               // ISO8601 para pickup agendado
}

export interface StuartJobResult {
  success: boolean;
  jobId?: string;
  trackingUrl?: string;
  error?: string;
}

export async function createStuartJob(
  options: CreateStuartJobOptions
): Promise<StuartJobResult> {
  // 1. Obter config e token OAuth
  // 2. POST /v2/jobs com pickups + dropoffs
  // 3. Retornar jobId + trackingUrl
  // 4. Tratar erros
}
```

### 7.3 InvoiceXpress

#### `src/lib/invoicexpress/client.ts`

```typescript
export interface InvoiceXpressConfig {
  accountName: string;
  apiKey: string;
  baseUrl: string;
}

export function getInvoiceXpressConfig(): InvoiceXpressConfig | null {
  const accountName = process.env.INVOICEXPRESS_ACCOUNT_NAME;
  const apiKey = process.env.INVOICEXPRESS_API_KEY;
  if (!accountName || !apiKey) return null;
  return {
    accountName,
    apiKey,
    baseUrl: `https://${accountName}.app.invoicexpress.com`,
  };
}

export async function invoiceXpressRequest<T>(
  config: InvoiceXpressConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  // Chama API InvoiceXpress com api_key como query param
  // Content-Type: application/json
  // Trata erros
}
```

#### `src/lib/invoicexpress/invoices.ts`

```typescript
export interface CreateInvoiceXpressOptions {
  items: { name: string; quantity: number; unitPrice: number }[];
  taxRate: number;           // 0.13 para 13%
  customerName: string;
  customerEmail: string;
  customerNif?: string;      // NIF opcional
  serviceType: 'delivery' | 'takeaway';
}

export interface InvoiceXpressResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  pdfUrl?: string;
  error?: string;
}

export async function createSimplifiedInvoice(
  options: CreateInvoiceXpressOptions
): Promise<InvoiceXpressResult> {
  // 1. Criar fatura simplificada via API
  // 2. Finalizar fatura (mudar estado para final)
  // 3. Obter URL do PDF
  // 4. Enviar PDF por email ao cliente
}
```

### 7.4 Camada de Abstracao de Faturacao

#### `src/lib/invoicing/index.ts`

```typescript
export interface InvoiceResult {
  success: boolean;
  provider: 'vendus' | 'invoicexpress';
  invoiceId?: string;
  invoiceNumber?: string;
  pdfUrl?: string;
  error?: string;
}

export interface CreateDeliveryInvoiceOptions {
  deliveryOrderId: string;
  restaurantSlug: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerNif?: string;
  serviceType: 'delivery' | 'takeaway';
}

/** Le INVOICE_PROVIDER env var, default 'invoicexpress' */
export function getInvoiceProvider(): 'vendus' | 'invoicexpress' {
  const envProvider = process.env.INVOICE_PROVIDER;
  if (envProvider === 'vendus' || envProvider === 'invoicexpress') return envProvider;
  return 'invoicexpress';
}

/** Cria fatura usando o provider configurado */
export async function createDeliveryInvoice(
  options: CreateDeliveryInvoiceOptions
): Promise<InvoiceResult> {
  const provider = getInvoiceProvider();
  if (provider === 'invoicexpress') {
    return createInvoiceXpressInvoice(options);
  } else {
    return createVendusDeliveryInvoice(options);
  }
}
```

---

## 8. Fase 5 - API Routes e Webhooks

### 8.1 Delivery Orders CRUD

#### `src/app/api/delivery-orders/route.ts`

**POST** - Criar pedido + Payment Intent:
```
1. Parse body: restaurantId, serviceType, items[], customer info, address
2. CreateDeliveryOrderUseCase.execute() → order em pending_payment
3. createPaymentIntent({ amount: order.total * 100, currency: 'eur', ... })
4. Update order com stripe_payment_intent_id
5. Return { order, clientSecret }
```

**GET** - Listar pedidos:
```
1. Verificar auth (admin ou customer)
2. Admin: GetDeliveryOrdersUseCase com filtros de query params
3. Customer: GetDeliveryOrdersUseCase com customerAuthId do token
4. Return orders[]
```

#### `src/app/api/delivery-orders/[id]/route.ts`

**GET** - Pedido individual com delivery data
**PATCH** - Update status (para uso da cozinha)

#### `src/app/api/delivery-orders/[id]/invoice/route.ts`

**POST** - Trigger criacao de fatura manualmente (fallback)

### 8.2 Stripe Webhook

#### `src/app/api/webhooks/stripe/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Ler body como text (raw)
  // 2. Verificar assinatura: verifyStripeWebhook(payload, signature)
  // 3. Switch event.type:

  // case 'payment_intent.succeeded':
  //   a. Buscar order por stripe_payment_intent_id
  //   b. Update: status → paid, stripe_payment_status → succeeded, paid_at
  //   c. Auto-advance: status → confirmed
  //   d. Fire-and-forget: createDeliveryInvoice()
  //   e. Se sucesso invoice: update invoice_* fields
  //   f. Se erro invoice: log em delivery_error_logs

  // case 'payment_intent.payment_failed':
  //   a. Log erro
  //   b. Manter order em pending_payment

  // 4. Return { received: true }
}

// IMPORTANTE: export const runtime = 'nodejs' (nao edge)
// IMPORTANTE: nao usar bodyParser - ler request.text()
```

### 8.3 Stuart Webhook

#### `src/app/api/webhooks/stuart/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Parse JSON body
  // 2. Verificar assinatura (STUART_WEBHOOK_SECRET)
  // 3. Buscar delivery por stuart_job_id
  // 4. Mapear evento Stuart → DeliveryStatus:
  //    - picking → picking
  //    - delivering → delivering
  //    - delivered → delivered
  //    - cancelled → cancelled
  // 5. Update delivery: status, driver info, tracking_url, timestamps
  // 6. Update delivery_order status:
  //    - picking → in_transit
  //    - delivered → delivered
  // 7. Return { received: true }
}
```

---

## 9. Fase 6 - Presentation Layer

### 9.1 Hooks

#### `src/presentation/hooks/useDeliveryOrder.ts`

Para a pagina de encomenda. Gere estado do carrinho e criacao de pedido.

```typescript
export interface UseDeliveryOrderResult {
  // Cart
  items: DeliveryOrderItem[];
  addItem: (item: DeliveryOrderItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  // Totais
  subtotal: number;
  deliveryFee: number;
  total: number;

  // Criar pedido
  createOrder: (params: {
    restaurantId: string;
    serviceType: ServiceType;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress?: DeliveryAddress;
    deliveryNotes?: string;
  }) => Promise<{ orderId: string; clientSecret: string } | null>;

  // Estado
  isCreating: boolean;
  error: string | null;
}
```

#### `src/presentation/hooks/useDeliveryTracking.ts`

Para a pagina de tracking. Usa Supabase Realtime.

```typescript
export interface UseDeliveryTrackingResult {
  order: DeliveryOrderWithDeliveryDTO | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeliveryTracking(orderId: string): UseDeliveryTrackingResult {
  // 1. Fetch order + delivery via API
  // 2. Subscribe a realtime changes em delivery_orders e deliveries
  // 3. Auto-update state on changes
}
```

### 9.2 Modificacao DependencyContext

**Ficheiro:** `src/presentation/contexts/DependencyContext.tsx`

Adicionar ao `Dependencies` interface e `DependencyProvider`:
- `deliveryOrderRepository: IDeliveryOrderRepository`
- `deliveryRepository: IDeliveryRepository`
- `createDeliveryOrder: CreateDeliveryOrderUseCase`
- `getDeliveryOrders: GetDeliveryOrdersUseCase`
- `updateDeliveryOrderStatus: UpdateDeliveryOrderStatusUseCase`

---

## 10. Fase 7 - Frontend Pages

### 10.1 Pagina de Encomenda

#### `src/app/[locale]/encomendar/page.tsx` (Server Component)

```typescript
// Fetch: restaurantes ativos, categorias, produtos com service_modes incluindo 'delivery'/'takeaway'
// Filtrar produtos por serviceModes
// Render: <OrderPageContent restaurants={...} categories={...} products={...} />
```

#### Componentes em `src/components/delivery/`

| Componente | Responsabilidade |
|------------|-----------------|
| `OrderPageContent.tsx` | Layout principal: selecao restaurante (tabs), tabs delivery/takeaway, grid de produtos por categoria, sidebar carrinho, formulario checkout |
| `DeliveryProductCard.tsx` | Card de produto com preco delivery/takeaway (de `service_prices`), botao adicionar, imagem, descricao |
| `CartSidebar.tsx` | Lista de items no carrinho, quantidades editaveis, subtotal, taxa entrega (so delivery), IVA 13%, total, botao checkout |
| `CheckoutForm.tsx` | Campos: nome, email, telefone, morada (com autocomplete, so delivery), notas entrega, Stripe Payment Element |
| `StripeElementsWrapper.tsx` | Provider `@stripe/react-stripe-js` com `Elements` e `loadStripe(publishableKey)` |

### 10.2 Pagina de Tracking

#### `src/app/[locale]/encomendar/tracking/[id]/page.tsx`

```typescript
// Render: <OrderTrackingContent orderId={params.id} />
```

#### Componentes

| Componente | Responsabilidade |
|------------|-----------------|
| `OrderTrackingContent.tsx` | Usa `useDeliveryTracking(orderId)`. Mostra timeline, dados estafeta, link tracking |
| `OrderTracking.tsx` | Timeline visual com 4 estados: Recebido → A preparar → A caminho → Entregue. Icones, cores, timestamps |

---

## 11. Fase 8 - Integracao Cozinha

### 11.1 Novo Componente

#### `src/components/kitchen/DeliveryOrderCard.tsx`

Card distinto dos dine-in orders:
- Badge colorido: "Delivery" (azul) ou "Take Away" (laranja)
- Lista de items com quantidades
- Nome + telefone do cliente
- Morada de entrega (se delivery)
- Botoes de acao: Confirmar → A preparar → Pronto para recolha
- Tempo estimado de preparacao

### 11.2 Modificacao Cozinha

#### `src/app/cozinha/page.tsx`

Adicionar seccao/tab para delivery orders:
- Novo hook `useDeliveryKitchenOrders()` que busca delivery_orders com status `confirmed`, `preparing`, `ready_for_pickup`
- Seccao separada ou tab "Delivery/Takeaway" ao lado dos dine-in orders
- Quando cozinha marca `ready_for_pickup` numa delivery order → API chama `createStuartJob()` automaticamente

**Trigger Stuart:** No endpoint `PATCH /api/delivery-orders/[id]/status`, quando `newStatus === 'ready_for_pickup'` e `serviceType === 'delivery'`:
1. Buscar dados do restaurante (morada, telefone)
2. `createStuartJob()` com pickup = restaurante, dropoff = cliente
3. `CreateDeliveryUseCase.execute()` com stuart_job_id e tracking_url
4. Update delivery_order com estimativas

---

## 12. Fase 9 - Testes

### 12.1 Domain Service Tests

#### `src/__tests__/domain/services/DeliveryService.test.ts`

~30 testes:
- `canChangeStatus`: todas as transicoes validas e invalidas
- `calculateTotals`: edge cases, arredondamento, items vazios
- `validateItems`: vazio, quantidade negativa, preco negativo
- `requiresDeliveryAddress`: delivery vs takeaway
- `getNextStatus`: sequencia delivery vs takeaway, estados terminais
- `isFinalStatus`: delivered e cancelled

### 12.2 Use Case Tests

#### `src/__tests__/application/use-cases/delivery-orders/DeliveryOrdersUseCases.test.ts`

~25 testes com mocks de `IDeliveryOrderRepository` e `IProductRepository`:
- `CreateDeliveryOrderUseCase`: criacao valida, morada em falta para delivery, produto nao encontrado, produto indisponivel, items vazios
- `GetDeliveryOrderByIdUseCase`: encontrado, nao encontrado
- `GetDeliveryOrdersUseCase`: com filtros, resultados vazios
- `UpdateDeliveryOrderStatusUseCase`: transicao valida, transicao invalida
- `ConfirmPaymentUseCase`: atualiza status e campos de pagamento
- `CancelDeliveryOrderUseCase`: logica de cancelamento

### 12.3 Infrastructure Tests

#### `src/__tests__/infrastructure/repositories/SupabaseDeliveryOrderRepository.test.ts`

~15 testes seguindo padrao de `SupabaseRestaurantRepository.test.ts`:
- CRUD completo
- Filtros
- `findByStripePaymentIntentId`
- `countByStatus`

---

## 13. Variaveis de Ambiente

Adicionar ao `.env.local`:

```bash
# === STRIPE (conta unica) ===
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === STUART ===
STUART_CLIENT_ID=...
STUART_CLIENT_SECRET=...
STUART_API_URL=https://api.sandbox.stuart.com  # sandbox para dev
STUART_WEBHOOK_SECRET=...

# === INVOICEXPRESS ===
INVOICEXPRESS_ACCOUNT_NAME=...
INVOICEXPRESS_API_KEY=...

# === PROVIDER DE FATURACAO ===
# Opcoes: vendus | invoicexpress
INVOICE_PROVIDER=invoicexpress
```

---

## 14. Dependencias npm

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Stuart e InvoiceXpress usam `fetch` nativo — sem SDK adicional.

---

## 15. Lista Completa de Ficheiros

### Base de Dados (1 ficheiro)
- `supabase/migrations/094_delivery_orders.sql`

### Domain Layer (8 ficheiros)
- `src/domain/value-objects/DeliveryOrderStatus.ts`
- `src/domain/value-objects/DeliveryStatus.ts`
- `src/domain/value-objects/ServiceType.ts`
- `src/domain/entities/DeliveryOrder.ts`
- `src/domain/entities/Delivery.ts`
- `src/domain/repositories/IDeliveryOrderRepository.ts`
- `src/domain/repositories/IDeliveryRepository.ts`
- `src/domain/services/DeliveryService.ts`

### Application Layer (10 ficheiros)
- `src/application/dto/DeliveryOrderDTO.ts`
- `src/application/use-cases/delivery-orders/CreateDeliveryOrderUseCase.ts`
- `src/application/use-cases/delivery-orders/GetDeliveryOrderByIdUseCase.ts`
- `src/application/use-cases/delivery-orders/GetDeliveryOrdersUseCase.ts`
- `src/application/use-cases/delivery-orders/UpdateDeliveryOrderStatusUseCase.ts`
- `src/application/use-cases/delivery-orders/ConfirmPaymentUseCase.ts`
- `src/application/use-cases/delivery-orders/CancelDeliveryOrderUseCase.ts`
- `src/application/use-cases/delivery-orders/index.ts`
- `src/application/use-cases/deliveries/CreateDeliveryUseCase.ts`
- `src/application/use-cases/deliveries/UpdateDeliveryStatusUseCase.ts`

### Infrastructure Layer (3 ficheiros)
- `src/infrastructure/repositories/SupabaseDeliveryOrderRepository.ts`
- `src/infrastructure/repositories/SupabaseDeliveryRepository.ts`
- `src/infrastructure/realtime/DeliveryOrderRealtimeHandler.ts`

### Integracoes Externas (8 ficheiros)
- `src/lib/stripe/client.ts`
- `src/lib/stripe/payments.ts`
- `src/lib/stripe/webhooks.ts`
- `src/lib/stuart/client.ts`
- `src/lib/stuart/jobs.ts`
- `src/lib/invoicexpress/client.ts`
- `src/lib/invoicexpress/invoices.ts`
- `src/lib/invoicing/index.ts`

### API Routes (5 ficheiros)
- `src/app/api/delivery-orders/route.ts`
- `src/app/api/delivery-orders/[id]/route.ts`
- `src/app/api/delivery-orders/[id]/invoice/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/stuart/route.ts`

### Presentation Layer (2 hooks)
- `src/presentation/hooks/useDeliveryOrder.ts`
- `src/presentation/hooks/useDeliveryTracking.ts`

### Frontend Pages e Componentes (9 ficheiros)
- `src/app/[locale]/encomendar/page.tsx`
- `src/app/[locale]/encomendar/tracking/[id]/page.tsx`
- `src/components/delivery/OrderPageContent.tsx`
- `src/components/delivery/DeliveryProductCard.tsx`
- `src/components/delivery/CartSidebar.tsx`
- `src/components/delivery/CheckoutForm.tsx`
- `src/components/delivery/StripeElementsWrapper.tsx`
- `src/components/delivery/OrderTrackingContent.tsx`
- `src/components/delivery/OrderTracking.tsx`

### Cozinha (1 ficheiro novo)
- `src/components/kitchen/DeliveryOrderCard.tsx`

### Testes (3 ficheiros)
- `src/__tests__/domain/services/DeliveryService.test.ts`
- `src/__tests__/application/use-cases/delivery-orders/DeliveryOrdersUseCases.test.ts`
- `src/__tests__/infrastructure/repositories/SupabaseDeliveryOrderRepository.test.ts`

### Ficheiros a Modificar (3)
- `src/presentation/contexts/DependencyContext.tsx` — registar delivery repos + use cases
- `src/app/cozinha/page.tsx` — adicionar seccao delivery orders
- `src/types/database.ts` — adicionar types para novas tabelas

### TOTAL: 44 ficheiros novos + 3 modificacoes

---

## 16. Fluxo Completo End-to-End

```
CLIENTE                          SERVIDOR                         EXTERNO
  |                                 |                                |
  |  1. Seleciona items + checkout  |                                |
  |  POST /api/delivery-orders ───→ |                                |
  |                                 | CreateDeliveryOrderUseCase     |
  |                                 | createPaymentIntent() ───────→ | Stripe
  |  ←── { order, clientSecret }    |                                |
  |                                 |                                |
  |  2. Paga com Stripe Elements    |                                |
  |  confirmPayment(clientSecret) ──────────────────────────────────→| Stripe
  |                                 |                                |
  |                                 | 3. Webhook                     |
  |                                 | ←── payment_intent.succeeded   | Stripe
  |                                 | ConfirmPaymentUseCase          |
  |                                 | status: paid → confirmed       |
  |                                 | createDeliveryInvoice() ──────→| InvoiceXpress
  |                                 |                                |
  |  4. Tracking page               |                                |
  |  Supabase Realtime ←──────────  | (updates automaticos)         |
  |                                 |                                |
  |                                 | 5. Cozinha confirma            |
  |                                 | PATCH status: preparing        |
  |                                 | PATCH status: ready_for_pickup |
  |                                 | createStuartJob() ────────────→| Stuart
  |                                 | CreateDeliveryUseCase          |
  |                                 |                                |
  |  6. Updates do estafeta         |                                |
  |  Supabase Realtime ←──────────  | ←── webhook updates            | Stuart
  |                                 | UpdateDeliveryStatusUseCase    |
  |                                 |                                |
  |  7. Entrega confirmada          |                                |
  |  Supabase Realtime ←──────────  | ←── webhook delivered          | Stuart
  |                                 | status: delivered              |
```

---

## 17. Verificacao e Testes

### Fase 0 - Base de Dados
```sql
SELECT * FROM delivery_orders LIMIT 0;
SELECT * FROM deliveries LIMIT 0;
SELECT * FROM delivery_error_logs LIMIT 0;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'delivery_orders';
SELECT * FROM pg_publication_tables WHERE tablename IN ('delivery_orders', 'deliveries');
```

### Fases 1-3 - Compilacao e Testes
```bash
npx tsc --noEmit
npm test -- --grep DeliveryService
npm test -- --grep DeliveryOrder
```

### Fase 4 - Integracoes
```bash
# Stripe test
stripe trigger payment_intent.succeeded

# Stuart sandbox test
curl -X POST https://api.sandbox.stuart.com/v2/jobs ...

# InvoiceXpress test
curl -X POST https://ACCOUNT.app.invoicexpress.com/simplified_invoices.json?api_key=KEY ...
```

### Fase 5 - Webhooks
```bash
# Stripe webhook local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Testar criacao de pedido
curl -X POST http://localhost:3000/api/delivery-orders -H "Content-Type: application/json" -d '{...}'
```

### E2E Completo
1. Navegar a `/pt/encomendar`
2. Selecionar restaurante, items, checkout
3. Pagar com test card `4242 4242 4242 4242`
4. Verificar webhook Stripe → order status `confirmed`
5. Verificar fatura criada (`invoice_number` no DB)
6. Cozinha marca `preparing` → `ready_for_pickup`
7. Verificar Stuart job criado (sandbox dashboard)
8. Stuart webhook → `in_transit` → `delivered`
9. Pagina tracking mostra estado final
10. Verificar email com PDF da fatura
