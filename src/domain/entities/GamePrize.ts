export type PrizeType = 'discount_percentage' | 'free_product' | 'free_dinner';

export interface GamePrize {
  id: string;
  sessionId: string;
  gameSessionId: string | null;
  sessionCustomerId: string | null;
  displayName: string;
  prizeType: PrizeType;
  prizeValue: string;
  prizeDescription: string | null;
  totalScore: number;
  redeemed: boolean;
  redeemedAt: Date | null;
  createdAt: Date;
}

export interface CreateGamePrizeData {
  sessionId: string;
  gameSessionId?: string | null;
  sessionCustomerId?: string | null;
  displayName: string;
  prizeType: PrizeType;
  prizeValue: string;
  prizeDescription?: string | null;
  totalScore?: number;
}
