import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  Package,
  Clock,
  User,
  MapPin,
  Truck,
  Phone,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  Store,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getDay,
  startOfDay,
} from "date-fns";
import { ar } from "date-fns/locale";

import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import { shopsService } from "@/services/catalog.service";
import { formatPrice, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ─── Constants ───────────────────────────────────────────────────────────
const HISTORY_STATUSES = ["DELIVERED", "CANCELLED", "CANCELLED_BY_SHOP", "CANCELLED_BY_ADMIN"];
const ORDERS_PER_PAGE = 10;
const WEEKDAYS = ["سب", "أح", "إث", "ثل", "أر", "خم", "جم"];

// ─── Date key helper (timezone-safe) ─────────────────────────────────────
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

// ─── Inline Calendar ─────────────────────────────────────────────────────
function InlineCalendar({
  selectedDate,
  onSelect,
  orderDates,
  latestOrderDate,
}: {
  selectedDate: Date | null;
  onSelect: (date: Date | null) => void;
  orderDates: Map<string, { total: number; count: number }>;
  latestOrderDate?: Date;
}) {
  const [viewMonth, setViewMonth] = useState(latestOrderDate || new Date());

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // JS getDay: 0=Sun ... 6=Sat → We want Sat=0, Sun=1 ... Fri=6
  const startDayOfWeek = (getDay(monthStart) + 1) % 7;

  // Compute max revenue in current month for intensity scaling
  const maxRevenue = useMemo(() => {
    let max = 0;
    daysInMonth.forEach((day) => {
      const key = dateKey(day);
      const data = orderDates.get(key);
      if (data && data.total > max) max = data.total;
    });
    return max;
  }, [daysInMonth, orderDates]);

  // Get intensity level (1-4) based on revenue relative to max
  const getIntensity = (revenue: number): number => {
    if (maxRevenue === 0 || revenue === 0) return 1;
    const ratio = revenue / maxRevenue;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  const intensityClasses: Record<number, string> = {
    1: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
    2: "bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300",
    3: "bg-green-300 dark:bg-green-800/60 text-green-900 dark:text-green-200 font-semibold",
    4: "bg-green-400 dark:bg-green-700/70 text-green-950 dark:text-green-100 font-bold",
  };

  return (
    <div className="bg-background border rounded-xl p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-bold">{format(viewMonth, "MMMM yyyy", { locale: ar })}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map((day) => {
          const key = dateKey(day);
          const data = orderDates.get(key);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasOrders = !!data;
          const today = isToday(day);
          const intensity = hasOrders ? getIntensity(data!.total) : 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (isSelected) onSelect(null);
                else onSelect(day);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center h-10 rounded-lg text-xs transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/30"
                  : today && hasOrders
                  ? cn(intensityClasses[intensity], "ring-1 ring-primary/50")
                  : today
                  ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                  : hasOrders
                  ? cn(intensityClasses[intensity], "hover:ring-1 hover:ring-green-400/50")
                  : "text-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <span>{format(day, "d")}</span>
              {hasOrders && !isSelected && (
                <span className="text-[8px] leading-none mt-0.5 opacity-70">
                  {data!.count}
                </span>
              )}
              {isSelected && hasOrders && (
                <span className="text-[8px] leading-none mt-0.5 text-primary-foreground/80">
                  {data!.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>أقل</span>
          <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-950/40" />
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50" />
          <div className="w-3 h-3 rounded bg-green-300 dark:bg-green-800/60" />
          <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-700/70" />
          <span>أكثر</span>
        </div>

        {selectedDate ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {format(selectedDate, "d MMM", { locale: ar })}
              {orderDates.get(dateKey(selectedDate)) && (
                <> • <span className="text-green-600 font-semibold">{formatPrice(orderDates.get(dateKey(selectedDate))!.total)}</span></>
              )}
            </span>
            <Button variant="ghost" size="sm" className="text-[10px] h-5 px-2 text-destructive" onClick={() => onSelect(null)}>
              عرض الكل
            </Button>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">اضغط على يوم لتصفية الطلبات</span>
        )}
      </div>
    </div>
  );
}

// ─── Order Row ───────────────────────────────────────────────────────────
function OrderRow({ order, isExpanded, onToggle }: { order: any; isExpanded: boolean; onToggle: () => void }) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PLACED;
  const isCancelled = order.status?.startsWith("CANCELLED");

  return (
    <div className="border rounded-xl overflow-hidden bg-background transition-shadow hover:shadow-sm">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 p-3 sm:p-4 text-right">
        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", isCancelled ? "bg-red-500" : "bg-green-500")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">#{order.order_number?.slice(-4) || order.order_number}</span>
            <Badge variant={isCancelled ? "destructive" : "default"} className="text-[10px] px-1.5 py-0">
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {order.customer_name || "عميل زائر"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {format(new Date(order.created_at), "d MMM yyyy • h:mm a", { locale: ar })}
            </span>
          </div>
        </div>
        <span className={cn("font-bold text-sm flex-shrink-0", isCancelled ? "text-muted-foreground line-through" : "text-primary")}>
          {formatPrice(order.total)}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{order.delivery_address}</span>
          </div>
          {(order.delivery_phone || order.customer_phone) && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${order.delivery_phone || order.customer_phone}`} className="text-primary hover:underline" dir="ltr">
                {order.delivery_phone || order.customer_phone}
              </a>
            </div>
          )}
          {(order.delivery_user || order.parent_order?.delivery_user) && (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>المندوب: {(order.delivery_user || order.parent_order?.delivery_user)?.full_name}</span>
            </div>
          )}
          <Separator />
          <div className="space-y-1.5">
            <p className="font-semibold text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> المنتجات ({order.items?.length || 0})
            </p>
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span><span className="text-muted-foreground">{item.quantity}×</span> {item.product_name}</span>
                <span className="text-muted-foreground">{formatPrice(item.total_price)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>الإجمالي</span>
            <span className={isCancelled ? "line-through text-muted-foreground" : ""}>{formatPrice(order.total)}</span>
          </div>
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, selectedDate]);

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

  // Pre-compute all history orders + order dates map for calendar
  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => HISTORY_STATUSES.includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const orderDatesMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    historyOrders.forEach((o) => {
      const key = dateKey(new Date(o.created_at));
      const existing = map.get(key) || { total: 0, count: 0 };
      map.set(key, {
        total: existing.total + (o.status === "DELIVERED" ? (o.total || 0) : 0),
        count: existing.count + 1,
      });
    });
    return map;
  }, [historyOrders]);

  // Filtered + paginated
  const { filteredOrders, totalPages, totalCount, totalRevenue } = useMemo(() => {
    let result = [...historyOrders];

    // Status filter
    if (statusFilter === "DELIVERED") {
      result = result.filter((o) => o.status === "DELIVERED");
    } else if (statusFilter === "CANCELLED") {
      result = result.filter((o) => o.status?.startsWith("CANCELLED"));
    }

    // Date filter
    if (selectedDate) {
      result = result.filter((o) => isSameDay(new Date(o.created_at), selectedDate));
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

    const totalRevenue = result.filter((o) => o.status === "DELIVERED").reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPages = Math.max(1, Math.ceil(result.length / ORDERS_PER_PAGE));

    return { filteredOrders: result, totalPages, totalCount: result.length, totalRevenue };
  }, [historyOrders, searchQuery, statusFilter, selectedDate]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, page]);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link to="/dashboard/orders"><ArrowRight className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">سجل الطلبات</h1>
          <p className="text-sm text-muted-foreground">{shop.name}</p>
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{totalCount}</p>
              <p className="text-[10px] text-muted-foreground truncate">طلبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{formatPrice(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground truncate">إيرادات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">
                {historyOrders.filter((o) => o.status?.startsWith("CANCELLED")).length}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">ملغية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <InlineCalendar selectedDate={selectedDate} onSelect={setSelectedDate} orderDates={orderDatesMap} latestOrderDate={historyOrders.length > 0 ? new Date(historyOrders[0].created_at) : undefined} />

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث برقم الطلب، اسم العميل..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">الكل</SelectItem>
            <SelectItem value="DELIVERED">مكتملة</SelectItem>
            <SelectItem value="CANCELLED">ملغية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {pagedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <ClipboardList className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">لا توجد طلبات</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedDate ? `لا توجد طلبات في ${format(selectedDate, "d MMMM yyyy", { locale: ar })}` : "حاول تغيير خيارات البحث أو التصفية"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagedOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isExpanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            السابق
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Show pages around current page
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            التالي
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
