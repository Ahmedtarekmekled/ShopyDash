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
import { DollarSign, Settings } from "lucide-react";

interface AdminDriverFinancialsProps {
  driverId: string;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDriverFinancials({ driverId, driverName, isOpen, onClose }: AdminDriverFinancialsProps) {
  const [activeTab, setActiveTab] = useState("payment");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Settings Form
  const [feeType, setFeeType] = useState("PERCENTAGE");
  const [feeRate, setFeeRate] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (isOpen && driverId) {
      loadSettings();
    }
  }, [isOpen, driverId]);

  const loadSettings = async () => {
    try {
      const data = await analyticsService.getDriverFinancialSettings(driverId);
      if (data) {
        setSettings(data);
        setFeeType(data.platform_fee_type || "PERCENTAGE");
        setFeeRate(data.platform_fee_rate?.toString() || "0");
        if (data.financial_start_date) {
            setStartDate(new Date(data.financial_start_date).toISOString().split('T')[0]);
        }
      } else {
         setFeeType("PERCENTAGE");
         setFeeRate("10"); // Default 10%
         setStartDate(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await analyticsService.updateDriverFinancialSettings(driverId, {
        platform_fee_type: feeType,
        platform_fee_rate: parseFloat(feeRate) || 0,
        financial_start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString()
      });
      notify.success("تم تحديث الإعدادات المالية للمندوب");
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
      await analyticsService.insertDriverPayment(
        driverId, 
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>العمليات المالية - المندوب: {driverName}</DialogTitle>
          <DialogDescription className="sr-only">
            إدارة إعدادات رسوم المنصة والمدفوعات الخاصة بهذا المندوب
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" className="gap-2"><DollarSign className="w-4 h-4"/> تحصيل رسوم</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4"/> الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4 py-4">
             <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  سجل المبالغ النقدية أو التحويلات التي استلمتها من المندوب كرسوم للمنصة. سيتم خصم هذا المبلغ فوراً من إجمالي المستحقات.
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

          <TabsContent value="settings" className="space-y-4 py-4">
             <div className="bg-muted p-4 rounded-lg mb-4 text-sm text-muted-foreground leading-relaxed">
               <strong>تاريخ بدء الحسابات:</strong> لن يتم احتساب أي عمولات للطلبات التي تمت قبل هذا التاريخ، مما يمنع تراكم المديونيات القديمة الخاطئة.<br/>
               <strong>طريقة احتساب الرسوم:</strong> يمكنك تحديد نسبة مئوية من رسوم التوصيل أو مبلغ ثابت عن كل طلب. يتم أخذ نسخة ثابتة (Snapshot) على كل طلب فور اكتماله.
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الرسوم</Label>
                  <Select value={feeType} onValueChange={setFeeType}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="PERCENTAGE">نسبة مئوية (%)</SelectItem>
                       <SelectItem value="FLAT">مبلغ ثابت (ر.س)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>قيمة الرسوم</Label>
                  <Input 
                    type="number" 
                    placeholder="10" 
                    value={feeRate} 
                    onChange={(e) => setFeeRate(e.target.value)} 
                  />
                </div>
             </div>
             <div className="space-y-2 mt-4">
               <Label>تاريخ بدء الحسابات المالية</Label>
               <Input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)} 
               />
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
