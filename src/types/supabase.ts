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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
          id: string
          is_active: boolean | null
          marketing_consent: boolean | null
          name: string
          phone: string | null
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
          id?: string
          is_active?: boolean | null
          marketing_consent?: boolean | null
          name: string
          phone?: string | null
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
          id?: string
          is_active?: boolean | null
          marketing_consent?: boolean | null
          name?: string
          phone?: string | null
          points?: number | null
          preferred_location?: string | null
          total_spent?: number | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "email_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "todays_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: number
          notes: string | null
          product_id: number | null
          quantity: number | null
          session_customer_id: string | null
          session_id: string | null
          status: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          quantity?: number | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          notes?: string | null
          product_id?: number | null
          quantity?: number | null
          session_customer_id?: string | null
          session_id?: string | null
          status?: string | null
          unit_price?: number
          updated_at?: string | null
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
        ]
      }
      products: {
        Row: {
          category_id: number | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
          display_name: string
          email: string | null
          full_name: string | null
          id: string
          is_session_host: boolean | null
          marketing_consent: boolean | null
          phone: string | null
          preferred_contact: string | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_session_host?: boolean | null
          marketing_consent?: boolean | null
          phone?: string | null
          preferred_contact?: string | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_session_host?: boolean | null
          marketing_consent?: boolean | null
          phone?: string | null
          preferred_contact?: string | null
          session_id?: string
          updated_at?: string | null
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
        ]
      }
      sessions: {
        Row: {
          closed_at: string | null
          id: string
          is_rodizio: boolean | null
          notes: string | null
          num_people: number | null
          started_at: string | null
          status: string | null
          table_id: number | null
          total_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          id?: string
          is_rodizio?: boolean | null
          notes?: string | null
          num_people?: number | null
          started_at?: string | null
          status?: string | null
          table_id?: number | null
          total_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          id?: string
          is_rodizio?: boolean | null
          notes?: string | null
          num_people?: number | null
          started_at?: string | null
          status?: string | null
          table_id?: number | null
          total_amount?: number | null
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
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          location: string | null
          name: string
          password_hash: string
          phone: string | null
          role_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
          name: string
          password_hash: string
          phone?: string | null
          role_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
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
      tables: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          last_scan_at: string | null
          location: string | null
          name: string | null
          number: number
          qr_code_generated_at: string | null
          qr_code_scans: number | null
          qr_code_token: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number: number
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          last_scan_at?: string | null
          location?: string | null
          name?: string | null
          number?: number
          qr_code_generated_at?: string | null
          qr_code_scans?: number | null
          qr_code_token?: string | null
        }
        Relationships: []
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
          confirmed_by_name: string | null
          created_at: string | null
          customer_email_delivered_at: string | null
          customer_email_id: string | null
          customer_email_opened_at: string | null
          customer_email_sent_at: string | null
          customer_email_status: string | null
          customer_name: string | null
          email: string | null
          email_status_label: string | null
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
          seated_at: string | null
          session_id: string | null
          special_requests: string | null
          status: string | null
          status_label: string | null
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
      session_with_customers: {
        Row: {
          closed_at: string | null
          customer_count: number | null
          customers: Json | null
          id: string | null
          is_rodizio: boolean | null
          notes: string | null
          num_people: number | null
          started_at: string | null
          status: string | null
          table_id: number | null
          table_location: string | null
          table_name: string | null
          table_number: number | null
          total_amount: number | null
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
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          last_login: string | null
          location: string | null
          name: string | null
          password_hash: string | null
          phone: string | null
          role_description: string | null
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
      tables_with_waiter: {
        Row: {
          created_at: string | null
          id: number | null
          is_active: boolean | null
          last_scan_at: string | null
          location: string | null
          name: string | null
          number: number | null
          qr_code_generated_at: string | null
          qr_code_scans: number | null
          qr_code_token: string | null
          waiter_assigned_at: string | null
          waiter_email: string | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Relationships: []
      }
      todays_reservations: {
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
          confirmed_by_name: string | null
          created_at: string | null
          customer_email_delivered_at: string | null
          customer_email_id: string | null
          customer_email_opened_at: string | null
          customer_email_sent_at: string | null
          customer_email_status: string | null
          customer_name: string | null
          email: string | null
          email_status_label: string | null
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
          seated_at: string | null
          session_id: string | null
          special_requests: string | null
          status: string | null
          status_label: string | null
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
          call_type: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          location: string | null
          message: string | null
          order_id: number | null
          order_status: string | null
          product_id: number | null
          product_name: string | null
          session_id: string | null
          status: string | null
          table_id: number | null
          table_name: string | null
          table_number: number | null
          updated_at: string | null
          waiter_id: string | null
          waiter_name: string | null
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
            referencedRelation: "tables_with_waiter"
            referencedColumns: ["waiter_id"]
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
            referencedColumns: ["waiter_id"]
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
      can_staff_access_table: {
        Args: { p_staff_id: string; p_table_id: number }
        Returns: boolean
      }
      can_staff_edit_order: {
        Args: { p_order_id: number; p_staff_id: string }
        Returns: boolean
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
      is_date_closed: {
        Args: { check_date: string; check_location: string }
        Returns: boolean
      }
      regenerate_qr_token: { Args: { p_table_id: number }; Returns: string }
      register_qr_scan: {
        Args: { p_ip_address?: string; p_token: string; p_user_agent?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
