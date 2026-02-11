import type { GamePrize, CreateGamePrizeData } from '../entities/GamePrize';

export interface IGamePrizeRepository {
  create(data: CreateGamePrizeData): Promise<GamePrize>;
  findBySession(sessionId: string): Promise<GamePrize[]>;
  findById(id: string): Promise<GamePrize | null>;
  redeem(id: string): Promise<GamePrize>;
}
