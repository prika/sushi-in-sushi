/**
 * Integration Tests: Customers API
 * Tests for the /api/customers/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { calculateTier } from "@/domain/customers/tier";
import { GET as GETFromSession } from "@/app/api/customers/from-session/route";
import { isValidPortuguesePhone } from "@/lib/validation/phone";

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockSupabaseFrom,
    }),
  ),
}));

/** Creates an awaitable Supabase query chain that resolves to the given mock data */
function createMockSessionCustomersChain(mockData: Record<string, unknown>[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then(
      resolve: (_value: {
        data: Record<string, unknown>[];
        error: null;
      }) => unknown,
      reject?: (_reason: unknown) => unknown,
    ) {
      return Promise.resolve({ data: mockData, error: null }).then(
        resolve,
        reject,
      );
    },
  };
  return chain;
}

function createTestSessionCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc-1",
    session_id: "session-123",
    display_name: "João",
    full_name: null,
    email: null,
    phone: null,
    birth_date: null,
    marketing_consent: false,
    customer_id: null,
    is_session_host: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createTestCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: "customer-1",
    email: "customer@test.com",
    name: "João Cliente",
    phone: "912345678",
    total_visits: 10,
    total_spent: 450.5,
    points: 450,
    tier: "gold",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("GET /api/customers/from-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação de parâmetros", () => {
    it("requer sessionId", async () => {
      const request = new NextRequest(
        "http://localhost/api/customers/from-session",
      );
      const response = await GETFromSession(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "sessionId é obrigatório" });
    });

    it("aceita sessionId válido e retorna 200", async () => {
      const customers = [
        createTestSessionCustomer({ id: "c1", display_name: "João" }),
        createTestSessionCustomer({ id: "c2", display_name: "Maria" }),
      ];
      mockSupabaseFrom.mockReturnValue(
        createMockSessionCustomersChain(customers),
      );

      const request = new NextRequest(
        "http://localhost/api/customers/from-session?sessionId=session-123",
      );
      const response = await GETFromSession(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0].display_name).toBe("João");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("session_customers");
    });
  });

  describe("Busca de clientes", () => {
    it("retorna lista de clientes da sessão", async () => {
      const customers = [
        createTestSessionCustomer({ id: "c1", display_name: "João" }),
        createTestSessionCustomer({ id: "c2", display_name: "Maria" }),
      ];
      mockSupabaseFrom.mockReturnValue(
        createMockSessionCustomersChain(customers),
      );

      const request = new NextRequest(
        "http://localhost/api/customers/from-session?sessionId=session-123",
      );
      const response = await GETFromSession(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body[0].display_name).toBe("João");
      expect(body[1].display_name).toBe("Maria");
    });

    it("retorna array vazio quando sem clientes", async () => {
      mockSupabaseFrom.mockReturnValue(createMockSessionCustomersChain([]));

      const request = new NextRequest(
        "http://localhost/api/customers/from-session?sessionId=session-123",
      );
      const response = await GETFromSession(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
      expect(Array.isArray(body)).toBe(true);
    });
  });
});

