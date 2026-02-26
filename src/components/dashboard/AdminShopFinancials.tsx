import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { analyticsService, DetailedFinancialReport, FinancialShopPerformance } from "@/services/analytics.service";
import { formatPrice } from "@/lib/utils";
import { DollarSign, Settings, Star, History, Printer, AlertCircle } from "lucide-react";
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

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Premium Form
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumDuration, setPremiumDuration] = useState("30");
  const [premiumNotes, setPremiumNotes] = useState("");

  // Settings Form
  const [commissionRate, setCommissionRate] = useState("");
  const [subFee, setSubFee] = useState("");
  const [startDate, setStartDate] = useState("");

  // Subscription Billing
  const [subBillingAmount, setSubBillingAmount] = useState("");
  const [subBillingMonth, setSubBillingMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [subBillingNotes, setSubBillingNotes] = useState("");

  // Report Form
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
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
        setSubBillingAmount(data.subscription_fee?.toString() || ""); // pre-fill billing amount
        if (data.financial_start_date) {
            setStartDate(new Date(data.financial_start_date).toISOString().split('T')[0]);
        }
      } else {
         setCommissionRate("10");
         setSubFee("0");
         setStartDate(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBalance = async () => {
    try {
      const shops = await analyticsService.getFinancialDashboardShops();
      const found = shops.find(s => s.shop_id === shopId);
      setBalance(found || null);
    } catch (e) {
      console.error("loadBalance error", e);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await analyticsService.updateShopFinancialSettings(shopId, {
        commission_percentage: parseFloat(commissionRate) || 0,
        subscription_fee: parseFloat(subFee) || 0,
        financial_start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString()
      });
      // Pre-fill billing amount from new sub fee
      setSubBillingAmount(subFee);
      notify.success("تم تحديث الإعدادات المالية للمتجر");
    } catch (error) {
       notify.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillSubscription = async () => {
    const amount = parseFloat(subBillingAmount);
    if (!subBillingAmount || isNaN(amount) || amount <= 0) {
      notify.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (!subBillingMonth) {
      notify.error("الرجاء تحديد الشهر المراد الفوترة عنه");
      return;
    }
    setIsLoading(true);
    try {
      await analyticsService.insertSubscriptionCharge(shopId, amount, subBillingMonth, subBillingNotes || undefined);
      notify.success(`تم إضافة رسوم اشتراك ${amount} ج.م لشهر ${subBillingMonth} بنجاح`);
      setSubBillingNotes("");
      // Advance billing month by 1 for next time
      const [y, m] = subBillingMonth.split('-').map(Number);
      const next = new Date(y, m, 1);
      setSubBillingMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
      loadBalance(); // refresh outstanding chips
    } catch (error: any) {
      notify.error(error.message || "حدث خطأ أثناء إضافة رسوم الاشتراك");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      notify.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (balance && amount > balance.total_outstanding) {
      notify.error(`المبلغ المدخل (${amount} ج.م) يتجاوز إجمالي المستحقات (${balance.total_outstanding} ج.م)`);
      return;
    }
    setIsLoading(true);
    try {
      await analyticsService.insertCommissionPayment(
        shopId, 
        amount, 
        paymentNotes || "تم التحصيل يدوياً من قبل الإدارة"
      );
      notify.success("تم تسجيل الدفعة بنجاح وخصمها من المستحقات");
      setPaymentAmount("");
      setPaymentNotes("");
      loadBalance(); // refresh the outstanding balance
    } catch (error) {
       notify.error("حدث خطأ أثناء تسجيل الدفعة");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantPremium = async () => {
     if (!premiumAmount || isNaN(Number(premiumAmount)) || Number(premiumAmount) < 0) {
      notify.error("الرجاء إدخال رسوم الترقية (اضع 0 إذا كانت مجانية)");
      return;
    }
    setIsLoading(true);
    try {
       const start = new Date();
       const end = new Date();
       end.setDate(start.getDate() + parseInt(premiumDuration));

       await analyticsService.insertPremiumSubscription(
         shopId,
         parseFloat(premiumAmount),
         start.toISOString(),
         end.toISOString(),
         new Date().toISOString(), // Assuming paid immediately for now
         premiumNotes || `اشتراك مميز لمدة ${premiumDuration} يوم`
       );
       notify.success("تم تفعيل الاشتراك المميز للمتجر");
       setPremiumAmount("");
       setPremiumNotes("");
    } catch (error) {
       notify.error("حدث خطأ أثناء تفعيل التميز");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = reportMonth.split('-');
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999).toISOString();

      const data = await analyticsService.getShopDetailedFinancialReport(shopId, start, end);
      setReportData(data);
      
      // Wait for React to render the hidden print component
      setTimeout(() => {
        window.print();
        setIsGenerating(false);
      }, 500);

    } catch (e) {
      notify.error("حدث خطأ أثناء استخراج كشف الحساب");
      setIsGenerating(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>العمليات المالية - {shopName}</DialogTitle>
          <DialogDescription className="sr-only">
            إدارة إعدادات العمولة والاشتراكات مميزة والمدفوعات الخاصة بهذا المتجر
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4" dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment" className="gap-2"><DollarSign className="w-4 h-4"/> تحصيل دفعة</TabsTrigger>
            <TabsTrigger value="report" className="gap-2"><Printer className="w-4 h-4"/> كشف حساب</TabsTrigger>
            <TabsTrigger value="premium" className="gap-2"><Star className="w-4 h-4"/> ترقية المتجر</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4"/> الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="space-y-4 py-4">
             <div className="bg-muted p-4 rounded-lg mb-4 text-sm text-muted-foreground leading-relaxed">
               <strong>كشف الحساب التفصيلي:</strong> حدد الشهر وسيتم استخراج جميع العمليات المالية والمبيعات لطباعتها أو حفظها كملف PDF مرتب.
             </div>
             <div className="space-y-2">
               <Label>التاريخ (الشهر/السنة)</Label>
               <Input 
                 type="month" 
                 value={reportMonth} 
                 onChange={(e) => setReportMonth(e.target.value)} 
               />
             </div>
             <Button className="w-full mt-4" variant="default" onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? "جاري تجهيز التقرير..." : "استخراج وطباعة كشف الحساب (PDF)"}
             </Button>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4 py-4">
             {/* Outstanding Summary + Quick-fill chips */}
             {balance ? (
               <div className="bg-muted/40 rounded-lg border p-3 space-y-3">
                 <p className="text-xs font-semibold text-muted-foreground">مستحقات المتجر</p>
                 <div className="flex flex-wrap gap-2">
                   {balance.commission_owed - balance.commission_paid > 0 && (
                     <button
                       type="button"
                       onClick={() => setPaymentAmount(String((balance.commission_owed - balance.commission_paid).toFixed(2)))}
                       className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-background text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                     >
                       عمولة <span className="font-bold">{formatPrice(balance.commission_owed - balance.commission_paid)}</span>
                     </button>
                   )}
                   {balance.subscription_owed - balance.subscription_paid > 0 && (
                     <button
                       type="button"
                       onClick={() => setPaymentAmount(String((balance.subscription_owed - balance.subscription_paid).toFixed(2)))}
                       className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-background text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                     >
                       اشتراك <span className="font-bold">{formatPrice(balance.subscription_owed - balance.subscription_paid)}</span>
                     </button>
                   )}
                   {balance.premium_owed - balance.premium_paid > 0 && (
                     <button
                       type="button"
                       onClick={() => setPaymentAmount(String((balance.premium_owed - balance.premium_paid).toFixed(2)))}
                       className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-background text-xs hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                     >
                       تمييز <span className="font-bold">{formatPrice(balance.premium_owed - balance.premium_paid)}</span>
                     </button>
                   )}
                   {balance.total_outstanding > 0 && (
                     <button
                       type="button"
                       onClick={() => setPaymentAmount(String(balance.total_outstanding.toFixed(2)))}
                       className="flex items-center gap-1 px-3 py-1.5 rounded-full border bg-primary/10 border-primary/30 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                     >
                       تحصيل الكل <span>{formatPrice(balance.total_outstanding)}</span>
                     </button>
                   )}
                   {balance.total_outstanding === 0 && (
                     <span className="text-xs text-green-700 font-medium">✓ لا توجد مستحقات معلقة</span>
                   )}
                 </div>
               </div>
             ) : (
               <div className="bg-muted/40 rounded-lg border p-3 text-xs text-muted-foreground">جاري تحميل المستحقات...</div>
             )}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <Label>المبلغ المستلم (ج.م)</Label>
                 {balance && balance.total_outstanding > 0 && (
                   <span className="text-xs text-muted-foreground">الحد الأقصى: <span className="font-semibold text-foreground">{formatPrice(balance.total_outstanding)}</span></span>
                 )}
               </div>
               <Input
                 type="number"
                 placeholder="0.00"
                 value={paymentAmount}
                 min={0}
                 max={balance?.total_outstanding ?? undefined}
                 onChange={(e) => {
                   const val = e.target.value;
                   if (balance && Number(val) > balance.total_outstanding) {
                     setPaymentAmount(String(balance.total_outstanding.toFixed(2)));
                   } else {
                     setPaymentAmount(val);
                   }
                 }}
                 className={balance && Number(paymentAmount) > balance.total_outstanding ? 'border-red-500 focus-visible:ring-red-500' : ''}
               />
               {balance && Number(paymentAmount) > balance.total_outstanding && (
                 <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> المبلغ يتجاوز إجمالي المستحقات</p>
               )}
             </div>
             <div className="space-y-2">
               <Label>ملاحظات (اختياري)</Label>
               <Textarea
                 placeholder="رقم الحوالة، اسم المستلم، إلخ..."
                 value={paymentNotes}
                 onChange={(e) => setPaymentNotes(e.target.value)}
                 rows={3}
               />
             </div>
             <Button
               className="w-full"
               onClick={handleCollectPayment}
               disabled={isLoading || !paymentAmount || Number(paymentAmount) <= 0 || (!!balance && Number(paymentAmount) > balance.total_outstanding)}
             >
                {isLoading ? "جاري الحفظ..." : "تسجيل الدفعة وتخفيض المديونية"}
             </Button>
          </TabsContent>

          <TabsContent value="premium" className="space-y-4 py-4">
             {isPremiumActive && premiumExpiresAt ? (
                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 mb-4 flex items-center justify-between">
                   <div>
                     <p className="font-bold text-green-800">حالة المتجر: مميز (نشط)</p>
                     <p className="text-sm text-green-700">ينتهي في: {new Date(premiumExpiresAt).toLocaleDateString('ar-SA')}</p>
                   </div>
                   <Star className="w-8 h-8 text-green-600 opacity-50 fill-green-600" />
                </div>
             ) : (
                <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 mb-4">
                   <p className="text-sm text-amber-800">
                     قم بترقية المتجر ليظهر في أعلى القائمة. إذا وضعت مبلغ رسوم هنا، سيتم إضافته إلى إيرادات المنصة كدفعة مدفوعة.
                   </p>
                </div>
             )}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>مدة التميز باليوم</Label>
                  <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="7">أسبوع (7 أيام)</SelectItem>
                       <SelectItem value="30">شهر (30 يوم)</SelectItem>
                       <SelectItem value="90">3 شهور (90 يوم)</SelectItem>
                       <SelectItem value="365">سنة (365 يوم)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>رسوم الترقية المحصلة (ر.س)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={premiumAmount} 
                    onChange={(e) => setPremiumAmount(e.target.value)} 
                  />
                </div>
             </div>
             <div className="space-y-2">
               <Label>ملاحظات (اختياري)</Label>
               <Textarea 
                 placeholder="تفاصيل الترقية..." 
                 value={premiumNotes} 
                 onChange={(e) => setPremiumNotes(e.target.value)}
                 rows={2}
               />
             </div>
             <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleGrantPremium} disabled={isLoading}>
                {isLoading ? "جاري التفعيل..." : "تفعيل الاشتراك المميز للمتجر"}
             </Button>
          </TabsContent>

          <TabsContent value="settings" className="space-y-5 py-4">
             {/* Commission Settings */}
             <div className="space-y-3">
               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">إعدادات العمولة</p>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>نسبة عمولة المنصة (%)</Label>
                   <Input
                     type="number"
                     placeholder="10"
                     value={commissionRate}
                     onChange={(e) => setCommissionRate(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>تاريخ بدء الحسابات</Label>
                   <Input
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                   />
                 </div>
               </div>
               <Button className="w-full" variant="secondary" onClick={handleSaveSettings} disabled={isLoading}>
                 {isLoading ? "جاري الحفظ..." : "حفظ إعدادات العمولة"}
               </Button>
             </div>

             <div className="border-t pt-4 space-y-3">
               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">رسوم الاشتراك الشهري</p>
               <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                 أضف رسوماً شهرية ثابتة على المتجر لخدمة المنصة. ستظهر المستحقات فوراً في حساب المتجر وتضاف لكشف الحساب الشهري.
               </div>

               {/* Default fee badge from settings */}
               {settings?.subscription_fee > 0 && (
                 <div className="flex items-center gap-2">
                   <span className="text-xs text-muted-foreground">الرسوم المحددة بالإعدادات:</span>
                   <button
                     type="button"
                     onClick={() => setSubBillingAmount(String(settings.subscription_fee))}
                     className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                   >
                     {formatPrice(settings.subscription_fee)} / شهر
                   </button>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <Label className="text-xs">مبلغ الاشتراك (ج.م)</Label>
                   <Input
                     type="number"
                     placeholder="700"
                     value={subBillingAmount}
                     onChange={(e) => setSubBillingAmount(e.target.value)}
                   />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="text-xs">الشهر</Label>
                   <Input
                     type="month"
                     value={subBillingMonth}
                     onChange={(e) => setSubBillingMonth(e.target.value)}
                   />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs">ملاحظات (اختياري)</Label>
                 <Input
                   placeholder="هاتف التأكيد، رقم الفاتورة..."
                   value={subBillingNotes}
                   onChange={(e) => setSubBillingNotes(e.target.value)}
                 />
               </div>
               <Button
                 className="w-full"
                 onClick={handleBillSubscription}
                 disabled={isLoading || !subBillingAmount || Number(subBillingAmount) <= 0}
               >
                 {isLoading ? "جاري الحفظ..." : `إضافة رسوم اشتراك ${subBillingMonth} لحساب المتجر`}
               </Button>
             </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
    <PrintableShopInvoice report={reportData} />
    </>
  );
}
