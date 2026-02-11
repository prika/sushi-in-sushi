import type { GameType } from './GameQuestion';

export interface GameAnswer {
  id: string;
  gameSessionId: string;
  sessionCustomerId: string | null;
  questionId: string | null;
  productId: number | null;
  gameType: GameType;
  answer: Record<string, unknown>;
  scoreEarned: number;
  answeredAt: Date;
}

export interface CreateGameAnswerData {
  gameSessionId: string;
  sessionCustomerId?: string | null;
  questionId?: string | null;
  productId?: number | null;
  gameType: GameType;
  answer: Record<string, unknown>;
  scoreEarned?: number;
}
