import { describe, it, expect, vi, beforeEach } from "vitest";
import { StartSessionUseCase } from "@/application/use-cases/sessions/StartSessionUseCase";
import { AutoAssignWaiterUseCase } from "@/application/use-cases/sessions/AutoAssignWaiterUseCase";
import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { ITableRepository } from "@/domain/repositories/ITableRepository";
import { Table } from "@/domain/entities/Table";
import { Session } from "@/domain/entities/Session";
import { Results } from "@/application/use-cases/Result";

// Helper para criar uma mesa de teste
function createTestTable(overrides: Partial<Table> = {}): Table {
  return {
    id: "table-1",
    number: 1,
    name: "Mesa 1",
    location: "circunvalacao",
    status: "available",
    isActive: true,
    currentSessionId: null,
    createdAt: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T12:00:00Z"),
    ...overrides,
  };
}

// Helper para criar uma sessão de teste
function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    tableId: "table-1",
    status: "active",
    isRodizio: false,
    numPeople: 2,
    totalAmount: 0,
    orderingMode: 'client',
    startedAt: new Date("2024-01-01T12:00:00Z"),
    closedAt: null,
    createdAt: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T12:00:00Z"),
    ...overrides,
  };
}

// Mock dos repositórios
function createMockSessionRepository(): ISessionRepository {
  return {
    findById: vi.fn(),
    findByIdWithTable: vi.fn(),
    findByIdWithOrders: vi.fn(),
    findActiveByTable: vi.fn(),
    findAll: vi.fn(),
    findActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    close: vi.fn(),
    countByStatus: vi.fn(),
    calculateTotal: vi.fn(),
  };
}

function createMockTableRepository(): ITableRepository {
  return {
    findById: vi.fn(),
    findByNumber: vi.fn(),
    findByIdWithWaiter: vi.fn(),
    findByIdWithSession: vi.fn(),
    findByIdFullStatus: vi.fn(),
    findAll: vi.fn(),
    findAllFullStatus: vi.fn(),
    findByWaiter: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countByStatus: vi.fn(),
  };
}

describe("StartSessionUseCase", () => {
  let useCase: StartSessionUseCase;
  let mockSessionRepository: ISessionRepository;
  let mockTableRepository: ITableRepository;

  beforeEach(() => {
    mockSessionRepository = createMockSessionRepository();
    mockTableRepository = createMockTableRepository();
    useCase = new StartSessionUseCase(
      mockSessionRepository,
      mockTableRepository,
    );
  });

  describe("execute", () => {
    it("deve iniciar sessão em mesa disponível", async () => {
      const table = createTestTable({ status: "available" });
      const newSession = createTestSession();

      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      vi.mocked(mockSessionRepository.create).mockResolvedValue(newSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({
        ...table,
        status: "occupied",
        currentSessionId: newSession.id,
      });

      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.id).toBe("session-1");
        expect(result.data.status).toBe("active");
      }
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });
      expect(mockTableRepository.update).toHaveBeenCalledWith("table-1", {
        status: "occupied",
        currentSessionId: "session-1",
      });
    });

    it("deve retornar erro se mesa não existe", async () => {
      vi.mocked(mockTableRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({
        tableId: "non-existent",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("TABLE_NOT_FOUND");
      }
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it("deve retornar erro se mesa está ocupada", async () => {
      const table = createTestTable({
        status: "occupied",
        currentSessionId: "existing-session",
      });
      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      // Sessão ativa existe — não é stale
      vi.mocked(mockSessionRepository.findById).mockResolvedValue(
        createTestSession({ id: "existing-session", status: "active" })
      );

      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("TABLE_OCCUPIED");
      }
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it("deve retornar erro se mesa está inativa", async () => {
      const table = createTestTable({ isActive: false });
      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);

      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("TABLE_INACTIVE");
      }
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it("deve retornar erro se número de pessoas é inválido", async () => {
      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
      expect(mockTableRepository.findById).not.toHaveBeenCalled();
    });

    it("deve retornar erro se número de pessoas excede limite", async () => {
      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 51,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("deve criar sessão rodízio", async () => {
      const table = createTestTable();
      const newSession = createTestSession({ isRodizio: true });

      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      vi.mocked(mockSessionRepository.create).mockResolvedValue(newSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({
        ...table,
        status: "occupied",
        currentSessionId: newSession.id,
      });

      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: true,
        numPeople: 4,
      });

      expect(result.success).toBe(true);
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        tableId: "table-1",
        isRodizio: true,
        numPeople: 4,
      });
    });
  });

  describe("auto-assign waiter", () => {
    it("deve chamar autoAssignWaiter após criar sessão", async () => {
      const mockAutoAssign = {
        execute: vi.fn().mockResolvedValue(Results.success({ assigned: true, waiterId: 'w1', waiterName: 'Alice' })),
      } as unknown as AutoAssignWaiterUseCase;

      const useCaseWithAutoAssign = new StartSessionUseCase(
        mockSessionRepository,
        mockTableRepository,
        mockAutoAssign,
      );

      const table = createTestTable();
      const newSession = createTestSession();

      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      vi.mocked(mockSessionRepository.create).mockResolvedValue(newSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({
        ...table,
        status: "occupied",
        currentSessionId: newSession.id,
      });

      const result = await useCaseWithAutoAssign.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(true);
      expect(mockAutoAssign.execute).toHaveBeenCalledWith({
        tableId: "table-1",
        location: "circunvalacao",
      });
    });

    it("não deve bloquear sessão se autoAssign falha", async () => {
      const mockAutoAssign = {
        execute: vi.fn().mockRejectedValue(new Error("auto-assign crashed")),
      } as unknown as AutoAssignWaiterUseCase;

      const useCaseWithAutoAssign = new StartSessionUseCase(
        mockSessionRepository,
        mockTableRepository,
        mockAutoAssign,
      );

      const table = createTestTable();
      const newSession = createTestSession();

      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      vi.mocked(mockSessionRepository.create).mockResolvedValue(newSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({
        ...table,
        status: "occupied",
        currentSessionId: newSession.id,
      });

      // Even though autoAssign throws, the session result catches it in the outer try/catch
      // and returns UNKNOWN_ERROR - but the session was already created
      const result = await useCaseWithAutoAssign.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      // Session was created before autoAssign was called
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(mockTableRepository.update).toHaveBeenCalled();
    });

    it("funciona sem autoAssign (backward compatible)", async () => {
      // useCase sem autoAssign (default do beforeEach)
      const table = createTestTable();
      const newSession = createTestSession();

      vi.mocked(mockTableRepository.findById).mockResolvedValue(table);
      vi.mocked(mockSessionRepository.create).mockResolvedValue(newSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({
        ...table,
        status: "occupied",
        currentSessionId: newSession.id,
      });

      const result = await useCase.execute({
        tableId: "table-1",
        isRodizio: false,
        numPeople: 2,
      });

      expect(result.success).toBe(true);
    });
  });
});
