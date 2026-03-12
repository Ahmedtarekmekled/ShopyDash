import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle, CheckCircle, CreditCard, Receipt, TrendingUp } from "lucide-react";
import { analyticsService, DetailedFinancialReport } from "@/services/analytics.service";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/store";
import { shopsService } from "@/services/catalog.service";

export function ShopOwnerFinancials() {
  const { user } = useAuth();
  const [report, setReport] = useState<DetailedFinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFinancials = async () => {
      if (!user) return;
      try {
        const shop = await shopsService.getByOwnerId(user.id);
        if (shop && shop.approval_status === "APPROVED") {
          const data = await analyticsService.getShopDetailedFinancialReport(shop.id);
          setReport(data);
        }
      } catch (error) {
        console.error("Failed to load financials:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFinancials();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">الماليات والمستحقات</h1>
          <p className="text-muted-foreground mt-1 text-sm">جاري التحميل...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { summary, orders, payments, subscriptions } = report || {
    summary: { net_debt: 0, total_revenue: 0, total_paid: 0, total_commission_owed: 0, total_subscription_owed: 0 },
    orders: [],
    payments: [],
    subscriptions: [],
  };

  const hasDebt = summary.net_debt > 0;
  const totalCharged = (summary.total_commission_owed || 0) + (summary.total_subscription_owed || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الماليات والمستحقات</h1>
        <p className="text-muted-foreground mt-1 text-sm">ملخص مالي شامل للمبيعات والعمولات والاشتراكات.</p>
      </div>

      {/* Stats row: show 3 cards always, المسدد only when there's a current debt */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">إجمالي المبيعات</span>
            </div>
            <div className="text-xl font-bold">{formatPrice(summary.total_revenue)}</div>
          </CardContent>
        </Card>

        {/* Only show المسدد when there is a current outstanding debt */}
        {hasDebt && (
          <Card className="border shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">سددته حتى الآن</span>
              </div>
              <div className="text-xl font-bold text-green-600">{formatPrice(summary.total_paid)}</div>
            </CardContent>
          </Card>
        )}

        <Card className={`border shadow-sm ${hasDebt ? "border-red-200" : "border-green-200"}`}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${hasDebt ? "text-red-500" : "text-green-500"}`} />
              <span className="text-xs text-muted-foreground">المديونية الحالية</span>
            </div>
            <div className={`text-xl font-bold ${hasDebt ? "text-red-600" : "text-green-600"}`}>
              {hasDebt ? formatPrice(summary.net_debt) : "لا يوجد دين"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charges breakdown — only when there is an outstanding debt */}
      {hasDebt && totalCharged > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">تفصيل المبالغ المستحقة عليك</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {(summary.total_commission_owed || 0) > 0 && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">عمولة الطلبات</p>
                      <p className="text-xs text-muted-foreground">
                        {orders.length > 0 && orders[0].commission_rate > 0
                          ? `نسبة ${orders[0].commission_rate}% من قيمة كل طلب منفذ`
                          : "نسبة مئوية من قيمة كل طلب منفذ"}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">
                    {orders.length > 0 && orders[0].commission_rate > 0
                      ? `${orders[0].commission_rate}%`
                      : formatPrice(summary.total_commission_owed)}
                  </span>
                </div>
              )}
              {/* Subscription row — only show when net_debt > 0 AND subscription is part of the debt */}
              {hasDebt && (summary.total_subscription_owed || 0) > 0 && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">رسوم الاشتراك الشهري</p>
                      <p className="text-xs text-muted-foreground">رسوم ثابتة شهرية لخدمة المنصة</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatPrice(summary.total_subscription_owed)}</span>
                </div>
              )}
              {summary.total_paid > 0 && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-semibold text-muted-foreground">سددته حتى الآن</span>
                  <span className="font-bold text-sm text-green-600">{formatPrice(summary.total_paid)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-bold">المتبقي عليك</span>
                <span className="font-bold text-sm text-red-600">{formatPrice(summary.net_debt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Orders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">أحدث الطلبات (العمولات)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد طلبات منفذة بعد</p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {orders.slice(-5).reverse().map((o: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <div>
                      <p className="font-medium text-sm">#{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-bold text-orange-600">عمولة {formatPrice(o.commission_fee)}</p>
                      <p className="text-xs text-muted-foreground">من {formatPrice(o.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments made */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">دفعاتك للمنصة</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {payments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد دفعات مسجلة</p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {payments.slice(-5).reverse().map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{p.notes || "سداد نقدي"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-green-600">{formatPrice(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription history */}
      {subscriptions && subscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">سجل رسوم الاشتراك الشهري</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {subscriptions.map((sub: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2.5">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {sub.billing_month
                          ? new Date(sub.billing_month).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.paid_at ? new Date(sub.paid_at).toLocaleDateString('ar-SA') : "لم يُسدد"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{formatPrice(sub.amount)}</span>
                    <Badge
                      variant="outline"
                      className={sub.status === 'PAID' || sub.status === 'UNPAID' && sub.paid_at
                        ? "bg-green-50 text-green-700 border-green-200 text-[10px]"
                        : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"}
                    >
                      {sub.status === 'PAID' ? "مسدد" : "معلق"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
