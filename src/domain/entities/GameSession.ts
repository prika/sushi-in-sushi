import type { GameType } from './GameQuestion';

export type GameSessionStatus = 'active' | 'completed' | 'abandoned';

export interface GameSession {
  id: string;
  sessionId: string;
  gameType: GameType | null;
  status: GameSessionStatus;
  roundNumber: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CreateGameSessionData {
  sessionId: string;
  gameType?: GameType | null;
  roundNumber?: number;
  totalQuestions?: number;
}
