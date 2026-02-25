import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Download, DollarSign, TrendingDown } from "lucide-react";
import { notify } from "@/lib/notify";

export function AdminFinancials() {
  const [period, setPeriod] = useState<"7D" | "30D" | "ALL">("30D");

  const startDate = useMemo(() => {
    if (period === "7D") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (period === "30D") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return undefined;
  }, [period]);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin_global_metrics', startDate],
    queryFn: () => analyticsService.getGlobalMetrics(startDate),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: shopMetrics } = useQuery({
    queryKey: ['admin_shop_metrics', startDate],
    queryFn: () => analyticsService.getShopPerformance(startDate, undefined, 1000, 0),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const exportToCSV = () => {
    if (!shopMetrics) return;
    
    // Create CSV content
    const headers = ['اسم المتجر', 'الطلبات المكتملة', 'الطلبات الملغية', 'إجمالي الإيرادات', 'العمولة المستحقة', 'نسبة القبول (%)'];
    const rows = shopMetrics.map(shop => [
      shop.shop_name,
      shop.completed_orders.toString(),
      shop.cancelled_orders.toString(),
      shop.revenue.toString(),
      shop.commission_paid.toString(),
      shop.acceptance_rate.toString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel Arabic support
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير-المالية-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("تم تصدير التقرير بنجاح");
  };

  if (isLoading || !metrics) {
    return <div className="text-muted-foreground p-8 text-center">جاري التحميل...</div>;
  }

  // Calculate lost revenue roughly (Avg Order Value * Total Cancelled in period roughly? No, better use shop cancelled actuals if we had them. We do from shop metrics!)
  const totalCancelledOrders = shopMetrics?.reduce((acc, curr) => acc + Number(curr.cancelled_orders), 0) || 0;
  const estimatedLostRevenue = totalCancelledOrders * metrics.avg_order_value;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">التقرير المالي التفصيلي</h2>
          <p className="text-sm text-muted-foreground">تتبع العمولات، الإيرادات والخسائر المحتملة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button variant={period === "7D" ? "default" : "outline"} onClick={() => setPeriod("7D")}>7 أيام</Button>
           <Button variant={period === "30D" ? "default" : "outline"} onClick={() => setPeriod("30D")}>30 يوم</Button>
           <Button variant={period === "ALL" ? "default" : "outline"} onClick={() => setPeriod("ALL")}>الكل</Button>
           <Button variant="outline" className="gap-2" onClick={exportToCSV}>
             <Download className="w-4 h-4" />
             تصدير المتاجر (CSV)
           </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              إجمالي إيرادات المنصة المجمعة (Total Value)
              <DollarSign className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatPrice(metrics.total_revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">بناءً على الطلبات المكتملة فقط</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              أرباح المنصة المكتسبة (Commission/Fees)
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(metrics.total_commission)}</div>
            <p className="text-xs text-muted-foreground mt-1">صافي ربح المنصة من التوصيل/الرسوم</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              الإيرادات المفقودة (تقديرياً)
              <TrendingDown className="w-4 h-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(estimatedLostRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalCancelledOrders} طلب ملغي</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أداء إيرادات المتاجر</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-6 p-4 bg-muted font-medium text-sm">
                 <div className="col-span-2">المتجر</div>
                 <div>طلبات ناجحة</div>
                 <div>مبيعات (الإيراد)</div>
                 <div>عمولة مستحقة</div>
                 <div>معدل القبول</div>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                 {!shopMetrics?.length ? (
                   <div className="p-4 text-center text-muted-foreground">لا توجد حركات مالية مسجلة.</div>
                 ) : (
                   shopMetrics.map((shop) => (
                     <div key={shop.shop_id} className="grid grid-cols-6 p-4 text-sm items-center hover:bg-muted/50">
                        <div className="col-span-2 font-medium">{shop.shop_name}</div>
                        <div className="text-green-600 font-medium">{shop.completed_orders}</div>
                        <div className="font-bold">{formatPrice(shop.revenue)}</div>
                        <div className="text-primary">{formatPrice(shop.commission_paid)}</div>
                        <div>
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.acceptance_rate > 85 ? 'bg-green-100 text-green-700' : shop.acceptance_rate > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {shop.acceptance_rate}%
                           </span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
