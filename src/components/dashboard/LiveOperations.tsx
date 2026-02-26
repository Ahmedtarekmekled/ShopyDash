import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AlertTriangle,
  Clock,
  Package,
  RefreshCw,
  Store,
  CheckCircle,
  Zap,
  Circle,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  PLACED:              { label: "جديد",           color: "text-blue-600",      dot: "bg-blue-500" },
  PREPARING:           { label: "قيد التحضير",    color: "text-amber-600",     dot: "bg-amber-500" },
  READY_FOR_DELIVERY:  { label: "جاهز للتسليم",   color: "text-emerald-600",   dot: "bg-emerald-500" },
  OUT_FOR_DELIVERY:    { label: "جاري التوصيل",   color: "text-purple-600",    dot: "bg-purple-500" },
  CANCELLED_BY_SHOP:   { label: "ملغي بالمتجر",   color: "text-red-500",       dot: "bg-red-400" },
};

export function LiveOperations() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: activeOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_live_orders", lastRefresh],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, shop:shops(id, name, phone)`)
        .not("status", "in", '("DELIVERED","CANCELLED")')
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000,
  });

  const handleManualRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  const now = new Date();

  const stuckOrders = activeOrders.filter((order) => {
    const mins = differenceInMinutes(now, new Date(order.created_at));
    if (order.status === "PLACED" && mins > 15) return true;
    if (order.status === "PREPARING" && mins > 30) return true;
    if (order.status === "READY_FOR_DELIVERY" && mins > 45) return true;
    if (order.status === "OUT_FOR_DELIVERY" && mins > 120) return true;
    return false;
  });

  if (isLoading) {
    return (
      <div className="text-center p-16 text-muted-foreground animate-pulse">
        جاري تحميل العمليات المباشرة...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            العمليات المباشرة
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحديث تلقائي كل 30 ثانية · {activeOrders.length} طلب نشط
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleManualRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {/* Alert bar if stuck orders */}
      {stuckOrders.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold">{stuckOrders.length} طلب متأخر</span>
            {" — "}يحتاج لتدخل أو متابعة مع المتجر/المندوب.
            <div className="mt-1.5 space-y-1">
              {stuckOrders.slice(0, 3).map((o) => (
                <div key={o.id} className="text-xs text-red-700 flex gap-2">
                  <span className="font-medium">{o.shop?.name}</span>
                  <span className="text-red-500">
                    #{o.order_number} · منذ {differenceInMinutes(now, new Date(o.created_at))} دقيقة
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            سجل الطلبات النشطة (الأقدم أولاً)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <p className="font-medium text-green-700">لا توجد طلبات نشطة حالياً</p>
              <p className="text-xs mt-1">العمليات تسير بشكل ممتاز.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[560px] overflow-y-auto">
              {activeOrders.map((order) => {
                const isStuck = stuckOrders.some((s) => s.id === order.id);
                const status = STATUS_MAP[order.status] ?? { label: order.status, color: "text-muted-foreground", dot: "bg-muted" };

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30",
                      isStuck && "bg-red-50/60"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isStuck ? "bg-red-100" : "bg-muted"
                    )}>
                      <Package className={cn("w-4 h-4", isStuck ? "text-red-600" : "text-muted-foreground")} />
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold truncate">
                          #{order.order_number}
                        </span>
                        {isStuck && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">تأخير</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {order.shop?.name ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          منذ {formatDistanceToNow(new Date(order.created_at), { locale: ar })}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-semibold shrink-0">
                      {formatPrice(order.total)}
                    </div>

                    {/* Status */}
                    <div className={cn("flex items-center gap-1.5 text-xs font-medium shrink-0", status.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
