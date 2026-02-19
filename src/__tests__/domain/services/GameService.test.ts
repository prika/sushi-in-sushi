import { describe, it, expect } from 'vitest';
import { GameService } from '@/domain/services/GameService';
import type { GameConfig } from '@/domain/value-objects/GameConfig';

// Helper para criar uma configuração de jogo de teste
function createTestConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gamesEnabled: true,
    gamesMode: 'selection',
    gamesPrizeType: 'discount_percentage',
    gamesPrizeValue: '10',
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
    ...overrides,
  };
}

describe('GameService', () => {
  describe('generateFunnyName', () => {
    it('deve retornar uma string do pool de nomes', () => {
      const name = GameService.generateFunnyName();
      const allNames = GameService.getFunnyNames();

      expect(typeof name).toBe('string');
      expect(allNames).toContain(name);
    });

    it('deve retornar um nome não vazio', () => {
      const name = GameService.generateFunnyName();

      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('getFunnyNames', () => {
    it('deve retornar um array com 30 nomes', () => {
      const names = GameService.getFunnyNames();

      expect(names).toHaveLength(30);
    });

    it('deve retornar uma cópia e não a referência original', () => {
      const names1 = GameService.getFunnyNames();
      const names2 = GameService.getFunnyNames();

      expect(names1).toEqual(names2);
      expect(names1).not.toBe(names2);

      // Modificar a cópia não deve afetar futuras chamadas
      names1.push('Test Name');
      const names3 = GameService.getFunnyNames();
      expect(names3).toHaveLength(30);
    });
  });

  describe('calculateScore', () => {
    describe('tinder', () => {
      it('deve dar pontuação total para like (rating 5)', () => {
        const score = GameService.calculateScore(
          'tinder',
          { rating: 5 },
          { points: 10 }
        );

        expect(score).toBe(10);
      });

      it('deve dar metade da pontuação para nope (rating diferente de 5)', () => {
        const score = GameService.calculateScore(
          'tinder',
          { rating: 1 },
          { points: 10 }
        );

        expect(score).toBe(5);
      });

      it('deve arredondar para baixo metade da pontuação ímpar', () => {
        const score = GameService.calculateScore(
          'tinder',
          { rating: 1 },
          { points: 7 }
        );

        expect(score).toBe(3);
      });
    });

    describe('quiz', () => {
      it('deve dar pontuação total para resposta correta', () => {
        const score = GameService.calculateScore(
          'quiz',
          { selectedIndex: 2 },
          { correctAnswerIndex: 2, points: 15 }
        );

        expect(score).toBe(15);
      });

      it('deve dar zero para resposta errada', () => {
        const score = GameService.calculateScore(
          'quiz',
          { selectedIndex: 1 },
          { correctAnswerIndex: 2, points: 15 }
        );

        expect(score).toBe(0);
      });

      it('deve dar zero quando correctAnswerIndex é null', () => {
        const score = GameService.calculateScore(
          'quiz',
          { selectedIndex: 0 },
          { correctAnswerIndex: null, points: 15 }
        );

        expect(score).toBe(0);
      });

      it('deve dar zero quando correctAnswerIndex é undefined', () => {
        const score = GameService.calculateScore(
          'quiz',
          { selectedIndex: 0 },
          { points: 15 }
        );

        expect(score).toBe(0);
      });
    });

    describe('preference', () => {
      it('deve dar pontuação total independentemente da resposta', () => {
        const score = GameService.calculateScore(
          'preference',
          { choice: 'option_a' },
          { points: 10 }
        );

        expect(score).toBe(10);
      });
    });

    describe('tipo desconhecido', () => {
      it('deve retornar zero para tipo de jogo desconhecido', () => {
        const score = GameService.calculateScore(
          'unknown' as never,
          { answer: 'test' },
          { points: 10 }
        );

        expect(score).toBe(0);
      });
    });
  });

  describe('buildLeaderboard', () => {
    it('deve ordenar por pontuação decrescente', () => {
      const scores = [
        { sessionCustomerId: 'c1', displayName: 'Player 1', totalScore: 10 },
        { sessionCustomerId: 'c3', displayName: 'Player 3', totalScore: 30 },
        { sessionCustomerId: 'c2', displayName: 'Player 2', totalScore: 20 },
      ];

      const leaderboard = GameService.buildLeaderboard(scores);

      expect(leaderboard[0].displayName).toBe('Player 3');
      expect(leaderboard[1].displayName).toBe('Player 2');
      expect(leaderboard[2].displayName).toBe('Player 1');
    });

    it('deve atribuir ranks sequenciais', () => {
      const scores = [
        { sessionCustomerId: 'c1', displayName: 'Player 1', totalScore: 30 },
        { sessionCustomerId: 'c2', displayName: 'Player 2', totalScore: 20 },
        { sessionCustomerId: 'c3', displayName: 'Player 3', totalScore: 10 },
      ];

      const leaderboard = GameService.buildLeaderboard(scores);

      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].rank).toBe(3);
    });

    it('deve lidar com empates atribuindo ranks sequenciais', () => {
      const scores = [
        { sessionCustomerId: 'c1', displayName: 'Player 1', totalScore: 20 },
        { sessionCustomerId: 'c2', displayName: 'Player 2', totalScore: 20 },
      ];

      const leaderboard = GameService.buildLeaderboard(scores);

      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[0].totalScore).toBe(20);
      expect(leaderboard[1].totalScore).toBe(20);
    });

    it('deve retornar array vazio quando não há scores', () => {
      const leaderboard = GameService.buildLeaderboard([]);

      expect(leaderboard).toEqual([]);
    });

    it('não deve modificar o array original', () => {
      const scores = [
        { sessionCustomerId: 'c1', displayName: 'Player 1', totalScore: 10 },
        { sessionCustomerId: 'c2', displayName: 'Player 2', totalScore: 30 },
      ];
      const originalFirst = scores[0].displayName;

      GameService.buildLeaderboard(scores);

      expect(scores[0].displayName).toBe(originalFirst);
    });
  });

  describe('shouldAwardPrize', () => {
    it('deve retornar false quando prizeType é none', () => {
      const config = createTestConfig({ gamesPrizeType: 'none' });

      const result = GameService.shouldAwardPrize(config, 5, true);

      expect(result).toBe(false);
    });

    it('deve retornar false quando não há participantes', () => {
      const config = createTestConfig({ gamesPrizeType: 'discount_percentage' });

      const result = GameService.shouldAwardPrize(config, 5, false);

      expect(result).toBe(false);
    });

    it('deve retornar false quando rounds jogadas são insuficientes', () => {
      const config = createTestConfig({
        gamesPrizeType: 'discount_percentage',
        gamesMinRoundsForPrize: 3,
      });

      const result = GameService.shouldAwardPrize(config, 2, true);

      expect(result).toBe(false);
    });

    it('deve retornar true quando todas as condições são satisfeitas', () => {
      const config = createTestConfig({
        gamesPrizeType: 'discount_percentage',
        gamesMinRoundsForPrize: 3,
      });

      const result = GameService.shouldAwardPrize(config, 3, true);

      expect(result).toBe(true);
    });

    it('deve retornar true quando rounds excedem o mínimo', () => {
      const config = createTestConfig({
        gamesPrizeType: 'free_dinner',
        gamesMinRoundsForPrize: 2,
      });

      const result = GameService.shouldAwardPrize(config, 10, true);

      expect(result).toBe(true);
    });
  });

  describe('buildPrizeDescription', () => {
    it('deve construir descrição de desconto percentual', () => {
      const desc = GameService.buildPrizeDescription('discount_percentage', '15');

      expect(desc).toBe('15% de desconto');
    });

    it('deve usar 0 quando valor de desconto é null', () => {
      const desc = GameService.buildPrizeDescription('discount_percentage', null);

      expect(desc).toBe('0% de desconto');
    });

    it('deve construir descrição de produto grátis com nome', () => {
      const desc = GameService.buildPrizeDescription('free_product', null, 'Temaki de Salmão');

      expect(desc).toBe('Produto grátis: Temaki de Salmão');
    });

    it('deve construir descrição de produto grátis sem nome', () => {
      const desc = GameService.buildPrizeDescription('free_product', null, null);

      expect(desc).toBe('Produto grátis');
    });

    it('deve construir descrição de jantar grátis com valor personalizado', () => {
      const desc = GameService.buildPrizeDescription('free_dinner', 'Jantar para 2 pessoas');

      expect(desc).toBe('Jantar para 2 pessoas');
    });

    it('deve construir descrição de jantar grátis sem valor', () => {
      const desc = GameService.buildPrizeDescription('free_dinner', null);

      expect(desc).toBe('Próximo jantar grátis');
    });

    it('deve retornar string vazia para tipo none', () => {
      const desc = GameService.buildPrizeDescription('none', null);

      expect(desc).toBe('');
    });
  });
});
