export type RoundingRule = 'nearest_int' | 'nearest_0_5' | 'ceil_int';
export type FallbackMode = 'block_checkout' | 'fixed_fee';
export type RoutingAlgorithm = 'nearest_neighbor';
export type MapboxProfile = 'driving' | 'driving-traffic';

export interface DeliverySettings {
  id: boolean;
  
  // Pricing (distance-based)
  base_fee: number;
  km_rate: number;
  pickup_stop_fee: number;
  min_fee: number;
  max_fee: number;
  platform_fee_fixed: number;
  platform_fee_percent: number;
  rounding_rule: RoundingRule;
  
  // Fallback
  fallback_mode: FallbackMode;
  fixed_fallback_fee: number;
  
  // Routing
  routing_algorithm: RoutingAlgorithm;
  return_to_customer: boolean;
  mapbox_profile: MapboxProfile;
  max_shops_per_order: number;
  
  updated_at: string;
  updated_by: string | null;
  is_platform_paused: boolean;
  max_active_orders: number;
}

export interface DeliveryFeeBreakdown {
  base_fee: number;
  km_component: number;
  stops_component: number;
  subtotal_fee: number;
  final_fee: number;
  total_km: number;
  total_minutes: number;
  shops_count: number;
  settings_used: DeliverySettings;
}

export type ParentOrderStatus =
  | 'PLACED'
  | 'PROCESSING'
  | 'PARTIALLY_READY'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_CANCELLED'
  | 'CANCELLED';

export interface ParentOrder {
  id: string;
  order_number: string;
  user_id: string;
  
  status: ParentOrderStatus;
  
  subtotal: number;
  total_delivery_fee: number;
  platform_fee: number;
  discount: number;
  total: number;
  
  route_km: number | null;
  route_minutes: number | null;
  pickup_sequence: number[] | null;
  delivery_fee_breakdown: DeliveryFeeBreakdown | null;
  delivery_settings_snapshot: DeliverySettings | null;
  
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_notes: string | null;
  
  payment_method: string;
  payment_status: string;
  delivery_user_id: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ParentOrderWithSubOrders extends ParentOrder {
  suborders: any[]; // Will be typed as OrderWithItems[]
}
