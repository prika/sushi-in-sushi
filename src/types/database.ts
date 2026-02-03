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

// Generic helper type for table rows
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

// Helper types for easier usage
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

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
