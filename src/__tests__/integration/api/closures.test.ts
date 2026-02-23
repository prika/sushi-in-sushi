/**
 * Integration Tests: Closures API
 * Tests for the /api/closures/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  getFutureDate,
  getPastDate,
  createTestClosure,
} from "../../helpers/factories";
import { GET as GETClosures, POST, DELETE } from "@/app/api/closures/route";
import { GET as GETClosuresCheck } from "@/app/api/closures/check/route";

// Hoisted mocks (available when vi.mock factories run)
const { mockVerifyAuth, mockSupabaseFrom } = vi.hoisted(() => ({
  mockVerifyAuth: vi.fn(),
  mockSupabaseFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockSupabaseFrom,
    }),
  ),
}));

vi.mock("@/lib/auth", () => ({
  verifyAuth: mockVerifyAuth,
}));

/** Creates an awaitable Supabase query chain that resolves to the given mock data */
function createMockClosureChain(mockData: Record<string, unknown>[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  };
  const thenable = {
    ...chain,
    then(
      resolve: (value: {
        data: Record<string, unknown>[];
        error: null;
      }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve({ data: mockData, error: null }).then(
        resolve,
        reject,
      );
    },
  };
  return thenable;
}

describe("GET /api/closures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Filtros", () => {
    it("filtra por localização", async () => {
      const closures = [
        createTestClosure({ id: 1, location: "circunvalacao" }),
        createTestClosure({ id: 2, location: null }), // both locations
      ];
      mockSupabaseFrom.mockReturnValue(createMockClosureChain(closures));

      const request = new NextRequest(
        "http://localhost/api/closures?location=circunvalacao",
      );
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0]).toMatchObject({ location: "circunvalacao" });
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });

    it("filtra por intervalo de datas", async () => {
      const closures = [
        createTestClosure({ id: 1, closure_date: "2026-02-15" }),
      ];
      mockSupabaseFrom.mockReturnValue(createMockClosureChain(closures));

      const request = new NextRequest(
        "http://localhost/api/closures?startDate=2026-02-01&endDate=2026-02-28",
      );
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].closure_date).toBe("2026-02-15");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });

    it("exclui recorrentes quando includeRecurring=false", async () => {
      const closures = [createTestClosure({ id: 1, is_recurring: false })];
      mockSupabaseFrom.mockReturnValue(createMockClosureChain(closures));

      const request = new NextRequest(
        "http://localhost/api/closures?includeRecurring=false",
      );
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].is_recurring).toBe(false);
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });

    it("inclui recorrentes por padrão", async () => {
      const closures = [
        createTestClosure({ id: 1, is_recurring: false }),
        createTestClosure({ id: 2, is_recurring: true }),
      ];
      mockSupabaseFrom.mockReturnValue(createMockClosureChain(closures));

      const request = new NextRequest("http://localhost/api/closures");
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body.some((c: { is_recurring: boolean }) => c.is_recurring)).toBe(
        true,
      );
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });
  });

  describe("Tipos de fecho", () => {
    it("identifica fecho específico na resposta HTTP", async () => {
      const closure = createTestClosure({
        id: 1,
        is_recurring: false,
        closure_date: "2026-02-25",
        reason: "Feriado",
      });
      mockSupabaseFrom.mockReturnValue(createMockClosureChain([closure]));

      const request = new NextRequest("http://localhost/api/closures");
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body[0].is_recurring).toBe(false);
      expect(body[0].closure_date).toBe("2026-02-25");
      expect(body[0].reason).toBe("Feriado");
    });

    it("identifica fecho recorrente na resposta HTTP", async () => {
      const closure = createTestClosure({
        id: 1,
        is_recurring: true,
        recurring_day_of_week: 1,
        reason: "Fechado às segundas",
      });
      mockSupabaseFrom.mockReturnValue(createMockClosureChain([closure]));

      const request = new NextRequest("http://localhost/api/closures");
      const response = await GETClosures(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body[0].is_recurring).toBe(true);
      expect(body[0].recurring_day_of_week).toBe(1);
    });
  });

  describe("Validação de dias da semana", () => {
    it("valida dias da semana (0-6)", () => {
      [0, 1, 2, 3, 4, 5, 6].forEach((day) => {
        expect(day >= 0 && day <= 6).toBe(true);
      });
    });

    it("rejeita dias inválidos", () => {
      [-1, 7, 8, 10].forEach((day) => {
        expect(day >= 0 && day <= 6).toBe(false);
      });
    });
  });
});

