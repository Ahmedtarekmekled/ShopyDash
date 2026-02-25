// =====================================================
// DATABASE TYPES - MATCHES SUPABASE SCHEMA
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "CUSTOMER" | "SHOP_OWNER" | "ADMIN" | "DELIVERY";
export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERED"
  | "CANCELLED"
  | "CANCELLED_BY_SHOP"
  | "CANCELLED_BY_ADMIN";
export type ShopStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          telegram_chat_id?: string | null; // Optional because legacy users might not have it
          telegram_enabled?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          telegram_chat_id?: string | null;
          telegram_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          telegram_chat_id?: string | null;
          telegram_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      regions: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          boundary_coordinates: any | null; // using any for jsonb for now, or {lat:number, lng:number}[]
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          boundary_coordinates?: any | null;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          is_active?: boolean;
          updated_at?: string;
          boundary_coordinates?: any | null;
        };
        Relationships: [];
      };
      region_limits: {
        Row: {
          id: string;
          region_id: string;
          max_stores_allowed: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          region_id: string;
          max_stores_allowed?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          region_id?: string;
          max_stores_allowed?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "region_limits_region_id_fkey";
            columns: ["region_id"];
            referencedRelation: "regions";
            referencedColumns: ["id"];
          }
        ];
      };
      districts: {
        Row: {
          id: string;
          region_id: string;
          name: string;
          name_en: string | null;
          slug: string;
          delivery_fee: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          region_id: string;
          name: string;
          name_en?: string | null;
          slug: string;
          delivery_fee?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          region_id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          delivery_fee?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          image_url: string | null;
          icon: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          type: 'SHOP' | 'PRODUCT';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_working_hours: {
        Row: {
          id: string;
          shop_id: string;
          day_of_week: number;
          period_index: number;
          is_enabled: boolean;
          start_time: string | null;
          end_time: string | null;
          crosses_midnight: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          day_of_week: number;
          period_index?: number;
          is_enabled?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          crosses_midnight?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          day_of_week?: number;
          period_index?: number;
          is_enabled?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          crosses_midnight?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_working_hours_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          }
        ];
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          region_id: string;
          district_id: string | null;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string;
          whatsapp: string | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          status: ShopStatus;
          is_open: boolean;
          is_active: boolean;
          disabled_reason: string | null;
          disabled_at: string | null;
          disabled_by: string | null;
          total_orders: number;
          opening_time: string | null;
          closing_time: string | null;
          delivery_fee: number;
          min_order_amount: number;
          category_id: string | null;
          approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          is_premium: boolean;
          premium_sort_order: number;
          override_mode: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          region_id: string;
          district_id?: string | null;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone: string;
          whatsapp?: string | null;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          status?: ShopStatus;
          is_open?: boolean;
          is_active?: boolean;
          disabled_reason?: string | null;
          disabled_at?: string | null;
          disabled_by?: string | null;
          total_orders?: number;
          opening_time?: string | null;
          closing_time?: string | null;
          delivery_fee?: number;
          min_order_amount?: number;
          category_id?: string | null;
          approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          is_premium?: boolean;
          premium_sort_order?: number;
          override_mode?: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          region_id?: string;
          district_id?: string | null;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string;
          whatsapp?: string | null;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          status?: ShopStatus;
          is_open?: boolean;
          is_active?: boolean;
          disabled_reason?: string | null;
          disabled_at?: string | null;
          disabled_by?: string | null;
          total_orders?: number;
          opening_time?: string | null;
          closing_time?: string | null;
          delivery_fee?: number;
          min_order_amount?: number;
          category_id?: string | null;
          approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          is_premium?: boolean;
          premium_sort_order?: number;
          override_mode?: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          sku: string | null;
          barcode: string | null;
          stock_quantity: number;
          low_stock_threshold: number | null;
          track_inventory: boolean;
          image_url: string | null;
          images: string[];
          unit: string;
          weight: number | null;
          is_featured: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id: string;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          low_stock_threshold?: number | null;
          track_inventory?: boolean;
          image_url?: string | null;
          images?: string[];
          unit?: string;
          weight?: number | null;
          is_featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category_id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          low_stock_threshold?: number | null;
          track_inventory?: boolean;
          image_url?: string | null;
          images?: string[];
          unit?: string;
          weight?: number | null;
          is_featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          shop_id: string;
          status: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_notes: string | null;
          platform_fee: number;
          payment_method: string;
          payment_status: string;
          estimated_delivery: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          delivery_user_id: string | null;
          parent_order_id: string | null;
          is_critical: boolean;
          pickup_sequence_index: number | null;
          cancelled_by: string | null; // UUID
          refund_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id: string;
          shop_id: string;
          status?: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount?: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_notes?: string | null;
          platform_fee?: number;
          payment_method?: string;
          payment_status?: string;
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          delivery_user_id?: string | null;
          parent_order_id?: string | null;
          is_critical?: boolean;
          pickup_sequence_index?: number | null;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          shop_id?: string;
          status?: OrderStatus;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          total?: number;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_notes?: string | null;
          platform_fee?: number;
          payment_method?: string;
          payment_status?: string;
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          delivery_user_id?: string | null;
          parent_order_id?: string | null;
          is_critical?: boolean;
          pickup_sequence_index?: number | null;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: OrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address: string;
          district_id: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          address: string;
          district_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address?: string;
          district_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      parent_orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          status: string;
          subtotal: number;
          total_delivery_fee: number;
          discount: number;
          total: number;
          route_km: number | null;
          route_minutes: number | null;
          pickup_sequence: Json | null;
          delivery_fee_breakdown: Json | null;
          delivery_settings_snapshot: Json | null;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_latitude: number | null;
          delivery_longitude: number | null;
          delivery_notes: string | null;
          platform_fee: number;
          payment_method: string;
          payment_status: string;
          delivery_user_id: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id: string;
          status?: string;
          subtotal: number;
          total_delivery_fee: number;
          discount?: number;
          total: number;
          route_km?: number | null;
          route_minutes?: number | null;
          pickup_sequence?: Json | null;
          delivery_fee_breakdown?: Json | null;
          delivery_settings_snapshot?: Json | null;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_latitude?: number | null;
          delivery_longitude?: number | null;
          delivery_notes?: string | null;
          platform_fee?: number;
          payment_method?: string;
          payment_status?: string;
          delivery_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          status?: string;
          subtotal?: number;
          total_delivery_fee?: number;
          discount?: number;
          total?: number;
          route_km?: number | null;
          route_minutes?: number | null;
          pickup_sequence?: Json | null;
          delivery_fee_breakdown?: Json | null;
          delivery_settings_snapshot?: Json | null;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_latitude?: number | null;
          delivery_longitude?: number | null;
          delivery_notes?: string | null;
          platform_fee?: number;
          payment_method?: string;
          payment_status?: string;
          delivery_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_settings: {
        Row: {
          id: boolean;
          base_fee: number;
          km_rate: number;
          pickup_stop_fee: number;
          min_fee: number;
          max_fee: number;
          platform_fee_fixed: number;
          platform_fee_percent: number;
          rounding_rule: string;
          fallback_mode: string;
          fixed_fallback_fee: number;
          routing_algorithm: string;
          return_to_customer: boolean;
          mapbox_profile: string;
          max_shops_per_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          base_fee?: number;
          km_rate?: number;
          pickup_stop_fee?: number;
          min_fee?: number;
          max_fee?: number;
          rounding_rule?: string;
          fallback_mode?: string;
          fixed_fallback_fee?: number;
          routing_algorithm?: string;
          return_to_customer?: boolean;
          mapbox_profile?: string;
          max_shops_per_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          base_fee?: number;
          km_rate?: number;
          pickup_stop_fee?: number;
          min_fee?: number;
          max_fee?: number;
          rounding_rule?: string;
          fallback_mode?: string;
          fixed_fallback_fee?: number;
          routing_algorithm?: string;
          return_to_customer?: boolean;
          mapbox_profile?: string;
          max_shops_per_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          type: string;
          message: string;
          order_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          type: string;
          message: string;
          order_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          type?: string;
          message?: string;
          order_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };

    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_shop_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_shop: {
        Args: { shop_id: string };
        Returns: boolean;
      };
      get_user_shop_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      assign_driver_to_parent: {
        Args: { p_parent_order_id: string; p_driver_id: string };
        Returns: { success: boolean; message: string };
      };
      update_shop_order_status: {
        Args: { p_order_id: string; p_status: string };
        Returns: void;
      };
      update_driver_order_status: {
        Args: { p_parent_id: string; p_status: string; p_driver_id: string };
        Returns: { success: boolean; message: string };
      };
      get_admin_global_metrics: {
        Args: { p_start_date?: string | null; p_end_date?: string | null };
        Returns: any;
      };
      get_shop_performance_metrics: {
        Args: { p_start_date?: string | null; p_end_date?: string | null; p_limit?: number; p_offset?: number };
        Returns: any[];
      };
      get_driver_performance_metrics: {
        Args: { p_start_date?: string | null; p_end_date?: string | null; p_limit?: number; p_offset?: number };
        Returns: any[];
      };
      get_platform_growth_chart: {
        Args: { p_start_date?: string | null; p_end_date?: string | null };
        Returns: any[];
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      shop_status: ShopStatus;
    };
  };
}

// =====================================================
// CONVENIENCE TYPES
// =====================================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Entity types
export type Profile = Tables<"profiles">;
export type Region = Tables<"regions">;
export type District = Tables<"districts">;
export type Category = Tables<"categories">;
export type Shop = Tables<"shops">;
export type Product = Tables<"products">;
export type Cart = Tables<"carts">;
export type CartItem = Tables<"cart_items">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistory = Tables<"order_status_history">;
export type Address = Tables<"addresses">;

export type ParentOrder = Tables<"parent_orders">;

// =====================================================
// EXTENDED TYPES WITH RELATIONS
// =====================================================

export type ProductWithShop = Product & {
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url" | "phone" | "address" | "override_mode" | "is_open">;
  category: Pick<Category, "id" | "name" | "slug">;
};

export type CartItemWithProduct = CartItem & {
  product: Product & {
    shop?: Pick<Shop, "id" | "name" | "slug" | "logo_url"> | null;
  };
};

export type CartWithItems = Cart & {
  items: CartItemWithProduct[];
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url" | "delivery_fee"> | null;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url" | "phone">;
  status_history: OrderStatusHistory[];
  parent_order?: Pick<ParentOrder, "id" | "order_number" | "total" | "platform_fee" | "total_delivery_fee"> | null;
};

export type ParentOrderWithSuborders = ParentOrder & {
  suborders: OrderWithItems[];
};

export type ShopWithProducts = Shop & {
  products: Product[];
  region: Region;
};

export type CategoryWithSubcategories = Category & {
  subcategories: Category[];
};

export type DistrictWithRegion = District & {
  region: Region;
};



// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export type WorkingHours = Database["public"]["Tables"]["shop_working_hours"]["Row"];
