import type { GameAnswer, CreateGameAnswerData } from '../entities/GameAnswer';

export interface LeaderboardEntry {
  sessionCustomerId: string | null;
  displayName: string;
  totalScore: number;
  rank?: number;
}

export interface IGameAnswerRepository {
  create(data: CreateGameAnswerData): Promise<GameAnswer>;
  findByGameSession(gameSessionId: string): Promise<GameAnswer[]>;
  findBySessionCustomer(gameSessionId: string, sessionCustomerId: string): Promise<GameAnswer[]>;
  getLeaderboard(gameSessionId: string): Promise<LeaderboardEntry[]>;
  getSessionLeaderboard(sessionId: string): Promise<LeaderboardEntry[]>;
}
