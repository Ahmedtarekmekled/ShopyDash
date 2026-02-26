import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Download, DollarSign, Store, Truck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { notify } from "@/lib/notify";

export function AdminFinancials() {
  const [period, setPeriod] = useState<"7D" | "30D" | "ALL">("30D");

  const startDate = useMemo(() => {
    if (period === "7D") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (period === "30D") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return undefined;
  }, [period]);

  const { data: platformMetrics, isLoading: isPlatformLoading } = useQuery({
    queryKey: ['admin_financial_platform', startDate],
    queryFn: () => analyticsService.getFinancialDashboardPlatform(startDate),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: shopMetrics, isLoading: isShopsLoading } = useQuery({
    queryKey: ['admin_financial_shops', startDate],
    queryFn: () => analyticsService.getFinancialDashboardShops(startDate, undefined, 1000, 0),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: driverMetrics, isLoading: isDriversLoading } = useQuery({
    queryKey: ['admin_financial_drivers', startDate],
    queryFn: () => analyticsService.getFinancialDashboardDrivers(startDate, undefined, 1000, 0),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const exportShopsCSV = () => {
    if (!shopMetrics) return;
    const headers = ['المتجر', 'مميز', 'الإيرادات', 'العمولة المستحقة', 'رسوم تم دفعها', 'إجمالي المتبقي (مستحق)', 'الحالة'];
    const rows = shopMetrics.map(shop => [
      shop.shop_name,
      shop.is_premium ? 'نعم' : 'لا',
      shop.gross_revenue.toString(),
      shop.commission_owed.toString(),
      shop.commission_paid.toString(),
      shop.total_outstanding.toString(),
      shop.financial_status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadCSV(csvContent, 'تقرير_حسابات_المتاجر');
  };

  const exportDriversCSV = () => {
    if (!driverMetrics) return;
    const headers = ['المندوب', 'الإيرادات (رسوم التوصيل)', 'رسوم المنصة المستحقة', 'رسوم العملاء النقدية', 'رسوم تم تحصيلها', 'المتبقي الكلي (مستحق)'];
    const rows = driverMetrics.map(driver => [
      driver.driver_name,
      driver.gross_earnings.toString(),
      driver.platform_fee_owed.toString(),
      driver.customer_fee_owed.toString(),
      driver.platform_fee_paid.toString(),
      driver.total_outstanding.toString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadCSV(csvContent, 'تقرير_حسابات_المناديب');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("تم تصدير التقرير بنجاح");
  };

  if (isPlatformLoading || isShopsLoading || isDriversLoading) {
    return <div className="text-muted-foreground p-8 text-center">جاري تحميل البيانات المالية...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">النظام المالي المتقدم</h2>
          <p className="text-sm text-muted-foreground">حسابات، تسويات، وإيرادات المنصة الدقيقة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button variant={period === "7D" ? "default" : "outline"} onClick={() => setPeriod("7D")}>7 أيام</Button>
           <Button variant={period === "30D" ? "default" : "outline"} onClick={() => setPeriod("30D")}>30 يوم</Button>
           <Button variant={period === "ALL" ? "default" : "outline"} onClick={() => setPeriod("ALL")}>الكل</Button>
        </div>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="platform">نظرة عامة للمنصة</TabsTrigger>
          <TabsTrigger value="shops">حسابات المتاجر</TabsTrigger>
          <TabsTrigger value="drivers">حسابات المناديب</TabsTrigger>
        </TabsList>

        {/* PLATFORM OVERVIEW */}
        <TabsContent value="platform" className="mt-6 space-y-6">
          {platformMetrics && (
            <>
              <div className="grid sm:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      المبالغ المحصلة (Total Collected)
                      <DollarSign className="w-4 h-4 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatPrice(platformMetrics.platform_total.total_collected)}</div>
                    <p className="text-xs text-muted-foreground mt-1">كاش فعلي تم إدخاله للنظام</p>
                  </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      إجمالي المستحقات (Outstanding)
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">{formatPrice(platformMetrics.platform_total.total_receivable_outstanding)}</div>
                    <p className="text-xs text-muted-foreground mt-1">مبالغ مستحقة من المتاجر والمناديب</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-500/5 border-green-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      صافي أرباح المنصة (Net Profit)
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatPrice(platformMetrics.platform_total.net_profit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">المحقق خلال هذه الفترة (محصل)</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="w-5 h-5 text-indigo-500" />
                      تفصيل إيرادات المتاجر
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm font-medium">عمولات الطلبات (Commission)</span>
                      <span className="font-bold">{formatPrice(platformMetrics.shop_commissions.paid)} / المستحق: {formatPrice(platformMetrics.shop_commissions.outstanding)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm font-medium">الاشتراكات الشهرية (Recurring)</span>
                      <span className="font-bold">{formatPrice(platformMetrics.regular_subscriptions.paid)} / المستحق: {formatPrice(platformMetrics.regular_subscriptions.outstanding)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">ترقيات التميز (Premium)</span>
                      <span className="font-bold whitespace-nowrap overflow-hidden text-amber-600">
                        {formatPrice(platformMetrics.premium_subscriptions.paid)} / المستحق: {formatPrice(platformMetrics.premium_subscriptions.outstanding)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-500" />
                      تفصيل إيرادات التوصيل والمنصة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm font-medium">رسوم المنصة من المناديب (Driver Fees)</span>
                      <span className="font-bold text-blue-600">
                        {formatPrice(platformMetrics.driver_fees.paid)} / المستحق: {formatPrice(platformMetrics.driver_fees.outstanding)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-amber-700">
                      <span className="text-sm font-medium">رسوم الخدمة النقدية مستحقة لدى المناديب (Customer Fees)</span>
                      <span className="font-bold text-amber-600">
                        المستحق: {formatPrice(platformMetrics.customer_fees?.owed || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* SHOPS FINANCES */}
        <TabsContent value="shops" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>كشف حساب المتاجر</CardTitle>
              <Button variant="outline" size="sm" onClick={exportShopsCSV} disabled={!shopMetrics?.length}>
                <Download className="w-4 h-4 ml-2" /> تصدير (CSV)
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-7 p-4 bg-muted font-medium text-sm">
                  <div className="col-span-2">المتجر</div>
                  <div>إيرادات المتجر</div>
                  <div>عمولة المنصة</div>
                  <div>ترقيات واشتراكات</div>
                  <div>المستحق (بذمة المتجر)</div>
                  <div>موقف مالي</div>
                </div>
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {!shopMetrics?.length ? (
                    <div className="p-4 text-center text-muted-foreground">لا توجد حركات مالية مسجلة.</div>
                  ) : (
                    shopMetrics.map((shop) => (
                      <div key={shop.shop_id} className="grid grid-cols-7 p-4 text-sm items-center hover:bg-muted/50">
                        <div className="col-span-2">
                          <p className="font-medium">{shop.shop_name}</p>
                          {shop.is_premium && <Badge variant="outline" className="text-[10px] mt-1 bg-amber-50 text-amber-600 border-amber-200">فرع مميز</Badge>}
                        </div>
                        <div className="font-medium">{formatPrice(shop.gross_revenue)}</div>
                         {/* Owed Comm vs Paid Comm */}
                        <div className="text-blue-600 font-medium whitespace-nowrap">
                          {formatPrice(shop.commission_owed)} <br/>
                          <span className="text-[10px] text-muted-foreground p-0.5">سُدد: {formatPrice(shop.commission_paid)}</span>
                        </div>
                        {/* Subs + Premium Owed */}
                        <div className="text-amber-600 whitespace-nowrap">
                          {formatPrice(shop.subscription_owed + shop.premium_owed)} <br/>
                          <span className="text-[10px] text-muted-foreground p-0.5">سُدد: {formatPrice(shop.subscription_paid + shop.premium_paid)}</span>
                        </div>
                        {/* Total Outstanding */}
                        <div className="font-bold text-red-600">{formatPrice(shop.total_outstanding)}</div>
                        <div>
                          {shop.financial_status === 'GOOD' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle className="w-3 h-3 ml-1"/> سليم</Badge>
                          ) : shop.financial_status === 'LATE' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">متأخر</Badge>
                          ) : (
                            <Badge variant="destructive">حرج</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRIVERS FINANCES */}
        <TabsContent value="drivers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>كشف حساب المناديب</CardTitle>
              <Button variant="outline" size="sm" onClick={exportDriversCSV} disabled={!driverMetrics?.length}>
                <Download className="w-4 h-4 ml-2" /> تصدير (CSV)
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-6 p-4 bg-muted font-medium text-sm">
                  <div className="col-span-2">المندوب</div>
                  <div>إيرادات التوصيل الكلية</div>
                  <div>رسوم المنصة المجمعة</div>
                  <div>المسدد للمنصة</div>
                  <div>المتبقي الكلي للمنصة</div>
                </div>
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {!driverMetrics?.length ? (
                    <div className="p-4 text-center text-muted-foreground">لا توجد حركات مالية مسجلة.</div>
                  ) : (
                    driverMetrics.map((driver) => (
                      <div key={driver.driver_id} className="grid grid-cols-6 p-4 text-sm items-center hover:bg-muted/50">
                        <div className="col-span-2">
                          <p className="font-medium">{driver.driver_name}</p>
                          <p className="text-xs text-muted-foreground">{driver.driver_phone}</p>
                        </div>
                        <div className="font-medium">{formatPrice(driver.gross_earnings)}</div>
                        <div className="text-amber-600 font-medium">
                          {formatPrice(driver.platform_fee_owed + driver.customer_fee_owed)}
                          <span className="text-[10px] text-muted-foreground block">
                            توصيل: {formatPrice(driver.platform_fee_owed)} | عملاء نقدي: {formatPrice(driver.customer_fee_owed)}
                          </span>
                        </div>
                        <div className="text-blue-600 font-medium">
                          {formatPrice(driver.platform_fee_paid)}
                        </div>
                        <div className="font-bold text-red-600">{formatPrice(driver.total_outstanding)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
