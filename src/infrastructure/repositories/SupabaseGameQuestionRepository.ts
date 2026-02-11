import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IGameQuestionRepository } from '@/domain/repositories/IGameQuestionRepository';
import {
  GameQuestion,
  CreateGameQuestionData,
  UpdateGameQuestionData,
  GameQuestionFilter,
  GameType,
} from '@/domain/entities/GameQuestion';

interface DatabaseGameQuestion {
  id: string;
  game_type: string;
  question_text: string;
  options: string[] | null;
  correct_answer_index: number | null;
  option_a: { label: string; imageUrl?: string } | null;
  option_b: { label: string; imageUrl?: string } | null;
  category: string | null;
  difficulty: number;
  points: number;
  is_active: boolean;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseGameQuestionRepository implements IGameQuestionRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: GameQuestionFilter): Promise<GameQuestion[]> {
    let query = this.supabase.from('game_questions').select('*');

    if (filter?.gameType) {
      query = query.eq('game_type', filter.gameType);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }
    if (filter?.restaurantId !== undefined) {
      if (filter.restaurantId === null) {
        query = query.is('restaurant_id', null);
      } else {
        query = query.eq('restaurant_id', filter.restaurantId);
      }
    }
    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapToEntity);
  }

  async findById(id: string): Promise<GameQuestion | null> {
    const { data, error } = await this.supabase
      .from('game_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findRandom(count: number, gameTypes?: GameType[], restaurantId?: string | null): Promise<GameQuestion[]> {
    let query = this.supabase
      .from('game_questions')
      .select('*')
      .eq('is_active', true);

    if (gameTypes && gameTypes.length > 0) {
      query = query.in('game_type', gameTypes);
    }

    if (restaurantId !== undefined && restaurantId !== null) {
      // Get global questions (restaurant_id IS NULL) OR matching restaurantId
      query = query.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
    } else {
      // If no restaurantId specified, only get global questions
      query = query.is('restaurant_id', null);
    }

    const { data, error } = await query.order('id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    // Shuffle in JS since Supabase doesn't support random ordering
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return selected.map(this.mapToEntity);
  }

  async create(data: CreateGameQuestionData): Promise<GameQuestion> {
    const { data: created, error } = await this.supabase
      .from('game_questions')
      .insert({
        game_type: data.gameType,
        question_text: data.questionText,
        options: data.options ?? null,
        correct_answer_index: data.correctAnswerIndex ?? null,
        option_a: data.optionA ?? null,
        option_b: data.optionB ?? null,
        category: data.category ?? null,
        difficulty: data.difficulty ?? 1,
        points: data.points ?? 10,
        is_active: data.isActive ?? true,
        restaurant_id: data.restaurantId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateGameQuestionData): Promise<GameQuestion> {
    const updateData: Record<string, unknown> = {};

    if (data.questionText !== undefined) updateData.question_text = data.questionText;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.correctAnswerIndex !== undefined) updateData.correct_answer_index = data.correctAnswerIndex;
    if (data.optionA !== undefined) updateData.option_a = data.optionA;
    if (data.optionB !== undefined) updateData.option_b = data.optionB;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from('game_questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('game_questions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private mapToEntity(row: DatabaseGameQuestion): GameQuestion {
    return {
      id: row.id,
      gameType: row.game_type as GameType,
      questionText: row.question_text,
      options: row.options,
      correctAnswerIndex: row.correct_answer_index,
      optionA: row.option_a,
      optionB: row.option_b,
      category: row.category,
      difficulty: row.difficulty,
      points: row.points,
      isActive: row.is_active,
      restaurantId: row.restaurant_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
