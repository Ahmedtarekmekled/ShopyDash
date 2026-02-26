import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { analyticsService } from "@/services/analytics.service";
import { DollarSign, Settings, Star, History } from "lucide-react";

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

  useEffect(() => {
    if (isOpen && shopId) {
      loadSettings();
    }
  }, [isOpen, shopId]);

  const loadSettings = async () => {
    try {
      const data = await analyticsService.getShopFinancialSettings(shopId);
      if (data) {
        setSettings(data);
        setCommissionRate(data.commission_percentage?.toString() || "0");
        setSubFee(data.subscription_fee?.toString() || "0");
        // Format for input type="date"
        if (data.financial_start_date) {
            setStartDate(new Date(data.financial_start_date).toISOString().split('T')[0]);
        }
      } else {
         // Defaults if none exist
         setCommissionRate("10"); // Example default 10%
         setSubFee("0");
         setStartDate(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error(e);
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
      notify.success("تم تحديث الإعدادات المالية للمتجر");
    } catch (error) {
       notify.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      notify.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    setIsLoading(true);
    try {
      await analyticsService.insertCommissionPayment(
        shopId, 
        parseFloat(paymentAmount), 
        paymentNotes || "تم التحصيل يدوياً من قبل الإدارة"
      );
      notify.success("تم تسجيل الدفعة بنجاح وخصمها من المستحقات");
      setPaymentAmount("");
      setPaymentNotes("");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>العمليات المالية - {shopName}</DialogTitle>
          <DialogDescription className="sr-only">
            إدارة إعدادات العمولة والاشتراكات مميزة والمدفوعات الخاصة بهذا المتجر
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment" className="gap-2"><DollarSign className="w-4 h-4"/> تحصيل دفعة</TabsTrigger>
            <TabsTrigger value="premium" className="gap-2"><Star className="w-4 h-4"/> ترقية المتجر</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4"/> الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4 py-4">
             <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  سجل الدفعات النقدية أو التحويلات التي استلمتها من المتجر. سيتم خصم هذا المبلغ فوراً من إجمالي المستحقات.
                </p>
             </div>
             <div className="space-y-2">
               <Label>المبلغ المستلم (ر.س)</Label>
               <Input 
                 type="number" 
                 placeholder="0.00" 
                 value={paymentAmount} 
                 onChange={(e) => setPaymentAmount(e.target.value)} 
               />
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
             <Button className="w-full" onClick={handleCollectPayment} disabled={isLoading}>
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

          <TabsContent value="settings" className="space-y-4 py-4">
             <div className="bg-muted p-4 rounded-lg mb-4 text-sm text-muted-foreground leading-relaxed">
               <strong>تاريخ بدء الحسابات:</strong> لن يتم احتساب أي عمولات للطلبات التي تمت قبل هذا التاريخ، مما يمنع تراكم المديونيات القديمة الخاطئة.<br/>
               <strong>نسبة العمولة:</strong> يتم أخذ نسخة ثابتة (Snapshot) من هذه النسبة على كل طلب فور اكتماله.
             </div>
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
                  <Label>تاريخ بدء الحسابات المالية</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
             </div>
             <Button className="w-full mt-4" variant="secondary" onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? "جاري الحفظ..." : "حفظ الإعدادات المالية"}
             </Button>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
