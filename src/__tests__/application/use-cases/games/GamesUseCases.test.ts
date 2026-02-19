import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetGameQuestionsUseCase } from "@/application/use-cases/games/GetGameQuestionsUseCase";
import { StartGameSessionUseCase } from "@/application/use-cases/games/StartGameSessionUseCase";
import { SubmitGameAnswerUseCase } from "@/application/use-cases/games/SubmitGameAnswerUseCase";
import { CompleteGameSessionUseCase } from "@/application/use-cases/games/CompleteGameSessionUseCase";
import { GetGameLeaderboardUseCase } from "@/application/use-cases/games/GetGameLeaderboardUseCase";
import { GetGameConfigUseCase } from "@/application/use-cases/games/GetGameConfigUseCase";
import { RedeemGamePrizeUseCase } from "@/application/use-cases/games/RedeemGamePrizeUseCase";
import { IGameQuestionRepository } from "@/domain/repositories/IGameQuestionRepository";
import { IGameSessionRepository } from "@/domain/repositories/IGameSessionRepository";
import { IGameAnswerRepository } from "@/domain/repositories/IGameAnswerRepository";
import { IGamePrizeRepository } from "@/domain/repositories/IGamePrizeRepository";
import { IRestaurantRepository } from "@/domain/repositories/IRestaurantRepository";
import { GameQuestion, GameType } from "@/domain/entities/GameQuestion";
import { GameSession } from "@/domain/entities/GameSession";
import { GameAnswer } from "@/domain/entities/GameAnswer";
import { GamePrize } from "@/domain/entities/GamePrize";
import { Restaurant } from "@/domain/entities/Restaurant";
import { GameConfig } from "@/domain/value-objects/GameConfig";

// --- Test Helpers ---

function createTestQuestion(
  overrides: Partial<GameQuestion> = {},
): GameQuestion {
  return {
    id: "question-1",
    gameType: "quiz",
    questionText: "Qual é o peixe mais usado no sushi?",
    options: ["Salmão", "Atum", "Dourada", "Robalo"],
    correctAnswerIndex: 0,
    optionA: null,
    optionB: null,
    category: "sushi",
    difficulty: 1,
    points: 10,
    isActive: true,
    restaurantId: null,
    createdAt: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T12:00:00Z"),
    ...overrides,
  };
}

function createTestGameSession(
  overrides: Partial<GameSession> = {},
): GameSession {
  return {
    id: "game-session-1",
    sessionId: "session-1",
    gameType: null,
    status: "active",
    roundNumber: 1,
    totalQuestions: 5,
    startedAt: new Date("2024-01-01T12:00:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-01T12:00:00Z"),
    ...overrides,
  };
}

function createTestGameAnswer(overrides: Partial<GameAnswer> = {}): GameAnswer {
  return {
    id: "answer-1",
    gameSessionId: "game-session-1",
    sessionCustomerId: "customer-1",
    questionId: "question-1",
    productId: null,
    gameType: "quiz",
    answer: { selectedIndex: 0 },
    scoreEarned: 10,
    answeredAt: new Date("2024-01-01T12:01:00Z"),
    ...overrides,
  };
}

function createTestGamePrize(overrides: Partial<GamePrize> = {}): GamePrize {
  return {
    id: "prize-1",
    sessionId: "session-1",
    gameSessionId: "game-session-1",
    sessionCustomerId: "customer-1",
    displayName: "Salmão Lover",
    prizeType: "discount_percentage",
    prizeValue: "10",
    prizeDescription: "10% de desconto",
    totalScore: 50,
    redeemed: false,
    redeemedAt: null,
    createdAt: new Date("2024-01-01T12:05:00Z"),
    ...overrides,
  };
}

function createTestRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: "restaurant-1",
    name: "Circunvalação",
    slug: "circunvalacao",
    address: "Rua da Circunvalação 123",
    latitude: null,
    longitude: null,
    maxCapacity: 50,
    defaultPeoplePerTable: 4,
    autoTableAssignment: false,
    autoReservations: false,
    orderCooldownMinutes: 0,
    showUpgradeAfterOrder: false,
    showUpgradeAtBill: false,
    gamesEnabled: true,
    gamesMode: "selection",
    gamesPrizeType: "discount_percentage",
    gamesPrizeValue: "10",
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createTestGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gamesEnabled: true,
    gamesMode: "selection",
    gamesPrizeType: "discount_percentage",
    gamesPrizeValue: "10",
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
    ...overrides,
  };
}

// --- Mock Repositories ---

function createMockGameQuestionRepository(): IGameQuestionRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findRandom: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockGameSessionRepository(): IGameSessionRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findBySessionId: vi.fn(),
    complete: vi.fn(),
    abandon: vi.fn(),
  };
}

function createMockGameAnswerRepository(): IGameAnswerRepository {
  return {
    create: vi.fn(),
    findByGameSession: vi.fn(),
    findBySessionCustomer: vi.fn(),
    getLeaderboard: vi.fn(),
    getSessionLeaderboard: vi.fn(),
  };
}

function createMockGamePrizeRepository(): IGamePrizeRepository {
  return {
    create: vi.fn(),
    findBySession: vi.fn(),
    findById: vi.fn(),
    redeem: vi.fn(),
  };
}

function createMockRestaurantRepository(): IRestaurantRepository {
  return {
    findAll: vi.fn(),
    findActive: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    validateSlugUnique: vi.fn(),
  };
}

// ================================================================
// GetGameQuestionsUseCase
// ================================================================

