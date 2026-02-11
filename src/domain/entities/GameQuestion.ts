export type GameType = 'tinder' | 'quiz' | 'preference';

export interface GameQuestion {
  id: string;
  gameType: GameType;
  questionText: string;
  options: string[] | null;
  correctAnswerIndex: number | null;
  optionA: { label: string; imageUrl?: string } | null;
  optionB: { label: string; imageUrl?: string } | null;
  category: string | null;
  difficulty: number;
  points: number;
  isActive: boolean;
  restaurantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameQuestionData {
  gameType: GameType;
  questionText: string;
  options?: string[] | null;
  correctAnswerIndex?: number | null;
  optionA?: { label: string; imageUrl?: string } | null;
  optionB?: { label: string; imageUrl?: string } | null;
  category?: string | null;
  difficulty?: number;
  points?: number;
  isActive?: boolean;
  restaurantId?: string | null;
}

export interface UpdateGameQuestionData {
  questionText?: string;
  options?: string[] | null;
  correctAnswerIndex?: number | null;
  optionA?: { label: string; imageUrl?: string } | null;
  optionB?: { label: string; imageUrl?: string } | null;
  category?: string | null;
  difficulty?: number;
  points?: number;
  isActive?: boolean;
}

export interface GameQuestionFilter {
  gameType?: GameType;
  category?: string;
  isActive?: boolean;
  restaurantId?: string | null;
}
