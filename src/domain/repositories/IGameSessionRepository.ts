import type { GameSession, CreateGameSessionData, GameSessionStatus } from '../entities/GameSession';

export interface IGameSessionRepository {
  create(data: CreateGameSessionData): Promise<GameSession>;
  findById(id: string): Promise<GameSession | null>;
  findBySessionId(sessionId: string, status?: GameSessionStatus): Promise<GameSession[]>;
  complete(id: string): Promise<GameSession>;
  abandon(id: string): Promise<GameSession>;
}
