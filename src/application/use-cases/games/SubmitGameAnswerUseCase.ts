/**
 * SubmitGameAnswerUseCase - Submete uma resposta a uma pergunta do jogo
 */

import { IGameAnswerRepository } from '@/domain/repositories/IGameAnswerRepository';
import { GameAnswer } from '@/domain/entities/GameAnswer';
import { GameType } from '@/domain/entities/GameQuestion';
import { GameService } from '@/domain/services/GameService';
import { Result, Results } from '../Result';

export interface SubmitGameAnswerInput {
  gameSessionId: string;
  sessionCustomerId?: string | null;
  questionId?: string | null;
  productId?: number | null;
  gameType: GameType;
  answer: Record<string, unknown>;
  questionPoints?: number;
  correctAnswerIndex?: number | null;
}

export class SubmitGameAnswerUseCase {
  constructor(private gameAnswerRepository: IGameAnswerRepository) {}

  async execute(input: SubmitGameAnswerInput): Promise<Result<GameAnswer>> {
    try {
      if (!input.gameSessionId) {
        return Results.error('ID da sessão de jogo é obrigatório', 'MISSING_GAME_SESSION_ID');
      }

      if (!input.questionId && !input.productId) {
        return Results.error('questionId ou productId é obrigatório', 'MISSING_QUESTION_OR_PRODUCT_ID');
      }

      // Calculate score using domain service
      const scoreEarned = GameService.calculateScore(
        input.gameType,
        input.answer,
        {
          correctAnswerIndex: input.correctAnswerIndex ?? null,
          points: input.questionPoints ?? 10,
        }
      );

      const gameAnswer = await this.gameAnswerRepository.create({
        gameSessionId: input.gameSessionId,
        sessionCustomerId: input.sessionCustomerId ?? null,
        questionId: input.questionId ?? null,
        productId: input.productId ?? null,
        gameType: input.gameType,
        answer: input.answer,
        scoreEarned,
      });

      return Results.success(gameAnswer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao submeter resposta',
        'SUBMIT_ANSWER_ERROR'
      );
    }
  }
}
