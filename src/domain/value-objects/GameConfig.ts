export type GamePrizeType =
  | "none"
  | "discount_percentage"
  | "free_product"
  | "free_dinner";
export type GamesMode = "selection" | "random";

export interface GameConfig {
  gamesEnabled: boolean;
  gamesMode: GamesMode;
  gamesPrizeType: GamePrizeType;
  gamesPrizeValue: string | null;
  gamesPrizeProductId: number | null;
  gamesMinRoundsForPrize: number;
  gamesQuestionsPerRound: number;
}
