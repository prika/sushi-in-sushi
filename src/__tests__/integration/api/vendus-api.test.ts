/**
 * Integration Tests: Vendus API Routes
 *
 * Tests for 5 Vendus API route files:
 * - /api/vendus/sync/products (GET + POST)
 * - /api/vendus/sync/tables (GET + POST)
 * - /api/vendus/invoices (GET + POST + DELETE)
 * - /api/vendus/invoices/[id]/pdf (GET)
 *
 * Each route follows: auth check -> validate body -> call vendus function -> log activity -> return result
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
// vi.hoisted ensures mock variables exist before vi.mock factory functions run

const {
  mockGetAuthUser,
  mockLogActivity,
  mockSyncProducts,
  mockGetProductSyncStats,
  mockImportTablesFromVendus,
  mockGetTableMapping,
  mockCreateInvoice,
  mockGetInvoices,
  mockVoidInvoice,
  mockGetInvoicePdf,
  mockAdminFrom,
} = vi.hoisted(() => {
  const mockAdminFrom = vi.fn();
  return {
    mockGetAuthUser: vi.fn(),
    mockLogActivity: vi.fn().mockResolvedValue(undefined),
    mockSyncProducts: vi.fn(),
    mockGetProductSyncStats: vi.fn(),
    mockImportTablesFromVendus: vi.fn(),
    mockGetTableMapping: vi.fn(),
    mockCreateInvoice: vi.fn(),
    mockGetInvoices: vi.fn(),
    mockVoidInvoice: vi.fn(),
    mockGetInvoicePdf: vi.fn(),
    mockAdminFrom,
  };
});

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

vi.mock('@/lib/auth/activity', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}));

vi.mock('@/lib/vendus', () => ({
  syncProducts: (...args: unknown[]) => mockSyncProducts(...args),
  getProductSyncStats: (...args: unknown[]) => mockGetProductSyncStats(...args),
  importTablesFromVendus: (...args: unknown[]) => mockImportTablesFromVendus(...args),
  getTableMapping: (...args: unknown[]) => mockGetTableMapping(...args),
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
  getInvoices: (...args: unknown[]) => mockGetInvoices(...args),
  voidInvoice: (...args: unknown[]) => mockVoidInvoice(...args),
  getInvoicePdf: (...args: unknown[]) => mockGetInvoicePdf(...args),
  isVendusReadOnly: () => false,
}));

// ─── Route handler imports ───────────────────────────────────────────────────

import {
  GET as getProducts,
  POST as postProducts,
} from '@/app/api/vendus/sync/products/route';

import {
  GET as getTables,
  POST as postTables,
} from '@/app/api/vendus/sync/tables/route';

import {
  GET as getInvoicesList,
  POST as postInvoices,
  DELETE as deleteInvoices,
} from '@/app/api/vendus/invoices/route';

import {
  GET as getInvoicePdfRoute,
} from '@/app/api/vendus/invoices/[id]/pdf/route';

// ─── Test data ───────────────────────────────────────────────────────────────

const adminUser = {
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

const kitchenUser = {
  id: 'kitchen-1',
  email: 'kitchen@test.com',
  name: 'Kitchen',
  role: 'kitchen',
  location: 'circunvalacao',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

function createJsonRequest(url: string, body: unknown, method = 'POST'): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sync Products (GET + POST)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/vendus/sync/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const response = await getProducts();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 when not admin', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);

    const response = await getProducts();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns products, categories and stats on success', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const stats = { total: 50, synced: 40, pending: 10, error: 0 };
    const mockProducts = [{ id: 'p1', name: 'Sashimi' }];
    const mockCategories = [{ id: 'c1', name: 'Sushi' }];
    mockGetProductSyncStats.mockResolvedValue(stats);
    mockAdminFrom.mockImplementation((table: string) => {
      const data = table === 'categories' ? mockCategories : mockProducts;
      return {
        select: () => ({
          order: () => Promise.resolve({ data, error: null }),
        }),
      };
    });

    const response = await getProducts();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toEqual(mockProducts);
    expect(body.categories).toEqual(mockCategories);
    expect(body.stats).toEqual(stats);
  });

  it('returns 500 when admin query throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockAdminFrom.mockImplementation(() => { throw new Error('DB connection failed'); });

    const response = await getProducts();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao obter dados de sync');
  });
});

describe('POST /api/vendus/sync/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 403 when not admin', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = new NextRequest(
      new URL('/api/vendus/sync/products', 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json{{{',
      },
    );
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Corpo do pedido invalido');
  });

  it('returns 400 when locationSlug is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/sync/products', {
      direction: 'push',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Localizacao obrigatoria');
  });

  it('returns 400 for invalid direction', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'sideways',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Direcao invalida. Use: push, pull ou both');
  });

  it('calls syncProducts with correct params and returns result', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const syncResult = {
      success: true,
      recordsProcessed: 10,
      recordsCreated: 5,
      recordsUpdated: 3,
      recordsFailed: 2,
    };
    mockSyncProducts.mockResolvedValue(syncResult);

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'push',
      pushAll: true,
      syncCategoriesFirst: false,
      previewOnly: false,
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(syncResult);
    expect(mockSyncProducts).toHaveBeenCalledWith({
      locationSlug: 'circunvalacao',
      direction: 'push',
      productIds: undefined,
      pushAll: true,
      previewOnly: false,
      defaultCategoryId: undefined,
      initiatedBy: 'admin-1',
    });
  });

  it('defaults direction to "both" when not provided', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSyncProducts.mockResolvedValue({ success: true, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0 });

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
    });
    await postProducts(request);

    expect(mockSyncProducts).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'both' }),
    );
  });

  it('logs activity on success when not previewOnly', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const syncResult = {
      success: true,
      recordsProcessed: 5,
      recordsCreated: 3,
      recordsUpdated: 2,
      recordsFailed: 0,
    };
    mockSyncProducts.mockResolvedValue(syncResult);

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'pull',
      previewOnly: false,
    });
    await postProducts(request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      'admin-1',
      'vendus_product_sync',
      'product',
      undefined,
      expect.objectContaining({
        direction: 'pull',
        locationSlug: 'circunvalacao',
        recordsProcessed: 5,
        success: true,
      }),
    );
  });

  it('does NOT log activity when previewOnly is true', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSyncProducts.mockResolvedValue({
      success: true,
      recordsProcessed: 3,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
    });

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'push',
      previewOnly: true,
    });
    await postProducts(request);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('returns 500 when syncProducts throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSyncProducts.mockRejectedValue(new Error('Vendus API timeout'));

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'push',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Vendus API timeout');
  });

  it('returns generic error message when non-Error is thrown', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSyncProducts.mockRejectedValue('unexpected string error');

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'push',
    });
    const response = await postProducts(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao sincronizar produtos');
  });

  it('passes productIds when provided', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockSyncProducts.mockResolvedValue({ success: true, recordsProcessed: 2, recordsCreated: 0, recordsUpdated: 2, recordsFailed: 0 });

    const request = createJsonRequest('/api/vendus/sync/products', {
      locationSlug: 'circunvalacao',
      direction: 'push',
      productIds: ['prod-1', 'prod-2'],
    });
    await postProducts(request);

    expect(mockSyncProducts).toHaveBeenCalledWith(
      expect.objectContaining({ productIds: ['prod-1', 'prod-2'] }),
    );
  });

  // Test removed: syncCategoriesFirst was removed from ProductSyncOptions
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sync Tables (GET + POST)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/vendus/sync/tables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createRequest('/api/vendus/sync/tables?location=circunvalacao');
    const response = await getTables(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 when not admin', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);

    const request = createRequest('/api/vendus/sync/tables?location=circunvalacao');
    const response = await getTables(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 400 when location param is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createRequest('/api/vendus/sync/tables');
    const response = await getTables(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Localizacao obrigatoria');
  });

  it('returns table mapping on success', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const mapping = [
      { localTableId: 'tbl-1', vendusTableId: 101, tableName: 'Mesa 1' },
      { localTableId: 'tbl-2', vendusTableId: 102, tableName: 'Mesa 2' },
    ];
    mockGetTableMapping.mockResolvedValue(mapping);

    const request = createRequest('/api/vendus/sync/tables?location=circunvalacao');
    const response = await getTables(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mapping);
    expect(mockGetTableMapping).toHaveBeenCalledWith('circunvalacao');
  });

  it('returns 500 when getTableMapping throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetTableMapping.mockRejectedValue(new Error('Mapping query failed'));

    const request = createRequest('/api/vendus/sync/tables?location=circunvalacao');
    const response = await getTables(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao obter mapeamento');
  });
});

describe('POST /api/vendus/sync/tables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'circunvalacao',
    });
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 when not admin', async () => {
    mockGetAuthUser.mockResolvedValue(kitchenUser);

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'circunvalacao',
    });
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = new NextRequest(
      new URL('/api/vendus/sync/tables', 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken',
      },
    );
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Corpo do pedido invalido');
  });

  it('returns 400 when locationSlug is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/sync/tables', {});
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Localizacao obrigatoria');
  });

  it('calls importTablesFromVendus and returns result on success', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const importResult = {
      success: true,
      recordsProcessed: 12,
      recordsCreated: 8,
      recordsUpdated: 4,
    };
    mockImportTablesFromVendus.mockResolvedValue(importResult);

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'boavista',
    });
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(importResult);
    expect(mockImportTablesFromVendus).toHaveBeenCalledWith({
      locationSlug: 'boavista',
      initiatedBy: 'admin-1',
    });
  });

  it('logs activity on success', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const importResult = {
      success: true,
      recordsProcessed: 5,
      recordsCreated: 3,
      recordsUpdated: 2,
    };
    mockImportTablesFromVendus.mockResolvedValue(importResult);

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'circunvalacao',
    });
    await postTables(request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      'admin-1',
      'vendus_table_import',
      'table',
      undefined,
      expect.objectContaining({
        locationSlug: 'circunvalacao',
        recordsProcessed: 5,
        recordsCreated: 3,
        recordsUpdated: 2,
        success: true,
      }),
    );
  });

  it('returns 500 when importTablesFromVendus throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockImportTablesFromVendus.mockRejectedValue(new Error('Vendus store not configured'));

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'circunvalacao',
    });
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Vendus store not configured');
  });

  it('returns generic error message when non-Error is thrown', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockImportTablesFromVendus.mockRejectedValue(null);

    const request = createJsonRequest('/api/vendus/sync/tables', {
      locationSlug: 'circunvalacao',
    });
    const response = await postTables(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao importar mesas');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Invoices (GET + POST + DELETE)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/vendus/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 for kitchen role', async () => {
    mockGetAuthUser.mockResolvedValue(kitchenUser);

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('allows admin role', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoices.mockResolvedValue([]);

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);

    expect(response.status).toBe(200);
  });

  it('allows waiter role', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);
    mockGetInvoices.mockResolvedValue([]);

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);

    expect(response.status).toBe(200);
  });

  it('returns invoices with default params', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const invoices = [
      { id: 'inv-1', documentNumber: 'FT 001', total: 50.00 },
      { id: 'inv-2', documentNumber: 'FT 002', total: 75.50 },
    ];
    mockGetInvoices.mockResolvedValue(invoices);

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(invoices);
    expect(mockGetInvoices).toHaveBeenCalledWith({
      status: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('passes query params to getInvoices', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoices.mockResolvedValue([]);

    const request = createRequest('/api/vendus/invoices?status=active&limit=10&offset=20');
    await getInvoicesList(request);

    expect(mockGetInvoices).toHaveBeenCalledWith({
      status: 'active',
      limit: 10,
      offset: 20,
    });
  });

  it('defaults invalid limit/offset to 50/0', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoices.mockResolvedValue([]);

    const request = createRequest('/api/vendus/invoices?limit=abc&offset=xyz');
    await getInvoicesList(request);

    expect(mockGetInvoices).toHaveBeenCalledWith({
      status: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('returns 500 when getInvoices throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoices.mockRejectedValue(new Error('Query error'));

    const request = createRequest('/api/vendus/invoices');
    const response = await getInvoicesList(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao obter faturas');
  });
});

describe('POST /api/vendus/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 for kitchen role', async () => {
    mockGetAuthUser.mockResolvedValue(kitchenUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = new NextRequest(
      new URL('/api/vendus/invoices', 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '---bad---',
      },
    );
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Corpo do pedido invalido');
  });

  it('returns 400 when sessionId is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('ID da sessao obrigatorio');
  });

  it('returns 400 when sessionId is not a string', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 12345,
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('ID da sessao obrigatorio');
  });

  it('returns 400 when locationSlug is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Localizacao obrigatoria');
  });

  it('returns 400 when paymentMethodId is not a positive number', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 0,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Metodo de pagamento invalido');
  });

  it('returns 400 when paymentMethodId is a string', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 'cash',
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Metodo de pagamento invalido');
  });

  it('returns 400 when paidAmount is negative', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: -10,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Valor pago invalido');
  });

  it('returns 201 on successful invoice creation', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const invoiceResult = {
      success: true,
      invoiceId: 'inv-123',
      vendusId: 99001,
      documentNumber: 'FT 2026/001',
    };
    mockCreateInvoice.mockResolvedValue(invoiceResult);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 89.90,
      customerNif: '123456789',
      customerName: 'Test Customer',
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(invoiceResult);
    expect(mockCreateInvoice).toHaveBeenCalledWith({
      sessionId: 'session-1',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 89.90,
      customerNif: '123456789',
      customerName: 'Test Customer',
      issuedBy: 'admin-1',
    });
  });

  it('allows waiter to create invoices', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoiceId: 'inv-456',
      vendusId: 99002,
      documentNumber: 'FT 2026/002',
    });

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-2',
      locationSlug: 'circunvalacao',
      paymentMethodId: 2,
      paidAmount: 45.00,
    });
    const response = await postInvoices(request);

    expect(response.status).toBe(201);
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ issuedBy: 'waiter-1' }),
    );
  });

  it('returns 400 when createInvoice returns success=false', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const failResult = {
      success: false,
      error: 'Session has no delivered orders',
    };
    mockCreateInvoice.mockResolvedValue(failResult);

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-empty',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 0,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('logs activity on successful creation', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoiceId: 'inv-789',
      vendusId: 99003,
      documentNumber: 'FT 2026/003',
    });

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-3',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 120.00,
    });
    await postInvoices(request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      'admin-1',
      'invoice_created',
      'invoice',
      'inv-789',
      expect.objectContaining({
        vendusId: 99003,
        documentNumber: 'FT 2026/003',
        sessionId: 'session-3',
      }),
    );
  });

  it('does NOT log activity when creation fails', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockCreateInvoice.mockResolvedValue({
      success: false,
      error: 'No items',
    });

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-4',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 0,
    });
    await postInvoices(request);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('returns 500 when createInvoice throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockCreateInvoice.mockRejectedValue(new Error('Vendus API error'));

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-5',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 50,
    });
    const response = await postInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao criar fatura');
  });

  it('accepts paidAmount of zero', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockCreateInvoice.mockResolvedValue({ success: true, invoiceId: 'inv-0', vendusId: 1, documentNumber: 'FT 001' });

    const request = createJsonRequest('/api/vendus/invoices', {
      sessionId: 'session-free',
      locationSlug: 'circunvalacao',
      paymentMethodId: 1,
      paidAmount: 0,
    });
    const response = await postInvoices(request);

    expect(response.status).toBe(201);
  });
});

describe('DELETE /api/vendus/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-1',
      reason: 'Duplicate',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 403 when not admin (waiter cannot void)', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-1',
      reason: 'Duplicate',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acesso nao autorizado');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = new NextRequest(
      new URL('/api/vendus/invoices', 'http://localhost:3000'),
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '}{bad',
      },
    );
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Corpo do pedido invalido');
  });

  it('returns 400 when invoiceId is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      reason: 'Duplicate',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('ID da fatura obrigatorio');
  });

  it('returns 400 when invoiceId is not a string', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 123,
      reason: 'Duplicate',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('ID da fatura obrigatorio');
  });

  it('returns 400 when reason is missing', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-1',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Motivo da anulacao obrigatorio');
  });

  it('returns 400 when reason is not a string', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-1',
      reason: 42,
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Motivo da anulacao obrigatorio');
  });

  it('voids invoice and returns 200 on success', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const voidResult = { success: true };
    mockVoidInvoice.mockResolvedValue(voidResult);

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-to-void',
      reason: 'Customer refund',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(voidResult);
    expect(mockVoidInvoice).toHaveBeenCalledWith('inv-to-void', 'Customer refund', 'admin-1');
  });

  it('returns 400 when voidInvoice returns success=false', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockVoidInvoice.mockResolvedValue({
      success: false,
      error: 'Invoice already voided',
    });

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-already-voided',
      reason: 'Mistake',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('logs activity on successful void', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockVoidInvoice.mockResolvedValue({ success: true });

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-void-log',
      reason: 'Wrong items',
    }, 'DELETE');
    await deleteInvoices(request);

    expect(mockLogActivity).toHaveBeenCalledWith(
      'admin-1',
      'invoice_voided',
      'invoice',
      'inv-void-log',
      { reason: 'Wrong items' },
    );
  });

  it('does NOT log activity when void fails', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockVoidInvoice.mockResolvedValue({ success: false, error: 'Already voided' });

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-fail',
      reason: 'Test',
    }, 'DELETE');
    await deleteInvoices(request);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('returns 500 when voidInvoice throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockVoidInvoice.mockRejectedValue(new Error('Network error'));

    const request = createJsonRequest('/api/vendus/invoices', {
      invoiceId: 'inv-error',
      reason: 'Test',
    }, 'DELETE');
    const response = await deleteInvoices(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao anular fatura');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Invoice PDF (GET)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/vendus/invoices/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const request = createRequest('/api/vendus/invoices/inv-1/pdf');
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Nao autenticado');
  });

  it('returns 400 when id param is empty', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);

    const request = createRequest('/api/vendus/invoices//pdf');
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: '' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('ID da fatura obrigatorio');
  });

  it('returns 404 when getInvoicePdf returns success=false', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoicePdf.mockResolvedValue({
      success: false,
      error: 'Invoice not found',
    });

    const request = createRequest('/api/vendus/invoices/inv-missing/pdf');
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-missing' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Invoice not found');
  });

  it('returns JSON with pdfUrl when Accept: application/json', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoicePdf.mockResolvedValue({
      success: true,
      pdfUrl: 'https://vendus.pt/invoices/inv-1.pdf',
    });

    const request = new NextRequest(
      new URL('/api/vendus/invoices/inv-1/pdf', 'http://localhost:3000'),
      {
        headers: { accept: 'application/json' },
      },
    );
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pdfUrl).toBe('https://vendus.pt/invoices/inv-1.pdf');
  });

  it('redirects when Accept header is not application/json', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    const pdfUrl = 'https://vendus.pt/invoices/inv-2.pdf';
    mockGetInvoicePdf.mockResolvedValue({
      success: true,
      pdfUrl,
    });

    const request = new NextRequest(
      new URL('/api/vendus/invoices/inv-2/pdf', 'http://localhost:3000'),
      {
        headers: { accept: 'text/html' },
      },
    );
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-2' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(pdfUrl);
  });

  it('returns 404 when pdfUrl is null/undefined and not JSON accept', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoicePdf.mockResolvedValue({
      success: true,
      pdfUrl: null,
    });

    const request = new NextRequest(
      new URL('/api/vendus/invoices/inv-3/pdf', 'http://localhost:3000'),
      {
        headers: { accept: 'text/html' },
      },
    );
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-3' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('PDF nao disponivel');
  });

  it('calls getInvoicePdf with the correct id', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoicePdf.mockResolvedValue({ success: true, pdfUrl: 'https://example.com/pdf' });

    const request = new NextRequest(
      new URL('/api/vendus/invoices/inv-specific/pdf', 'http://localhost:3000'),
      { headers: { accept: 'application/json' } },
    );
    await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-specific' }),
    });

    expect(mockGetInvoicePdf).toHaveBeenCalledWith('inv-specific');
  });

  it('returns 500 when getInvoicePdf throws', async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockGetInvoicePdf.mockRejectedValue(new Error('PDF service down'));

    const request = createRequest('/api/vendus/invoices/inv-error/pdf');
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-error' }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Erro ao obter PDF da fatura');
  });

  it('allows waiter role to access PDF', async () => {
    mockGetAuthUser.mockResolvedValue(waiterUser);
    mockGetInvoicePdf.mockResolvedValue({
      success: true,
      pdfUrl: 'https://vendus.pt/invoices/inv-w.pdf',
    });

    const request = new NextRequest(
      new URL('/api/vendus/invoices/inv-w/pdf', 'http://localhost:3000'),
      { headers: { accept: 'application/json' } },
    );
    const response = await getInvoicePdfRoute(request, {
      params: Promise.resolve({ id: 'inv-w' }),
    });

    expect(response.status).toBe(200);
  });
});
