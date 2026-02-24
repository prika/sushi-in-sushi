// =============================================================================
// IMPORT SHARED TYPES FROM DOMAIN (Single source of truth)
// =============================================================================
import type { SessionStatus as DomainSessionStatus } from "@/domain/value-objects/SessionStatus";
import type { OrderStatus as DomainOrderStatus } from "@/domain/value-objects/OrderStatus";
import type { TableStatus as DomainTableStatus } from "@/domain/value-objects/TableStatus";

// Re-export domain types for backwards compatibility
export type SessionStatus = DomainSessionStatus;
export type OrderStatus = DomainOrderStatus;
export type TableStatus = DomainTableStatus;

// Location is now a dynamic string (restaurant slug)
// Use useLocations() hook to get available locations
export type Location = string;


// =============================================================================
// SUPABASE JSON TYPE
// =============================================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          icon: string | null;
          created_at: string;
          updated_at: string;
          vendus_id: string | null;
          vendus_synced_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          vendus_id?: string | null;
          vendus_synced_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
          vendus_id?: string | null;
          vendus_synced_at?: string | null;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          number: number;
          name: string;
          location: string;
          is_active: boolean;
          vendus_table_id: string | null;
          vendus_room_id: string | null;
          vendus_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          name: string;
          location?: string;
          is_active?: boolean;
          vendus_table_id?: string | null;
          vendus_room_id?: string | null;
          vendus_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: number;
          name?: string;
          location?: string;
          is_active?: boolean;
          vendus_table_id?: string | null;
          vendus_room_id?: string | null;
          vendus_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category_id: string;
          image_url: string | null;
          image_urls: string[] | null;
          is_available: boolean;
          is_rodizio: boolean;
          sort_order: number;
          quantity: number;
          vendus_id: string | null;
          vendus_ids: Record<string, string>;
          vendus_reference: string | null;
          vendus_tax_id: string | null;
          vendus_synced_at: string | null;
          vendus_sync_status: string;
          created_at: string;
          updated_at: string;
          location_id: string | null;
          service_modes: string[];
          service_prices: Record<string, number>;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category_id: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_available?: boolean;
          is_rodizio?: boolean;
          sort_order?: number;
          quantity?: number;
          vendus_id?: string | null;
          vendus_ids?: Record<string, string>;
          vendus_reference?: string | null;
          vendus_tax_id?: string | null;
          vendus_synced_at?: string | null;
          vendus_sync_status?: string;
          created_at?: string;
          updated_at?: string;
          location_id?: string | null;
          service_modes?: string[];
          service_prices?: Record<string, number>;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          category_id?: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_available?: boolean;
          is_rodizio?: boolean;
          sort_order?: number;
          quantity?: number;
          vendus_id?: string | null;
          vendus_ids?: Record<string, string>;
          vendus_reference?: string | null;
          vendus_tax_id?: string | null;
          vendus_synced_at?: string | null;
          vendus_sync_status?: string;
          created_at?: string;
          updated_at?: string;
          location_id?: string | null;
          service_modes?: string[];
          service_prices?: Record<string, number>;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          unit: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_ingredients: {
        Row: {
          id: string;
          product_id: string;
          ingredient_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          ingredient_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          ingredient_id?: string;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          table_id: string;
          started_at: string;
          closed_at: string | null;
          is_rodizio: boolean;
          num_people: number;
          status: SessionStatus;
          notes: string | null;
          total_amount: number;
          ordering_mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          started_at?: string;
          closed_at?: string | null;
          is_rodizio?: boolean;
          num_people?: number;
          status?: SessionStatus;
          notes?: string | null;
          total_amount?: number;
          ordering_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          started_at?: string;
          closed_at?: string | null;
          is_rodizio?: boolean;
          num_people?: number;
          status?: SessionStatus;
          notes?: string | null;
          total_amount?: number;
          ordering_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      session_customers: {
        Row: {
          id: string;
          session_id: string;
          display_name: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          birth_date: string | null;
          preferred_contact: PreferredContact;
          marketing_consent: boolean;
          customer_id: string | null;
          is_session_host: boolean;
          device_id: string | null;
          tier: number;
          email_verified: boolean;
          phone_verified: boolean;
          verification_token: string | null;
          verification_expires_at: string | null;
          verification_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          display_name: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          preferred_contact?: PreferredContact;
          marketing_consent?: boolean;
          customer_id?: string | null;
          is_session_host?: boolean;
          device_id?: string | null;
          tier?: number;
          email_verified?: boolean;
          phone_verified?: boolean;
          verification_token?: string | null;
          verification_expires_at?: string | null;
          verification_type?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          display_name?: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          preferred_contact?: PreferredContact;
          marketing_consent?: boolean;
          customer_id?: string | null;
          is_session_host?: boolean;
          device_id?: string | null;
          tier?: number;
          email_verified?: boolean;
          phone_verified?: boolean;
          verification_token?: string | null;
          verification_expires_at?: string | null;
          verification_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_customers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          session_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          notes: string | null;
          status: OrderStatus;
          session_customer_id: string | null;
          prepared_by: string | null;
          preparing_started_at: string | null;
          ready_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
          notes?: string | null;
          status?: OrderStatus;
          session_customer_id?: string | null;
          prepared_by?: string | null;
          preparing_started_at?: string | null;
          ready_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          notes?: string | null;
          status?: OrderStatus;
          session_customer_id?: string | null;
          prepared_by?: string | null;
          preparing_started_at?: string | null;
          ready_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          email: string;
          name: string;
          password_hash: string;
          role_id: number;
          location: string | null;
          phone: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash: string;
          role_id: number;
          location?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          password_hash?: string;
          role_id?: number;
          location?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      waiter_tables: {
        Row: {
          id: number;
          staff_id: string;
          table_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: number;
          staff_id: string;
          table_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: number;
          staff_id?: string;
          table_id?: string;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waiter_tables_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waiter_tables_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          birth_date: string | null;
          preferred_location: string | null;
          marketing_consent: boolean;
          points: number;
          total_spent: number;
          visit_count: number;
          is_active: boolean;
          email_verified: boolean;
          phone_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          phone?: string | null;
          birth_date?: string | null;
          preferred_location?: string | null;
          marketing_consent?: boolean;
          points?: number;
          total_spent?: number;
          visit_count?: number;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          birth_date?: string | null;
          preferred_location?: string | null;
          marketing_consent?: boolean;
          points?: number;
          total_spent?: number;
          visit_count?: number;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: number;
          staff_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          staff_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          staff_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      game_questions: {
        Row: {
          id: string;
          game_type: string;
          question_text: string;
          options: Json | null;
          correct_answer_index: number | null;
          option_a: Json | null;
          option_b: Json | null;
          category: string | null;
          difficulty: number;
          points: number;
          is_active: boolean;
          restaurant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_type: string;
          question_text: string;
          options?: Json | null;
          correct_answer_index?: number | null;
          option_a?: Json | null;
          option_b?: Json | null;
          category?: string | null;
          difficulty?: number;
          points?: number;
          is_active?: boolean;
          restaurant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_type?: string;
          question_text?: string;
          options?: Json | null;
          correct_answer_index?: number | null;
          option_a?: Json | null;
          option_b?: Json | null;
          category?: string | null;
          difficulty?: number;
          points?: number;
          is_active?: boolean;
          restaurant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_sessions: {
        Row: {
          id: string;
          session_id: string;
          game_type: string | null;
          status: string;
          round_number: number;
          total_questions: number;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          game_type?: string | null;
          status?: string;
          round_number?: number;
          total_questions?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          game_type?: string | null;
          status?: string;
          round_number?: number;
          total_questions?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_sessions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      game_answers: {
        Row: {
          id: string;
          game_session_id: string;
          session_customer_id: string | null;
          question_id: string | null;
          product_id: number | null;
          game_type: string;
          answer: Json;
          score_earned: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          game_session_id: string;
          session_customer_id?: string | null;
          question_id?: string | null;
          product_id?: number | null;
          game_type: string;
          answer: Json;
          score_earned?: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          game_session_id?: string;
          session_customer_id?: string | null;
          question_id?: string | null;
          product_id?: number | null;
          game_type?: string;
          answer?: Json;
          score_earned?: number;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_answers_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "game_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      game_prizes: {
        Row: {
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
        };
        Insert: {
          id?: string;
          session_id: string;
          game_session_id?: string | null;
          session_customer_id?: string | null;
          display_name: string;
          prize_type: string;
          prize_value: string;
          prize_description?: string | null;
          total_score?: number;
          redeemed?: boolean;
          redeemed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          game_session_id?: string | null;
          session_customer_id?: string | null;
          display_name?: string;
          prize_type?: string;
          prize_value?: string;
          prize_description?: string | null;
          total_score?: number;
          redeemed?: boolean;
          redeemed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_prizes_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_prizes_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_ratings: {
        Row: {
          id: string;
          session_id: string;
          session_customer_id: string | null;
          product_id: number;
          order_id: string | null;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          session_customer_id?: string | null;
          product_id: number;
          order_id?: string | null;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          session_customer_id?: string | null;
          product_id?: number;
          order_id?: string | null;
          rating?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_ratings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_ratings_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_logs: {
        Row: {
          id: string;
          session_customer_id: string | null;
          customer_id: string | null;
          verification_type: string;
          contact_value: string;
          token: string;
          expires_at: string;
          status: string;
          verified_at: string | null;
          ip_address: unknown;
          user_agent: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          session_customer_id?: string | null;
          customer_id?: string | null;
          verification_type: string;
          contact_value: string;
          token: string;
          expires_at: string;
          status?: string;
          verified_at?: string | null;
          ip_address?: unknown;
          user_agent?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          session_customer_id?: string | null;
          customer_id?: string | null;
          verification_type?: string;
          contact_value?: string;
          token?: string;
          expires_at?: string;
          status?: string;
          verified_at?: string | null;
          ip_address?: unknown;
          user_agent?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_logs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_logs_session_customer_id_fkey";
            columns: ["session_customer_id"];
            isOneToOne: false;
            referencedRelation: "session_customers";
            referencedColumns: ["id"];
          },
        ];
      };
      vendus_sync_log: {
        Row: {
          id: number;
          operation: string;
          direction: string;
          entity_type: string;
          entity_id: string | null;
          vendus_id: string | null;
          location_id: string | null;
          status: string;
          records_processed: number;
          records_created: number;
          records_updated: number;
          records_failed: number;
          error_message: string | null;
          error_details: Json | null;
          request_data: Json | null;
          response_data: Json | null;
          initiated_by: string | null;
          started_at: string;
          completed_at: string | null;
          duration_ms: number | null;
        };
        Insert: {
          id?: number;
          operation: string;
          direction: string;
          entity_type: string;
          entity_id?: string | null;
          vendus_id?: string | null;
          location_id?: string | null;
          status: string;
          records_processed?: number;
          records_created?: number;
          records_updated?: number;
          records_failed?: number;
          error_message?: string | null;
          error_details?: Json | null;
          request_data?: Json | null;
          response_data?: Json | null;
          initiated_by?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_ms?: number | null;
        };
        Update: {
          id?: number;
          operation?: string;
          direction?: string;
          entity_type?: string;
          entity_id?: string | null;
          vendus_id?: string | null;
          location_id?: string | null;
          status?: string;
          records_processed?: number;
          records_created?: number;
          records_updated?: number;
          records_failed?: number;
          error_message?: string | null;
          error_details?: Json | null;
          request_data?: Json | null;
          response_data?: Json | null;
          initiated_by?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_ms?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vendus_sync_log_initiated_by_fkey";
            columns: ["initiated_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          vendus_store_id: string | null;
          vendus_register_id: string | null;
          vendus_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          vendus_store_id?: string | null;
          vendus_register_id?: string | null;
          vendus_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          vendus_store_id?: string | null;
          vendus_register_id?: string | null;
          vendus_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: number;
          name: string;
          slug: string;
          vendus_id: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          vendus_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          vendus_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          session_id: string | null;
          location_id: string | null;
          vendus_id: string | null;
          vendus_document_number: string | null;
          vendus_document_type: string;
          vendus_series: string | null;
          vendus_hash: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          currency: string;
          payment_method_id: number | null;
          paid_amount: number | null;
          change_amount: number;
          customer_nif: string | null;
          customer_name: string | null;
          status: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          pdf_url: string | null;
          pdf_generated_at: string | null;
          issued_by: string | null;
          error_message: string | null;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          location_id?: string | null;
          vendus_id?: string | null;
          vendus_document_number?: string | null;
          vendus_document_type?: string;
          vendus_series?: string | null;
          vendus_hash?: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          currency?: string;
          payment_method_id?: number | null;
          paid_amount?: number | null;
          change_amount?: number;
          customer_nif?: string | null;
          customer_name?: string | null;
          status?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          pdf_url?: string | null;
          pdf_generated_at?: string | null;
          issued_by?: string | null;
          error_message?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          location_id?: string | null;
          vendus_id?: string | null;
          vendus_document_number?: string | null;
          vendus_document_type?: string;
          vendus_series?: string | null;
          vendus_hash?: string | null;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          currency?: string;
          payment_method_id?: number | null;
          paid_amount?: number | null;
          change_amount?: number;
          customer_nif?: string | null;
          customer_name?: string | null;
          status?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          pdf_url?: string | null;
          pdf_generated_at?: string | null;
          issued_by?: string | null;
          error_message?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      vendus_retry_queue: {
        Row: {
          id: number;
          operation: string;
          entity_type: string;
          entity_id: string;
          location_id: string | null;
          payload: Json;
          attempts: number;
          max_attempts: number;
          next_retry_at: string;
          last_error: string | null;
          status: string;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: number;
          operation: string;
          entity_type: string;
          entity_id: string;
          location_id?: string | null;
          payload: Json;
          attempts?: number;
          max_attempts?: number;
          next_retry_at?: string;
          last_error?: string | null;
          status?: string;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: number;
          operation?: string;
          entity_type?: string;
          entity_id?: string;
          location_id?: string | null;
          payload?: Json;
          attempts?: number;
          max_attempts?: number;
          next_retry_at?: string;
          last_error?: string | null;
          status?: string;
          created_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          reservation_date: string;
          reservation_time: string;
          party_size: number;
          location: string;
          table_id: string | null;
          is_rodizio: boolean;
          special_requests: string | null;
          occasion: string | null;
          status: ReservationStatus;
          confirmed_by: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          session_id: string | null;
          seated_at: string | null;
          marketing_consent: boolean;
          created_at: string;
          updated_at: string;
          customer_email_id: string | null;
          customer_email_sent_at: string | null;
          customer_email_delivered_at: string | null;
          customer_email_opened_at: string | null;
          customer_email_status: EmailStatus | null;
          confirmation_email_id: string | null;
          confirmation_email_sent_at: string | null;
          confirmation_email_delivered_at: string | null;
          confirmation_email_opened_at: string | null;
          confirmation_email_status: EmailStatus | null;
          day_before_reminder_id: string | null;
          day_before_reminder_sent_at: string | null;
          day_before_reminder_delivered_at: string | null;
          day_before_reminder_opened_at: string | null;
          day_before_reminder_status: EmailStatus | null;
          same_day_reminder_id: string | null;
          same_day_reminder_sent_at: string | null;
          same_day_reminder_delivered_at: string | null;
          same_day_reminder_opened_at: string | null;
          same_day_reminder_status: EmailStatus | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          reservation_date: string;
          reservation_time: string;
          party_size: number;
          location: string;
          table_id?: string | null;
          is_rodizio?: boolean;
          special_requests?: string | null;
          occasion?: string | null;
          status?: string;
          marketing_consent?: boolean;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          reservation_date?: string;
          reservation_time?: string;
          party_size?: number;
          location?: string;
          table_id?: string | null;
          is_rodizio?: boolean;
          special_requests?: string | null;
          occasion?: string | null;
          status?: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          session_id?: string | null;
          seated_at?: string | null;
          marketing_consent?: boolean;
          customer_email_id?: string | null;
          customer_email_sent_at?: string | null;
          customer_email_delivered_at?: string | null;
          customer_email_opened_at?: string | null;
          customer_email_status?: EmailStatus | null;
          confirmation_email_id?: string | null;
          confirmation_email_sent_at?: string | null;
          confirmation_email_delivered_at?: string | null;
          confirmation_email_opened_at?: string | null;
          confirmation_email_status?: EmailStatus | null;
          day_before_reminder_id?: string | null;
          day_before_reminder_sent_at?: string | null;
          day_before_reminder_delivered_at?: string | null;
          day_before_reminder_opened_at?: string | null;
          day_before_reminder_status?: EmailStatus | null;
          same_day_reminder_id?: string | null;
          same_day_reminder_sent_at?: string | null;
          same_day_reminder_delivered_at?: string | null;
          same_day_reminder_opened_at?: string | null;
          same_day_reminder_status?: EmailStatus | null;
        };
        Relationships: [];
      };
      reservation_settings: {
        Row: {
          id: number;
          day_before_reminder_enabled: boolean;
          day_before_reminder_hours: number;
          same_day_reminder_enabled: boolean;
          same_day_reminder_hours: number;
          rodizio_waste_policy_enabled: boolean;
          rodizio_waste_fee_per_piece: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          day_before_reminder_enabled?: boolean;
          day_before_reminder_hours?: number;
          same_day_reminder_enabled?: boolean;
          same_day_reminder_hours?: number;
          rodizio_waste_policy_enabled?: boolean;
          rodizio_waste_fee_per_piece?: number;
          updated_by?: string | null;
        };
        Update: {
          day_before_reminder_enabled?: boolean;
          day_before_reminder_hours?: number;
          same_day_reminder_enabled?: boolean;
          same_day_reminder_hours?: number;
          rodizio_waste_policy_enabled?: boolean;
          rodizio_waste_fee_per_piece?: number;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      waiter_calls: {
        Row: {
          id: string;
          table_id: string;
          session_id: string | null;
          session_customer_id: string | null;
          order_id: string | null;
          call_type: WaiterCallType;
          message: string | null;
          status: WaiterCallStatus;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          completed_at: string | null;
          location: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          call_type: string;
          location: string;
          session_id?: string | null;
          session_customer_id?: string | null;
          order_id?: string | null;
          message?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          session_id?: string | null;
          session_customer_id?: string | null;
          order_id?: string | null;
          call_type?: string;
          message?: string | null;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          completed_at?: string | null;
          location?: string;
        };
        Relationships: [];
      };
      email_events: {
        Row: {
          id: string;
          reservation_id: string | null;
          email_id: string;
          event_type: string;
          email_type: string | null;
          recipient_email: string | null;
          raw_data: Json | null;
          event_timestamp: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          email_id: string;
          event_type: string;
          email_type?: string | null;
          recipient_email?: string | null;
          raw_data?: Json | null;
          event_timestamp?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          email_id?: string;
          event_type?: string;
          email_type?: string | null;
          recipient_email?: string | null;
          raw_data?: Json | null;
          event_timestamp?: string | null;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          max_capacity: number;
          default_people_per_table: number;
          auto_table_assignment: boolean;
          auto_reservations: boolean;
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          max_capacity?: number;
          default_people_per_table?: number;
          auto_table_assignment?: boolean;
          auto_reservations?: boolean;
          order_cooldown_minutes?: number;
          show_upgrade_after_order?: boolean;
          show_upgrade_at_bill?: boolean;
          games_enabled?: boolean;
          games_mode?: string;
          games_prize_type?: string;
          games_prize_value?: string | null;
          games_prize_product_id?: number | null;
          games_min_rounds_for_prize?: number;
          games_questions_per_round?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          max_capacity?: number;
          default_people_per_table?: number;
          auto_table_assignment?: boolean;
          auto_reservations?: boolean;
          order_cooldown_minutes?: number;
          show_upgrade_after_order?: boolean;
          show_upgrade_at_bill?: boolean;
          games_enabled?: boolean;
          games_mode?: string;
          games_prize_type?: string;
          games_prize_value?: string | null;
          games_prize_product_id?: number | null;
          games_min_rounds_for_prize?: number;
          games_questions_per_round?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      products_with_vendus_status: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category_id: string;
          image_url: string | null;
          is_available: boolean;
          is_rodizio: boolean;
          sort_order: number;
          vendus_id: string | null;
          vendus_reference: string | null;
          vendus_tax_id: string | null;
          vendus_synced_at: string | null;
          vendus_sync_status: string;
          created_at: string;
          updated_at: string;
          location_id: string | null;
          location_slug: string | null;
          category_name: string | null;
          sync_status_label: string;
          last_synced: string | null;
        };
        Relationships: [];
      };
      invoices_with_details: {
        Row: {
          id: string;
          session_id: string | null;
          location_id: string | null;
          vendus_id: string | null;
          vendus_document_number: string | null;
          vendus_document_type: string;
          vendus_series: string | null;
          vendus_hash: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          currency: string;
          payment_method_id: number | null;
          paid_amount: number | null;
          change_amount: number;
          customer_nif: string | null;
          customer_name: string | null;
          status: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          pdf_url: string | null;
          pdf_generated_at: string | null;
          issued_by: string | null;
          error_message: string | null;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
          payment_method_name: string | null;
          issued_by_name: string | null;
          voided_by_name: string | null;
          table_id: string | null;
          table_number: number | null;
          table_name: string | null;
          status_label: string;
        };
        Relationships: [];
      };
      waiter_assignments: {
        Row: {
          id: number;
          assigned_at: string;
          staff_id: string;
          staff_name: string;
          staff_email: string;
          table_id: string;
          table_number: number;
          table_name: string;
          table_location: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_verification_token: {
        Args: Record<string, never>;
        Returns: string;
      };
      close_session_and_free_table: {
        Args: {
          session_id_param: string;
        };
        Returns: void;
      };
      set_product_ingredients: {
        Args: {
          p_product_id: string;
          p_ingredients: unknown;
        };
        Returns: void;
      };
    };
    Enums: {
      session_status: SessionStatus;
      order_status: OrderStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Note: SessionStatus, OrderStatus, TableStatus, Location are now imported from domain/value-objects
// and re-exported at the top of this file for backwards compatibility

// Generic helper type for table rows
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// Helper types for easier usage
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert =
  Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate =
  Database["public"]["Tables"]["categories"]["Update"];

export type TableBase = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];

// Extended Table type with new fields
export type Table = TableBase & {
  status?: TableStatus;
  status_note?: string | null;
  current_session_id?: string | null;
  current_reservation_id?: string | null;
};

// Table with full status from view
export type TableFullStatus = Table & {
  session_id: string | null;
  session_started: string | null;
  is_rodizio: boolean | null;
  session_people: number | null;
  session_total: number | null;
  reservation_id?: string | null;
  reservation_time?: string | null;
  reservation_people?: number | null;
  reservation_name?: string | null;
  reservation_phone?: string | null;
  status_label: string;
  minutes_occupied: number | null;
  // Waiter info
  waiter_id?: string | null;
  waiter_name?: string | null;
};

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type SessionBase = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

// Extended Session type with metrics fields
export type Session = SessionBase & {
  first_order_at?: string | null;
  last_order_at?: string | null;
  bill_requested_at?: string | null;
  time_to_first_order?: number | null;
  total_duration?: number | null;
  time_ordering?: number | null;
};

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

// Extended types with relations
export type ProductWithCategory = Product & {
  category: Category;
};

export type OrderWithProduct = Order & {
  product: Product;
};

export type SessionWithOrders = Session & {
  orders: OrderWithProduct[];
  table: Table;
};

// =============================================
// USER MANAGEMENT SYSTEM TYPES
// =============================================

// Role types
export type RoleName = "admin" | "kitchen" | "waiter" | "customer";

export type Role = {
  id: number;
  name: RoleName;
  description: string;
};

// Note: Location is imported from domain/value-objects and re-exported at the top of this file

// Staff types
export type Staff = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role_id: number;
  location: Location | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
};

export type StaffInsert = Omit<Staff, "id" | "created_at" | "last_login"> & {
  id?: string;
  created_at?: string;
  last_login?: string | null;
};

export type StaffUpdate = Partial<Omit<Staff, "id" | "created_at">>;

export type StaffWithRole = Staff & {
  role: Role;
};

// Waiter-Table assignment types
export type WaiterTable = {
  id: number;
  staff_id: string;
  table_id: string;
  assigned_at: string;
};

export type WaiterTableInsert = Omit<WaiterTable, "id" | "assigned_at"> & {
  id?: number;
  assigned_at?: string;
};

export type WaiterTableUpdate = Partial<Omit<WaiterTable, "id">>;

export type WaiterTableWithDetails = WaiterTable & {
  staff: Staff;
  table: Table;
};

// Customer types
export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  preferred_location: Location | null;
  marketing_consent: boolean;
  points: number;
  total_spent: number;
  visit_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerInsert = Omit<
  Customer,
  "id" | "created_at" | "updated_at" | "points" | "total_spent" | "visit_count"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  points?: number;
  total_spent?: number;
  visit_count?: number;
};

export type CustomerUpdate = Partial<Omit<Customer, "id" | "created_at">>;

// Activity log types
export type ActivityLog = {
  id: number;
  staff_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ActivityLogInsert = Omit<ActivityLog, "id" | "created_at"> & {
  id?: number;
  created_at?: string;
};

// Auth session type (for JWT payload)
export type AuthSession = {
  staff: StaffWithRole;
  token: string;
  expires_at: string;
};

// Auth user type (simplified for middleware/client)
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  location: Location | null;
};

// =============================================
// TABLE MANAGEMENT TYPES
// =============================================

// Table status history
export type TableStatusHistory = {
  id: number;
  table_id: string;
  old_status: TableStatus | null;
  new_status: TableStatus;
  changed_by: string | null;
  reason: string | null;
  reservation_id: string | null;
  session_id: string | null;
  created_at: string;
};

export type TableStatusHistoryInsert = Omit<
  TableStatusHistory,
  "id" | "created_at"
> & {
  id?: number;
  created_at?: string;
};

// Daily metrics
export type DailyMetrics = {
  id: number;
  date: string;
  location: string;
  total_sessions: number;
  rodizio_sessions: number;
  carta_sessions: number;
  total_covers: number;
  avg_time_to_first_order: number | null;
  avg_session_duration: number | null;
  avg_rodizio_duration: number | null;
  avg_carta_duration: number | null;
  total_revenue: number;
  avg_ticket: number;
  total_reservations: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  no_shows: number;
  walk_ins: number;
  created_at: string;
  updated_at: string;
};

// Session metrics summary (from view)
export type SessionMetricsSummary = {
  location: string;
  total_sessions: number;
  rodizio_count: number;
  carta_count: number;
  total_covers: number;
  avg_time_to_first_order: number | null;
  avg_duration: number | null;
  avg_rodizio_duration: number | null;
  avg_carta_duration: number | null;
  total_revenue: number;
  avg_ticket: number;
};

// =============================================
// RESERVATIONS TYPES
// =============================================

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type ReservationOccasion =
  | "birthday"
  | "anniversary"
  | "business"
  | "other";

export type EmailStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed";

export type Reservation = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: Location;
  table_id: number | null;
  is_rodizio: boolean;
  special_requests: string | null;
  occasion: ReservationOccasion | null;
  status: ReservationStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  session_id: string | null;
  seated_at: string | null;
  marketing_consent: boolean;
  // Email tracking - customer confirmation
  customer_email_id: string | null;
  customer_email_sent_at: string | null;
  customer_email_delivered_at: string | null;
  customer_email_opened_at: string | null;
  customer_email_status: EmailStatus | null;
  // Email tracking - reservation confirmed
  confirmation_email_id: string | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_delivered_at: string | null;
  confirmation_email_opened_at: string | null;
  confirmation_email_status: EmailStatus | null;
  // Email tracking - day before reminder
  day_before_reminder_id: string | null;
  day_before_reminder_sent_at: string | null;
  day_before_reminder_delivered_at: string | null;
  day_before_reminder_opened_at: string | null;
  day_before_reminder_status: EmailStatus | null;
  // Email tracking - same day reminder (2h before)
  same_day_reminder_id: string | null;
  same_day_reminder_sent_at: string | null;
  same_day_reminder_delivered_at: string | null;
  same_day_reminder_opened_at: string | null;
  same_day_reminder_status: EmailStatus | null;
  created_at: string;
  updated_at: string;
};

export type ReservationInsert = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: Location;
  is_rodizio?: boolean;
  special_requests?: string | null;
  occasion?: ReservationOccasion | null;
  marketing_consent?: boolean;
};

export type ReservationUpdate = Partial<Omit<Reservation, "id" | "created_at">>;

export type ReservationWithDetails = Reservation & {
  table_number: number | null;
  table_name: string | null;
  confirmed_by_name: string | null;
  customer_name: string;
  status_label: string;
  email_status_label: "not_sent" | "sent" | "delivered" | "opened";
};

// Restaurant Closures (days off)
export type RestaurantClosure = {
  id: number;
  closure_date: string;
  location: Location | null;
  reason: string | null;
  is_recurring: boolean;
  recurring_day_of_week: number | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantClosureInsert = {
  closure_date: string;
  location?: Location | null;
  reason?: string | null;
  is_recurring?: boolean;
  recurring_day_of_week?: number | null;
};

export type RestaurantClosureUpdate = Partial<
  Omit<RestaurantClosure, "id" | "created_at" | "created_by">
>;

// =============================================
// WAITER CALLS TYPES
// =============================================

export type WaiterCallType = "assistance" | "bill" | "order" | "other";
export type WaiterCallStatus =
  | "pending"
  | "acknowledged"
  | "completed"
  | "cancelled";

export type WaiterCall = {
  id: string;
  table_id: string;
  session_id: string | null;
  call_type: WaiterCallType;
  message: string | null;
  status: WaiterCallStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  location: Location;
  created_at: string;
  updated_at: string;
};

// =============================================
// VENDUS INTEGRATION TYPES
// =============================================

export type VendusSyncStatus =
  | "pending"
  | "synced"
  | "error"
  | "not_applicable";
export type VendusSyncDirection = "push" | "pull" | "both";
export type VendusSyncLogStatus = "started" | "success" | "error" | "partial";
export type InvoiceStatus = "pending" | "issued" | "voided" | "error";
export type VendusDocumentType = "FR" | "FT" | "FS"; // Fatura-Recibo, Fatura, Fatura Simplificada
export type RetryQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

// Extended Product type with Vendus fields
export type ProductWithVendus = Product & {
  vendus_id: string | null;
  vendus_ids: Record<string, string>;
  vendus_reference: string | null;
  vendus_tax_id: string | null;
  vendus_synced_at: string | null;
  vendus_sync_status: VendusSyncStatus;
};

// Extended Table type with Vendus fields
export type TableWithVendus = Table & {
  vendus_table_id: string | null;
  vendus_room_id: string | null;
  vendus_synced_at: string | null;
};

// Payment Method
export type PaymentMethod = {
  id: number;
  name: string;
  slug: string;
  vendus_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type PaymentMethodInsert = Omit<PaymentMethod, "id" | "created_at"> & {
  id?: number;
  created_at?: string;
};

// Invoice
export type Invoice = {
  id: string;
  session_id: string | null;
  location_id: string | null;
  vendus_id: string | null;
  vendus_document_number: string | null;
  vendus_document_type: VendusDocumentType;
  vendus_series: string | null;
  vendus_hash: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  payment_method_id: number | null;
  paid_amount: number | null;
  change_amount: number;
  customer_nif: string | null;
  customer_name: string | null;
  status: InvoiceStatus;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  issued_by: string | null;
  error_message: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceInsert = Omit<
  Invoice,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceUpdate = Partial<Omit<Invoice, "id" | "created_at">>;

export type InvoiceWithDetails = Invoice & {
  payment_method_name: string | null;
  issued_by_name: string | null;
  voided_by_name: string | null;
  table_id: string | null;
  table_number: number | null;
  table_name: string | null;
  status_label: string;
};

// Vendus Sync Log
export type VendusSyncLog = {
  id: number;
  operation: string;
  direction: VendusSyncDirection;
  entity_type: string;
  entity_id: string | null;
  vendus_id: string | null;
  location_id: string | null;
  status: VendusSyncLogStatus;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
  initiated_by: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
};

export type VendusSyncLogInsert = Omit<VendusSyncLog, "id" | "started_at"> & {
  id?: number;
  started_at?: string;
};

// Vendus Retry Queue
export type VendusRetryQueue = {
  id: number;
  operation: string;
  entity_type: string;
  entity_id: string;
  location_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  status: RetryQueueStatus;
  created_at: string;
  processed_at: string | null;
};

export type VendusRetryQueueInsert = Omit<
  VendusRetryQueue,
  "id" | "created_at" | "attempts"
> & {
  id?: number;
  created_at?: string;
  attempts?: number;
};

// Products with Vendus status (from view)
export type ProductWithVendusStatus = Product & {
  category_name: string | null;
  vendus_id: string | null;
  vendus_ids: Record<string, string>;
  vendus_sync_status: VendusSyncStatus;
  sync_status_label: string;
  last_synced: string | null;
};

export type WaiterCallInsert = {
  table_id: string;
  session_id?: string | null;
  call_type?: WaiterCallType;
  message?: string | null;
  location: Location;
};

export type WaiterCallUpdate = Partial<
  Omit<WaiterCall, "id" | "created_at" | "table_id" | "location">
>;

export type WaiterCallWithDetails = WaiterCall & {
  table_number: number;
  table_name: string;
  acknowledged_by_name: string | null;
  assigned_waiter_name: string | null;
  assigned_waiter_id: string | null;
};

// Table with assigned waiter (from view)
export type TableWithWaiter = Table & {
  waiter_id: string | null;
  waiter_name: string | null;
  waiter_email: string | null;
  waiter_assigned_at: string | null;
};

// =============================================
// SESSION CUSTOMERS TYPES
// =============================================

export type PreferredContact = "email" | "phone" | "none";

export type SessionCustomer = {
  id: string;
  session_id: string;
  display_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  birth_date: string | null;
  marketing_consent: boolean;
  preferred_contact: PreferredContact;
  customer_id: string | null;
  is_session_host: boolean;
  device_id: string | null;
  tier: number;
  created_at: string;
  updated_at: string;
};

export type SessionCustomerInsert = {
  session_id: string;
  display_name: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  marketing_consent?: boolean;
  preferred_contact?: PreferredContact;
  customer_id?: string | null;
  is_session_host?: boolean;
  device_id?: string | null;
  tier?: number;
};

export type SessionCustomerUpdate = Partial<
  Omit<SessionCustomer, "id" | "session_id" | "created_at">
>;

// Session customer summary (for display in waiter panel)
export type SessionCustomerSummary = {
  id: string;
  display_name: string;
  is_host: boolean;
  created_at: string;
};

// Session with customers (from view)
export type SessionWithCustomers = Session & {
  table_number: number;
  table_name: string;
  table_location: string;
  customers: SessionCustomerSummary[];
  customer_count: number;
};

// Order with customer info (from view)
export type OrderWithCustomer = Order & {
  product_name: string;
  product_price: number;
  customer_name: string | null;
  customer_id: string | null;
};

// Extended OrderWithProduct to include customer info
export type OrderWithProductAndCustomer = OrderWithProduct & {
  session_customer_id: string | null;
  customer_name?: string | null;
};

// =============================================
// DEVICE PROFILE TYPES
// =============================================

export type DeviceProfileRow = {
  device_id: string;
  last_display_name: string | null;
  last_full_name: string | null;
  last_email: string | null;
  last_phone: string | null;
  last_birth_date: string | null;
  last_preferred_contact: string;
  highest_tier: number;
  linked_customer_id: string | null;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

// =============================================
// GAME TYPES
// =============================================

export type GameQuestionRow = {
  id: string;
  game_type: string;
  question_text: string;
  options: unknown | null;
  correct_answer_index: number | null;
  option_a: unknown | null;
  option_b: unknown | null;
  category: string | null;
  difficulty: number;
  points: number;
  is_active: boolean;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GameSessionRow = {
  id: string;
  session_id: string;
  status: string;
  round_number: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type GameAnswerRow = {
  id: string;
  game_session_id: string;
  session_customer_id: string | null;
  question_id: string | null;
  product_id: number | null;
  game_type: string;
  answer: unknown;
  score_earned: number;
  answered_at: string;
};

export type GamePrizeRow = {
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
};

// =============================================
// RESERVATION SETTINGS TYPES
// =============================================

export type ReservationSettings = {
  id: number;
  day_before_reminder_enabled: boolean;
  day_before_reminder_hours: number;
  same_day_reminder_enabled: boolean;
  same_day_reminder_hours: number;
  rodizio_waste_policy_enabled: boolean;
  rodizio_waste_fee_per_piece: number;
  updated_at: string;
  updated_by: string | null;
};

export type ReservationSettingsUpdate = Partial<
  Omit<ReservationSettings, "id" | "updated_at">
>;

// =============================================
// STAFF TIME OFF TYPES
// =============================================

export type StaffTimeOffType = "vacation" | "sick" | "personal" | "other";
export type StaffTimeOffStatus = "pending" | "approved" | "rejected";

export type StaffTimeOff = {
  id: number;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: StaffTimeOffType;
  reason: string | null;
  status: StaffTimeOffStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffTimeOffInsert = {
  staff_id: string;
  start_date: string;
  end_date: string;
  type?: StaffTimeOffType;
  reason?: string | null;
  status?: StaffTimeOffStatus;
};

export type StaffTimeOffUpdate = Partial<
  Omit<StaffTimeOff, "id" | "staff_id" | "created_at">
>;

export type StaffTimeOffWithStaff = StaffTimeOff & {
  staff_name: string;
  staff_email: string;
  approved_by_name: string | null;
};