describe("GetGameQuestionsUseCase", () => {
  let useCase: GetGameQuestionsUseCase;
  let mockRepository: IGameQuestionRepository;

  beforeEach(() => {
    mockRepository = createMockGameQuestionRepository();
    useCase = new GetGameQuestionsUseCase(mockRepository);
  });

  it("deve retornar perguntas aleatórias", async () => {
    const questions = [
      createTestQuestion({ id: "q-1" }),
      createTestQuestion({ id: "q-2", questionText: "O que é wasabi?" }),
    ];
    vi.mocked(mockRepository.findRandom).mockResolvedValue(questions);

    const result = await useCase.execute({ count: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("q-1");
    }
    expect(mockRepository.findRandom).toHaveBeenCalledWith(
      2,
      undefined,
      undefined,
    );
  });

  it("deve retornar lista vazia quando não há perguntas", async () => {
    vi.mocked(mockRepository.findRandom).mockResolvedValue([]);

    const result = await useCase.execute({ count: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("deve passar filtros de tipo de jogo e restaurante", async () => {
    vi.mocked(mockRepository.findRandom).mockResolvedValue([
      createTestQuestion(),
    ]);

    const result = await useCase.execute({
      count: 3,
      gameTypes: ["quiz", "tinder"],
      restaurantId: "rest-1",
    });

    expect(result.success).toBe(true);
    expect(mockRepository.findRandom).toHaveBeenCalledWith(
      3,
      ["quiz", "tinder"],
      "rest-1",
    );
  });

  it("deve retornar erro quando count é inválido", async () => {
    const result = await useCase.execute({ count: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_COUNT");
    }
  });
});

// ================================================================
// StartGameSessionUseCase
// ================================================================

describe("StartGameSessionUseCase", () => {
  let useCase: StartGameSessionUseCase;
  let mockSessionRepo: IGameSessionRepository;
  let mockQuestionRepo: IGameQuestionRepository;

  beforeEach(() => {
    mockSessionRepo = createMockGameSessionRepository();
    mockQuestionRepo = createMockGameQuestionRepository();
    useCase = new StartGameSessionUseCase(mockSessionRepo, mockQuestionRepo);
  });

  it("deve criar sessão de jogo e retornar perguntas", async () => {
    const gameSession = createTestGameSession();
    const questions = [
      createTestQuestion({ id: "q-1" }),
      createTestQuestion({ id: "q-2" }),
    ];

    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue([]);
    vi.mocked(mockSessionRepo.create).mockResolvedValue(gameSession);
    vi.mocked(mockQuestionRepo.findRandom).mockResolvedValue(questions);

    const result = await useCase.execute({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameSession.id).toBe("game-session-1");
      expect(result.data.questions).toHaveLength(2);
    }
  });

  it("deve calcular round_number baseado em sessões existentes", async () => {
    const existingSessions = [
      createTestGameSession({ id: "gs-1", roundNumber: 1 }),
      createTestGameSession({ id: "gs-2", roundNumber: 2 }),
    ];
    const newSession = createTestGameSession({ roundNumber: 3 });

    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue(
      existingSessions,
    );
    vi.mocked(mockSessionRepo.create).mockResolvedValue(newSession);
    vi.mocked(mockQuestionRepo.findRandom).mockResolvedValue([]);

    const result = await useCase.execute({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    expect(mockSessionRepo.create).toHaveBeenCalledWith({
      sessionId: "session-1",
      gameType: null,
      roundNumber: 3,
      totalQuestions: 5,
    });
  });

  it("deve usar questionsPerRound personalizado", async () => {
    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue([]);
    vi.mocked(mockSessionRepo.create).mockResolvedValue(
      createTestGameSession(),
    );
    vi.mocked(mockQuestionRepo.findRandom).mockResolvedValue([]);

    await useCase.execute({ sessionId: "session-1", questionsPerRound: 10 });

    expect(mockSessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalQuestions: 10 }),
    );
    expect(mockQuestionRepo.findRandom).toHaveBeenCalledWith(
      10,
      undefined,
      undefined,
    );
  });

  it("deve criar sessão em modo tinder sem buscar perguntas", async () => {
    const tinderSession = createTestGameSession({
      gameType: "tinder",
      totalQuestions: 0,
    });

    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue([]);
    vi.mocked(mockSessionRepo.create).mockResolvedValue(tinderSession);

    const result = await useCase.execute({
      sessionId: "session-1",
      gameType: "tinder",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameSession.gameType).toBe("tinder");
      expect(result.data.gameSession.totalQuestions).toBe(0);
      expect(result.data.questions).toHaveLength(0);
    }
    expect(mockSessionRepo.create).toHaveBeenCalledWith({
      sessionId: "session-1",
      gameType: "tinder",
      roundNumber: 1,
      totalQuestions: 0,
    });
    // Should NOT fetch questions in tinder mode
    expect(mockQuestionRepo.findRandom).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando sessionId está vazio", async () => {
    const result = await useCase.execute({ sessionId: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_SESSION_ID");
    }
  });
});

// ================================================================
// SubmitGameAnswerUseCase
// ================================================================

describe("SubmitGameAnswerUseCase", () => {
  let useCase: SubmitGameAnswerUseCase;
  let mockRepository: IGameAnswerRepository;

  beforeEach(() => {
    mockRepository = createMockGameAnswerRepository();
    useCase = new SubmitGameAnswerUseCase(mockRepository);
  });

  it("deve calcular pontuação para quiz correto e criar resposta", async () => {
    const answer = createTestGameAnswer({ scoreEarned: 10 });
    vi.mocked(mockRepository.create).mockResolvedValue(answer);

    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionCustomerId: "customer-1",
      questionId: "question-1",
      gameType: "quiz",
      answer: { selectedIndex: 0 },
      questionPoints: 10,
      correctAnswerIndex: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scoreEarned).toBe(10);
    }
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gameSessionId: "game-session-1",
        scoreEarned: 10,
      }),
    );
  });

  it("deve calcular pontuação zero para quiz errado", async () => {
    const answer = createTestGameAnswer({ scoreEarned: 0 });
    vi.mocked(mockRepository.create).mockResolvedValue(answer);

    await useCase.execute({
      gameSessionId: "game-session-1",
      questionId: "question-1",
      gameType: "quiz",
      answer: { selectedIndex: 2 },
      questionPoints: 10,
      correctAnswerIndex: 0,
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ scoreEarned: 0 }),
    );
  });

  it("deve calcular pontuação para tinder (like = pontos completos)", async () => {
    const answer = createTestGameAnswer({
      gameType: "tinder",
      scoreEarned: 10,
    });
    vi.mocked(mockRepository.create).mockResolvedValue(answer);

    await useCase.execute({
      gameSessionId: "game-session-1",
      questionId: "question-1",
      gameType: "tinder",
      answer: { rating: 5 },
      questionPoints: 10,
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ scoreEarned: 10 }),
    );
  });

  it("deve calcular pontuação para preference (sempre pontos completos)", async () => {
    const answer = createTestGameAnswer({
      gameType: "preference",
      scoreEarned: 10,
    });
    vi.mocked(mockRepository.create).mockResolvedValue(answer);

    await useCase.execute({
      gameSessionId: "game-session-1",
      questionId: "question-1",
      gameType: "preference",
      answer: { chosen: "A" },
      questionPoints: 10,
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ scoreEarned: 10 }),
    );
  });

  it("deve submeter resposta com productId em vez de questionId", async () => {
    const answer = createTestGameAnswer({
      questionId: null,
      productId: 42,
      gameType: "tinder",
      scoreEarned: 10,
    });
    vi.mocked(mockRepository.create).mockResolvedValue(answer);

    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionCustomerId: "customer-1",
      productId: 42,
      gameType: "tinder",
      answer: { rating: 5 },
      questionPoints: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productId).toBe(42);
      expect(result.data.questionId).toBeNull();
    }
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 42,
        questionId: null,
      }),
    );
  });

  it("deve retornar erro quando nem questionId nem productId são fornecidos", async () => {
    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      gameType: "tinder",
      answer: { rating: 5 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_QUESTION_OR_PRODUCT_ID");
    }
  });

  it("deve retornar erro quando gameSessionId está em falta", async () => {
    const result = await useCase.execute({
      gameSessionId: "",
      questionId: "question-1",
      gameType: "quiz",
      answer: { selectedIndex: 0 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_GAME_SESSION_ID");
    }
  });
});

