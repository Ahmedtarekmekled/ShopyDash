import { supabase } from "@/lib/supabase";
import type {
  Category,
  Product,
  Shop,
  ProductWithShop,
  Region,
  District,
  Address,
  WorkingHours,
} from "@/types/database";
import { getShopOpenState } from "@/lib/shop-helpers";

// Extended Address type with district info
export type AddressWithDistrict = Address & {
  district?: District & { region?: Region };
};

// Categories
export const categoriesService = {
  async getAll(options?: {
    type?: 'SHOP' | 'PRODUCT';
    parentId?: string | null;
  }): Promise<Category[]> {
    let query = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        query = query.is("parent_id", null);
      } else {
        query = query.eq("parent_id", options.parentId);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) return null;
    return data;
  },

  async create(
    category: Omit<Category, "id" | "created_at" | "updated_at">
  ): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
  },
};

// Products
export const productsService = {
  async getAll(options?: {
    categoryId?: string;
    shopId?: string;
    regionId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
  }): Promise<ProductWithShop[]> {
    let query = supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, region_id, is_active, status, override_mode),
        category:categories(id, name, slug)
      `
      )
      .eq("is_active", true);

    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    if (options?.shopId) {
      query = query.eq("shop_id", options.shopId);
    }

    if (options?.regionId) {
      query = query.eq("shop.region_id", options.regionId);
    }

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    if (options?.featured) {
      query = query.eq("is_featured", true);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data as unknown as ProductWithShop[]) || [];
  },

  async getById(id: string): Promise<ProductWithShop | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone, address, override_mode, is_open, is_active, status),
        category:categories(id, name, slug)
      `
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data as unknown as ProductWithShop;
  },

  async getBySlug(
    slug: string,
    shopId: string
  ): Promise<ProductWithShop | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone, address, override_mode, is_open, is_active, status),
        category:categories(id, name, slug)
      `
      )
      .eq("slug", slug)
      .eq("shop_id", shopId)
      .single();

    if (error) return null;
    return data as unknown as ProductWithShop;
  },

  async create(
    product: Omit<Product, "id" | "created_at" | "updated_at">
  ): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;
  },
};

// Shops
export const shopsService = {
  async getHours(shopId: string): Promise<WorkingHours[]> {
    const { data, error } = await supabase
      .from("shop_working_hours")
      .select("*")
      .eq("shop_id", shopId)
      .order("day_of_week", { ascending: true })
      .order("period_index", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateHours(shopId: string, hours: Partial<WorkingHours>[]): Promise<void> {
    const { error } = await supabase
      .from("shop_working_hours")
      .upsert(
        hours.map(h => ({
           shop_id: shopId,
           day_of_week: h.day_of_week,
           period_index: h.period_index || 1, // Default to 1 if missing
           is_enabled: h.is_enabled !== undefined ? h.is_enabled : true,
           start_time: h.start_time,
           end_time: h.end_time,
           crosses_midnight: h.crosses_midnight || false
        } as any)),
        { onConflict: 'shop_id, day_of_week, period_index' }
      );

    if (error) throw error;
  },

  async updateOverride(shopId: string, mode: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED'): Promise<void> {
    const { error } = await supabase
      .from("shops")
      .update({ override_mode: mode })
      .eq("id", shopId);
      
    if (error) throw error;
  },

  async getAll(options?: {
    regionId?: string;
    status?: string;
    search?: string;
    categoryId?: string;
    approvedOnly?: boolean;
    limit?: number;
  }): Promise<Shop[]> {
    let query = supabase.from("shops").select("*, category:categories(id, name, slug, icon), owner:profiles!owner_id(full_name, email, phone)");

    if (options?.regionId) {
      query = query.eq("region_id", options.regionId);
    }

    // Filter by approval status (default to APPROVED for customer-facing)
    if (options?.approvedOnly !== false) {
      query = query.eq("approval_status", "APPROVED");
    } else if (options?.status) {
      query = query.eq("status", options.status as any);
    }

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    // NEW: Filter by category
    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // NEW: Sort by premium first, then rating
    query = query
      .order("is_premium", { ascending: false })
      .order("premium_sort_order", { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getRankedShops(options?: {
    regionId?: string;
    limit?: number;
    categoryId?: string;
    premiumOnly?: boolean;
  }): Promise<Shop[]> {
    // 1. Fetch all approved & active shops
    let query = supabase
      .from("shops")
      .select("*, category:categories(id, name, slug, icon), working_hours:shop_working_hours(*)")
      .eq("approval_status", "APPROVED")
      .eq("is_active", true);

    if (options?.premiumOnly) {
      query = query.eq("is_premium_active", true);
    }

    if (options?.regionId) {
      query = query.eq("region_id", options.regionId);
    }

    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    // Fetch shops
    const { data: shops, error: shopsError } = await query;
    if (shopsError) throw shopsError;
    if (!shops?.length) return [];


    // 2. Fetch 30-day sales stats (Try RPC, fallback to 0)
    let salesMap = new Map<string, number>();
    try {
      const { data: stats, error: statsError } = await (supabase.rpc as any)(
        "get_shop_30d_sales",
        {}
      );
      if (!statsError && stats) {
        stats.forEach((s: any) => salesMap.set(s.shop_id, Number(s.sales_count)));
      }
    } catch (e) {
      console.warn("Failed to fetch shop stats, falling back to 0 sales", e);
    }

    // 3. Separate Logic
    // Compute Real-Time Open Status
    const now = new Date();
    const candidates = shops.map((s) => {
      const openState = getShopOpenState(s as any, s.working_hours || [], now);
      return {
        ...s,
        _sales_score: salesMap.get(s.id) || 0,
        _is_open_realtime: openState.isOpen,
      };
    });

    // Strategy:
    // 1. Filter OPEN shops
    // 2. Filter CLOSED shops
    // 3. Sort OPEN shops: Premium first, then Sales
    // 4. Sort CLOSED shops: Sales
    // 5. Concatenate: Open + Closed

    const openShops = candidates.filter((s) => s._is_open_realtime);
    const closedShops = candidates.filter((s) => !s._is_open_realtime);

    // Sort OPEN: Premium (order 1, 2, ...), then Sales Descending
    openShops.sort((a, b) => {
      // 1. Premium Priority
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;

      // 2. Premium Sort Order (if both premium)
      if (a.is_premium && b.is_premium) {
        return (a.premium_sort_order || 99) - (b.premium_sort_order || 99);
      }

      // 3. Sales Score (if both not premium, or equal premium rank?)
      // Actually if both are premium, we used sort order. 
      // If both are NOT premium, we use Sales Score.
      return b._sales_score - a._sales_score;
    });

    // Sort CLOSED: Sales Descending
    closedShops.sort((a, b) => b._sales_score - a._sales_score);

    // Combine
    const finalOrder = [...openShops, ...closedShops];

    // Filter limit if requested
    if (options?.limit) {
      return finalOrder.slice(0, options.limit);
    }

    return finalOrder;
  },

  async getById(id: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async getBySlug(slug: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data;
  },

  async getByOwnerId(ownerId: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    if (error) return null;
    return data;
  },

  async create(
    shop: Omit<
      Shop,
      "id" | "created_at" | "updated_at" | "rating" | "total_orders"
    >
  ): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops")
      .insert(shop)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Shop>): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Shop["status"]): Promise<Shop> {
    return this.update(id, { status });
  },

  async toggleActive(id: string, updates: { 
    is_active: boolean; 
    disabled_reason?: string | null;
    disabled_at?: string | null;
    disabled_by?: string | null;
  }): Promise<Shop> {
    return this.update(id, updates);
  },

  async getAnalytics(shopId: string, startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    revenue: number;
    orders_count: number;
  }>> {
    const { data, error } = await (supabase.rpc as any)('get_shop_analytics', {
      p_shop_id: shopId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    });

    if (error) throw error;
    return (data as Array<{
      date: string;
      revenue: number;
      orders_count: number;
    }>) || [];
  },
};

// Regions
export const regionsService = {
  async getAll(): Promise<Region[]> {
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Region | null> {
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async getDistricts(regionId: string): Promise<District[]> {
    const { data, error } = await supabase
      .from("districts")
      .select("*")
      .eq("region_id", regionId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllDistricts(): Promise<(District & { region: Region })[]> {
    const { data, error } = await supabase
      .from("districts")
      .select("*, region:regions(*)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as unknown as (District & { region: Region })[]) || [];
  },

  async create(region: Omit<Region, "id" | "created_at" | "updated_at">): Promise<Region> {
    const { data, error } = await supabase.from("regions").insert(region).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Region>): Promise<Region> {
    const { data, error } = await supabase.from("regions").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) throw error;
  },
};

// Addresses Service - Saved customer addresses
export const addressesService = {
  async getByUser(userId: string): Promise<AddressWithDistrict[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as AddressWithDistrict[]) || [];
  },

  async getById(id: string): Promise<AddressWithDistrict | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data as unknown as AddressWithDistrict;
  },

  async getDefault(userId: string): Promise<AddressWithDistrict | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error) return null;
    return data as unknown as AddressWithDistrict;
  },

  async create(address: {
    user_id: string;
    label: string;
    address: string;
    district_id?: string | null;
    phone?: string | null;
    is_default?: boolean;
  }): Promise<Address> {
    // If this is set as default, unset other defaults first
    if (address.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", address.user_id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert(address)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    userId: string,
    updates: Partial<Omit<Address, "id" | "user_id" | "created_at">>
  ): Promise<Address> {
    // If setting as default, unset others first
    if (updates.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async setDefault(id: string, userId: string): Promise<void> {
    // Unset all defaults
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);

    // Set new default
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },
};
