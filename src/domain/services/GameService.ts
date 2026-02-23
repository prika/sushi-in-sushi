/**
 * GameService - Serviço de domínio para jogos interativos
 * Contém a lógica de negócio pura relacionada a jogos de mesa
 */

import type { GameType } from '../entities/GameQuestion';
import type { GameConfig, GamePrizeType } from '../value-objects/GameConfig';
import type { LeaderboardEntry } from '../repositories/IGameAnswerRepository';

export type { LeaderboardEntry };

/**
 * Serviço de domínio para jogos interativos
 * Contém apenas lógica de negócio pura, sem dependências de infraestrutura
 */
export class GameService {
  private static readonly FUNNY_NAMES: string[] = [
    'Salmão Lover', 'Wasabi Ninja', 'Temaki Samurai', 'Maki Master', 'Sushi Sensei',
    'Nigiri Warrior', 'Gyoza Guru', 'Ramen Rebel', 'Tofu Titan', 'Edamame King',
    'Chopstick Pro', 'Rice Runner', 'Shoyu Boss', 'Ginger Snap', 'Dragon Roll',
    'Uramaki Hero', 'Sashimi Star', 'Nori Knight', 'Tataki Tiger', 'Teriyaki Queen',
    'Sake Sage', 'Miso Marvel', 'Tempura Thunder', 'Katsu Champion', 'Yakitori Yogi',
    'Bento Boss', 'Wasabi Warrior', 'Sushi Surfer', 'Matcha Monster', 'Kimchi King',
  ];

  /**
   * Gera um nome divertido aleatório para um jogador
   */
  static generateFunnyName(): string {
    const index = Math.floor(Math.random() * this.FUNNY_NAMES.length);
    return this.FUNNY_NAMES[index];
  }

  /**
   * Retorna uma cópia da lista de nomes divertidos disponíveis
   */
  static getFunnyNames(): string[] {
    return [...this.FUNNY_NAMES];
  }

  /**
   * Calcula a pontuação de uma resposta baseado no tipo de jogo
   */
  static calculateScore(
    gameType: GameType,
    answer: Record<string, unknown>,
    question: { correctAnswerIndex?: number | null; points: number }
  ): number {
    switch (gameType) {
      case 'tinder':
        // All swipes earn points (5pts for nope/left, 10pts for like/right)
        return answer.rating === 5 ? question.points : Math.floor(question.points / 2);
      case 'quiz':
        // Correct answer = full points, wrong = 0
        if (question.correctAnswerIndex === null) return 0;
        return answer.selectedIndex === question.correctAnswerIndex ? question.points : 0;
      case 'preference':
        // All preferences earn full points (it's about data, not right/wrong)
        return question.points;
      default:
        return 0;
    }
  }

  /**
   * Constrói o leaderboard ordenado por pontuação decrescente
   */
  static buildLeaderboard(
    scores: { sessionCustomerId: string | null; displayName: string; totalScore: number }[]
  ): LeaderboardEntry[] {
    const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    return sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Verifica se o prémio deve ser atribuído com base na configuração e progresso
   */
  static shouldAwardPrize(
    config: GameConfig,
    roundsPlayed: number,
    hasParticipants: boolean
  ): boolean {
    if (config.gamesPrizeType === 'none') return false;
    if (!hasParticipants) return false;
    return roundsPlayed >= config.gamesMinRoundsForPrize;
  }

  /**
   * Constrói a descrição do prémio para exibição
   */
  static buildPrizeDescription(
    prizeType: GamePrizeType,
    prizeValue: string | null,
    productName?: string | null
  ): string {
    switch (prizeType) {
      case 'discount_percentage':
        return `${prizeValue ?? '0'}% de desconto`;
      case 'free_product':
        return productName ? `Produto grátis: ${productName}` : 'Produto grátis';
      case 'free_dinner':
        return prizeValue || 'Próximo jantar grátis';
      default:
        return '';
    }
  }
}