// ================================================================
// CompleteGameSessionUseCase
// ================================================================

describe("CompleteGameSessionUseCase", () => {
  let useCase: CompleteGameSessionUseCase;
  let mockSessionRepo: IGameSessionRepository;
  let mockAnswerRepo: IGameAnswerRepository;
  let mockPrizeRepo: IGamePrizeRepository;

  beforeEach(() => {
    mockSessionRepo = createMockGameSessionRepository();
    mockAnswerRepo = createMockGameAnswerRepository();
    mockPrizeRepo = createMockGamePrizeRepository();
    useCase = new CompleteGameSessionUseCase(
      mockSessionRepo,
      mockAnswerRepo,
      mockPrizeRepo,
    );
  });

  it("deve completar sessão e retornar leaderboard com prémio", async () => {
    const completedSession = createTestGameSession({ status: "completed" });
    const leaderboard = [
      { sessionCustomerId: "c-1", displayName: "Salmão Lover", totalScore: 50 },
      { sessionCustomerId: "c-2", displayName: "Wasabi Ninja", totalScore: 30 },
    ];
    const completedSessions = [
      createTestGameSession({ id: "gs-1", status: "completed" }),
      createTestGameSession({ id: "gs-2", status: "completed" }),
      createTestGameSession({ id: "gs-3", status: "completed" }),
    ];
    const prize = createTestGamePrize();

    vi.mocked(mockSessionRepo.complete).mockResolvedValue(completedSession);
    vi.mocked(mockAnswerRepo.getSessionLeaderboard).mockResolvedValue(
      leaderboard,
    );
    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue(
      completedSessions,
    );
    vi.mocked(mockPrizeRepo.create).mockResolvedValue(prize);

    const config = createTestGameConfig({ gamesMinRoundsForPrize: 3 });
    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionId: "session-1",
      config,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leaderboard).toHaveLength(2);
      expect(result.data.prize).not.toBeNull();
      expect(result.data.prize!.displayName).toBe("Salmão Lover");
    }
  });

  it("não deve atribuir prémio quando rounds insuficientes", async () => {
    const completedSession = createTestGameSession({ status: "completed" });
    const leaderboard = [
      { sessionCustomerId: "c-1", displayName: "Salmão Lover", totalScore: 50 },
    ];
    const completedSessions = [
      createTestGameSession({ id: "gs-1", status: "completed" }),
    ];

    vi.mocked(mockSessionRepo.complete).mockResolvedValue(completedSession);
    vi.mocked(mockAnswerRepo.getSessionLeaderboard).mockResolvedValue(
      leaderboard,
    );
    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue(
      completedSessions,
    );

    const config = createTestGameConfig({ gamesMinRoundsForPrize: 3 });
    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionId: "session-1",
      config,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prize).toBeNull();
    }
    expect(mockPrizeRepo.create).not.toHaveBeenCalled();
  });

  it("não deve atribuir prémio quando tipo é none", async () => {
    vi.mocked(mockSessionRepo.complete).mockResolvedValue(
      createTestGameSession({ status: "completed" }),
    );
    vi.mocked(mockAnswerRepo.getSessionLeaderboard).mockResolvedValue([
      { sessionCustomerId: "c-1", displayName: "Player", totalScore: 100 },
    ]);
    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue([
      createTestGameSession({ status: "completed" }),
      createTestGameSession({ status: "completed" }),
      createTestGameSession({ status: "completed" }),
    ]);

    const config = createTestGameConfig({ gamesPrizeType: "none" });
    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionId: "session-1",
      config,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prize).toBeNull();
    }
    expect(mockPrizeRepo.create).not.toHaveBeenCalled();
  });

  it("não deve atribuir prémio quando não há participantes", async () => {
    vi.mocked(mockSessionRepo.complete).mockResolvedValue(
      createTestGameSession({ status: "completed" }),
    );
    vi.mocked(mockAnswerRepo.getSessionLeaderboard).mockResolvedValue([]);
    vi.mocked(mockSessionRepo.findBySessionId).mockResolvedValue([
      createTestGameSession({ status: "completed" }),
      createTestGameSession({ status: "completed" }),
      createTestGameSession({ status: "completed" }),
    ]);

    const config = createTestGameConfig();
    const result = await useCase.execute({
      gameSessionId: "game-session-1",
      sessionId: "session-1",
      config,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leaderboard).toHaveLength(0);
      expect(result.data.prize).toBeNull();
    }
  });
});

