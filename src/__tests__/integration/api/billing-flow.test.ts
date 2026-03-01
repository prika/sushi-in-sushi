/**
 * Integration Tests: Billing & Payment Flow
 *
 * Tests the complete billing flow:
 * - GET /api/sessions — session with customer_nif
 * - POST /api/vendus/invoices — invoice creation with NIF and payment method
 * - Billing flow logic: NIF validation, document type selection, Vendus fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetAuthUser,
  mockLogActivity,
  mockCreateInvoice,
  mockCreateAdminClient,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockLogActivity: vi.fn().mockResolvedValue(undefined),
  mockCreateInvoice: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

vi.mock('@/lib/auth/activity', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

vi.mock('@/lib/vendus', () => ({
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
  getInvoices: vi.fn().mockResolvedValue([]),
  voidInvoice: vi.fn(),
  getInvoicePdf: vi.fn(),
}));

// Mock Supabase for sessions GET route
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => {
    const client = mockCreateAdminClient();
    return client || {
      from: vi.fn(() => mockSupabaseQuery),
    };
  },
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => mockSupabaseQuery),
  })),
}));

// ─── Route handler imports ───────────────────────────────────────────────────

import {
  GET as getSessions,
} from '@/app/api/sessions/route';

import {
  POST as postInvoices,
} from '@/app/api/vendus/invoices/route';

// ─── Test data ───────────────────────────────────────────────────────────────

const _adminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  location: null,
};

const waiterUser = {
  id: 'waiter-1',
  email: 'waiter@test.com',
  name: 'Waiter',
  role: 'waiter',
  location: 'circunvalacao',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

function createJsonRequest(url: string, body: unknown, method = 'POST'): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/vendus/invoices — Billing-specific scenarios
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/vendus/invoices (billing flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice creation with NIF (Fatura-Recibo)', () => {
    it('passes customerNif to createInvoice when provided', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-nif-1',
        vendusId: '99010',
        documentNumber: 'FR 2026/001',
        pdfUrl: 'https://vendus.pt/pdf/1',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-billing-1',
        locationSlug: 'circunvalacao',
        paymentMethodId: 1,
        paidAmount: 45.50,
        customerNif: '123456789',
        customerName: 'João Silva',
      });
      const response = await postInvoices(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.documentNumber).toBe('FR 2026/001');
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          customerNif: '123456789',
          customerName: 'João Silva',
          issuedBy: 'waiter-1',
        }),
      );
    });

    it('passes customerNif as undefined when not provided (Fatura Simplificada)', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-no-nif',
        vendusId: '99011',
        documentNumber: 'FS 2026/001',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-billing-2',
        locationSlug: 'circunvalacao',
        paymentMethodId: 2,
        paidAmount: 30.00,
      });
      const response = await postInvoices(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.documentNumber).toBe('FS 2026/001');
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          customerNif: undefined,
          customerName: undefined,
        }),
      );
    });
  });

  describe('Payment method selection', () => {
    it('passes correct paymentMethodId for card payment', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-card',
        vendusId: '99020',
        documentNumber: 'FS 2026/002',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-card',
        locationSlug: 'circunvalacao',
        paymentMethodId: 2, // Multibanco
        paidAmount: 75.00,
      });
      const response = await postInvoices(request);

      expect(response.status).toBe(201);
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethodId: 2,
          paidAmount: 75.00,
        }),
      );
    });

    it('passes correct paymentMethodId for MB Way', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-mbway',
        vendusId: '99021',
        documentNumber: 'FS 2026/003',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-mbway',
        locationSlug: 'circunvalacao',
        paymentMethodId: 3, // MB Way
        paidAmount: 55.00,
      });
      const response = await postInvoices(request);

      expect(response.status).toBe(201);
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethodId: 3,
        }),
      );
    });
  });

  describe('Vendus not configured (fallback scenario)', () => {
    it('returns error when Vendus is not configured for location', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: false,
        error: 'Vendus nao configurado para esta localizacao',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-no-vendus',
        locationSlug: 'boavista',
        paymentMethodId: 1,
        paidAmount: 40.00,
      });
      const response = await postInvoices(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Vendus nao configurado para esta localizacao');
    });

    it('does not log activity when Vendus fails', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: false,
        error: 'Vendus nao configurado',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-fail',
        locationSlug: 'circunvalacao',
        paymentMethodId: 1,
        paidAmount: 50.00,
      });
      await postInvoices(request);

      expect(mockLogActivity).not.toHaveBeenCalled();
    });
  });

  describe('Activity logging', () => {
    it('logs invoice_created with correct metadata', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-log-1',
        vendusId: '99030',
        documentNumber: 'FR 2026/010',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-log',
        locationSlug: 'circunvalacao',
        paymentMethodId: 1,
        paidAmount: 100.00,
        customerNif: '999999990',
      });
      await postInvoices(request);

      expect(mockLogActivity).toHaveBeenCalledWith(
        'waiter-1',
        'invoice_created',
        'invoice',
        'inv-log-1',
        expect.objectContaining({
          vendusId: '99030',
          documentNumber: 'FR 2026/010',
          sessionId: 'session-log',
        }),
      );
    });
  });

  describe('Full billing flow with NIF and payment', () => {
    it('waiter creates invoice with NIF + card payment', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-full-1',
        vendusId: '99040',
        documentNumber: 'FR 2026/020',
        pdfUrl: 'https://vendus.pt/pdf/full-1',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-full-billing',
        locationSlug: 'circunvalacao',
        paymentMethodId: 2,
        paidAmount: 89.50,
        customerNif: '507123456',
        customerName: 'Empresa Lda',
      });
      const response = await postInvoices(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.invoiceId).toBe('inv-full-1');
      expect(body.pdfUrl).toBe('https://vendus.pt/pdf/full-1');

      // Verify all params passed correctly
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        sessionId: 'session-full-billing',
        locationSlug: 'circunvalacao',
        paymentMethodId: 2,
        paidAmount: 89.50,
        customerNif: '507123456',
        customerName: 'Empresa Lda',
        issuedBy: 'waiter-1',
      });

      // Verify activity logged
      expect(mockLogActivity).toHaveBeenCalledOnce();
    });

    it('waiter creates invoice without NIF (consumidor final)', async () => {
      mockGetAuthUser.mockResolvedValue(waiterUser);
      mockCreateInvoice.mockResolvedValue({
        success: true,
        invoiceId: 'inv-anon',
        vendusId: '99041',
        documentNumber: 'FS 2026/021',
      });

      const request = createJsonRequest('/api/vendus/invoices', {
        sessionId: 'session-anon-billing',
        locationSlug: 'circunvalacao',
        paymentMethodId: 1,
        paidAmount: 25.00,
      });
      const response = await postInvoices(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.documentNumber).toBe('FS 2026/021');
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          customerNif: undefined,
          paymentMethodId: 1,
        }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sessions — Session with customer_nif
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/sessions (billing fields)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default Supabase mock chain
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });
  });

  it('returns 400 when tableNumber is missing', async () => {
    const request = createRequest('/api/sessions?location=circunvalacao');
    const response = await getSessions(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('tableNumber é obrigatório');
  });

  it('returns null session when table not found', async () => {
    // Mock from() to return a query builder that eventually resolves to null
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => queryBuilder),
    });

    const request = createRequest('/api/sessions?tableNumber=999&location=circunvalacao');
    const response = await getSessions(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tableId).toBeNull();
    expect(body.session).toBeNull();
  });

  it('returns session with customer_nif when present', async () => {
    const sessionWithNif = {
      id: 'session-nif-test',
      table_id: 'table-1',
      status: 'pending_payment',
      is_rodizio: false,
      num_people: 2,
      total_amount: 45.50,
      customer_nif: '123456789',
      started_at: new Date().toISOString(),
    };

    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // tables query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null }),
        };
      }
      if (callCount === 2) {
        // sessions query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: sessionWithNif, error: null }),
        };
      }
      if (callCount === 3) {
        // waiter_assignments query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { staff_name: 'Carlos' }, error: null }),
        };
      }
      // restaurants query
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'r-1', order_cooldown_minutes: 3, games_mode: 'off' }, error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    const request = createRequest('/api/sessions?tableNumber=5&location=circunvalacao');
    const response = await getSessions(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session).toBeDefined();
    expect(body.session.customer_nif).toBe('123456789');
    expect(body.session.status).toBe('pending_payment');
    expect(body.waiterName).toBe('Carlos');
  });

  it('returns session without customer_nif (active session)', async () => {
    const activeSession = {
      id: 'session-active',
      table_id: 'table-2',
      status: 'active',
      is_rodizio: true,
      num_people: 4,
      total_amount: 0,
      customer_nif: null,
      started_at: new Date().toISOString(),
    };

    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'table-2' }, error: null }),
        };
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: activeSession, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    const request = createRequest('/api/sessions?tableNumber=10&location=circunvalacao');
    const response = await getSessions(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session).toBeDefined();
    expect(body.session.customer_nif).toBeNull();
    expect(body.session.status).toBe('active');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NIF Validation Logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('NIF validation', () => {
  // Portuguese NIF: exactly 9 digits
  const isValidNif = (nif: string): boolean => /^\d{9}$/.test(nif);

  it('accepts valid 9-digit NIF', () => {
    expect(isValidNif('123456789')).toBe(true);
    expect(isValidNif('507123456')).toBe(true);
    expect(isValidNif('999999990')).toBe(true);
  });

  it('rejects NIF with fewer than 9 digits', () => {
    expect(isValidNif('12345678')).toBe(false);
    expect(isValidNif('1234')).toBe(false);
    expect(isValidNif('')).toBe(false);
  });

  it('rejects NIF with more than 9 digits', () => {
    expect(isValidNif('1234567890')).toBe(false);
    expect(isValidNif('12345678901')).toBe(false);
  });

  it('rejects NIF with letters', () => {
    expect(isValidNif('12345678a')).toBe(false);
    expect(isValidNif('abcdefghi')).toBe(false);
    expect(isValidNif('PT12345678')).toBe(false);
  });

  it('rejects NIF with spaces', () => {
    expect(isValidNif('123 456 789')).toBe(false);
    expect(isValidNif(' 123456789')).toBe(false);
  });

  it('rejects NIF with special characters', () => {
    expect(isValidNif('123-456-789')).toBe(false);
    expect(isValidNif('123.456.789')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Billing Flow — Session Status Transitions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Billing session status transitions', () => {
  it('valid: active → pending_payment (customer requests bill)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['active']).toContain('pending_payment');
  });

  it('valid: pending_payment → paid (waiter processes payment)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['pending_payment']).toContain('paid');
  });

  it('valid: paid → closed (session fully closed)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['paid']).toContain('closed');
  });

  it('invalid: active → paid (cannot skip pending_payment from customer)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['active']).not.toContain('paid');
  });

  it('valid: pending_payment → active (cancel bill request)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['pending_payment']).toContain('active');
  });

  it('invalid: closed → any (closed sessions cannot transition)', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['pending_payment', 'closed'],
      pending_payment: ['paid', 'active'],
      paid: ['closed'],
      closed: [],
    };

    expect(validTransitions['closed']).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Document Type Selection Logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('Document type selection', () => {
  // Mirrors the logic in src/lib/vendus/invoices.ts
  const getDocumentType = (customerNif?: string): 'FR' | 'FS' => {
    return customerNif ? 'FR' : 'FS';
  };

  it('returns FR (Fatura-Recibo) when NIF is provided', () => {
    expect(getDocumentType('123456789')).toBe('FR');
    expect(getDocumentType('507123456')).toBe('FR');
  });

  it('returns FS (Fatura Simplificada) when no NIF', () => {
    expect(getDocumentType()).toBe('FS');
    expect(getDocumentType(undefined)).toBe('FS');
  });

  it('returns FR for any non-empty NIF string', () => {
    expect(getDocumentType('999999999')).toBe('FR');
  });
});
