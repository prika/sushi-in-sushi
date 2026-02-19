import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IGamePrizeRepository } from "@/domain/repositories/IGamePrizeRepository";
import {
  GamePrize,
  CreateGamePrizeData,
  PrizeType,
} from "@/domain/entities/GamePrize";

interface DatabaseGamePrize {
  id: string;
  session_id: string;
  game_session_id: string | null;
  session_customer_id: string | null;
  display_name: string;
  prize_type: string;
  prize_value: string;
  prize_description: string | null;
  total_score: number;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

export class SupabaseGamePrizeRepository implements IGamePrizeRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async create(data: CreateGamePrizeData): Promise<GamePrize> {
    const { data: created, error } = await this.supabase
      .from("game_prizes")
      .insert({
        session_id: data.sessionId,
        game_session_id: data.gameSessionId ?? null,
        session_customer_id: data.sessionCustomerId ?? null,
        display_name: data.displayName,
        prize_type: data.prizeType,
        prize_value: data.prizeValue,
        prize_description: data.prizeDescription ?? null,
        total_score: data.totalScore ?? 0,
        redeemed: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async findBySession(sessionId: string): Promise<GamePrize[]> {
    const { data, error } = await this.supabase
      .from("game_prizes")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapToEntity);
  }

  async findById(id: string): Promise<GamePrize | null> {
    const { data, error } = await this.supabase
      .from("game_prizes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async redeem(id: string): Promise<GamePrize> {
    const { data: updated, error } = await this.supabase
      .from("game_prizes")
      .update({
        redeemed: true,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("redeemed", false)
      .select()
      .single();

    if (error || updated == null) {
      throw new Error(error?.message ?? "Prize already redeemed or not found");
    }
    return this.mapToEntity(updated);
  }

  private mapToEntity(row: DatabaseGamePrize): GamePrize {
    return {
      id: row.id,
      sessionId: row.session_id,
      gameSessionId: row.game_session_id,
      sessionCustomerId: row.session_customer_id,
      displayName: row.display_name,
      prizeType: row.prize_type as PrizeType,
      prizeValue: row.prize_value,
      prizeDescription: row.prize_description,
      totalScore: row.total_score,
      redeemed: row.redeemed,
      redeemedAt: row.redeemed_at ? new Date(row.redeemed_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}
