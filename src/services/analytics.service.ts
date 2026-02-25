import { supabase } from "@/lib/supabase";

export interface GlobalMetrics {
  total_revenue: number;
  total_commission: number;
  active_shops: number;
  pending_shops: number;
  active_drivers: number;
  online_drivers: number;
  avg_order_value: number;
}

export interface ShopPerformance {
  shop_id: string;
  shop_name: string;
  shop_logo: string | null;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  revenue: number;
  commission_paid: number;
  acceptance_rate: number;
}

export interface DriverPerformance {
  driver_id: string;
  driver_name: string;
  driver_phone: string | null;
  total_deliveries: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  earnings: number;
  acceptance_rate: number;
}

export interface PlatformGrowth {
  day_date: string;
  total_orders: number;
  total_revenue: number;
}

export const analyticsService = {
  async getGlobalMetrics(startDate?: string, endDate?: string): Promise<GlobalMetrics> {
    const params: Record<string, any> = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;
    
    const { data, error } = await supabase.rpc('get_admin_global_metrics', params);

    if (error) throw error;
    return data as unknown as GlobalMetrics;
  },

  async getShopPerformance(startDate?: string, endDate?: string, limit: number = 50, offset: number = 0): Promise<ShopPerformance[]> {
    const params: Record<string, any> = { p_limit: limit, p_offset: offset };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc('get_shop_performance_metrics', params);

    if (error) throw error;
    return data as unknown as ShopPerformance[];
  },

  async getDriverPerformance(startDate?: string, endDate?: string, limit: number = 50, offset: number = 0): Promise<DriverPerformance[]> {
    const params: Record<string, any> = { p_limit: limit, p_offset: offset };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc('get_driver_performance_metrics', params);

    if (error) throw error;
    return data as unknown as DriverPerformance[];
  },

  async getPlatformGrowth(startDate?: string, endDate?: string): Promise<PlatformGrowth[]> {
    const params: Record<string, any> = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc('get_platform_growth_chart', params);

    if (error) throw error;
    return data as unknown as PlatformGrowth[];
  }
};
