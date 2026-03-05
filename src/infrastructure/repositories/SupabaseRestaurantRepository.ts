import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IRestaurantRepository } from "@/domain/repositories/IRestaurantRepository";
import {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantFilter,
} from "@/domain/entities/Restaurant";

// Database type (snake_case)
interface DatabaseRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  description: string | null;
  address_locality: string | null;
  address_country: string | null;
  google_maps_url: string | null;
  phone: string | null;
  opens_at: string | null;
  closes_at: string | null;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  default_people_per_table: number;
  auto_table_assignment: boolean;
  auto_reservations: boolean;
  auto_reservation_max_party_size: number;
  order_cooldown_minutes: number;
  show_upgrade_after_order: boolean;
  show_upgrade_at_bill: boolean;
  games_enabled: boolean;
  games_mode: string;
  games_prize_type: string;
  games_prize_value: string | null;
  games_prize_product_id: number | null;
  games_min_rounds_for_prize: number;
  games_questions_per_round: number;
  kitchen_print_mode: string;
  zone_split_printing: boolean;
  auto_print_on_order: boolean;
  email: string | null;
  vendus_store_id: string | null;
  vendus_register_id: string | null;
  vendus_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseRestaurantRepository implements IRestaurantRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: RestaurantFilter): Promise<Restaurant[]> {
    let query = this.supabase
      .from("restaurants")
      .select("*")
      .order("name", { ascending: true });

    if (filter?.isActive !== undefined) {
      query = query.eq("is_active", filter.isActive);
    }

    if (filter?.slug) {
      query = query.eq("slug", filter.slug);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row: DatabaseRestaurant) =>
      this.mapToEntity(row),
    );
  }

  async findActive(): Promise<Restaurant[]> {
    return this.findAll({ isActive: true });
  }

  async findById(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreateRestaurantData): Promise<Restaurant> {
    const { data: created, error } = await this.supabase
      .from("restaurants")
      .insert({
        name: data.name,
        slug: data.slug,
        address: data.address,
        description: data.description ?? null,
        address_locality: data.addressLocality ?? "Porto",
        address_country: data.addressCountry ?? "PT",
        google_maps_url: data.googleMapsUrl ?? null,
        phone: data.phone ?? null,
        opens_at: data.opensAt ?? "12:00",
        closes_at: data.closesAt ?? "23:00",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        max_capacity: data.maxCapacity,
        default_people_per_table: data.defaultPeoplePerTable,
        auto_table_assignment: data.autoTableAssignment ?? false,
        auto_reservations: data.autoReservations ?? false,
        auto_reservation_max_party_size: data.autoReservationMaxPartySize ?? 6,
        order_cooldown_minutes: data.orderCooldownMinutes ?? 0,
        show_upgrade_after_order: data.showUpgradeAfterOrder ?? false,
        show_upgrade_at_bill: data.showUpgradeAtBill ?? false,
        games_enabled: data.gamesEnabled ?? false,
        games_mode: data.gamesMode ?? "selection",
        games_prize_type: data.gamesPrizeType ?? "none",
        games_prize_value: data.gamesPrizeValue ?? null,
        games_prize_product_id: data.gamesPrizeProductId ?? null,
        games_min_rounds_for_prize: data.gamesMinRoundsForPrize ?? 1,
        games_questions_per_round: data.gamesQuestionsPerRound ?? 6,
        kitchen_print_mode: data.kitchenPrintMode ?? "none",
        zone_split_printing: data.zoneSplitPrinting ?? true,
        auto_print_on_order: data.autoPrintOnOrder ?? false,
        email: data.email ?? null,
        vendus_store_id: data.vendusStoreId ?? null,
        vendus_register_id: data.vendusRegisterId ?? null,
        vendus_enabled: data.vendusEnabled ?? false,
        is_active: data.isActive ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateRestaurantData): Promise<Restaurant> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.addressLocality !== undefined) updateData.address_locality = data.addressLocality;
    if (data.addressCountry !== undefined) updateData.address_country = data.addressCountry;
    if (data.googleMapsUrl !== undefined) updateData.google_maps_url = data.googleMapsUrl;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.opensAt !== undefined) updateData.opens_at = data.opensAt;
    if (data.closesAt !== undefined) updateData.closes_at = data.closesAt;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.maxCapacity !== undefined)
      updateData.max_capacity = data.maxCapacity;
    if (data.defaultPeoplePerTable !== undefined)
      updateData.default_people_per_table = data.defaultPeoplePerTable;
    if (data.autoTableAssignment !== undefined)
      updateData.auto_table_assignment = data.autoTableAssignment;
    if (data.autoReservations !== undefined)
      updateData.auto_reservations = data.autoReservations;
    if (data.autoReservationMaxPartySize !== undefined)
      updateData.auto_reservation_max_party_size = data.autoReservationMaxPartySize;
    if (data.orderCooldownMinutes !== undefined)
      updateData.order_cooldown_minutes = data.orderCooldownMinutes;
    if (data.showUpgradeAfterOrder !== undefined)
      updateData.show_upgrade_after_order = data.showUpgradeAfterOrder;
    if (data.showUpgradeAtBill !== undefined)
      updateData.show_upgrade_at_bill = data.showUpgradeAtBill;
    if (data.gamesEnabled !== undefined)
      updateData.games_enabled = data.gamesEnabled;
    if (data.gamesMode !== undefined) updateData.games_mode = data.gamesMode;
    if (data.gamesPrizeType !== undefined)
      updateData.games_prize_type = data.gamesPrizeType;
    if (data.gamesPrizeValue !== undefined)
      updateData.games_prize_value = data.gamesPrizeValue;
    if (data.gamesPrizeProductId !== undefined)
      updateData.games_prize_product_id = data.gamesPrizeProductId ?? null;
    if (data.gamesMinRoundsForPrize !== undefined)
      updateData.games_min_rounds_for_prize = data.gamesMinRoundsForPrize;
    if (data.gamesQuestionsPerRound !== undefined)
      updateData.games_questions_per_round = data.gamesQuestionsPerRound;
    if (data.kitchenPrintMode !== undefined)
      updateData.kitchen_print_mode = data.kitchenPrintMode;
    if (data.zoneSplitPrinting !== undefined)
      updateData.zone_split_printing = data.zoneSplitPrinting;
    if (data.autoPrintOnOrder !== undefined)
      updateData.auto_print_on_order = data.autoPrintOnOrder;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.vendusStoreId !== undefined)
      updateData.vendus_store_id = data.vendusStoreId;
    if (data.vendusRegisterId !== undefined)
      updateData.vendus_register_id = data.vendusRegisterId;
    if (data.vendusEnabled !== undefined)
      updateData.vendus_enabled = data.vendusEnabled;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("restaurants")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async validateSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.from("restaurants").select("id").eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data.length === 0;
  }

  private mapToEntity(row: DatabaseRestaurant): Restaurant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      description: row.description ?? null,
      addressLocality: row.address_locality ?? "Porto",
      addressCountry: row.address_country ?? "PT",
      googleMapsUrl: row.google_maps_url ?? null,
      phone: row.phone ?? null,
      opensAt: row.opens_at ?? "12:00",
      closesAt: row.closes_at ?? "23:00",
      latitude: row.latitude,
      longitude: row.longitude,
      maxCapacity: row.max_capacity,
      defaultPeoplePerTable: row.default_people_per_table,
      autoTableAssignment: row.auto_table_assignment,
      autoReservations: row.auto_reservations,
      autoReservationMaxPartySize: row.auto_reservation_max_party_size ?? 6,
      orderCooldownMinutes: row.order_cooldown_minutes,
      showUpgradeAfterOrder: row.show_upgrade_after_order,
      showUpgradeAtBill: row.show_upgrade_at_bill,
      gamesEnabled: row.games_enabled,
      gamesMode: (row.games_mode ?? "selection") as Restaurant["gamesMode"],
      gamesPrizeType: (row.games_prize_type ??
        "none") as Restaurant["gamesPrizeType"],
      gamesPrizeValue: row.games_prize_value,
      gamesPrizeProductId: row.games_prize_product_id ?? null,
      gamesMinRoundsForPrize: row.games_min_rounds_for_prize,
      gamesQuestionsPerRound: row.games_questions_per_round,
      kitchenPrintMode: (row.kitchen_print_mode ?? "none") as Restaurant["kitchenPrintMode"],
      zoneSplitPrinting: row.zone_split_printing ?? true,
      autoPrintOnOrder: row.auto_print_on_order ?? false,
      email: row.email ?? null,
      vendusStoreId: row.vendus_store_id ?? null,
      vendusRegisterId: row.vendus_register_id ?? null,
      vendusEnabled: row.vendus_enabled ?? false,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
