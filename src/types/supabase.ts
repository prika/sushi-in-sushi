export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
          ip_address: string | null
          staff_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          staff_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      AgentRun: {
        Row: {
          completedAt: string | null
          createdAt: string
          currentStage: Database["public"]["Enums"]["PipelineStage"] | null
          error: string | null
          estimatedCost: number
          id: string
          logs: Json
          progress: number
          projectId: string
          stages: Database["public"]["Enums"]["PipelineStage"][] | null
          startedAt: string | null
          status: Database["public"]["Enums"]["RunStatus"]
          totalTokensIn: number
          totalTokensOut: number
          triggerType: Database["public"]["Enums"]["RunTrigger"]
        }
        Insert: {
          completedAt?: string | null
          createdAt?: string
          currentStage?: Database["public"]["Enums"]["PipelineStage"] | null
          error?: string | null
          estimatedCost?: number
          id: string
          logs?: Json
          progress?: number
          projectId: string
          stages?: Database["public"]["Enums"]["PipelineStage"][] | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["RunStatus"]
          totalTokensIn?: number
          totalTokensOut?: number
          triggerType: Database["public"]["Enums"]["RunTrigger"]
        }
        Update: {
          completedAt?: string | null
          createdAt?: string
          currentStage?: Database["public"]["Enums"]["PipelineStage"] | null
          error?: string | null
          estimatedCost?: number
          id?: string
          logs?: Json
          progress?: number
          projectId?: string
          stages?: Database["public"]["Enums"]["PipelineStage"][] | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["RunStatus"]
          totalTokensIn?: number
          totalTokensOut?: number
          triggerType?: Database["public"]["Enums"]["RunTrigger"]
        }
        Relationships: [
          {
            foreignKeyName: "AgentRun_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      ApiKeyStore: {
        Row: {
          accessToken: string
          createdAt: string
          expiresAt: string | null
          id: string
          metadata: Json | null
          provider: Database["public"]["Enums"]["ApiProvider"]
          refreshToken: string | null
          scopes: string[] | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken: string
          createdAt?: string
          expiresAt?: string | null
          id: string
          metadata?: Json | null
          provider: Database["public"]["Enums"]["ApiProvider"]
          refreshToken?: string | null
          scopes?: string[] | null
          updatedAt?: string
          userId: string
        }
        Update: {
          accessToken?: string
          createdAt?: string
          expiresAt?: string | null
          id?: string
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["ApiProvider"]
          refreshToken?: string | null
          scopes?: string[] | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ApiKeyStore_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditResult: {
        Row: {
          auditedAt: string
          avgComments: number | null
          avgEngagementRate: number | null
          avgLikes: number | null
          avgShares: number | null
          followerCount: number | null
          id: string
          opportunities: string[] | null
          platform: Database["public"]["Enums"]["Platform"]
          postCount: number | null
          postingFrequency: number | null
          projectId: string
          rawData: Json | null
          recommendations: string[] | null
          score: number
          strengths: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          auditedAt?: string
          avgComments?: number | null
          avgEngagementRate?: number | null
          avgLikes?: number | null
          avgShares?: number | null
          followerCount?: number | null
          id: string
          opportunities?: string[] | null
          platform: Database["public"]["Enums"]["Platform"]
          postCount?: number | null
          postingFrequency?: number | null
          projectId: string
          rawData?: Json | null
          recommendations?: string[] | null
          score: number
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          auditedAt?: string
          avgComments?: number | null
          avgEngagementRate?: number | null
          avgLikes?: number | null
          avgShares?: number | null
          followerCount?: number | null
          id?: string
          opportunities?: string[] | null
          platform?: Database["public"]["Enums"]["Platform"]
          postCount?: number | null
          postingFrequency?: number | null
          projectId?: string
          rawData?: Json | null
          recommendations?: string[] | null
          score?: number
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditResult_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_audit_log: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          staff_id: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          staff_id?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          staff_id?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "auth_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempts: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          identifier: string
          identifier_type: string
          last_attempt_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier: string
          identifier_type: string
          last_attempt_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      auth_session_config: {
        Row: {
          inactivity_timeout_minutes: number
          max_concurrent_sessions: number
          require_mfa: boolean
          role_name: string
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          inactivity_timeout_minutes?: number
          max_concurrent_sessions?: number
          require_mfa?: boolean
          role_name: string
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          inactivity_timeout_minutes?: number
          max_concurrent_sessions?: number
          require_mfa?: boolean
          role_name?: string
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_session_config_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "auth_session_config_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: true
            referencedRelation: "staff_with_roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      CalendarEntry: {
        Row: {
          contentPieceId: string | null
          createdAt: string
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["Platform"]
          projectId: string
          publishedAt: string | null
          scheduledAt: string
          status: Database["public"]["Enums"]["CalendarStatus"]
          title: string
          updatedAt: string
        }
        Insert: {
          contentPieceId?: string | null
          createdAt?: string
          id: string
          notes?: string | null
          platform: Database["public"]["Enums"]["Platform"]
          projectId: string
          publishedAt?: string | null
          scheduledAt: string
          status?: Database["public"]["Enums"]["CalendarStatus"]
          title: string
          updatedAt?: string
        }
        Update: {
          contentPieceId?: string | null
          createdAt?: string
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["Platform"]
          projectId?: string
          publishedAt?: string | null
          scheduledAt?: string
          status?: Database["public"]["Enums"]["CalendarStatus"]
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CalendarEntry_contentPieceId_fkey"
            columns: ["contentPieceId"]
            isOneToOne: false
            referencedRelation: "ContentPiece"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CalendarEntry_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: number
          notes: string | null
          product_id: number | null
          quantity: number | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          quantity?: number | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          quantity?: number | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: number
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      Competitor: {
        Row: {
          analysis: Json | null
          createdAt: string
          discoveredBy: Database["public"]["Enums"]["DiscoveryMethod"]
          facebookPage: string | null
          id: string
          instagramHandle: string | null
          name: string
          overallScore: number | null
          projectId: string
          tiktokHandle: string | null
          updatedAt: string
          websiteUrl: string | null
          youtubeChannel: string | null
        }
        Insert: {
          analysis?: Json | null
          createdAt?: string
          discoveredBy?: Database["public"]["Enums"]["DiscoveryMethod"]
          facebookPage?: string | null
          id: string
          instagramHandle?: string | null
          name: string
          overallScore?: number | null
          projectId: string
          tiktokHandle?: string | null
          updatedAt?: string
          websiteUrl?: string | null
          youtubeChannel?: string | null
        }
        Update: {
          analysis?: Json | null
          createdAt?: string
          discoveredBy?: Database["public"]["Enums"]["DiscoveryMethod"]
          facebookPage?: string | null
          id?: string
          instagramHandle?: string | null
          name?: string
          overallScore?: number | null
          projectId?: string
          tiktokHandle?: string | null
          updatedAt?: string
          websiteUrl?: string | null
          youtubeChannel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Competitor_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      ContentPiece: {
        Row: {
          body: string
          callToAction: string | null
          contentPillar: string | null
          contentType: Database["public"]["Enums"]["ContentType"]
          createdAt: string
          hashtags: string[] | null
          id: string
          mediaUrls: string[] | null
          platform: Database["public"]["Enums"]["Platform"]
          projectId: string
          slides: Json | null
          status: Database["public"]["Enums"]["ContentStatus"]
          strategyId: string | null
          thumbnailConcept: string | null
          title: string | null
          updatedAt: string
          videoScript: Json | null
        }
        Insert: {
          body: string
          callToAction?: string | null
          contentPillar?: string | null
          contentType: Database["public"]["Enums"]["ContentType"]
          createdAt?: string
          hashtags?: string[] | null
          id: string
          mediaUrls?: string[] | null
          platform: Database["public"]["Enums"]["Platform"]
          projectId: string
          slides?: Json | null
          status?: Database["public"]["Enums"]["ContentStatus"]
          strategyId?: string | null
          thumbnailConcept?: string | null
          title?: string | null
          updatedAt?: string
          videoScript?: Json | null
        }
        Update: {
          body?: string
          callToAction?: string | null
          contentPillar?: string | null
          contentType?: Database["public"]["Enums"]["ContentType"]
          createdAt?: string
          hashtags?: string[] | null
          id?: string
          mediaUrls?: string[] | null
          platform?: Database["public"]["Enums"]["Platform"]
          projectId?: string
          slides?: Json | null
          status?: Database["public"]["Enums"]["ContentStatus"]
          strategyId?: string | null
          thumbnailConcept?: string | null
          title?: string | null
          updatedAt?: string
          videoScript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ContentPiece_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ContentPiece_strategyId_fkey"
            columns: ["strategyId"]
            isOneToOne: false
            referencedRelation: "Strategy"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points_history: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: number
          points: number
          reason: string | null
          reference_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: number
          points: number
          reason?: string | null
          reference_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: number
          points?: number
          reason?: string | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string | null
          email: string
          email_verified: boolean
          id: string
          is_active: boolean | null
          marketing_consent: boolean | null
          name: string
          phone: string | null
          phone_verified: boolean
          points: number | null
          preferred_location: string | null
          total_spent: number | null
          updated_at: string | null
          visit_count: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean
          id?: string
          is_active?: boolean | null
          marketing_consent?: boolean | null
          name: string
          phone?: string | null
          phone_verified?: boolean
          points?: number | null
          preferred_location?: string | null
          total_spent?: number | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean
          id?: string
          is_active?: boolean | null
          marketing_consent?: boolean | null
          name?: string
          phone?: string | null
          phone_verified?: boolean
          points?: number | null
          preferred_location?: string | null
          total_spent?: number | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          avg_carta_duration: number | null
          avg_rodizio_duration: number | null
          avg_session_duration: number | null
          avg_ticket: number | null
          avg_time_to_first_order: number | null
          cancelled_reservations: number | null
          carta_sessions: number | null
          confirmed_reservations: number | null
          created_at: string | null
          date: string
          id: number
          location: string
          no_shows: number | null
          rodizio_sessions: number | null
          total_covers: number | null
          total_reservations: number | null
          total_revenue: number | null
          total_sessions: number | null
          updated_at: string | null
          walk_ins: number | null
        }
        Insert: {
          avg_carta_duration?: number | null
          avg_rodizio_duration?: number | null
          avg_session_duration?: number | null
          avg_ticket?: number | null
          avg_time_to_first_order?: number | null
          cancelled_reservations?: number | null
          carta_sessions?: number | null
          confirmed_reservations?: number | null
          created_at?: string | null
          date: string
          id?: number
          location: string
          no_shows?: number | null
          rodizio_sessions?: number | null
          total_covers?: number | null
          total_reservations?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          walk_ins?: number | null
        }
        Update: {
          avg_carta_duration?: number | null
          avg_rodizio_duration?: number | null
          avg_session_duration?: number | null
          avg_ticket?: number | null
          avg_time_to_first_order?: number | null
          cancelled_reservations?: number | null
          carta_sessions?: number | null
          confirmed_reservations?: number | null
          created_at?: string | null
          date?: string
          id?: number
          location?: string
          no_shows?: number | null
          rodizio_sessions?: number | null
          total_covers?: number | null
          total_reservations?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          walk_ins?: number | null
        }
        Relationships: []
      }
      device_profiles: {
        Row: {
          created_at: string | null
          device_id: string
          first_seen_at: string | null
          highest_tier: number
          last_birth_date: string | null
          last_display_name: string | null
          last_email: string | null
          last_full_name: string | null
          last_phone: string | null
          last_preferred_contact: string | null
          last_seen_at: string | null
          linked_customer_id: string | null
          updated_at: string | null
          visit_count: number
        }
        Insert: {
          created_at?: string | null
          device_id: string
          first_seen_at?: string | null
          highest_tier?: number
          last_birth_date?: string | null
          last_display_name?: string | null
          last_email?: string | null
          last_full_name?: string | null
          last_phone?: string | null
          last_preferred_contact?: string | null
          last_seen_at?: string | null
          linked_customer_id?: string | null
          updated_at?: string | null
          visit_count?: number
        }
        Update: {
          created_at?: string | null
          device_id?: string
          first_seen_at?: string | null
          highest_tier?: number
          last_birth_date?: string | null
          last_display_name?: string | null
          last_email?: string | null
          last_full_name?: string | null
          last_phone?: string | null
          last_preferred_contact?: string | null
          last_seen_at?: string | null
          linked_customer_id?: string | null
          updated_at?: string | null
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_profiles_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string | null
          email_id: string
          email_type: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          raw_data: Json | null
          recipient_email: string | null
          reservation_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_id: string
          email_type?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          raw_data?: Json | null
          recipient_email?: string | null
          reservation_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_id?: string
          email_type?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          raw_data?: Json | null
          recipient_email?: string | null
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      game_answers: {
        Row: {
          answer: Json
          answered_at: string | null
          game_session_id: string
          game_type: string
          id: string
          product_id: number | null
          question_id: string | null
          score_earned: number | null
          session_customer_id: string | null
        }
        Insert: {
          answer: Json
          answered_at?: string | null
          game_session_id: string
          game_type: string
          id?: string
          product_id?: number | null
          question_id?: string | null
          score_earned?: number | null
          session_customer_id?: string | null
        }
        Update: {
          answer?: Json
          answered_at?: string | null
          game_session_id?: string
          game_type?: string
          id?: string
          product_id?: number | null
          question_id?: string | null
          score_earned?: number | null
          session_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_answers_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_answers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "game_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_answers_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "game_answers_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      game_prizes: {
        Row: {
          created_at: string | null
          display_name: string
          game_session_id: string | null
          id: string
          prize_description: string | null
          prize_type: string
          prize_value: string
          redeemed: boolean | null
          redeemed_at: string | null
          session_customer_id: string | null
          session_id: string
          total_score: number | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          game_session_id?: string | null
          id?: string
          prize_description?: string | null
          prize_type: string
          prize_value: string
          redeemed?: boolean | null
          redeemed_at?: string | null
          session_customer_id?: string | null
          session_id: string
          total_score?: number | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          game_session_id?: string | null
          id?: string
          prize_description?: string | null
          prize_type?: string
          prize_value?: string
          redeemed?: boolean | null
          redeemed_at?: string | null
          session_customer_id?: string | null
          session_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_prizes_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prizes_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "game_prizes_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prizes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prizes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prizes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prizes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      game_questions: {
        Row: {
          category: string | null
          correct_answer_index: number | null
          created_at: string | null
          difficulty: number | null
          game_type: string
          id: string
          is_active: boolean | null
          option_a: Json | null
          option_b: Json | null
          options: Json | null
          points: number | null
          question_text: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          correct_answer_index?: number | null
          created_at?: string | null
          difficulty?: number | null
          game_type: string
          id?: string
          is_active?: boolean | null
          option_a?: Json | null
          option_b?: Json | null
          options?: Json | null
          points?: number | null
          question_text: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          correct_answer_index?: number | null
          created_at?: string | null
          difficulty?: number | null
          game_type?: string
          id?: string
          is_active?: boolean | null
          option_a?: Json | null
          option_b?: Json | null
          options?: Json | null
          points?: number | null
          question_text?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_questions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          game_type: string | null
          id: string
          round_number: number | null
          session_id: string
          started_at: string | null
          status: string | null
          total_questions: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          game_type?: string | null
          id?: string
          round_number?: number | null
          session_id: string
          started_at?: string | null
          status?: string | null
          total_questions?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          game_type?: string | null
          id?: string
          round_number?: number | null
          session_id?: string
          started_at?: string | null
          status?: string | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: number
          location: string | null
          notes: string | null
          prepared_by: string | null
          preparing_started_at: string | null
          product_id: number | null
          quantity: number | null
          ready_at: string | null
          session_customer_id: string | null
          session_id: string | null
          status: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          prepared_by?: string | null
          preparing_started_at?: string | null
          product_id?: number | null
          quantity?: number | null
          ready_at?: string | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: number
          location?: string | null
          notes?: string | null
          prepared_by?: string | null
          preparing_started_at?: string | null
          product_id?: number | null
          quantity?: number | null
          ready_at?: string | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "orders_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      PerformanceMetric: {
        Row: {
          collectedAt: string
          engagementRate: number | null
          followers: number | null
          followersChange: number | null
          id: string
          impressions: number | null
          insights: string | null
          metricDate: string
          platform: Database["public"]["Enums"]["Platform"]
          postsPublished: number | null
          profileVisits: number | null
          projectId: string
          rawData: Json | null
          reach: number | null
          totalComments: number | null
          totalLikes: number | null
          totalShares: number | null
          totalViews: number | null
          websiteClicks: number | null
        }
        Insert: {
          collectedAt?: string
          engagementRate?: number | null
          followers?: number | null
          followersChange?: number | null
          id: string
          impressions?: number | null
          insights?: string | null
          metricDate: string
          platform: Database["public"]["Enums"]["Platform"]
          postsPublished?: number | null
          profileVisits?: number | null
          projectId: string
          rawData?: Json | null
          reach?: number | null
          totalComments?: number | null
          totalLikes?: number | null
          totalShares?: number | null
          totalViews?: number | null
          websiteClicks?: number | null
        }
        Update: {
          collectedAt?: string
          engagementRate?: number | null
          followers?: number | null
          followersChange?: number | null
          id?: string
          impressions?: number | null
          insights?: string | null
          metricDate?: string
          platform?: Database["public"]["Enums"]["Platform"]
          postsPublished?: number | null
          profileVisits?: number | null
          projectId?: string
          rawData?: Json | null
          reach?: number | null
          totalComments?: number | null
          totalLikes?: number | null
          totalShares?: number | null
          totalViews?: number | null
          websiteClicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PerformanceMetric_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          created_at: string
          id: string
          order_id: number | null
          product_id: number
          rating: number
          session_customer_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: number | null
          product_id: number
          rating: number
          session_customer_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: number | null
          product_id?: number
          rating?: number
          session_customer_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_ratings_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          image_urls: string[] | null
          is_available: boolean | null
          is_rodizio: boolean | null
          location: string | null
          name: string
          pieces: number | null
          price: number
          sort_order: number | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          is_rodizio?: boolean | null
          location?: string | null
          name: string
          pieces?: number | null
          price: number
          sort_order?: number | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          is_rodizio?: boolean | null
          location?: string | null
          name?: string
          pieces?: number | null
          price?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      Project: {
        Row: {
          brandProfile: Json | null
          budget: Database["public"]["Enums"]["BudgetRange"] | null
          businessType: Database["public"]["Enums"]["BusinessType"]
          createdAt: string
          description: string | null
          facebookPage: string | null
          goals: string[] | null
          googleBusinessId: string | null
          id: string
          instagramHandle: string | null
          location: string | null
          marketResearch: Json | null
          monitoringInterval: number
          name: string
          nextMonitoringAt: string | null
          status: Database["public"]["Enums"]["ProjectStatus"]
          targetAudience: string | null
          tiktokHandle: string | null
          updatedAt: string
          userId: string
          websiteUrl: string | null
          youtubeChannel: string | null
        }
        Insert: {
          brandProfile?: Json | null
          budget?: Database["public"]["Enums"]["BudgetRange"] | null
          businessType: Database["public"]["Enums"]["BusinessType"]
          createdAt?: string
          description?: string | null
          facebookPage?: string | null
          goals?: string[] | null
          googleBusinessId?: string | null
          id: string
          instagramHandle?: string | null
          location?: string | null
          marketResearch?: Json | null
          monitoringInterval?: number
          name: string
          nextMonitoringAt?: string | null
          status?: Database["public"]["Enums"]["ProjectStatus"]
          targetAudience?: string | null
          tiktokHandle?: string | null
          updatedAt?: string
          userId: string
          websiteUrl?: string | null
          youtubeChannel?: string | null
        }
        Update: {
          brandProfile?: Json | null
          budget?: Database["public"]["Enums"]["BudgetRange"] | null
          businessType?: Database["public"]["Enums"]["BusinessType"]
          createdAt?: string
          description?: string | null
          facebookPage?: string | null
          goals?: string[] | null
          googleBusinessId?: string | null
          id?: string
          instagramHandle?: string | null
          location?: string | null
          marketResearch?: Json | null
          monitoringInterval?: number
          name?: string
          nextMonitoringAt?: string | null
          status?: Database["public"]["Enums"]["ProjectStatus"]
          targetAudience?: string | null
          tiktokHandle?: string | null
          updatedAt?: string
          userId?: string
          websiteUrl?: string | null
          youtubeChannel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Project_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          id: number
          ip_address: string | null
          scanned_at: string | null
          session_created: boolean | null
          session_id: string | null
          table_id: number | null
          user_agent: string | null
        }
        Insert: {
          id?: number
          ip_address?: string | null
          scanned_at?: string | null
          session_created?: boolean | null
          session_id?: string | null
          table_id?: number | null
          user_agent?: string | null
        }
        Update: {
          id?: number
          ip_address?: string | null
          scanned_at?: string | null
          session_created?: boolean | null
          session_id?: string | null
          table_id?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "qr_scans_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      reservation_settings: {
        Row: {
          day_before_reminder_enabled: boolean | null
          day_before_reminder_hours: number | null
          id: number
          rodizio_waste_fee_per_piece: number | null
          rodizio_waste_policy_enabled: boolean | null
          same_day_reminder_enabled: boolean | null
          same_day_reminder_hours: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          day_before_reminder_enabled?: boolean | null
          day_before_reminder_hours?: number | null
          id?: number
          rodizio_waste_fee_per_piece?: number | null
          rodizio_waste_policy_enabled?: boolean | null
          same_day_reminder_enabled?: boolean | null
          same_day_reminder_hours?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          day_before_reminder_enabled?: boolean | null
          day_before_reminder_hours?: number | null
          id?: number
          rodizio_waste_fee_per_piece?: number | null
          rodizio_waste_policy_enabled?: boolean | null
          same_day_reminder_enabled?: boolean | null
          same_day_reminder_hours?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "reservation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_email_delivered_at: string | null
          confirmation_email_id: string | null
          confirmation_email_opened_at: string | null
          confirmation_email_sent_at: string | null
          confirmation_email_status: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_email_delivered_at: string | null
          customer_email_id: string | null
          customer_email_opened_at: string | null
          customer_email_sent_at: string | null
          customer_email_status: string | null
          day_before_reminder_delivered_at: string | null
          day_before_reminder_id: string | null
          day_before_reminder_opened_at: string | null
          day_before_reminder_sent_at: string | null
          day_before_reminder_status: string | null
          email: string
          first_name: string
          id: string
          is_rodizio: boolean | null
          last_name: string
          location: string
          marketing_consent: boolean | null
          occasion: string | null
          party_size: number
          phone: string
          reservation_date: string
          reservation_time: string
          same_day_reminder_delivered_at: string | null
          same_day_reminder_id: string | null
          same_day_reminder_opened_at: string | null
          same_day_reminder_sent_at: string | null
          same_day_reminder_status: string | null
          seated_at: string | null
          session_id: string | null
          special_requests: string | null
          status: string | null
          table_id: number | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_delivered_at?: string | null
          confirmation_email_id?: string | null
          confirmation_email_opened_at?: string | null
          confirmation_email_sent_at?: string | null
          confirmation_email_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_email_delivered_at?: string | null
          customer_email_id?: string | null
          customer_email_opened_at?: string | null
          customer_email_sent_at?: string | null
          customer_email_status?: string | null
          day_before_reminder_delivered_at?: string | null
          day_before_reminder_id?: string | null
          day_before_reminder_opened_at?: string | null
          day_before_reminder_sent_at?: string | null
          day_before_reminder_status?: string | null
          email: string
          first_name: string
          id?: string
          is_rodizio?: boolean | null
          last_name: string
          location: string
          marketing_consent?: boolean | null
          occasion?: string | null
          party_size: number
          phone: string
          reservation_date: string
          reservation_time: string
          same_day_reminder_delivered_at?: string | null
          same_day_reminder_id?: string | null
          same_day_reminder_opened_at?: string | null
          same_day_reminder_sent_at?: string | null
          same_day_reminder_status?: string | null
          seated_at?: string | null
          session_id?: string | null
          special_requests?: string | null
          status?: string | null
          table_id?: number | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_delivered_at?: string | null
          confirmation_email_id?: string | null
          confirmation_email_opened_at?: string | null
          confirmation_email_sent_at?: string | null
          confirmation_email_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_email_delivered_at?: string | null
          customer_email_id?: string | null
          customer_email_opened_at?: string | null
          customer_email_sent_at?: string | null
          customer_email_status?: string | null
          day_before_reminder_delivered_at?: string | null
          day_before_reminder_id?: string | null
          day_before_reminder_opened_at?: string | null
          day_before_reminder_sent_at?: string | null
          day_before_reminder_status?: string | null
          email?: string
          first_name?: string
          id?: string
          is_rodizio?: boolean | null
          last_name?: string
          location?: string
          marketing_consent?: boolean | null
          occasion?: string | null
          party_size?: number
          phone?: string
          reservation_date?: string
          reservation_time?: string
          same_day_reminder_delivered_at?: string | null
          same_day_reminder_id?: string | null
          same_day_reminder_opened_at?: string | null
          same_day_reminder_sent_at?: string | null
          same_day_reminder_status?: string | null
          seated_at?: string | null
          session_id?: string | null
          special_requests?: string | null
          status?: string | null
          table_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      restaurant_closures: {
        Row: {
          closure_date: string
          created_at: string | null
          created_by: string | null
          id: number
          is_recurring: boolean | null
          location: string | null
          reason: string | null
          recurring_day_of_week: number | null
          updated_at: string | null
        }
        Insert: {
          closure_date: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_recurring?: boolean | null
          location?: string | null
          reason?: string | null
          recurring_day_of_week?: number | null
          updated_at?: string | null
        }
        Update: {
          closure_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_recurring?: boolean | null
          location?: string | null
          reason?: string | null
          recurring_day_of_week?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "restaurant_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          auto_reservations: boolean
          auto_table_assignment: boolean
          created_at: string | null
          default_people_per_table: number
          games_enabled: boolean
          games_min_rounds_for_prize: number
          games_mode: string | null
          games_prize_product_id: number | null
          games_prize_type: string | null
          games_prize_value: string | null
          games_questions_per_round: number
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          max_capacity: number
          name: string
          order_cooldown_minutes: number
          show_upgrade_after_order: boolean
          show_upgrade_at_bill: boolean
          slug: string
          updated_at: string | null
        }
        Insert: {
          address: string
          auto_reservations?: boolean
          auto_table_assignment?: boolean
          created_at?: string | null
          default_people_per_table?: number
          games_enabled?: boolean
          games_min_rounds_for_prize?: number
          games_mode?: string | null
          games_prize_product_id?: number | null
          games_prize_type?: string | null
          games_prize_value?: string | null
          games_questions_per_round?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          max_capacity: number
          name: string
          order_cooldown_minutes?: number
          show_upgrade_after_order?: boolean
          show_upgrade_at_bill?: boolean
          slug: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          auto_reservations?: boolean
          auto_table_assignment?: boolean
          created_at?: string | null
          default_people_per_table?: number
          games_enabled?: boolean
          games_min_rounds_for_prize?: number
          games_mode?: string | null
          games_prize_product_id?: number | null
          games_prize_type?: string | null
          games_prize_value?: string | null
          games_questions_per_round?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          name?: string
          order_cooldown_minutes?: number
          show_upgrade_after_order?: boolean
          show_upgrade_at_bill?: boolean
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_games_prize_product_id_fkey"
            columns: ["games_prize_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      session_customers: {
        Row: {
          birth_date: string | null
          created_at: string | null
          customer_id: string | null
          device_id: string | null
          display_name: string
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          is_session_host: boolean | null
          marketing_consent: boolean | null
          phone: string | null
          phone_verified: boolean
          preferred_contact: string | null
          session_id: string
          tier: number
          updated_at: string | null
          verification_expires_at: string | null
          verification_token: string | null
          verification_type: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          device_id?: string | null
          display_name: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_session_host?: boolean | null
          marketing_consent?: boolean | null
          phone?: string | null
          phone_verified?: boolean
          preferred_contact?: string | null
          session_id: string
          tier?: number
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_token?: string | null
          verification_type?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          device_id?: string | null
          display_name?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_session_host?: boolean | null
          marketing_consent?: boolean | null
          phone?: string | null
          phone_verified?: boolean
          preferred_contact?: string | null
          session_id?: string
          tier?: number
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_token?: string | null
          verification_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_customers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_customers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_customers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_customers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      session_participants: {
        Row: {
          created_at: string | null
          device_id: string
          id: number
          is_active: boolean | null
          last_seen: string | null
          name: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: number
          is_active?: boolean | null
          last_seen?: string | null
          name?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: number
          is_active?: boolean | null
          last_seen?: string | null
          name?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      sessions: {
        Row: {
          bill_requested_at: string | null
          closed_at: string | null
          first_order_at: string | null
          id: string
          is_rodizio: boolean | null
          last_order_at: string | null
          location: string | null
          notes: string | null
          num_people: number | null
          started_at: string | null
          status: string | null
          table_id: number | null
          time_ordering: number | null
          time_to_first_order: number | null
          total_amount: number | null
          total_duration: number | null
        }
        Insert: {
          bill_requested_at?: string | null
          closed_at?: string | null
          first_order_at?: string | null
          id?: string
          is_rodizio?: boolean | null
          last_order_at?: string | null
          location?: string | null
          notes?: string | null
          num_people?: number | null
          started_at?: string | null
          status?: string | null
          table_id?: number | null
          time_ordering?: number | null
          time_to_first_order?: number | null
          total_amount?: number | null
          total_duration?: number | null
        }
        Update: {
          bill_requested_at?: string | null
          closed_at?: string | null
          first_order_at?: string | null
          id?: string
          is_rodizio?: boolean | null
          last_order_at?: string | null
          location?: string | null
          notes?: string | null
          num_people?: number | null
          started_at?: string | null
          status?: string | null
          table_id?: number | null
          time_ordering?: number | null
          time_to_first_order?: number | null
          total_amount?: number | null
          total_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number
          id: string
          is_active: boolean | null
          known_ips: unknown[] | null
          last_login: string | null
          last_login_at: string | null
          last_login_ip: unknown
          location: string | null
          locked_until: string | null
          mfa_enrolled_at: string | null
          mfa_required: boolean
          name: string
          password_hash: string
          phone: string | null
          role_id: number
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          failed_login_attempts?: number
          id?: string
          is_active?: boolean | null
          known_ips?: unknown[] | null
          last_login?: string | null
          last_login_at?: string | null
          last_login_ip?: unknown
          location?: string | null
          locked_until?: string | null
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          name: string
          password_hash: string
          phone?: string | null
          role_id: number
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          failed_login_attempts?: number
          id?: string
          is_active?: boolean | null
          known_ips?: unknown[] | null
          last_login?: string | null
          last_login_at?: string | null
          last_login_ip?: unknown
          location?: string | null
          locked_until?: string | null
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          name?: string
          password_hash?: string
          phone?: string | null
          role_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string
          id: number
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date: string
          id?: number
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: number
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "staff_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      Strategy: {
        Row: {
          actionItems: Json
          budgetAllocation: Json | null
          contentPillars: Json
          executiveSummary: string
          fullDocument: string
          generatedAt: string
          growthTargets: Json
          id: string
          isActive: boolean
          platformStrategies: Json
          projectId: string
          version: number
        }
        Insert: {
          actionItems: Json
          budgetAllocation?: Json | null
          contentPillars: Json
          executiveSummary: string
          fullDocument: string
          generatedAt?: string
          growthTargets: Json
          id: string
          isActive?: boolean
          platformStrategies: Json
          projectId: string
          version?: number
        }
        Update: {
          actionItems?: Json
          budgetAllocation?: Json | null
          contentPillars?: Json
          executiveSummary?: string
          fullDocument?: string
          generatedAt?: string
          growthTargets?: Json
          id?: string
          isActive?: boolean
          platformStrategies?: Json
          projectId?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "Strategy_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      table_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: number
          new_status: string | null
          old_status: string | null
          reason: string | null
          reservation_id: string | null
          session_id: string | null
          table_id: number
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: number
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
          reservation_id?: string | null
          session_id?: string | null
          table_id: number
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: number
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
          reservation_id?: string | null
          session_id?: string | null
          table_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "table_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "table_status_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_status_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_status_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_status_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string | null
          current_reservation_id: string | null
          current_session_id: string | null
          id: number
          is_active: boolean | null
          last_scan_at: string | null
          location: string | null
          name: string | null
          number: number
          qr_code_generated_at: string | null
          qr_code_scans: number | null
          qr_code_token: string | null
          status: string | null
          status_note: string | null
        }
        Insert: {
          created_at?: string | null
          current_reservation_id?: string | null
          current_session_id?: string | null
          id?: number
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number: number
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
          status?: string | null
          status_note?: string | null
        }
        Update: {
          created_at?: string | null
          current_reservation_id?: string | null
          current_session_id?: string | null
          id?: number
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number?: number
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
          status?: string | null
          status_note?: string | null
        }
        Relationships: []
      }
      User: {
        Row: {
          avatarUrl: string | null
          createdAt: string
          email: string
          id: string
          name: string | null
          passwordHash: string | null
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          createdAt?: string
          email: string
          id: string
          name?: string | null
          passwordHash?: string | null
          updatedAt?: string
        }
        Update: {
          avatarUrl?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string | null
          passwordHash?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          contact_value: string
          created_at: string | null
          customer_id: string | null
          expires_at: string
          id: string
          ip_address: unknown
          session_customer_id: string | null
          status: string
          token: string
          updated_at: string | null
          user_agent: string | null
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          contact_value: string
          created_at?: string | null
          customer_id?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          session_customer_id?: string | null
          status?: string
          token: string
          updated_at?: string | null
          user_agent?: string | null
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          contact_value?: string
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          session_customer_id?: string | null
          status?: string
          token?: string
          updated_at?: string | null
          user_agent?: string | null
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "verification_logs_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_calls: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          call_type: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          location: string
          message: string | null
          order_id: number | null
          session_customer_id: string | null
          session_id: string | null
          status: string | null
          table_id: number
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          call_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location: string
          message?: string | null
          order_id?: number | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          table_id: number
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          call_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location?: string
          message?: string | null
          order_id?: number | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          table_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      waiter_tables: {
        Row: {
          assigned_at: string | null
          id: number
          staff_id: string | null
          table_id: number | null
        }
        Insert: {
          assigned_at?: string | null
          id?: number
          staff_id?: string | null
          table_id?: number | null
        }
        Update: {
          assigned_at?: string | null
          id?: number
          staff_id?: string | null
          table_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "waiter_tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
    }
    Views: {
      active_sessions_full: {
        Row: {
          closed_at: string | null
          id: string | null
          is_rodizio: boolean | null
          notes: string | null
          num_people: number | null
          started_at: string | null
          status: string | null
          table_id: number | null
          table_location: string | null
          table_number: number | null
          total_amount: number | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      orders_with_customer: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: number | null
          notes: string | null
          product_id: number | null
          product_name: string | null
          product_price: number | null
          quantity: number | null
          session_customer_id: string | null
          session_id: string | null
          status: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_session_customer_id_fkey"
            columns: ["session_customer_id"]
            isOneToOne: false
            referencedRelation: "session_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
        ]
      }
      reservations_with_details: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_email_delivered_at: string | null
          confirmation_email_id: string | null
          confirmation_email_opened_at: string | null
          confirmation_email_sent_at: string | null
          confirmation_email_status: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_email_delivered_at: string | null
          customer_email_id: string | null
          customer_email_opened_at: string | null
          customer_email_sent_at: string | null
          customer_email_status: string | null
          day_before_reminder_delivered_at: string | null
          day_before_reminder_id: string | null
          day_before_reminder_opened_at: string | null
          day_before_reminder_sent_at: string | null
          day_before_reminder_status: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_rodizio: boolean | null
          last_name: string | null
          location: string | null
          marketing_consent: boolean | null
          occasion: string | null
          party_size: number | null
          phone: string | null
          reservation_date: string | null
          reservation_time: string | null
          same_day_reminder_delivered_at: string | null
          same_day_reminder_id: string | null
          same_day_reminder_opened_at: string | null
          same_day_reminder_sent_at: string | null
          same_day_reminder_status: string | null
          seated_at: string | null
          session_id: string | null
          special_requests: string | null
          status: string | null
          table_id: number | null
          table_name: string | null
          table_number: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "reservations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      session_metrics_summary: {
        Row: {
          avg_carta_duration: number | null
          avg_duration: number | null
          avg_rodizio_duration: number | null
          avg_ticket: number | null
          avg_time_to_first_order: number | null
          carta_count: number | null
          location: string | null
          rodizio_count: number | null
          total_covers: number | null
          total_revenue: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      session_with_customers: {
        Row: {
          bill_requested_at: string | null
          closed_at: string | null
          customer_count: number | null
          customers: Json | null
          first_order_at: string | null
          id: string | null
          is_rodizio: boolean | null
          last_order_at: string | null
          location: string | null
          notes: string | null
          num_people: number | null
          started_at: string | null
          status: string | null
          table_id: number | null
          table_location: string | null
          table_name: string | null
          table_number: number | null
          time_ordering: number | null
          time_to_first_order: number | null
          total_amount: number | null
          total_duration: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      staff_with_roles: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          failed_login_attempts: number | null
          id: string | null
          is_active: boolean | null
          known_ips: unknown[] | null
          last_login: string | null
          last_login_at: string | null
          last_login_ip: unknown
          location: string | null
          locked_until: string | null
          mfa_enrolled_at: string | null
          mfa_required: boolean | null
          name: string | null
          password_hash: string | null
          phone: string | null
          role_id: number | null
          role_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tables_full_status: {
        Row: {
          created_at: string | null
          current_reservation_id: string | null
          current_session_id: string | null
          id: number | null
          is_active: boolean | null
          is_rodizio: boolean | null
          last_scan_at: string | null
          location: string | null
          minutes_occupied: number | null
          name: string | null
          number: number | null
          qr_code_generated_at: string | null
          qr_code_scans: number | null
          qr_code_token: string | null
          session_id: string | null
          session_people: number | null
          session_started: string | null
          session_total: number | null
          status: string | null
          status_label: string | null
          status_note: string | null
        }
        Relationships: []
      }
      tables_with_waiter: {
        Row: {
          created_at: string | null
          current_reservation_id: string | null
          current_session_id: string | null
          id: number | null
          is_active: boolean | null
          last_scan_at: string | null
          location: string | null
          name: string | null
          number: number | null
          qr_code_generated_at: string | null
          qr_code_scans: number | null
          qr_code_token: string | null
          status: string | null
          status_note: string | null
        }
        Insert: {
          created_at?: string | null
          current_reservation_id?: string | null
          current_session_id?: string | null
          id?: number | null
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number?: number | null
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
          status?: string | null
          status_note?: string | null
        }
        Update: {
          created_at?: string | null
          current_reservation_id?: string | null
          current_session_id?: string | null
          id?: number | null
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number?: number | null
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
          status?: string | null
          status_note?: string | null
        }
        Relationships: []
      }
      waiter_assignments: {
        Row: {
          assigned_at: string | null
          id: number | null
          staff_email: string | null
          staff_id: string | null
          staff_name: string | null
          table_id: number | null
          table_location: string | null
          table_name: string | null
          table_number: number | null
        }
        Relationships: []
      }
      waiter_calls_with_details: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledged_by_name: string | null
          assigned_waiter_id: string | null
          assigned_waiter_name: string | null
          call_type: string | null
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          id: string | null
          location: string | null
          message: string | null
          order_id: number | null
          session_customer_id: string | null
          session_id: string | null
          status: string | null
          table_id: number | null
          table_name: string | null
          table_number: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_calls_with_details"
            referencedColumns: ["assigned_waiter_id"]
          },
          {
            foreignKeyName: "waiter_calls_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "waiter_with_tables"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "waiter_calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_with_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_full_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "waiter_assignments"
            referencedColumns: ["table_id"]
          },
        ]
      }
      waiter_with_tables: {
        Row: {
          email: string | null
          staff_id: string | null
          staff_location: string | null
          staff_name: string | null
          table_ids: number[] | null
          table_locations: string[] | null
          table_numbers: number[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_location: {
        Args: { target_location: string }
        Returns: boolean
      }
      can_staff_access_table: {
        Args: { p_staff_id: string; p_table_id: number }
        Returns: boolean
      }
      can_staff_edit_order: {
        Args: { p_order_id: number; p_staff_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_block_minutes?: number
          p_identifier: string
          p_identifier_type?: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          attempts_remaining: number
          blocked_until: string
          current_attempts: number
        }[]
      }
      check_table_availability: {
        Args: {
          p_date: string
          p_duration_minutes?: number
          p_location: string
          p_party_size: number
          p_time: string
        }
        Returns: {
          is_available: boolean
          table_id: number
          table_name: string
          table_number: number
        }[]
      }
      cleanup_auth_data: { Args: never; Returns: undefined }
      current_user_has_role: {
        Args: { allowed_roles: string[] }
        Returns: boolean
      }
      generate_verification_token: { Args: never; Returns: string }
      get_accessible_tables: {
        Args: { p_staff_id: string }
        Returns: {
          table_id: number
          table_location: string
          table_number: number
        }[]
      }
      get_available_slots: {
        Args: { p_date: string; p_location: string; p_party_size: number }
        Returns: {
          slot_time: string
          tables_available: number
        }[]
      }
      get_closure_reason: {
        Args: { check_date: string; check_location: string }
        Returns: string
      }
      get_current_staff: {
        Args: never
        Returns: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number
          id: string
          is_active: boolean | null
          known_ips: unknown[] | null
          last_login: string | null
          last_login_at: string | null
          last_login_ip: unknown
          location: string | null
          locked_until: string | null
          mfa_enrolled_at: string | null
          mfa_required: boolean
          name: string
          password_hash: string
          phone: string | null
          role_id: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "staff"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_current_staff_id: { Args: never; Returns: string }
      get_current_staff_location: { Args: never; Returns: string }
      get_current_staff_role: { Args: never; Returns: string }
      get_session_config: {
        Args: { p_role_name: string }
        Returns: {
          inactivity_timeout_minutes: number
          max_concurrent_sessions: number
          require_mfa: boolean
          role_name: string
          session_timeout_minutes: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "auth_session_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_session_metrics: {
        Args: {
          p_end_date?: string
          p_location?: string
          p_start_date?: string
        }
        Returns: {
          metric_name: string
          metric_value: string
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_staff: { Args: never; Returns: boolean }
      is_date_closed: {
        Args: { check_date: string; check_location: string }
        Returns: boolean
      }
      is_mfa_required_for_current_user: { Args: never; Returns: boolean }
      log_auth_event: {
        Args: {
          p_auth_user_id?: string
          p_email?: string
          p_error_message?: string
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_staff_id?: string
          p_success?: boolean
          p_user_agent?: string
        }
        Returns: string
      }
      regenerate_qr_token: { Args: { p_table_id: number }; Returns: string }
      register_qr_scan: {
        Args: { p_ip_address?: string; p_token: string; p_user_agent?: string }
        Returns: Json
      }
      reset_rate_limit: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: undefined
      }
      update_staff_login_info: {
        Args: { p_ip_address: unknown; p_staff_id: string; p_success?: boolean }
        Returns: boolean
      }
      waiter_can_access_table:
        | {
            Args: { table_id_param: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.waiter_can_access_table(table_id_param => int4), public.waiter_can_access_table(table_id_param => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { table_id_param: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.waiter_can_access_table(table_id_param => int4), public.waiter_can_access_table(table_id_param => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      ApiProvider:
        | "INSTAGRAM"
        | "FACEBOOK"
        | "YOUTUBE"
        | "TIKTOK"
        | "GOOGLE_BUSINESS"
        | "SERPAPI"
        | "BRAVE_SEARCH"
      BudgetRange: "MINIMAL" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE"
      BusinessType:
        | "RESTAURANT"
        | "MUSICIAN"
        | "FREELANCER"
        | "STORE"
        | "ECOMMERCE"
        | "SAAS"
        | "AGENCY"
        | "PERSONAL_BRAND"
        | "NONPROFIT"
        | "OTHER"
      CalendarStatus:
        | "SCHEDULED"
        | "PUBLISHED"
        | "MISSED"
        | "RESCHEDULED"
        | "CANCELLED"
      ContentStatus:
        | "DRAFT"
        | "REVIEW"
        | "APPROVED"
        | "SCHEDULED"
        | "PUBLISHED"
        | "ARCHIVED"
      ContentType:
        | "POST"
        | "CAROUSEL"
        | "REEL"
        | "STORY"
        | "VIDEO"
        | "SHORT"
        | "ARTICLE"
        | "GOOGLE_POST"
      DiscoveryMethod: "USER_PROVIDED" | "AI_DISCOVERED"
      PipelineStage:
        | "BRAND_ANALYSIS"
        | "MARKET_RESEARCH"
        | "COMPETITOR_DISCOVERY"
        | "COMPETITOR_ANALYSIS"
        | "PLATFORM_AUDIT"
        | "STRATEGY_GENERATION"
        | "CONTENT_GENERATION"
        | "CALENDAR_PLANNING"
        | "MONITORING"
      Platform:
        | "INSTAGRAM"
        | "YOUTUBE"
        | "FACEBOOK"
        | "TIKTOK"
        | "GOOGLE_BUSINESS"
        | "WEBSITE"
      ProjectStatus:
        | "CREATED"
        | "ANALYZING"
        | "AUDIT_COMPLETE"
        | "STRATEGY_READY"
        | "CONTENT_GENERATED"
        | "ACTIVE"
        | "PAUSED"
        | "ARCHIVED"
      RunStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
      RunTrigger:
        | "USER_INITIATED"
        | "CRON_MONITORING"
        | "STRATEGY_REFRESH"
        | "CONTENT_REGENERATION"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ApiProvider: [
        "INSTAGRAM",
        "FACEBOOK",
        "YOUTUBE",
        "TIKTOK",
        "GOOGLE_BUSINESS",
        "SERPAPI",
        "BRAVE_SEARCH",
      ],
      BudgetRange: ["MINIMAL", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"],
      BusinessType: [
        "RESTAURANT",
        "MUSICIAN",
        "FREELANCER",
        "STORE",
        "ECOMMERCE",
        "SAAS",
        "AGENCY",
        "PERSONAL_BRAND",
        "NONPROFIT",
        "OTHER",
      ],
      CalendarStatus: [
        "SCHEDULED",
        "PUBLISHED",
        "MISSED",
        "RESCHEDULED",
        "CANCELLED",
      ],
      ContentStatus: [
        "DRAFT",
        "REVIEW",
        "APPROVED",
        "SCHEDULED",
        "PUBLISHED",
        "ARCHIVED",
      ],
      ContentType: [
        "POST",
        "CAROUSEL",
        "REEL",
        "STORY",
        "VIDEO",
        "SHORT",
        "ARTICLE",
        "GOOGLE_POST",
      ],
      DiscoveryMethod: ["USER_PROVIDED", "AI_DISCOVERED"],
      PipelineStage: [
        "BRAND_ANALYSIS",
        "MARKET_RESEARCH",
        "COMPETITOR_DISCOVERY",
        "COMPETITOR_ANALYSIS",
        "PLATFORM_AUDIT",
        "STRATEGY_GENERATION",
        "CONTENT_GENERATION",
        "CALENDAR_PLANNING",
        "MONITORING",
      ],
      Platform: [
        "INSTAGRAM",
        "YOUTUBE",
        "FACEBOOK",
        "TIKTOK",
        "GOOGLE_BUSINESS",
        "WEBSITE",
      ],
      ProjectStatus: [
        "CREATED",
        "ANALYZING",
        "AUDIT_COMPLETE",
        "STRATEGY_READY",
        "CONTENT_GENERATED",
        "ACTIVE",
        "PAUSED",
        "ARCHIVED",
      ],
      RunStatus: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
      RunTrigger: [
        "USER_INITIATED",
        "CRON_MONITORING",
        "STRATEGY_REFRESH",
        "CONTENT_REGENERATION",
      ],
    },
  },
} as const
