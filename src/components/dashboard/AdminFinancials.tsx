import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import {
  Download,
  Store,
  Truck,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  User,
} from "lucide-react";
import { notify } from "@/lib/notify";

const PAGE_SIZE = 10;

function Pagination({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void; }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
      <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total}</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={page === 1} className="h-7 w-7">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={page === pages} className="h-7 w-7">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  GOOD: { label: "سليم", className: "bg-green-100 text-green-700" },
  LATE: { label: "متأخر", className: "bg-amber-100 text-amber-700" },
  CRITICAL: { label: "حرج", className: "bg-red-100 text-red-700" },
};

export function AdminFinancials() {
  const [period, setPeriod] = useState<"7D" | "30D" | "ALL">("30D");
  const [shopPage, setShopPage] = useState(1);
  const [driverPage, setDriverPage] = useState(1);

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

  const shopPage_data = useMemo(() => {
    if (!shopMetrics) return [];
    return shopMetrics.slice((shopPage - 1) * PAGE_SIZE, shopPage * PAGE_SIZE);
  }, [shopMetrics, shopPage]);

  const driverPage_data = useMemo(() => {
    if (!driverMetrics) return [];
    return driverMetrics.slice((driverPage - 1) * PAGE_SIZE, driverPage * PAGE_SIZE);
  }, [driverMetrics, driverPage]);

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("تم تصدير التقرير");
  };

  const exportShopsCSV = () => {
    if (!shopMetrics) return;
    const headers = ['المتجر', 'مميز', 'الإيرادات', 'عمولة مستحقة', 'اشتراك مستحق', 'تمييز مستحق', 'إجمالي المستحق', 'الحالة'];
    const rows = shopMetrics.map(s => [
      s.shop_name, s.is_premium ? 'نعم' : 'لا',
      s.gross_revenue, s.commission_owed, s.subscription_owed,
      s.premium_owed, s.total_outstanding, s.financial_status,
    ]);
    downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'تقرير_المتاجر');
  };

  const exportDriversCSV = () => {
    if (!driverMetrics) return;
    const headers = ['المندوب', 'الهاتف', 'رسوم التوصيل', 'مستحقات المنصة', 'تم التحصيل', 'صافي الدين'];
    const rows = driverMetrics.map(d => [
      d.driver_name, d.driver_phone || '',
      d.platform_fee_owed, d.customer_fee_owed, d.platform_fee_paid, d.total_outstanding,
    ]);
    downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'تقرير_المناديب');
  };

  if (isPlatformLoading || isShopsLoading || isDriversLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">النظام المالي المتقدم</h1>
          <p className="text-muted-foreground text-sm mt-0.5">حسابات، تسويات، وإيرادات المنصة الدقيقة</p>
        </div>
        {/* Segmented period */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["7D", "30D", "ALL"] as const).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setShopPage(1); setDriverPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${period === p ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
              {p === "7D" ? "7 أيام" : p === "30D" ? "30 يوم" : "الكل"}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[460px]">
          <TabsTrigger value="platform">نظرة عامة للمنصة</TabsTrigger>
          <TabsTrigger value="shops">حسابات المتاجر</TabsTrigger>
          <TabsTrigger value="drivers">حسابات المناديب</TabsTrigger>
        </TabsList>

        {/* ──────────────── PLATFORM ──────────────── */}
        <TabsContent value="platform" className="mt-6 space-y-5">
          {platformMetrics && (
            <>
              {/* KPI cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <DollarSign className="w-5 h-5 text-primary" />,
                    iconBg: "bg-primary/10",
                    label: "المبالغ المحصّلة",
                    sub: "ما دخل النظام فعلاً",
                    value: platformMetrics.platform_total.total_collected,
                  },
                  {
                    icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
                    iconBg: "bg-amber-100",
                    label: "إجمالي المستحقات",
                    sub: "من متاجر ومناديب",
                    value: platformMetrics.platform_total.total_receivable_outstanding,
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5 text-green-600" />,
                    iconBg: "bg-green-100",
                    label: "صافي أرباح المنصة",
                    sub: "الفترة المختارة",
                    value: platformMetrics.platform_total.net_profit,
                  },
                ].map(card => (
                  <Card key={card.label} className="border-muted">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-full ${card.iconBg} flex items-center justify-center`}>
                          {card.icon}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                      </div>
                      <div className="text-2xl font-bold">{formatPrice(card.value)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Breakdown cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Shop revenue */}
                <Card className="border-muted">
                  <CardHeader className="pb-2 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-3.5 h-3.5 text-primary" />
                      </div>
                      تفصيل إيرادات المتاجر
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-4">
                    {[
                      { label: "عمولات الطلبات (Commission)", paid: platformMetrics.shop_commissions.paid, outstanding: platformMetrics.shop_commissions.outstanding },
                      { label: "الاشتراكات الشهرية (Recurring)", paid: platformMetrics.regular_subscriptions.paid, outstanding: platformMetrics.regular_subscriptions.outstanding },
                      { label: "ترقيات التميز (Premium)", paid: platformMetrics.premium_subscriptions.paid, outstanding: platformMetrics.premium_subscriptions.outstanding },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatPrice(row.paid)}</span>
                          {row.outstanding > 0 && (
                            <span className="block text-[10px] text-amber-600 font-medium">
                              المستحق: {formatPrice(row.outstanding)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Driver revenue */}
                <Card className="border-muted">
                  <CardHeader className="pb-2 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-primary" />
                      </div>
                      تفصيل إيرادات التوصيل والمنصة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-4">
                    {[
                      { label: "رسوم المنصة من المناديب (Driver Fees)", value: platformMetrics.driver_fees.owed },
                      { label: "مستحقات المنصة على المناديب (Customer Fees)", value: platformMetrics.customer_fees?.owed || 0 },
                      { label: "تم تحصيله", value: platformMetrics.driver_fees.paid },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-semibold">{formatPrice(row.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border">
                      <span className="text-xs font-semibold">صافي الدين على المناديب</span>
                      <span className="text-sm font-bold text-amber-600">
                        {formatPrice((platformMetrics.driver_fees.owed + (platformMetrics.customer_fees?.owed || 0)) - platformMetrics.driver_fees.paid)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ──────────────── SHOPS ──────────────── */}
        <TabsContent value="shops" className="mt-6">
          <Card className="border-muted">
            <CardHeader className="flex flex-row justify-between items-center pb-3 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
              <div>
                <CardTitle className="text-sm font-semibold">حسابات المتاجر</CardTitle>
                {shopMetrics && <p className="text-xs text-muted-foreground mt-0.5">{shopMetrics.length} متجر مسجّل</p>}
              </div>
              <Button variant="outline" size="sm" onClick={exportShopsCSV} disabled={!shopMetrics?.length} className="h-8 text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" /> تصدير CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                {/* Header */}
                <div className="grid grid-cols-5 px-5 py-2.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground">
                  <div className="col-span-2">المتجر</div>
                  <div className="text-center">الإيرادات</div>
                  <div className="text-center">إجمالي المستحق</div>
                  <div className="text-center">الحالة</div>
                </div>
                {/* Rows */}
                <div className="divide-y">
                  {!shopPage_data.length ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">لا توجد بيانات في هذه الفترة.</div>
                  ) : shopPage_data.map(shop => {
                    const status = statusConfig[shop.financial_status] ?? { label: shop.financial_status, className: "bg-muted text-muted-foreground" };
                    return (
                      <div key={shop.shop_id} className="grid grid-cols-5 px-5 py-3.5 text-sm items-center hover:bg-muted/20 transition-colors">
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">
                              {shop.shop_name}
                              {shop.is_premium && <span className="text-amber-500 mr-1 text-xs">★</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{shop.total_orders} طلب مكتمل</p>
                          </div>
                        </div>
                        <div className="text-center text-muted-foreground text-xs">{formatPrice(shop.gross_revenue)}</div>
                        <div className="text-center font-bold">
                          {shop.total_outstanding < 0 ? (
                            <span className="text-green-600" dir="ltr">+ {formatPrice(Math.abs(shop.total_outstanding))}</span>
                          ) : (
                            formatPrice(shop.total_outstanding)
                          )}
                        </div>
                        <div className="text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Pagination
                page={shopPage} total={shopMetrics?.length ?? 0}
                onPrev={() => setShopPage(p => Math.max(1, p - 1))}
                onNext={() => setShopPage(p => p + 1)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────── DRIVERS ──────────────── */}
        <TabsContent value="drivers" className="mt-6">
          <Card className="border-muted">
            <CardHeader className="flex flex-row justify-between items-center pb-3 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
              <div>
                <CardTitle className="text-sm font-semibold">حسابات المناديب</CardTitle>
                {driverMetrics && <p className="text-xs text-muted-foreground mt-0.5">{driverMetrics.length} مندوب مسجّل</p>}
              </div>
              <Button variant="outline" size="sm" onClick={exportDriversCSV} disabled={!driverMetrics?.length} className="h-8 text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" /> تصدير CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <div className="grid grid-cols-4 px-5 py-2.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground">
                  <div className="col-span-2">المندوب</div>
                  <div className="text-center">رسوم مجمعة</div>
                  <div className="text-center">صافي الدين</div>
                </div>
                <div className="divide-y">
                  {!driverPage_data.length ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">لا توجد بيانات في هذه الفترة.</div>
                  ) : driverPage_data.map(driver => (
                    <div key={driver.driver_id} className="grid grid-cols-4 px-5 py-3.5 text-sm items-center hover:bg-muted/20 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{driver.driver_name}</p>
                          {driver.driver_phone && (
                            <p className="text-[10px] text-muted-foreground" dir="ltr">{driver.driver_phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-muted-foreground text-xs">
                        {formatPrice(driver.platform_fee_owed + driver.customer_fee_owed)}
                      </div>
                      <div className="text-center font-bold">
                        {driver.total_outstanding < 0 ? (
                            <span className="text-green-600" dir="ltr">+ {formatPrice(Math.abs(driver.total_outstanding))}</span>
                          ) : (
                            formatPrice(driver.total_outstanding)
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Pagination
                page={driverPage} total={driverMetrics?.length ?? 0}
                onPrev={() => setDriverPage(p => Math.max(1, p - 1))}
                onNext={() => setDriverPage(p => p + 1)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