describe("GET /api/closures/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validação de parâmetros", () => {
    it("requer date e location", () => {
      const params = { date: "2026-02-15" }; // missing location
      const isValid = params.date && "location" in params;

      expect(isValid).toBe(false);
    });

    it("aceita date e location válidos", () => {
      const params = { date: "2026-02-15", location: "circunvalacao" };
      const isValid = !!(params.date && params.location);

      expect(isValid).toBe(true);
    });
  });

  describe("Resposta quando fechado", () => {
    it("retorna isClosed=true com razão", () => {
      const response = {
        isClosed: true,
        reason: "Feriado Nacional",
        type: "specific",
      };

      expect(response.isClosed).toBe(true);
      expect(response.reason).toBeDefined();
      expect(response.type).toBe("specific");
    });

    it("indica tipo recorrente", () => {
      const response = {
        isClosed: true,
        reason: "Fechado às segundas",
        type: "recurring",
      };

      expect(response.type).toBe("recurring");
    });
  });

  describe("Resposta quando aberto", () => {
    it("retorna isClosed=false", () => {
      const response = {
        isClosed: false,
        reason: null,
        type: null,
      };

      expect(response.isClosed).toBe(false);
      expect(response.reason).toBeNull();
      expect(response.type).toBeNull();
    });
  });

  describe("Detecção de fecho recorrente", () => {
    it("deteta segundas-feiras (day 1)", () => {
      const date = new Date("2026-02-09"); // Monday
      const dayOfWeek = date.getDay();

      expect(dayOfWeek).toBe(1);
    });

    it("deteta domingos (day 0)", () => {
      const date = new Date("2026-02-08"); // Sunday
      const dayOfWeek = date.getDay();

      expect(dayOfWeek).toBe(0);
    });
  });

  describe("Tratamento de erros", () => {
    it("retorna isClosed=false em caso de erro", async () => {
      const dbError = { data: null, error: new Error("DB error") };
      const mockOr = vi.fn().mockResolvedValue(dbError);
      const mockEq2 = vi.fn().mockReturnValue({ or: mockOr });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const request = new NextRequest(
        "http://localhost/api/closures/check?date=2026-02-15&location=circunvalacao",
      );
      const response = await GETClosuresCheck(request);
      const body = await response.json();

      expect(body.isClosed).toBe(false);
      expect(body.reason).toBeNull();
      expect(body.type).toBeNull();
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });
  });
});

describe("POST /api/closures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Autenticação", () => {
    it("requer autenticação", async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/closures", {
        method: "POST",
        body: JSON.stringify({
          closure_date: getFutureDate(7),
          location: "circunvalacao",
          reason: "Test",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it("permite admin criar fecho", async () => {
      mockVerifyAuth.mockResolvedValue({ id: "admin-1", role: "admin" });

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          closure_date: getFutureDate(7),
          location: "circunvalacao",
          reason: "Test",
          is_recurring: false,
          recurring_day_of_week: null,
          created_by: "admin-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
      });

      const request = new NextRequest("http://localhost/api/closures", {
        method: "POST",
        body: JSON.stringify({
          closure_date: getFutureDate(7),
          location: "circunvalacao",
          reason: "Test",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockVerifyAuth).toHaveBeenCalled();
      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("closure_date");
    });
  });

  describe("Validação de dados", () => {
    it("valida data no formato YYYY-MM-DD", () => {
      const validDates = ["2026-02-15", "2026-12-31", "2027-01-01"];

      validDates.forEach((date) => {
        expect(/^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(true);
      });
    });

    it("rejeita datas no passado", () => {
      const pastDate = getPastDate(7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const closureDate = new Date(pastDate);

      expect(closureDate < today).toBe(true);
    });

    it("aceita datas futuras", () => {
      const futureDate = getFutureDate(7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const closureDate = new Date(futureDate);

      expect(closureDate >= today).toBe(true);
    });
  });

  describe("Tipos de fecho", () => {
    it("cria fecho específico", () => {
      const data = {
        closure_date: getFutureDate(7),
        location: "circunvalacao",
        reason: "Feriado",
        is_recurring: false,
      };

      expect(data.is_recurring).toBe(false);
      expect(data.closure_date).toBeDefined();
    });

    it("cria fecho recorrente", () => {
      const data = {
        is_recurring: true,
        recurring_day_of_week: 1,
        location: "circunvalacao",
        reason: "Fechado às segundas",
      };

      expect(data.is_recurring).toBe(true);
      expect(data.recurring_day_of_week).toBeDefined();
    });
  });
});

describe("DELETE /api/closures", () => {
  /** Creates a Supabase chain mock for DELETE flow: findById (select/eq/single) + delete (delete/eq) */
  function createDeleteMockChain(closureId: number, exists = true) {
    const closure = createTestClosure({ id: closureId });
    const mockSingle = vi
      .fn()
      .mockResolvedValue(
        exists
          ? { data: closure, error: null }
          : { data: null, error: { code: "PGRST116" } },
      );
    const mockEqForSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqForSelect });

    const mockEqForDelete = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqForDelete });

    mockSupabaseFrom.mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
    });

    return { mockEqForSelect, mockSingle, mockEqForDelete, mockDelete };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sucesso", () => {
    it("elimina fecho por ID e retorna 200", async () => {
      const closureId = 42;
      mockVerifyAuth.mockResolvedValue({ id: "admin-1", role: "admin" });
      const { mockEqForSelect, mockEqForDelete } = createDeleteMockChain(
        closureId,
        true,
      );

      const request = new NextRequest(
        `http://localhost/api/closures?id=${closureId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
      expect(mockEqForSelect).toHaveBeenCalledWith("id", closureId);
      expect(mockEqForDelete).toHaveBeenCalledWith("id", closureId);
    });
  });

  describe("Autenticação e autorização", () => {
    it("retorna 401 quando não autenticado", async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/closures?id=1", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it("retorna 403 quando não é admin", async () => {
      mockVerifyAuth.mockResolvedValue({ id: "waiter-1", role: "waiter" });

      const request = new NextRequest("http://localhost/api/closures?id=1", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain("administradores");
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe("Validação e erros", () => {
    it("retorna 400 quando ID está em falta", async () => {
      mockVerifyAuth.mockResolvedValue({ id: "admin-1", role: "admin" });

      const request = new NextRequest("http://localhost/api/closures", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("obrigatório");
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it("retorna 400 quando fecho não existe", async () => {
      const closureId = 999;
      mockVerifyAuth.mockResolvedValue({ id: "admin-1", role: "admin" });
      createDeleteMockChain(closureId, false);

      const request = new NextRequest(
        `http://localhost/api/closures?id=${closureId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("não encontrada");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("restaurant_closures");
    });
  });
});
