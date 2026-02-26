import { supabase } from "@/lib/supabase";
import { shopsService } from './catalog.service';

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

export interface FinancialShopPerformance {
  shop_id: string;
  shop_name: string;
  is_premium: boolean;
  total_orders: number;
  gross_revenue: number;
  commission_owed: number;
  commission_paid: number;
  subscription_owed: number;
  subscription_paid: number;
  premium_owed: number;
  premium_paid: number;
  total_outstanding: number;
  last_payment_date: string | null;
  financial_status: 'GOOD' | 'LATE' | 'CRITICAL';
}

export interface FinancialDriverPerformance {
  driver_id: string;
  driver_name: string;
  driver_phone: string | null;
  total_deliveries: number;
  gross_earnings: number;
  platform_fee_owed: number;
  customer_fee_owed: number;
  platform_fee_paid: number;
  total_outstanding: number;
  last_settlement_date: string | null;
}

export interface FinancialPlatformRollup {
  shop_commissions: { owed: number; paid: number; outstanding: number };
  premium_subscriptions: { owed: number; paid: number; outstanding: number };
  regular_subscriptions: { owed: number; paid: number; outstanding: number };
  driver_fees: { owed: number; paid: number; outstanding: number };
  customer_fees: { owed: number };
  platform_total: { total_receivable_outstanding: number; total_collected: number; net_profit: number };
}

export interface DriverPersonalFinancials {
  deliveries_fee_owed: number;
  customer_cash_owed: number;
  total_owed: number;
  total_paid: number;
  net_outstanding: number;
}

export interface DetailedFinancialReport {
  summary: {
    shop_name: string;
    total_revenue: number;
    total_commission_owed: number;
    total_subscription_owed: number;
    total_paid: number;
    net_debt: number;
    period_start: string;
    period_end: string;
  };
  orders: Array<{
    order_number: string;
    created_at: string;
    status: string;
    total: number;
    commission_rate: number;
    commission_fee: number;
    net_revenue: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paid_at: string;
    notes: string;
  }>;
  subscriptions: Array<{
    type: string;
    amount: number;
    billing_month: string;
    status: string;
    paid_at: string;
  }>;
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
  },

  async getFinancialDashboardShops(startDate?: string, endDate?: string, limit: number = 50, offset: number = 0): Promise<FinancialShopPerformance[]> {
    const params: Record<string, any> = { p_limit: limit, p_offset: offset };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await (supabase.rpc as any)('get_financial_dashboard_shops', params);

    if (error) throw error;
    return data as unknown as FinancialShopPerformance[];
  },

  async getFinancialDashboardDrivers(startDate?: string, endDate?: string, limit: number = 50, offset: number = 0): Promise<FinancialDriverPerformance[]> {
    const params: Record<string, any> = { p_limit: limit, p_offset: offset };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await (supabase.rpc as any)('get_financial_dashboard_drivers', params);

    if (error) throw error;
    return data as unknown as FinancialDriverPerformance[];
  },

  async getFinancialDashboardPlatform(startDate?: string, endDate?: string): Promise<FinancialPlatformRollup> {
    const params: Record<string, any> = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await (supabase.rpc as any)('get_financial_dashboard_platform', params);

    if (error) throw error;
    return data as unknown as FinancialPlatformRollup;
  },

  async getMyDriverFinancials(): Promise<DriverPersonalFinancials> {
    const { data, error } = await (supabase.rpc as any)('get_my_driver_financials');
    if (error) throw error;
    return data as unknown as DriverPersonalFinancials;
  },

  async getShopDetailedFinancialReport(shopId: string, startDate?: string, endDate?: string): Promise<DetailedFinancialReport> {
    const params: Record<string, any> = { p_shop_id: shopId };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await (supabase.rpc as any)('get_shop_detailed_financial_report', params);
    if (error) throw error;
    return data as unknown as DetailedFinancialReport;
  },

  // --- LEDGER & SETTINGS ENTRY METHODS ---

  async updateShopFinancialSettings(shopId: string, settings: { commission_percentage?: number, subscription_fee?: number, financial_start_date?: string, billing_cycle_start_date?: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if exists
    const { data: existing } = await supabase.from('shop_financial_settings' as any).select('shop_id').eq('shop_id', shopId).maybeSingle();
    
    if (existing) {
       const { error } = await supabase.from('shop_financial_settings' as any)
         .update({ ...settings, updated_at: new Date().toISOString(), updated_by: user?.id })
         .eq('shop_id', shopId);
       if (error) throw error;
    } else {
       const { error } = await supabase.from('shop_financial_settings' as any)
         .insert([{ shop_id: shopId, ...settings, updated_by: user?.id }]);
       if (error) throw error;
    }
  },

  async getShopFinancialSettings(shopId: string): Promise<any> {
    const { data, error } = await supabase.from('shop_financial_settings' as any).select('*').eq('shop_id', shopId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateDriverFinancialSettings(driverId: string, settings: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if exists
    const { data: existing } = await supabase.from('driver_financial_settings' as any).select('driver_id').eq('driver_id', driverId).maybeSingle();
    
    if (existing) {
       const { error } = await supabase.from('driver_financial_settings' as any)
         .update({ ...settings, updated_at: new Date().toISOString() })
         .eq('driver_id', driverId);
       if (error) throw error;
    } else {
       const { error } = await supabase.from('driver_financial_settings' as any)
         .insert({ driver_id: driverId, ...settings });
       if (error) throw error;
    }
  },

  async getDriverFinancialSettings(driverId: string): Promise<any> {
    const { data, error } = await supabase.from('driver_financial_settings' as any).select('*').eq('driver_id', driverId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async insertCommissionPayment(shopId: string, amount: number, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { error } = await supabase.from('commission_payments' as any).insert([{
      shop_id: shopId, amount, notes, created_by_admin: user.id
    }]);
    if (error) throw error;
  },

  async insertSubscriptionCharge(shopId: string, amount: number, billingMonth: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { error } = await supabase.from('subscription_payments' as any).insert([{
      shop_id: shopId,
      amount,
      billing_month: billingMonth, // e.g. "2026-02"
      status: 'UNPAID',
      notes: notes || `رسوم اشتراك شهري - ${billingMonth}`,
      created_by_admin: user.id,
    }]);
    if (error) throw error;
  },

  async insertPremiumSubscription(shopId: string, amount: number, startDate: string, endDate: string, paymentDate?: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    
    // 1. Insert into ledger
    const { error: insertError } = await supabase.from('premium_subscription_payments' as any).insert([{
      shop_id: shopId, amount, start_date: startDate, end_date: endDate, payment_date: paymentDate || null, notes, created_by_admin: user.id
    }]);
    if (insertError) throw insertError;
    
    // 2. Flip shop premium flag safely
    await shopsService.update(shopId, { 
        is_premium: true,
        is_premium_active: true,
        premium_expires_at: endDate,
        premium_sort_order: 99
      } as any);
  },

  async insertDriverPayment(driverId: string, amount: number, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { error } = await supabase.from('driver_payments' as any).insert([{
      driver_id: driverId, amount, notes, created_by_admin: user.id
    }]);
    if (error) throw error;
  }
};
