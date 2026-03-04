import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  Calendar,
  Package,
  Clock,
  User,
  MapPin,
  Truck,
  Phone,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  X,
  Store,
} from "lucide-react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import { shopsService } from "@/services/catalog.service";
import { formatPrice, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ─── Helpers ─────────────────────────────────────────────────────────────
function getDateLabel(date: Date): string {
  if (isToday(date)) return "اليوم";
  if (isYesterday(date)) return "أمس";
  return format(date, "EEEE d MMMM yyyy", { locale: ar });
}

// Completed/cancelled statuses are "history"
const HISTORY_STATUSES = ["DELIVERED", "CANCELLED", "CANCELLED_BY_SHOP", "CANCELLED_BY_ADMIN"];

// ─── Inline order row ────────────────────────────────────────────────────
function OrderRow({ order, isExpanded, onToggle }: { order: any; isExpanded: boolean; onToggle: () => void }) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PLACED;
  const isCancelled = order.status?.startsWith("CANCELLED");

  return (
    <div className="border rounded-xl overflow-hidden bg-background transition-shadow hover:shadow-sm">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 sm:p-4 text-right"
      >
        {/* Status indicator dot */}
        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", isCancelled ? "bg-red-500" : "bg-green-500")} />

        {/* Order# + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">#{order.order_number?.split("-")[1] || order.order_number}</span>
            <Badge variant={isCancelled ? "destructive" : "default"} className="text-[10px] px-1.5 py-0">
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {order.customer_name || "عميل زائر"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {format(new Date(order.created_at), "h:mm a", { locale: ar })}
            </span>
          </div>
        </div>

        {/* Total */}
        <span className={cn("font-bold text-sm flex-shrink-0", isCancelled ? "text-muted-foreground line-through" : "text-primary")}>
          {formatPrice(order.total)}
        </span>

        {/* Expand icon */}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20 text-sm">
          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{order.delivery_address}</span>
          </div>

          {/* Phone */}
          {(order.delivery_phone || order.customer_phone) && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${order.delivery_phone || order.customer_phone}`} className="text-primary hover:underline" dir="ltr">
                {order.delivery_phone || order.customer_phone}
              </a>
            </div>
          )}

          {/* Driver */}
          {(order.delivery_user || order.parent_order?.delivery_user) && (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>المندوب: {(order.delivery_user || order.parent_order?.delivery_user)?.full_name}</span>
            </div>
          )}

          {/* Items */}
          <Separator />
          <div className="space-y-1.5">
            <p className="font-semibold text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> المنتجات ({order.items?.length || 0})
            </p>
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  <span className="text-muted-foreground">{item.quantity}×</span> {item.product_name}
                </span>
                <span className="text-muted-foreground">{formatPrice(item.total_price)}</span>
              </div>
            ))}
          </div>

          {/* Totals row */}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>الإجمالي</span>
            <span className={isCancelled ? "line-through text-muted-foreground" : ""}>{formatPrice(order.total)}</span>
          </div>

          {/* Cancellation reason */}
          {isCancelled && order.cancellation_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">سبب الإلغاء:</p>
                <p>{order.cancellation_reason}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function ShopOrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userShop = await shopsService.getByOwnerId(user.id);
        setShop(userShop);
        if (userShop) {
          const shopOrders = await orderService.getShopOrdersEnhanced(userShop.id);
          setOrders(shopOrders);
        }
      } catch (error) {
        console.error("Failed to load order history:", error);
        toast({ title: "خطأ", description: "فشل تحميل السجل", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  // Filter to history statuses, search, and group by date
  const { grouped, totalCount, totalRevenue } = useMemo(() => {
    let result = orders.filter((o) => HISTORY_STATUSES.includes(o.status));

    // Status filter
    if (statusFilter === "DELIVERED") {
      result = result.filter((o) => o.status === "DELIVERED");
    } else if (statusFilter === "CANCELLED") {
      result = result.filter((o) => o.status?.startsWith("CANCELLED"));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.delivery_phone?.includes(q)
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Revenue from delivered only
    const totalRevenue = result.filter((o) => o.status === "DELIVERED").reduce((sum, o) => sum + (o.total || 0), 0);

    // Group by date
    const groups: { label: string; date: Date; orders: any[] }[] = [];
    const dateMap = new Map<string, any[]>();

    result.forEach((o) => {
      const key = startOfDay(new Date(o.created_at)).toISOString();
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key)!.push(o);
    });

    dateMap.forEach((orderList, key) => {
      const date = new Date(key);
      groups.push({ label: getDateLabel(date), date, orders: orderList });
    });

    groups.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { grouped: groups, totalCount: result.length, totalRevenue };
  }, [orders, searchQuery, statusFilter]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── No Shop ──
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Store className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-bold">لا يوجد متجر</h2>
        <Button asChild><Link to="/dashboard/settings">إنشاء متجر</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link to="/dashboard/orders"><ArrowRight className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">سجل الطلبات</h1>
            <p className="text-sm text-muted-foreground">{shop.name}</p>
          </div>
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatPrice(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">إيرادات المكتملة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {orders.filter((o) => o.status?.startsWith("CANCELLED")).length}
              </p>
              <p className="text-xs text-muted-foreground">طلبات ملغية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب، اسم العميل..."
            className="pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الطلبات</SelectItem>
            <SelectItem value="DELIVERED">مكتملة فقط</SelectItem>
            <SelectItem value="CANCELLED">ملغية فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders grouped by date */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">لا توجد طلبات مطابقة</h3>
          <p className="text-sm text-muted-foreground">حاول تغيير خيارات البحث أو التصفية</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date.toISOString()}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-3 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold">{group.label}</h2>
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {group.orders.length} طلب
                </Badge>
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground font-medium">
                  {formatPrice(group.orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + (o.total || 0), 0))}
                </span>
              </div>
              {/* Orders */}
              <div className="space-y-2">
                {group.orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isExpanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
