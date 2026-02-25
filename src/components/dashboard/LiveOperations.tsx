import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Order } from "@/types/database";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  RefreshCw, 
  Store, 
  Truck, 
  Zap,
  CheckCircle
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function LiveOperations() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: activeOrders, isLoading, refetch } = useQuery({
    queryKey: ['admin_live_orders', lastRefresh],
    queryFn: async () => {
      // Fetch all non-final orders with shop info
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shop:shops(id, name, phone)
        `)
        .not('status', 'in', '("DELIVERED","CANCELLED")')
        .order('created_at', { ascending: true }); // Oldest first (stuck)
        
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000, // auto refresh every 30s
  });

  const handleManualRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  if (isLoading || !activeOrders) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse">جاري تحميل العمليات المباشرة...</div>;
  }

  // Determine insights
  const now = new Date();
  
  // Stuck = preparing for > 30 mins, or Placed for > 15 mins
  const stuckOrders = activeOrders.filter(order => {
    const mins = differenceInMinutes(now, new Date(order.created_at));
    if (order.status === 'PLACED' && mins > 15) return true;
    if (order.status === 'PREPARING' && mins > 30) return true;
    if (order.status === 'READY_FOR_DELIVERY' && mins > 45) return true;
    if (order.status === 'OUT_FOR_DELIVERY' && mins > 120) return true; // 2 hours out?
    return false;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PLACED: { variant: "secondary", label: "جديد" },
      PREPARING: { variant: "outline", label: "قيد التحضير" },
      READY_FOR_DELIVERY: { variant: "default", label: "جاهز للتسليم" },
      OUT_FOR_DELIVERY: { variant: "secondary", label: "جاري التوصيل" },
    };
    return variants[status] || { variant: "outline", label: status };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            العمليات الذكية المباشرة
          </h2>
          <p className="text-sm text-muted-foreground">مراقبة حية للاختناقات وأوامر التوصيل المتأخرة</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleManualRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تحديث ({activeOrders.length} طلب نشط)
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Smart Insights Panel */}
        <Card className="md:col-span-1 bg-amber-500/5 border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              رؤى ذكية تحذيرية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stuckOrders.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-100/50 rounded-lg text-red-800 text-sm font-medium flex items-start gap-2">
                   <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                   يوجد {stuckOrders.length} طلبات متأخرة عن المعدل الطبيعي وتحتاج لتدخل أو متابعة مع المتجر/المندوب.
                </div>
                {stuckOrders.slice(0, 3).map(order => (
                  <div key={order.id} className="text-sm border-l-2 border-red-500 pl-3 py-1 ml-2">
                     <p className="font-semibold">{order.shop?.name || 'متجر غير معروف'}</p>
                     <p className="text-muted-foreground">طلب #{order.order_number} - متأخر منذ {differenceInMinutes(now, new Date(order.created_at))} دقيقة</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                 </div>
                 <p className="font-medium text-green-800">العمليات تسير بشكل ممتاز</p>
                 <p className="text-xs text-muted-foreground mt-1">لا توجد أي طلبات متأخرة حالياً أو اختناقات في المنصة.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Orders List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex justify-between items-center">
               <span>سجل الطلبات النشطة (الأقدم أولاً)</span>
               <Badge variant="secondary">{activeOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {activeOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">لا توجد أي طلبات نشطة في النظام حالياً.</div>
              ) : (
                activeOrders.map(order => {
                  const isStuck = stuckOrders.some(s => s.id === order.id);
                  const statusInfo = getStatusBadge(order.status);
                  
                  return (
                    <div 
                      key={order.id} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border",
                        isStuck ? "bg-red-50 border-red-200" : "bg-card"
                      )}
                    >
                      <div className="flex gap-4 items-start sm:items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          isStuck ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                           <Package className="w-5 h-5" />
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                              <span className="font-bold">#{order.order_number}</span>
                              {isStuck && <Badge variant="destructive" className="text-[10px] h-5">تأخير</Badge>}
                           </div>
                           <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {order.shop?.name}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> منذ {formatDistanceToNow(new Date(order.created_at), { locale: ar, addSuffix: false })}</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 sm:w-1/3">
                         <div className="text-left font-medium">
                            {formatPrice(order.total)}
                         </div>
                         <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
