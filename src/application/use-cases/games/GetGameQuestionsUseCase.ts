/**
 * GetGameQuestionsUseCase - Obtém perguntas aleatórias para um jogo
 */

import { IGameQuestionRepository } from '@/domain/repositories/IGameQuestionRepository';
import { GameQuestion, GameType } from '@/domain/entities/GameQuestion';
import { Result, Results } from '../Result';

export interface GetGameQuestionsInput {
  count: number;
  gameTypes?: GameType[];
  restaurantId?: string | null;
}

export class GetGameQuestionsUseCase {
  constructor(private gameQuestionRepository: IGameQuestionRepository) {}

  async execute(input: GetGameQuestionsInput): Promise<Result<GameQuestion[]>> {
    try {
      if (input.count <= 0) {
        return Results.error('O número de perguntas deve ser positivo', 'INVALID_COUNT');
      }

      const questions = await this.gameQuestionRepository.findRandom(
        input.count,
        input.gameTypes,
        input.restaurantId
      );

      return Results.success(questions);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar perguntas do jogo',
        'GET_QUESTIONS_ERROR'
      );
    }
  }
}
