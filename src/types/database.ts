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
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          name: string;
          location?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: number;
          name?: string;
          location?: string;
          is_active?: boolean;
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
          is_available: boolean;
          is_rodizio: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category_id: string;
          image_url?: string | null;
          is_available?: boolean;
          is_rodizio?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          category_id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_rodizio?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
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
          }
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
          }
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
          }
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
          }
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
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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

// Enum types
export type SessionStatus = "active" | "pending_payment" | "paid" | "closed";
export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
export type TableStatus = "available" | "reserved" | "occupied" | "inactive";

// Generic helper type for table rows
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

// Helper types for easier usage
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

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

// Location type
export type Location = "circunvalacao" | "boavista";

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

export type CustomerInsert = Omit<Customer, "id" | "created_at" | "updated_at" | "points" | "total_spent" | "visit_count"> & {
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

export type TableStatusHistoryInsert = Omit<TableStatusHistory, "id" | "created_at"> & {
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

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type ReservationOccasion = "birthday" | "anniversary" | "business" | "other";

export type EmailStatus = "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";

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

export type RestaurantClosureUpdate = Partial<Omit<RestaurantClosure, "id" | "created_at" | "created_by">>;

// =============================================
// WAITER CALLS TYPES
// =============================================

export type WaiterCallType = "assistance" | "bill" | "order" | "other";
export type WaiterCallStatus = "pending" | "acknowledged" | "completed" | "cancelled";

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

export type WaiterCallInsert = {
  table_id: string;
  session_id?: string | null;
  call_type?: WaiterCallType;
  message?: string | null;
  location: Location;
};

export type WaiterCallUpdate = Partial<Omit<WaiterCall, "id" | "created_at" | "table_id" | "location">>;

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
  birth_date: string | null;
  marketing_consent: boolean;
  preferred_contact: PreferredContact;
  customer_id: string | null;
  is_session_host: boolean;
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
};

export type SessionCustomerUpdate = Partial<Omit<SessionCustomer, "id" | "session_id" | "created_at">>;

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

export type ReservationSettingsUpdate = Partial<Omit<ReservationSettings, "id" | "updated_at">>;
