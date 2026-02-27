import { describe, it, expect, vi, beforeEach } from "vitest";
import { IRestaurantRepository } from "@/domain/repositories/IRestaurantRepository";
import { ITableRepository } from "@/domain/repositories/ITableRepository";
import { Restaurant } from "@/domain/entities/Restaurant";
import { Table } from "@/domain/entities/Table";
import { CreateTablesForRestaurantUseCase } from "@/application/use-cases/restaurants";

// --- Helpers ---

const baseRestaurant: Restaurant = {
  id: "rest-1",
  name: "Circunvalação",
  slug: "circunvalacao",
  address: "Porto",
  latitude: null,
  longitude: null,
  maxCapacity: 40,
  defaultPeoplePerTable: 4,
  autoTableAssignment: false,
  autoReservations: false,
  orderCooldownMinutes: 0,
  showUpgradeAfterOrder: false,
  showUpgradeAtBill: false,
  gamesEnabled: false,
  gamesMode: "selection",
  gamesPrizeType: "none",
  gamesPrizeValue: null,
  gamesPrizeProductId: null,
  gamesMinRoundsForPrize: 1,
  gamesQuestionsPerRound: 6,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeTable(number: number, overrides: Partial<Table> = {}): Table {
  return {
    id: `table-${number}`,
    number,
    name: `Mesa ${number}`,
    location: "circunvalacao" as any,
    status: "available",
    isActive: true,
    currentSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const createMockRestaurantRepo = (): IRestaurantRepository => ({
  findAll: vi.fn(),
  findActive: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  validateSlugUnique: vi.fn(),
});

const createMockTableRepo = (): ITableRepository => ({
  findById: vi.fn(),
  findByNumber: vi.fn(),
  findByIdWithWaiter: vi.fn(),
  findByIdWithSession: vi.fn(),
  findByIdFullStatus: vi.fn(),
  findAll: vi.fn().mockResolvedValue([]),
  findAllFullStatus: vi.fn(),
  findByWaiter: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  countByStatus: vi.fn(),
});

describe("CreateTablesForRestaurantUseCase", () => {
  let restaurantRepo: IRestaurantRepository;
  let tableRepo: ITableRepository;
  let useCase: CreateTablesForRestaurantUseCase;

  beforeEach(() => {
    restaurantRepo = createMockRestaurantRepo();
    tableRepo = createMockTableRepo();
    useCase = new CreateTablesForRestaurantUseCase(restaurantRepo, tableRepo);
    vi.clearAllMocks();
  });

  // =====================================================
  // Validações
  // =====================================================

  it("deve retornar erro se restaurante não existe", async () => {
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(null);

    const result = await useCase.execute({ restaurantSlug: "nao-existe" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("RESTAURANT_NOT_FOUND");
  });

  it("deve retornar erro se restaurante não está ativo", async () => {
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue({
      ...baseRestaurant,
      isActive: false,
    });

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("RESTAURANT_INACTIVE");
  });

  // =====================================================
  // Primeira criação (sem mesas existentes)
  // =====================================================

  it("deve criar mesas na primeira execução (40 cap / 4 ppl = 10 mesas)", async () => {
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    vi.mocked(tableRepo.findAll).mockResolvedValue([]);
    vi.mocked(tableRepo.create).mockImplementation(async (data) =>
      makeTable(data.number)
    );

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(10);
    }
    expect(tableRepo.create).toHaveBeenCalledTimes(10);
  });

  it("deve criar mesas com ceil (50 cap / 4 ppl = 13 mesas)", async () => {
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue({
      ...baseRestaurant,
      maxCapacity: 50,
    });
    vi.mocked(tableRepo.findAll).mockResolvedValue([]);
    vi.mocked(tableRepo.create).mockImplementation(async (data) =>
      makeTable(data.number)
    );

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(13);
    }
  });

  // =====================================================
  // Número exato — nada a fazer
  // =====================================================

  it("deve retornar mesas existentes se já tem o número exato", async () => {
    const existing = Array.from({ length: 10 }, (_, i) => makeTable(i + 1));
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    vi.mocked(tableRepo.findAll).mockResolvedValue(existing);

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(10);
    }
    expect(tableRepo.create).not.toHaveBeenCalled();
    expect(tableRepo.update).not.toHaveBeenCalled();
  });

  // =====================================================
  // Expansão (precisa de mais mesas)
  // =====================================================

  it("deve pedir forceRecreate para expandir mesas existentes", async () => {
    const existing = Array.from({ length: 5 }, (_, i) => makeTable(i + 1));
    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    vi.mocked(tableRepo.findAll).mockResolvedValue(existing);

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("TABLES_ALREADY_EXIST");
  });

  it("deve criar mesas em falta com forceRecreate", async () => {
    const existing = Array.from({ length: 7 }, (_, i) => makeTable(i + 1));

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    // Primeira chamada: ativas (7), segunda chamada: inativas (0)
    vi.mocked(tableRepo.findAll)
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce([]);
    vi.mocked(tableRepo.create).mockImplementation(async (data) =>
      makeTable(data.number)
    );

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(10);
    }
    // Deve criar 3 mesas novas (8, 9, 10)
    expect(tableRepo.create).toHaveBeenCalledTimes(3);
    expect(tableRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ number: 8 })
    );
    expect(tableRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ number: 9 })
    );
    expect(tableRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ number: 10 })
    );
  });

  it("deve reativar mesas inativas antes de criar novas", async () => {
    const active = [makeTable(1), makeTable(2)];
    const inactive = [
      makeTable(3, { isActive: false }),
      makeTable(4, { isActive: false }),
    ];

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue({
      ...baseRestaurant,
      maxCapacity: 20, // 5 mesas
    });
    vi.mocked(tableRepo.findAll)
      .mockResolvedValueOnce(active) // ativas
      .mockResolvedValueOnce(inactive); // inativas
    vi.mocked(tableRepo.update).mockImplementation(async (id, data) => {
      const num = parseInt(id.replace("table-", ""));
      return makeTable(num, data);
    });
    vi.mocked(tableRepo.create).mockImplementation(async (data) =>
      makeTable(data.number)
    );

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(5);
    }
    // Reativou 2 inativas + criou 1 nova
    expect(tableRepo.update).toHaveBeenCalledTimes(2);
    expect(tableRepo.update).toHaveBeenCalledWith("table-3", {
      isActive: true,
      status: "available",
    });
    expect(tableRepo.update).toHaveBeenCalledWith("table-4", {
      isActive: true,
      status: "available",
    });
    expect(tableRepo.create).toHaveBeenCalledTimes(1);
  });

  it("deve deduplicar mesas inativas com o mesmo número", async () => {
    const active: Table[] = [];
    // Duas inativas com número 1 (duplicadas de runs anteriores)
    const inactive = [
      makeTable(1, { id: "dup-1a", isActive: false }),
      makeTable(1, { id: "dup-1b", isActive: false }),
      makeTable(2, { id: "dup-2", isActive: false }),
    ];

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue({
      ...baseRestaurant,
      maxCapacity: 8, // 2 mesas
    });
    vi.mocked(tableRepo.findAll)
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(inactive);
    vi.mocked(tableRepo.update).mockImplementation(async (id, data) => {
      return makeTable(1, { id, ...data });
    });

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    // Deve reativar apenas 1 mesa por número (dup-1a e dup-2)
    expect(tableRepo.update).toHaveBeenCalledTimes(2);
    expect(tableRepo.update).toHaveBeenCalledWith("dup-1a", {
      isActive: true,
      status: "available",
    });
    expect(tableRepo.update).toHaveBeenCalledWith("dup-2", {
      isActive: true,
      status: "available",
    });
    expect(tableRepo.create).not.toHaveBeenCalled();
  });

  it("não deve criar mesas com números já activos", async () => {
    // Mesas ativas: 1, 3, 5 (com gaps)
    const active = [makeTable(1), makeTable(3), makeTable(5)];

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue({
      ...baseRestaurant,
      maxCapacity: 20, // 5 mesas
    });
    vi.mocked(tableRepo.findAll)
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce([]); // sem inativas
    vi.mocked(tableRepo.create).mockImplementation(async (data) =>
      makeTable(data.number)
    );

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(5);
    }
    // Deve criar nas posições 2 e 4 (gaps)
    expect(tableRepo.create).toHaveBeenCalledTimes(2);
    expect(tableRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ number: 2 })
    );
    expect(tableRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ number: 4 })
    );
  });

  // =====================================================
  // Redução (demasiadas mesas ativas)
  // =====================================================

  it("deve desativar mesas excedentes (livres, número mais alto)", async () => {
    const existing = Array.from({ length: 13 }, (_, i) => makeTable(i + 1));

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant); // 10 desejadas
    vi.mocked(tableRepo.findAll).mockResolvedValue(existing);
    vi.mocked(tableRepo.update).mockImplementation(async (id, data) => {
      const num = parseInt(id.replace("table-", ""));
      return makeTable(num, data);
    });

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(10);
      // Mantém mesas 1-10
      expect(result.data.map((t) => t.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
    // Desativa mesas 11, 12, 13
    expect(tableRepo.update).toHaveBeenCalledTimes(3);
    expect(tableRepo.update).toHaveBeenCalledWith("table-11", { isActive: false });
    expect(tableRepo.update).toHaveBeenCalledWith("table-12", { isActive: false });
    expect(tableRepo.update).toHaveBeenCalledWith("table-13", { isActive: false });
  });

  it("deve desativar livres e avisar sobre ocupadas ao reduzir", async () => {
    const existing = Array.from({ length: 13 }, (_, i) =>
      makeTable(i + 1, {
        status: i + 1 === 12 ? "occupied" : "available", // Mesa 12 ocupada
      })
    );

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    vi.mocked(tableRepo.findAll).mockResolvedValue(existing);
    vi.mocked(tableRepo.update).mockImplementation(async (id, data) => {
      const num = parseInt(id.replace("table-", ""));
      return makeTable(num, data);
    });

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("TABLES_HAVE_ACTIVE_SESSIONS");
      // Mesa 12 é mencionada no erro
      expect(result.error).toContain("12");
    }
    // Desativa 11 e 13 (livres), mas não a 12 (ocupada)
    expect(tableRepo.update).toHaveBeenCalledWith("table-11", { isActive: false });
    expect(tableRepo.update).toHaveBeenCalledWith("table-13", { isActive: false });
    expect(tableRepo.update).not.toHaveBeenCalledWith("table-12", expect.anything());
  });

  it("não deve desativar mesas reservadas", async () => {
    const existing = Array.from({ length: 12 }, (_, i) =>
      makeTable(i + 1, {
        status: i + 1 >= 11 ? "reserved" : "available",
      })
    );

    vi.mocked(restaurantRepo.findBySlug).mockResolvedValue(baseRestaurant);
    vi.mocked(tableRepo.findAll).mockResolvedValue(existing);
    vi.mocked(tableRepo.update).mockImplementation(async (id, data) => {
      const num = parseInt(id.replace("table-", ""));
      return makeTable(num, data);
    });

    const result = await useCase.execute({
      restaurantSlug: "circunvalacao",
      forceRecreate: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("TABLES_HAVE_ACTIVE_SESSIONS");
    }
    // Não tentou desativar mesas 11 e 12 (reservadas)
    expect(tableRepo.update).not.toHaveBeenCalledWith("table-11", { isActive: false });
    expect(tableRepo.update).not.toHaveBeenCalledWith("table-12", { isActive: false });
  });

  // =====================================================
  // Erros e edge cases
  // =====================================================

  it("deve tratar erros do repositório", async () => {
    vi.mocked(restaurantRepo.findBySlug).mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("DB connection failed");
    }
  });
});
