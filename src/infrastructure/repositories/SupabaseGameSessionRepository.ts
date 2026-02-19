import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IGameSessionRepository } from '@/domain/repositories/IGameSessionRepository';
import {
  GameSession,
  CreateGameSessionData,
  GameSessionStatus,
} from '@/domain/entities/GameSession';

interface DatabaseGameSession {
  id: string;
  session_id: string;
  game_type: string | null;
  status: string;
  round_number: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export class SupabaseGameSessionRepository implements IGameSessionRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async create(data: CreateGameSessionData): Promise<GameSession> {
    const { data: created, error } = await this.supabase
      .from('game_sessions')
      .insert({
        session_id: data.sessionId,
        game_type: data.gameType ?? null,
        status: 'active',
        round_number: data.roundNumber ?? 1,
        total_questions: data.totalQuestions ?? 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<GameSession | null> {
    const { data, error } = await this.supabase
      .from('game_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findBySessionId(sessionId: string, status?: GameSessionStatus): Promise<GameSession[]> {
    let query = this.supabase
      .from('game_sessions')
      .select('*')
      .eq('session_id', sessionId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapToEntity);
  }

  async complete(id: string): Promise<GameSession> {
    const { data: updated, error } = await this.supabase
      .from('game_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async abandon(id: string): Promise<GameSession> {
    const { data: updated, error } = await this.supabase
      .from('game_sessions')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  private mapToEntity(row: DatabaseGameSession): GameSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      gameType: (row.game_type as GameSession['gameType']) ?? null,
      status: row.status as GameSessionStatus,
      roundNumber: row.round_number,
      totalQuestions: row.total_questions,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}
