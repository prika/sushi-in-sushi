import type { GameQuestion, CreateGameQuestionData, UpdateGameQuestionData, GameQuestionFilter, GameType } from '../entities/GameQuestion';

export interface IGameQuestionRepository {
  findAll(filter?: GameQuestionFilter): Promise<GameQuestion[]>;
  findById(id: string): Promise<GameQuestion | null>;
  findRandom(count: number, gameTypes?: GameType[], restaurantId?: string | null): Promise<GameQuestion[]>;
  create(data: CreateGameQuestionData): Promise<GameQuestion>;
  update(id: string, data: UpdateGameQuestionData): Promise<GameQuestion>;
  delete(id: string): Promise<void>;
}
