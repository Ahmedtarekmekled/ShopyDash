import { supabase } from "@/lib/supabase";
import type {
  CartItem,
  CartWithItems,
  CartItemWithProduct,
  Order,
  OrderWithItems,
  OrderStatus,
  OrderStatusHistory,
} from "@/types/database";
import { deliverySettingsService } from "./delivery-settings.service";
import type { CheckoutCalculation } from "./multi-store-checkout.service";

// Cart Service
export const cartService = {
  async getCart(userId: string): Promise<CartWithItems | null> {
    try {
      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .select(
          `
          *,
          shop:shops(id, name, slug, logo_url),
          items:cart_items(
            *,
            product:products(
              *,
              shop:shops(id, name, slug, logo_url)
            )
          )
        `
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (cartError) {
        console.warn("Cart fetch error:", cartError.message);
        return null;
      }
      return cart as unknown as CartWithItems;
    } catch (error) {
      console.warn("Cart service error:", error);
      return null;
    }
  },

  async addItem(
    userId: string,
    shopId: string,
    productId: string,
    quantity: number
  ): Promise<CartItem> {
    // 1. Check Shop Open State first (Safeguard)
    const { data: shop } = await supabase
      .from("shops")
      .select("override_mode")
      .eq("id", shopId)
      .single();

    if (shop) {
       const { data: hours } = await supabase
         .from("shop_working_hours")
         .select("*")
         .eq("shop_id", shopId);
       
       // Using simpler logic here or importing the helper if it's safe to use in service
       // Ideally services shouldn't depend on UI/Lib helpers if they are large, but getShopOpenState is pure logic.
       // However, to keep service clean, we might just checking manual override or implement simple check.
       // Let's strict it:
       // If we can import getShopOpenState, that's best.
       // Since it's in @/lib/shop-helpers, it should be fine.
       const { getShopOpenState } = await import("@/lib/shop-helpers");
       const status = getShopOpenState(shop as any, hours || []);
       
       if (!status.isOpen) {
          throw new Error("المتجر مغلق حالياً");
       }
    }

    // Get or create multi-shop cart
    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cart) {
      // Create new multi-shop cart (shop_id = null)
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: userId, shop_id: null })
        .select("id")
        .single();

      if (createError) throw createError;
      cart = newCart;
    }

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .maybeSingle();

    // Validate Stock Limit
    const { data: productCheck } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();

    const availableStock = productCheck?.stock_quantity || 0;
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentQuantity + quantity > availableStock) {
      throw new Error(`عذراً، الكمية المطلوبة غير متوفرة. المتاح: ${availableStock}`);
    }

    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Add new item
    const { data, error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    // Prevent temporary IDs from hitting the database
    if (itemId.startsWith("temp-")) {
      throw new Error("ITEM_SYNCING");
    }

    if (quantity <= 0) {
      await this.removeItem(itemId);
      throw new Error("Item removed");
    }

    // Validate Stock Limit
    const { data: cartItem } = await supabase
      .from("cart_items")
      .select("product_id")
      .eq("id", itemId)
      .single();

    if (cartItem) {
      const { data: productCheck } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", cartItem.product_id)
        .single();
        
      const availableStock = productCheck?.stock_quantity || 0;
      if (quantity > availableStock) {
        throw new Error(`عذراً، الكمية المطلوبة غير متوفرة. المتاح: ${availableStock}`);
      }
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .select()
      .single();


    if (error) throw error;
    return data;
  },

  async removeItem(itemId: string): Promise<void> {
    // Prevent temporary IDs from hitting the database
    if (itemId.startsWith("temp-")) {
       return; // Silently ignore as it's not even in the DB yet
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
  },

  async clearCart(userId: string): Promise<void> {
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (cart) {
      await supabase.from("cart_items").delete().eq("cart_id", cart.id);
      await supabase.from("carts").delete().eq("id", cart.id);
    }
  },

  calculateTotal(items: CartItemWithProduct[]): {
    subtotal: number;
    itemCount: number;
  } {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (item.product?.price || 0) * item.quantity,
        itemCount: acc.itemCount + item.quantity,
      }),
      { subtotal: 0, itemCount: 0 }
    );
  },
  async getParentOrder(parentId: string): Promise<any> {
    const { data, error } = await supabase
      .from("parent_orders")
      .select(`
        *,
        suborders:orders(
          id,
          shop:shops(id, name, address, phone, latitude, longitude),
          items:order_items(product_name, quantity, total_price)
        )
      `)
      .eq("id", parentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

// Order Service
export const orderService = {
  async getParentOrder(orderId: string): Promise<any | null> {
    const { data: parentOrder, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !parentOrder) return null;

    // Fetch suborders
    const { data: suborders, error: subError } = await supabase
      .from("orders")
      .select(`
        *,
        shop:shops(id, name, slug, logo_url, phone, address, latitude, longitude),
        items:order_items(*),
        status_history:order_status_history(*)
      `)
      .eq("parent_order_id", orderId)
      .neq("status", "CANCELLED")
      .neq("status", "CANCELLED_BY_SHOP")
      .neq("status", "CANCELLED_BY_ADMIN")
      .order("created_at", { ascending: true });

    if (subError) throw subError;

    return {
      ...parentOrder,
      suborders: suborders || [],
    };
  },

  async create(orderData: {
    userId: string;
    shopId: string;
    customerName: string;
    items: Array<{
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
    }>;
    deliveryAddress: string;
    deliveryPhone: string;
    notes?: string;
    deliveryFee?: number;
  }): Promise<Order> {
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.productPrice * item.quantity,
      0
    );
    const deliveryFee = orderData.deliveryFee || 0;

    // Calculate Platform Fee
    const settings = await deliverySettingsService.getSettings();
    const platformFeeRaw = settings.platform_fee_fixed + (subtotal * settings.platform_fee_percent / 100);
    const platformFee = Math.round(platformFeeRaw * 100) / 100;

    const total = subtotal + deliveryFee + platformFee;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: orderData.userId,
        shop_id: orderData.shopId,
        status: "PLACED",
        subtotal,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        total,
        customer_name: orderData.customerName,
        customer_phone: orderData.deliveryPhone,
        delivery_address: orderData.deliveryAddress,
        delivery_notes: orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = orderData.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.productPrice,
      quantity: item.quantity,
      total_price: item.productPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Create initial status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "PLACED",
      created_by: orderData.userId,
    });

    // Clear cart
    await cartService.clearCart(orderData.userId);

    return order;
  },

  /**
   * Create multi-store order with authoritative Platform Fee calculation
   */
  async createMultiStoreOrder(
    calculation: CheckoutCalculation
  ): Promise<{ parent_order_id: string; order_number: string }> {
    const { parent_order_data, suborders_data } = calculation;

    // 1. Re-calculate Platform Fee Authoritatively
    const totalSubtotal = suborders_data.reduce((sum: number, sub: any) => sum + sub.subtotal, 0);
    
    const settings = await deliverySettingsService.getSettings();
    const platformFeeRaw = settings.platform_fee_fixed + (totalSubtotal * settings.platform_fee_percent / 100);
    const platformFee = Math.round(platformFeeRaw * 100) / 100;

    // 2. Re-calculate Total
    const deliveryFee = parent_order_data.total_delivery_fee;
    const total = totalSubtotal + deliveryFee + platformFee;

    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Append GPS to Address String
    const addressWithGPS = parent_order_data.delivery_latitude && parent_order_data.delivery_longitude 
        ? `${parent_order_data.delivery_address} \nموقع GPS: ${parent_order_data.delivery_latitude},${parent_order_data.delivery_longitude}`
        : parent_order_data.delivery_address;

    // Create parent order
    const { data: parentOrder, error: parentError } = await supabase
      .from('parent_orders')
      .insert({
        ...parent_order_data,
        delivery_address: addressWithGPS,
        order_number: orderNumber,
        status: 'PLACED',
        payment_method: 'COD',
        payment_status: 'PENDING',
        platform_fee: platformFee, // Authoritative value
        total: total, // Authoritative total
      })
      .select()
      .single();

    if (parentError) {
      console.error('Failed to create parent order:', parentError);
      throw new Error('فشل إنشاء الطلب');
    }

    // Create suborders
    for (const suborderData of suborders_data) {
      const subOrderNumber = `${orderNumber}-${suborderData.shop_id.slice(0, 4).toUpperCase()}`;
      
      const { data: suborder, error: suborderError } = await supabase
        .from('orders')
        .insert({
          parent_order_id: parentOrder.id,
          order_number: subOrderNumber,
          shop_id: suborderData.shop_id,
          user_id: parent_order_data.user_id,
          status: 'PLACED',
          subtotal: suborderData.subtotal,
          delivery_fee: 0,
          platform_fee: 0, // Fee is on parent
          total: suborderData.subtotal,
          customer_name: parent_order_data.customer_name,
          customer_phone: parent_order_data.customer_phone,
          delivery_address: parent_order_data.delivery_address,
          delivery_notes: parent_order_data.delivery_notes,
          payment_method: 'COD',
          payment_status: 'PENDING',
          pickup_sequence_index: suborderData.pickup_sequence_index,
        })
        .select()
        .single();

      if (suborderError) {
        console.error('Failed to create suborder:', suborderError);
        throw new Error('فشل إنشاء تفاصيل الطلب');
      }

      // Create order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(
          suborderData.items.map((item: any) => ({
            order_id: suborder.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }))
        );

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
        throw new Error('فشل إنشاء منتجات الطلب');
      }

      // Create status history
      await supabase.from('order_status_history').insert({
        order_id: suborder.id,
        status: 'PLACED',
        created_by: parent_order_data.user_id,
      });
    }

    return {
      parent_order_id: parentOrder.id,
      order_number: orderNumber,
    };
  },

  async getByUser(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ data: OrderWithItems[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      data: (data as unknown as OrderWithItems[]) || [],
      count: count || 0,
    };
  },

  async getByShop(
    shopId: string,
    status?: OrderStatus
  ): Promise<OrderWithItems[]> {
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("shop_id", shopId);

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data as unknown as OrderWithItems[]) || [];
  },

  async getShopOrdersEnhanced(shopId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*),
        delivery_user:profiles!delivery_user_id(id, full_name, phone, avatar_url),
        parent_order:parent_orders!parent_order_id(
            id, 
            status, 
            delivery_user_id, 
            delivery_latitude,
            delivery_longitude,
            delivery_user:profiles!delivery_user_id(id, full_name, phone, avatar_url)
        )
      `
      )
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(orderId: string): Promise<OrderWithItems | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*),
        parent_order:parent_orders(id, order_number, total, platform_fee, total_delivery_fee)
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) return null;
    return data as unknown as OrderWithItems;
  },

  async getByDeliveryUser(userId: string): Promise<any[]> {
    // Return Parent Orders assigned to this user
    const { data: parentOrders, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("delivery_user_id", userId)
      .neq("status", "DELIVERED")
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!parentOrders) return [];

    // Fetch suborders for each parent
    const ordersWithDetails = await Promise.all(
      parentOrders.map(async (pOrder) => {
         return await this.getParentOrder(pOrder.id);
      })
    );

    return ordersWithDetails.filter(Boolean);
  },

  async getDeliveryHistory(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("delivery_user_id", userId)
      .in("status", ["DELIVERED", "CANCELLED"])
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDeliveryStats(userId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: orders, error } = await supabase
      .from("parent_orders")
      .select("total_delivery_fee, status, created_at")
      .eq("delivery_user_id", userId)
      .eq("status", "DELIVERED")
      .gte("updated_at", firstDayOfMonth);

    if (error) throw error;

    const totalEarning = orders?.reduce((sum, o) => sum + (o.total_delivery_fee || 0), 0) || 0;
    const count = orders?.length || 0;

    return {
      monthly_earnings: totalEarning,
      monthly_count: count
    };
  },



  async assignDriver(orderId: string, driverId: string): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_user_id: driverId })
      .eq("id", orderId);

    if (error) throw error;
  },

  async assignDriverToParent(parentOrderId: string, driverId: string): Promise<void> {
    const { data, error } = await supabase.rpc('assign_driver_to_parent', {
      p_parent_order_id: parentOrderId,
      p_driver_id: driverId
    });

    if (error) throw error;
    if (!data.success) {
      throw new Error(data.message || 'فشل قبول الطلب');
    }
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    userId: string,
    notes?: string
  ): Promise<Order> {
    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
      READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
      CANCELLED_BY_SHOP: [],
      CANCELLED_BY_ADMIN: [],
    };


    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!currentOrder) throw new Error("الطلب غير موجود");

    const allowedStatuses =
      validTransitions[currentOrder.status as OrderStatus];
    if (!allowedStatuses.includes(status)) {
      throw new Error("لا يمكن تغيير حالة الطلب إلى هذه الحالة");
    }

    // Update order status ATOMICALLY via RPC to sync Parent Status
    const { error: orderError } = await supabase
      .rpc('update_shop_order_status', { 
        p_order_id: orderId, 
        p_status: status 
      });

    if (orderError) throw orderError;

    // Fetch updated order to return
    const { data: order } = await supabase
      .from("orders")
      .select()
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    // Add to status history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status,
      notes,
      created_by: userId,
    });

    return order as Order;
  },

  async cancelOrder(
    orderId: string,
    reason: string,
    actor: 'SHOP' | 'ADMIN' = 'SHOP'
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error("سبب الإلغاء مطلوب");
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("يجب تسجيل الدخول لإلغاء الطلب");

    const status = actor === 'SHOP' ? 'CANCELLED_BY_SHOP' : 'CANCELLED_BY_ADMIN';

    // Cast 'cancel_shop_order' to any to avoid TS error if types aren't fully updated yet
    const { data, error } = await supabase.rpc('cancel_shop_order' as any, {
      p_order_id: orderId,
      p_reason: reason,
      p_actor_id: user.id, // Pass UUID
      p_status: status
    });

    if (error) throw error;
    
    // RPC returns JSONB, check success field
    const result = data as any;
    if (result && !result.success) {
      throw new Error(result.message || 'فشل إلغاء الطلب');
    }
  },

  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    const { data, error } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateParentStatus(
    parentId: string,
    status: OrderStatus,
    userId: string
  ): Promise<void> {
    // We use a backend RPC to bypass strict RLS on the orders table.
    // This allows assigned drivers to safely push 'OUT_FOR_DELIVERY' to all relevant sub-orders.
    const { data, error } = await supabase.rpc('update_driver_order_status', {
        p_parent_id: parentId,
        p_status: status,
        p_driver_id: userId
    });

    if (error) throw error;
    
    // Fallback error-handling from custom script payload
    const result = data as any;
    if (result && !result.success) {
      throw new Error(result.message || 'فشل تحديث حالة الطلب');
    }
  },
};

// Order Status helpers
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  PLACED: {
    label: "تم استلام الطلب",
    color: "info",
    icon: "ClipboardList",
  },
  CONFIRMED: {
    label: "تم تأكيد الطلب",
    color: "primary",
    icon: "CheckCircle",
  },
  PREPARING: {
    label: "جاري التجهيز",
    color: "warning",
    icon: "Package",
  },
  READY_FOR_PICKUP: {
    label: "جاهز للاستلام",
    color: "success",
    icon: "ShoppingBag",
  },
  OUT_FOR_DELIVERY: {
    label: "جاري التوصيل",
    color: "secondary",
    icon: "Truck",
  },
  DELIVERED: {
    label: "تم التوصيل",
    color: "success",
    icon: "CheckCheck",
  },
  CANCELLED: {
    label: "ملغى",
    color: "destructive",
    icon: "XCircle",
  },
  CANCELLED_BY_SHOP: {
    label: "ملغى من المتجر",
    color: "destructive",
    icon: "Store",
  },
  CANCELLED_BY_ADMIN: {
    label: "ملغى من الإدارة",
    color: "destructive",
    icon: "ShieldAlert",
  },
};
