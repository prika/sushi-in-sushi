import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IGameAnswerRepository, LeaderboardEntry } from '@/domain/repositories/IGameAnswerRepository';
import {
  GameAnswer,
  CreateGameAnswerData,
} from '@/domain/entities/GameAnswer';
import type { GameType } from '@/domain/entities/GameQuestion';

interface DatabaseGameAnswer {
  id: string;
  game_session_id: string;
  session_customer_id: string | null;
  question_id: string | null;
  product_id: number | null;
  game_type: string;
  answer: Record<string, unknown>;
  score_earned: number;
  answered_at: string;
}

interface DatabaseSessionCustomer {
  id: string;
  display_name: string;
}

export class SupabaseGameAnswerRepository implements IGameAnswerRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async create(data: CreateGameAnswerData): Promise<GameAnswer> {
    const row: Record<string, unknown> = {
      game_session_id: data.gameSessionId,
      session_customer_id: data.sessionCustomerId ?? null,
      game_type: data.gameType,
      answer: data.answer,
      score_earned: data.scoreEarned ?? 0,
      answered_at: new Date().toISOString(),
      question_id: data.questionId ?? null,
      product_id: data.productId ?? null,
    };

    // Try insert first; on unique conflict, update the existing row
    const { data: created, error } = await this.supabase
      .from('game_answers')
      .insert(row)
      .select()
      .single();

    if (error) {
      // Unique constraint violation (23505) — update existing row instead
      if (error.code === '23505') {
        return this.updateExisting(data);
      }
      throw new Error(error.message);
    }

    return this.mapToEntity(created);
  }

  private async updateExisting(data: CreateGameAnswerData): Promise<GameAnswer> {
    let query = this.supabase
      .from('game_answers')
      .update({
        answer: data.answer,
        score_earned: data.scoreEarned ?? 0,
        answered_at: new Date().toISOString(),
      })
      .eq('game_session_id', data.gameSessionId);

    // Match on the correct deduplication column
    if (data.productId != null) {
      query = query.eq('product_id', data.productId);
    } else {
      query = query.eq('question_id', data.questionId!);
    }

    // Match session_customer_id (handle NULL)
    if (data.sessionCustomerId) {
      query = query.eq('session_customer_id', data.sessionCustomerId);
    } else {
      query = query.is('session_customer_id', null);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async findByGameSession(gameSessionId: string): Promise<GameAnswer[]> {
    const { data, error } = await this.supabase
      .from('game_answers')
      .select('*')
      .eq('game_session_id', gameSessionId)
      .order('answered_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapToEntity);
  }

  async findBySessionCustomer(gameSessionId: string, sessionCustomerId: string): Promise<GameAnswer[]> {
    const { data, error } = await this.supabase
      .from('game_answers')
      .select('*')
      .eq('game_session_id', gameSessionId)
      .eq('session_customer_id', sessionCustomerId)
      .order('answered_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapToEntity);
  }

  async getLeaderboard(gameSessionId: string): Promise<LeaderboardEntry[]> {
    // Fetch all answers for this game session
    const { data: answers, error: answersError } = await this.supabase
      .from('game_answers')
      .select('session_customer_id, score_earned')
      .eq('game_session_id', gameSessionId);

    if (answersError) throw new Error(answersError.message);
    if (!answers || answers.length === 0) return [];

    // Aggregate scores by session_customer_id in JS
    const scoreMap = new Map<string, number>();
    for (const answer of answers) {
      const customerId = answer.session_customer_id || 'anonymous';
      const current = scoreMap.get(customerId) || 0;
      scoreMap.set(customerId, current + (answer.score_earned || 0));
    }

    // Get display names for all session_customer_ids
    const customerIds = Array.from(scoreMap.keys()).filter((id) => id !== 'anonymous');
    const displayNameMap = new Map<string, string>();

    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await this.supabase
        .from('session_customers')
        .select('id, display_name')
        .in('id', customerIds);

      if (customersError) throw new Error(customersError.message);
      if (customers) {
        for (const customer of customers as DatabaseSessionCustomer[]) {
          displayNameMap.set(customer.id, customer.display_name);
        }
      }
    }

    // Build leaderboard sorted by total score descending
    const leaderboard: LeaderboardEntry[] = [];
    for (const [customerId, totalScore] of Array.from(scoreMap.entries())) {
      leaderboard.push({
        sessionCustomerId: customerId === 'anonymous' ? null : customerId,
        displayName: customerId === 'anonymous'
          ? 'Anonymous'
          : displayNameMap.get(customerId) || 'Unknown',
        totalScore,
      });
    }

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    return leaderboard;
  }

  async getSessionLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
    // First get all game_session IDs for this restaurant session
    const { data: gameSessions, error: sessionsError } = await this.supabase
      .from('game_sessions')
      .select('id')
      .eq('session_id', sessionId);

    if (sessionsError) throw new Error(sessionsError.message);
    if (!gameSessions || gameSessions.length === 0) return [];

    const gameSessionIds = gameSessions.map((gs: { id: string }) => gs.id);

    // Fetch all answers across all game sessions for this session
    const { data: answers, error: answersError } = await this.supabase
      .from('game_answers')
      .select('session_customer_id, score_earned')
      .in('game_session_id', gameSessionIds);

    if (answersError) throw new Error(answersError.message);
    if (!answers || answers.length === 0) return [];

    // Aggregate scores by session_customer_id in JS
    const scoreMap = new Map<string, number>();
    for (const answer of answers) {
      const customerId = answer.session_customer_id || 'anonymous';
      const current = scoreMap.get(customerId) || 0;
      scoreMap.set(customerId, current + (answer.score_earned || 0));
    }

    // Get display names for all session_customer_ids
    const customerIds = Array.from(scoreMap.keys()).filter((id) => id !== 'anonymous');
    const displayNameMap = new Map<string, string>();

    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await this.supabase
        .from('session_customers')
        .select('id, display_name')
        .in('id', customerIds);

      if (customersError) throw new Error(customersError.message);
      if (customers) {
        for (const customer of customers as DatabaseSessionCustomer[]) {
          displayNameMap.set(customer.id, customer.display_name);
        }
      }
    }

    // Build leaderboard sorted by total score descending
    const leaderboard: LeaderboardEntry[] = [];
    for (const [customerId, totalScore] of Array.from(scoreMap.entries())) {
      leaderboard.push({
        sessionCustomerId: customerId === 'anonymous' ? null : customerId,
        displayName: customerId === 'anonymous'
          ? 'Anonymous'
          : displayNameMap.get(customerId) || 'Unknown',
        totalScore,
      });
    }

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    return leaderboard;
  }

  private mapToEntity(row: DatabaseGameAnswer): GameAnswer {
    return {
      id: row.id,
      gameSessionId: row.game_session_id,
      sessionCustomerId: row.session_customer_id,
      questionId: row.question_id,
      productId: row.product_id,
      gameType: row.game_type as GameType,
      answer: row.answer,
      scoreEarned: row.score_earned,
      answeredAt: new Date(row.answered_at),
    };
  }
}