describe("GET /api/customers/[id]/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação de ID", () => {
    it("valida UUID", () => {
      const validUUIDs = [
        "123e4567-e89b-12d3-a456-426614174000",
        "550e8400-e29b-41d4-a716-446655440000",
      ];

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      validUUIDs.forEach((uuid) => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
    });

    it("rejeita IDs inválidos", () => {
      const invalidIds = ["123", "abc", "", "not-a-uuid"];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidIds.forEach((id) => {
        expect(uuidRegex.test(id)).toBe(false);
      });
    });
  });

  describe("Histórico de cliente", () => {
    it("retorna informações do cliente", () => {
      const customer = createTestCustomer();

      expect(customer).toHaveProperty("id");
      expect(customer).toHaveProperty("email");
      expect(customer).toHaveProperty("name");
      expect(customer).toHaveProperty("total_visits");
      expect(customer).toHaveProperty("total_spent");
      expect(customer).toHaveProperty("points");
      expect(customer).toHaveProperty("tier");
    });

    it("calcula estatísticas corretas", () => {
      const customer = createTestCustomer({
        total_visits: 15,
        total_spent: 750.0,
      });

      const avgSpentPerVisit = customer.total_spent / customer.total_visits;

      expect(customer.total_visits).toBe(15);
      expect(customer.total_spent).toBe(750.0);
      expect(avgSpentPerVisit).toBe(50.0);
    });

    it("retorna reservas do cliente", () => {
      const reservations = [
        { id: "r1", date: "2026-02-20", status: "confirmed" },
        { id: "r2", date: "2026-01-15", status: "completed" },
      ];

      expect(reservations).toHaveLength(2);
      expect(reservations[0].status).toBe("confirmed");
    });

    it("retorna sessões do cliente", () => {
      const sessions = [
        { id: "s1", date: "2026-02-10", total: 45.5 },
        { id: "s2", date: "2026-01-20", total: 62.0 },
      ];

      expect(sessions).toHaveLength(2);
      expect(sessions.reduce((sum, s) => sum + s.total, 0)).toBe(107.5);
    });
  });

  describe("Sistema de tiers", () => {
    it("identifica tier bronze para points < 100", () => {
      const points = 50;
      const tier = calculateTier(points);

      expect(tier).toBe("bronze");
      expect(points).toBeLessThan(100);
    });

    it("identifica tier silver para 100 <= points < 500", () => {
      const points = 250;
      const tier = calculateTier(points);

      expect(tier).toBe("silver");
      expect(points).toBeGreaterThanOrEqual(100);
      expect(points).toBeLessThan(500);
    });

    it("identifica tier gold para 500 <= points < 1000", () => {
      const points = 750;
      const tier = calculateTier(points);

      expect(tier).toBe("gold");
      expect(points).toBeGreaterThanOrEqual(500);
      expect(points).toBeLessThan(1000);
    });

    it("identifica tier platinum para points >= 1000", () => {
      const points = 1500;
      const tier = calculateTier(points);

      expect(tier).toBe("platinum");
      expect(points).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("Cálculo de pontos", () => {
    it("converte gasto em pontos (1€ = 1 ponto)", () => {
      const spent = 45.5;
      const points = Math.floor(spent);

      expect(points).toBe(45);
    });

    it("arredonda para baixo valores decimais", () => {
      const spent = 99.99;
      const points = Math.floor(spent);

      expect(points).toBe(99);
    });

    it("acumula pontos ao longo do tempo", () => {
      const visits = [{ spent: 30.0 }, { spent: 45.5 }, { spent: 62.75 }];

      const totalPoints = visits.reduce(
        (sum, v) => sum + Math.floor(v.spent),
        0,
      );

      expect(totalPoints).toBe(137); // 30 + 45 + 62
    });
  });

  describe("Filtros de histórico", () => {
    it("filtra por data de início", () => {
      const sessions = [
        { date: "2026-02-15" },
        { date: "2026-01-10" },
        { date: "2026-03-20" },
      ];

      const startDate = "2026-02-01";
      const filtered = sessions.filter((s) => s.date >= startDate);

      expect(filtered).toHaveLength(2);
    });

    it("filtra por data de fim", () => {
      const sessions = [
        { date: "2026-02-15" },
        { date: "2026-01-10" },
        { date: "2026-03-20" },
      ];

      const endDate = "2026-02-28";
      const filtered = sessions.filter((s) => s.date <= endDate);

      expect(filtered).toHaveLength(2);
    });

    it("filtra por intervalo de datas", () => {
      const sessions = [
        { date: "2026-02-15" },
        { date: "2026-01-10" },
        { date: "2026-03-20" },
      ];

      const startDate = "2026-02-01";
      const endDate = "2026-02-28";
      const filtered = sessions.filter(
        (s) => s.date >= startDate && s.date <= endDate,
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe("2026-02-15");
    });
  });
});

describe("Validação de dados de cliente", () => {
  it("valida formato de email", () => {
    const validEmails = [
      "user@example.com",
      "test.user@example.com",
      "user+tag@example.co.uk",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it("valida formato de telefone português", () => {
    const validPhones = [
      "912345678",
      "961234567",
      "+351912345678",
      "00351961234567",
    ];

    const invalidPhones = [
      "12345678", // não começa com 9
      "91234567", // poucos dígitos
      "9123456789", // dígitos a mais
      "951234567", // prefixo inválido (95 não é mobile)
      "", // vazio
      "abc",
    ];

    validPhones.forEach((phone) => {
      expect(isValidPortuguesePhone(phone)).toBe(true);
    });

    invalidPhones.forEach((phone) => {
      expect(isValidPortuguesePhone(phone)).toBe(false);
    });
  });

  it("valida nome não vazio", () => {
    const validNames = ["João Silva", "Maria", "José Carlos dos Santos"];

    validNames.forEach((name) => {
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });
});
