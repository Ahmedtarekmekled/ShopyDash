import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { analyticsService, DetailedFinancialReport, FinancialShopPerformance } from "@/services/analytics.service";
import { formatPrice } from "@/lib/utils";
import { DollarSign, Settings, Star, Printer, AlertCircle } from "lucide-react";
import { PrintableShopInvoice } from "./PrintableShopInvoice";

interface AdminShopFinancialsProps {
  shopId: string;
  shopName: string;
  isOpen: boolean;
  onClose: () => void;
  isPremiumActive?: boolean;
  premiumExpiresAt?: string;
}

export function AdminShopFinancials({ shopId, shopName, isOpen, onClose, isPremiumActive, premiumExpiresAt }: AdminShopFinancialsProps) {
  const [activeTab, setActiveTab] = useState("payment");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [balance, setBalance] = useState<FinancialShopPerformance | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumDuration, setPremiumDuration] = useState("30");
  const [premiumNotes, setPremiumNotes] = useState("");

  const [commissionRate, setCommissionRate] = useState("");
  const [subFee, setSubFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [autoBill, setAutoBill] = useState(false);

  const [subBillingAmount, setSubBillingAmount] = useState("");
  const [subBillingMonth, setSubBillingMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [subBillingNotes, setSubBillingNotes] = useState("");

  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [reportData, setReportData] = useState<DetailedFinancialReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && shopId) {
      loadSettings();
      loadBalance();
    }
  }, [isOpen, shopId]);

  const loadSettings = async () => {
    try {
      const data = await analyticsService.getShopFinancialSettings(shopId);
      if (data) {
        setSettings(data);
        setCommissionRate(data.commission_percentage?.toString() || "0");
        setSubFee(data.subscription_fee?.toString() || "0");
        setSubBillingAmount(data.subscription_fee?.toString() || "");
        setAutoBill(data.auto_bill_subscription ?? false);
        if (data.financial_start_date) {
          setStartDate(new Date(data.financial_start_date).toISOString().split('T')[0]);
        }
      } else {
        setCommissionRate("10");
        setSubFee("0");
        setStartDate(new Date().toISOString().split('T')[0]);
        setAutoBill(false);
      }
    } catch (e) { console.error(e); }
  };

  const loadBalance = async () => {
    try {
      const shops = await analyticsService.getFinancialDashboardShops();
      const found = shops.find(s => s.shop_id === shopId);
      setBalance(found || null);
    } catch (e) { console.error("loadBalance error", e); }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await analyticsService.updateShopFinancialSettings(shopId, {
        commission_percentage: parseFloat(commissionRate) || 0,
        subscription_fee: parseFloat(subFee) || 0,
        auto_bill_subscription: autoBill,
        financial_start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString()
      });
      setSubBillingAmount(subFee);
      notify.success("تم تحديث الإعدادات المالية");
    } catch (error) {
      notify.error("حدث خطأ أثناء الحفظ");
    } finally { setIsLoading(false); }
  };

  const handleBillSubscription = async () => {
    const amount = parseFloat(subBillingAmount);
    if (!subBillingAmount || isNaN(amount) || amount <= 0) { notify.error("الرجاء إدخال مبلغ صحيح"); return; }
    if (!subBillingMonth) { notify.error("الرجاء تحديد الشهر"); return; }
    setIsLoading(true);
    try {
      await analyticsService.insertSubscriptionCharge(shopId, amount, subBillingMonth, subBillingNotes || undefined);
      notify.success(`تم إضافة اشتراك ${subBillingMonth}`);
      setSubBillingNotes("");
      const [y, m] = subBillingMonth.split('-').map(Number);
      const next = new Date(y, m, 1);
      setSubBillingMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
      loadBalance();
    } catch (error: any) {
      notify.error(error.message || "حدث خطأ");
    } finally { setIsLoading(false); }
  };

  const handleCollectPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) { notify.error("الرجاء إدخال مبلغ صحيح"); return; }
    if (balance && amount > balance.total_outstanding) { notify.error("المبلغ يتجاوز المستحقات"); return; }
    setIsLoading(true);
    try {
      await analyticsService.insertCommissionPayment(shopId, amount, paymentNotes || "تم التحصيل يدوياً");
      notify.success("تم تسجيل الدفعة بنجاح");
      setPaymentAmount("");
      setPaymentNotes("");
      loadBalance();
    } catch (error) {
      notify.error("حدث خطأ أثناء التسجيل");
    } finally { setIsLoading(false); }
  };

  const handleGrantPremium = async () => {
    if (!premiumAmount || isNaN(Number(premiumAmount)) || Number(premiumAmount) < 0) { notify.error("الرجاء إدخال رسوم الترقية"); return; }
    setIsLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + parseInt(premiumDuration));
      await analyticsService.insertPremiumSubscription(shopId, parseFloat(premiumAmount), start.toISOString(), end.toISOString(), new Date().toISOString(), premiumNotes || `اشتراك مميز لمدة ${premiumDuration} يوم`);
      notify.success("تم تفعيل الاشتراك المميز");
      setPremiumAmount("");
      setPremiumNotes("");
    } catch (error) {
      notify.error("حدث خطأ أثناء التفعيل");
    } finally { setIsLoading(false); }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = reportMonth.split('-');
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999).toISOString();
      const data = await analyticsService.getShopDetailedFinancialReport(shopId, start, end);
      setReportData(data);
      setTimeout(() => { window.print(); setIsGenerating(false); }, 500);
    } catch (e) {
      notify.error("حدث خطأ في استخراج التقرير");
      setIsGenerating(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">العمليات المالية — {shopName}</DialogTitle>
          <DialogDescription className="sr-only">إدارة إعدادات العمولة والاشتراكات والمدفوعات</DialogDescription>
        </DialogHeader>

        {/* Balance chips — always visible at top */}
        {balance && (
          <div className="flex flex-wrap gap-1.5 pb-2 border-b">
            {balance.commission_owed - balance.commission_paid > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
                عمولة: {formatPrice(balance.commission_owed - balance.commission_paid)}
              </span>
            )}
            {balance.subscription_owed - balance.subscription_paid > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
                اشتراك: {formatPrice(balance.subscription_owed - balance.subscription_paid)}
              </span>
            )}
            {balance.premium_owed - balance.premium_paid > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                تمييز: {formatPrice(balance.premium_owed - balance.premium_paid)}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${balance.total_outstanding > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
              الإجمالي: {formatPrice(balance.total_outstanding)}
            </span>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="payment" className="text-xs gap-1"><DollarSign className="w-3 h-3"/> تحصيل</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1"><Settings className="w-3 h-3"/> إعدادات</TabsTrigger>
            <TabsTrigger value="premium" className="text-xs gap-1"><Star className="w-3 h-3"/> ترقية</TabsTrigger>
            <TabsTrigger value="report" className="text-xs gap-1"><Printer className="w-3 h-3"/> كشف</TabsTrigger>
          </TabsList>

          {/* TAB: PAYMENT */}
          <TabsContent value="payment" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">المبلغ المستلم (ج.م)</Label>
                {balance && balance.total_outstanding > 0 && (
                  <button type="button" onClick={() => setPaymentAmount(String(balance.total_outstanding.toFixed(2)))}
                    className="text-xs text-primary hover:underline">
                    تحصيل الكل: {formatPrice(balance.total_outstanding)}
                  </button>
                )}
              </div>
              <Input type="number" placeholder="0.00" value={paymentAmount} min={0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (balance && Number(val) > balance.total_outstanding) setPaymentAmount(String(balance.total_outstanding.toFixed(2)));
                  else setPaymentAmount(val);
                }}
              />
              {balance && Number(paymentAmount) > balance.total_outstanding && (
                <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> يتجاوز المستحقات</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظات (اختياري)</Label>
              <Textarea placeholder="رقم الحوالة، اسم المستلم..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" size="sm" onClick={handleCollectPayment}
              disabled={isLoading || !paymentAmount || Number(paymentAmount) <= 0 || (!!balance && Number(paymentAmount) > balance.total_outstanding)}>
              {isLoading ? "جاري الحفظ..." : "تسجيل الدفعة"}
            </Button>
          </TabsContent>

          {/* TAB: SETTINGS — compact grid layout */}
          <TabsContent value="settings" className="pt-3">
            {/* Commission row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1.5">
                <Label className="text-xs">نسبة العمولة (%)</Label>
                <Input type="number" placeholder="10" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ بدء الحسابات</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Subscription row */}
            <div className="border-t pt-3 mb-3">
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">رسوم الاشتراك الشهري (ج.م)</Label>
                  <Input type="number" placeholder="800" value={subFee} onChange={(e) => setSubFee(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Switch checked={autoBill} onCheckedChange={setAutoBill} disabled={!subFee || parseFloat(subFee) <= 0} />
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">تلقائي</Label>
                </div>
              </div>
              {autoBill && subFee && parseFloat(subFee) > 0 && (
                <p className="text-xs text-muted-foreground mb-3">✓ سيتم إضافة {formatPrice(parseFloat(subFee))} تلقائياً في أول كل شهر</p>
              )}
            </div>

            <Button className="w-full mb-4" size="sm" variant="secondary" onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>

            {/* Manual subscription billing */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">فوترة يدوية</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">المبلغ (ج.م)</Label>
                  <Input type="number" placeholder={subFee || "0"} value={subBillingAmount} onChange={(e) => setSubBillingAmount(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الشهر</Label>
                  <Input type="month" value={subBillingMonth} onChange={(e) => setSubBillingMonth(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <Input placeholder="ملاحظات..." value={subBillingNotes} onChange={(e) => setSubBillingNotes(e.target.value)} className="h-8 text-sm" />
              <Button className="w-full" size="sm" onClick={handleBillSubscription} disabled={isLoading || !subBillingAmount || Number(subBillingAmount) <= 0}>
                {isLoading ? "جاري الحفظ..." : `إضافة رسوم اشتراك ${subBillingMonth}`}
              </Button>
            </div>
          </TabsContent>

          {/* TAB: PREMIUM */}
          <TabsContent value="premium" className="space-y-3 pt-3">
            {isPremiumActive && premiumExpiresAt && new Date(premiumExpiresAt) > new Date() ? (
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-800 text-sm">مميز (نشط)</p>
                  <p className="text-xs text-green-700">ينتهي: {new Date(premiumExpiresAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <Star className="w-6 h-6 text-green-600 fill-green-600 opacity-60" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">المتجر غير مميز حالياً. قم بالترقية ليظهر في أعلى القائمة.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">مدة التميز</Label>
                <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                    <SelectItem value="90">90 يوم</SelectItem>
                    <SelectItem value="365">سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الرسوم (ج.م)</Label>
                <Input type="number" placeholder="0.00" value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <Input placeholder="ملاحظات..." value={premiumNotes} onChange={(e) => setPremiumNotes(e.target.value)} className="h-8 text-sm" />
            <Button className="w-full bg-amber-600 hover:bg-amber-700" size="sm" onClick={handleGrantPremium} disabled={isLoading}>
              {isLoading ? "جاري التفعيل..." : "تفعيل التمييز"}
            </Button>
          </TabsContent>

          {/* TAB: REPORT */}
          <TabsContent value="report" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">اختر الشهر لاستخراج كشف الحساب التفصيلي وطباعته.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">الشهر / السنة</Label>
              <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="h-8 text-sm" />
            </div>
            <Button className="w-full" size="sm" onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? "جاري التجهيز..." : "استخراج وطباعة PDF"}
            </Button>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
    <PrintableShopInvoice report={reportData} />
    </>
  );
}
