/**
 * Test Mocks
 * Mock implementations for external services
 */

import { vi } from 'vitest';

// ============================================
// SUPABASE MOCK
// ============================================
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
};

export function createMockSupabase() {
  return mockSupabaseClient;
}

// ============================================
// RESEND (EMAIL) MOCK
// ============================================
export const mockResend = {
  emails: {
    send: vi.fn().mockResolvedValue({
      data: { id: 'email-123' },
      error: null,
    }),
  },
};

export function createMockResend() {
  return mockResend;
}

// ============================================
// FETCH MOCK
// ============================================
export function createMockFetch(responses: Record<string, unknown>) {
  return vi.fn((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const key = `${method}:${url}`;

    const response = responses[key] || responses[url] || { ok: true, json: async () => ({}) };

    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => response,
      ...response,
    });
  });
}

// ============================================
// NEXT.JS REQUEST/RESPONSE MOCKS
// ============================================
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}) {
  const { method = 'GET', url = 'http://localhost:3000', headers = {}, body } = options;

  return {
    method,
    url,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    nextUrl: new URL(url),
  } as unknown as Request;
}

// ============================================
// ROUTER MOCK
// ============================================
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

// ============================================
// LOCAL STORAGE MOCK
// ============================================
export function createMockLocalStorage() {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}