// ================================================================
// GetGameLeaderboardUseCase
// ================================================================

describe("GetGameLeaderboardUseCase", () => {
  let useCase: GetGameLeaderboardUseCase;
  let mockRepository: IGameAnswerRepository;

  beforeEach(() => {
    mockRepository = createMockGameAnswerRepository();
    useCase = new GetGameLeaderboardUseCase(mockRepository);
  });

  it("deve retornar leaderboard ordenado com rankings", async () => {
    const rawScores = [
      { sessionCustomerId: "c-1", displayName: "Player A", totalScore: 30 },
      { sessionCustomerId: "c-2", displayName: "Player B", totalScore: 50 },
      { sessionCustomerId: "c-3", displayName: "Player C", totalScore: 10 },
    ];
    vi.mocked(mockRepository.getSessionLeaderboard).mockResolvedValue(
      rawScores,
    );

    const result = await useCase.execute({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].displayName).toBe("Player B");
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].totalScore).toBe(50);
      expect(result.data[1].rank).toBe(2);
      expect(result.data[2].rank).toBe(3);
    }
  });

  it("deve retornar leaderboard vazio", async () => {
    vi.mocked(mockRepository.getSessionLeaderboard).mockResolvedValue([]);

    const result = await useCase.execute({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("deve retornar erro quando sessionId está em falta", async () => {
    const result = await useCase.execute({ sessionId: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_SESSION_ID");
    }
  });
});

// ================================================================
// GetGameConfigUseCase
// ================================================================

describe("GetGameConfigUseCase", () => {
  let useCase: GetGameConfigUseCase;
  let mockRepository: IRestaurantRepository;

  beforeEach(() => {
    mockRepository = createMockRestaurantRepository();
    useCase = new GetGameConfigUseCase(mockRepository);
  });

  it("deve retornar configuração de jogos do restaurante", async () => {
    const restaurant = createTestRestaurant({
      gamesEnabled: true,
      gamesPrizeType: "free_product",
      gamesPrizeValue: "product-abc",
      gamesPrizeProductId: 1,
      gamesMinRoundsForPrize: 2,
      gamesQuestionsPerRound: 8,
    });
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(restaurant);

    const result = await useCase.execute({ restaurantSlug: "circunvalacao" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gamesEnabled).toBe(true);
      expect(result.data.gamesPrizeType).toBe("free_product");
      expect(result.data.gamesPrizeValue).toBe("product-abc");
      expect(result.data.gamesPrizeProductId).toBe(1);
      expect(result.data.gamesMinRoundsForPrize).toBe(2);
      expect(result.data.gamesQuestionsPerRound).toBe(8);
    }
  });

  it("deve retornar erro quando restaurante não encontrado", async () => {
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);

    const result = await useCase.execute({ restaurantSlug: "inexistente" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("RESTAURANT_NOT_FOUND");
    }
  });

  it("deve retornar erro quando slug está vazio", async () => {
    const result = await useCase.execute({ restaurantSlug: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_RESTAURANT_SLUG");
    }
  });
});

// ================================================================
// RedeemGamePrizeUseCase
// ================================================================

describe("RedeemGamePrizeUseCase", () => {
  let useCase: RedeemGamePrizeUseCase;
  let mockRepository: IGamePrizeRepository;

  beforeEach(() => {
    mockRepository = createMockGamePrizeRepository();
    useCase = new RedeemGamePrizeUseCase(mockRepository);
  });

  it("deve resgatar prémio com sucesso", async () => {
    const existingPrize = createTestGamePrize({ redeemed: false });
    const redeemedPrize = createTestGamePrize({
      redeemed: true,
      redeemedAt: new Date("2024-01-01T13:00:00Z"),
    });
    vi.mocked(mockRepository.findById).mockResolvedValue(existingPrize);
    vi.mocked(mockRepository.redeem).mockResolvedValue(redeemedPrize);

    const result = await useCase.execute({ prizeId: "prize-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.redeemed).toBe(true);
      expect(result.data.redeemedAt).not.toBeNull();
    }
    expect(mockRepository.findById).toHaveBeenCalledWith("prize-1");
    expect(mockRepository.redeem).toHaveBeenCalledWith("prize-1");
  });

  it("deve retornar erro quando prizeId está em falta", async () => {
    const result = await useCase.execute({ prizeId: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MISSING_PRIZE_ID");
    }
  });

  it("deve retornar erro quando prémio não encontrado", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ prizeId: "invalid-prize" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Prémio não encontrado");
      expect(result.code).toBe("PRIZE_NOT_FOUND");
    }
  });

  it("deve retornar erro quando prémio já foi resgatado", async () => {
    const alreadyRedeemed = createTestGamePrize({ redeemed: true });
    vi.mocked(mockRepository.findById).mockResolvedValue(alreadyRedeemed);

    const result = await useCase.execute({ prizeId: "prize-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Prémio já foi resgatado");
      expect(result.code).toBe("PRIZE_ALREADY_REDEEMED");
    }
  });

  it("deve retornar erro quando repositório falha", async () => {
    const existingPrize = createTestGamePrize({ redeemed: false });
    vi.mocked(mockRepository.findById).mockResolvedValue(existingPrize);
    vi.mocked(mockRepository.redeem).mockRejectedValue(
      new Error("Database error"),
    );

    const result = await useCase.execute({ prizeId: "prize-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Database error");
      expect(result.code).toBe("REDEEM_PRIZE_ERROR");
    }
  });
});
