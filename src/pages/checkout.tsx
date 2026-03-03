import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import {
  CreditCard,
  Truck,
  ShoppingBag,
  CheckCircle,
  Phone,
  FileText,
  ArrowLeft,
  Banknote,
  Wallet,
  Clock,
  Store,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LocationSelector } from "@/components/LocationSelector";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useCart, useAuth } from "@/store";
import { orderService } from "@/services";
import { getCurrentUser } from "@/lib/supabase";

const checkoutSchema = z.object({
  address: z.string().min(10, "العنوان يجب أن يكون 10 حروف على الأقل"),
  phone: z.string().min(10, "رقم الهاتف غير صالح"),
  district_id: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cash", "wallet"]),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;
type CheckoutStep = "delivery" | "payment" | "review";

interface LocationData {
  address: string;
  districtId: string | null;
  deliveryFee: number;
  phone?: string;
  lat?: number;
  lng?: number;
}

const STEPS: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
  { id: "delivery", label: "التوصيل", icon: Truck },
  { id: "payment", label: "الدفع", icon: CreditCard },
  { id: "review", label: "المراجعة", icon: FileText },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { cart, cartTotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("delivery");
  const [locationData, setLocationData] = useState<LocationData>({
    address: "",
    districtId: null,
    deliveryFee: 0,
  });
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);
  const [platformFee, setPlatformFee] = useState(0);
  const [isFallbackFee, setIsFallbackFee] = useState(false);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { deliverySettingsService } = await import('@/services/delivery-settings.service');
        const s = await deliverySettingsService.getSettings();
        if (s.is_platform_paused) {
          notify.error("المنصة متوقفة مؤقتاً عن استقبال الطلبات. نأسف للإزعاج.");
          navigate('/');
          return;
        }
        const raw = s.platform_fee_fixed + (cartTotal * s.platform_fee_percent / 100);
        setPlatformFee(Math.round(raw * 100) / 100);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    loadSettings();
  }, [cartTotal, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: user?.phone || "",
      address: "",
      paymentMethod: "cash",
    },
  });

  const watchedValues = watch();
  const deliveryFee = calculatedDeliveryFee;

  const handleLocationChange = (data: LocationData) => {
    setLocationData(data);
    setValue("address", data.address);
    if (data.districtId) setValue("district_id", data.districtId);
    if (data.phone) setValue("phone", data.phone);
  };

  useEffect(() => {
    const calculateFee = async () => {
      if (!locationData.lat || !locationData.lng || !cart?.items?.length) {
        setCalculatedDeliveryFee(null);
        return;
      }
      setIsCalculatingFee(true);
      try {
        const { user: authUser } = await getCurrentUser();
        if (!authUser) return;
        const { calculateMultiStoreCheckout } = await import('@/services/multi-store-checkout.service');
        const calculation = await calculateMultiStoreCheckout({
          userId: authUser.id,
          cartItems: cart.items as any,
          deliveryAddress: locationData.address || "العنوان المحدد على الخريطة",
          deliveryLatitude: locationData.lat,
          deliveryLongitude: locationData.lng,
          customerName: user?.full_name || authUser.email || "عميل",
          customerPhone: watchedValues.phone || "",
          notes: watchedValues.notes,
        });
        if (calculation.validation_errors.length === 0) {
          setCalculatedDeliveryFee(calculation.parent_order_data.total_delivery_fee);
          setIsFallbackFee(calculation.is_fallback);
          if (calculation.is_fallback && calculation.fallback_warning) {
            notify.info(calculation.fallback_warning);
          }
        }
      } catch (error) {
        console.error("Auto calculation error:", error);
      } finally {
        setIsCalculatingFee(false);
      }
    };
    const timer = setTimeout(calculateFee, 500);
    return () => clearTimeout(timer);
  }, [locationData.lat, locationData.lng, cart?.items, watchedValues.phone]);

  const goToStep = async (step: CheckoutStep) => {
    if (step === "payment") {
      const isValid = await trigger(["address", "phone"]);
      if (!isValid) return;
      if (!locationData.address || locationData.address.length < 10) {
        notify.error("يرجى إدخال عنوان صالح (10 حروف على الأقل)");
        return;
      }
      if (!locationData.lat || !locationData.lng) {
        notify.error("يرجى تحديد موقع التوصيل على الخريطة");
        return;
      }
    }
    if (step === "review") {
      const isValid = await trigger();
      if (!isValid) return;
      await calculateDeliveryFeeForReview();
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateDeliveryFeeForReview = async () => {
    if (!cart || !cart.items || cart.items.length === 0) return;
    const { user: authUser } = await getCurrentUser();
    if (!authUser) return;
    const uniqueShops = new Set(cart.items.map(item => item.product?.shop_id).filter(Boolean));
    const isMultiShop = uniqueShops.size > 1 || cart.shop_id === null;
    if (!isMultiShop) {
      setCalculatedDeliveryFee(locationData.deliveryFee);
      setIsFallbackFee(false);
      return;
    }
    try {
      const { calculateMultiStoreCheckout } = await import('@/services/multi-store-checkout.service');
      const calculation = await calculateMultiStoreCheckout({
        userId: authUser.id,
        cartItems: cart.items as any,
        deliveryAddress: locationData.address || watchedValues.address,
        deliveryLatitude: locationData.lat || 0,
        deliveryLongitude: locationData.lng || 0,
        customerName: user?.full_name || authUser.email || "عميل",
        customerPhone: watchedValues.phone,
        notes: watchedValues.notes,
      });
      if (calculation.validation_errors.length > 0) {
        notify.error(calculation.validation_errors[0]);
        return;
      }
      setCalculatedDeliveryFee(calculation.parent_order_data.total_delivery_fee);
      setIsFallbackFee(calculation.is_fallback);
      if (calculation.is_fallback && calculation.fallback_warning) {
        notify.info(calculation.fallback_warning);
      }
    } catch (error) {
      console.error('Fee calculation error:', error);
      setCalculatedDeliveryFee(locationData.deliveryFee);
      setIsFallbackFee(false);
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    if (!cart || !cart.items || cart.items.length === 0) {
      notify.error("السلة فارغة");
      return;
    }
    setIsLoading(true);
    try {
      const { user: authUser } = await getCurrentUser();
      if (!authUser) {
        notify.error("يجب تسجيل الدخول");
        return;
      }
      const uniqueShops = new Set(cart.items.map(item => item.product?.shop_id).filter(Boolean));
      const isMultiShop = uniqueShops.size > 1 || cart.shop_id === null;
      if (isMultiShop) {
        const { calculateMultiStoreCheckout } = await import('@/services/multi-store-checkout.service');
        const calculation = await calculateMultiStoreCheckout({
          userId: authUser.id,
          cartItems: cart.items as any,
          deliveryAddress: locationData.address || data.address,
          deliveryLatitude: locationData.lat || 0,
          deliveryLongitude: locationData.lng || 0,
          customerName: user?.full_name || authUser.email || "عميل",
          customerPhone: data.phone,
          notes: data.notes,
        });
        if (calculation.validation_errors.length > 0) {
          notify.error(calculation.validation_errors[0]);
          return;
        }
        if (calculation.is_fallback && calculation.fallback_warning) {
          notify.warning(calculation.fallback_warning);
        }
        const result = await orderService.createMultiStoreOrder(calculation);
        await clearCart();
        notify.success(AR.checkout.success);
        navigate(`/orders/${result.parent_order_id}`, { replace: true });
      } else {
        const order = await orderService.create({
          userId: authUser.id,
          shopId: cart.shop_id || cart.items[0].product?.shop_id!,
          customerName: user?.full_name || authUser.email || "عميل",
          items: cart.items.map((item) => ({
            productId: item.product_id,
            productName: item.product?.name || "",
            productPrice: item.product?.price || 0,
            quantity: item.quantity,
          })),
          deliveryAddress: locationData.address || data.address,
          deliveryPhone: data.phone,
          notes: data.notes,
          deliveryFee: deliveryFee || 0,
        });
        notify.success(AR.checkout.success);
        navigate(`/orders/${order.id}`, { replace: true });
      }
    } catch (error) {
      console.error(error);
      notify.error("حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-6 text-sm">قم بتسجيل الدخول لإتمام عملية الشراء</p>
          <Link to="/login?redirect=/checkout">
            <Button size="lg" className="w-full">{AR.auth.login}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">{AR.cart.empty}</h2>
          <p className="text-muted-foreground mb-6 text-sm">أضف منتجات إلى سلة التسوق أولاً</p>
          <Link to="/products">
            <Button size="lg" className="w-full">{AR.cart.startShopping}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const totalAmount = cartTotal + (deliveryFee || 0) + platformFee;

  return (
    <div className="min-h-screen bg-muted/30 pb-32 md:pb-8">
      {/* Top Header Bar */}
      <div className="bg-background border-b sticky top-0 z-20">
        <div className="container-app">
          <div className="flex items-center justify-between h-14 md:h-16">
            <h1 className="text-base md:text-lg font-bold">{AR.checkout.title}</h1>

            {/* Steps Indicator — compact for mobile */}
            <div className="flex items-center gap-1 md:gap-2">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < stepIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => isCompleted && goToStep(step.id)}
                      disabled={!isCompleted}
                      className={cn(
                        "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "text-success cursor-pointer hover:bg-success/10",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                        isActive && "bg-white/20",
                        isCompleted && "bg-success/10"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <StepIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <ChevronRight className={cn(
                        "w-3.5 h-3.5 mx-0.5",
                        index < stepIndex ? "text-success" : "text-muted-foreground/40"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-4 md:py-6">
        {/* Mobile: Collapsible Order Summary */}
        <div className="md:hidden mb-4">
          <button
            type="button"
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="w-full bg-background border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {cart.items.length} منتجات
                {cart.shop?.name && <span className="text-muted-foreground"> · {cart.shop.name}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">{formatPrice(totalAmount)}</span>
              <ChevronRight className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                showOrderSummary && "rotate-90"
              )} />
            </div>
          </button>

          {/* Expanded mobile summary */}
          {showOrderSummary && (
            <div className="mt-2 bg-background border rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 space-y-3">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 truncate text-muted-foreground">
                        {item.quantity}× {item.product?.name}
                      </span>
                      <span className="font-medium">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{AR.cart.subtotal}</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{AR.cart.deliveryFee}</span>
                    <span>
                      {isCalculatingFee ? (
                        <span className="text-xs animate-pulse text-muted-foreground">جاري الاحتساب...</span>
                      ) : deliveryFee !== null ? formatPrice(deliveryFee) : "—"}
                    </span>
                  </div>
                  {platformFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رسوم الخدمة</span>
                      <span>{formatPrice(platformFee)}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>{AR.cart.total}</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>وقت التوصيل المتوقع: 30-45 دقيقة</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Layout */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 items-start">

            {/* Left/Top: Step Content */}
            <div className="lg:col-span-2 space-y-4">

              {/* ── Step 1: Delivery ── */}
              {currentStep === "delivery" && (
                <div className="bg-background rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{AR.checkout.deliveryInfo}</h2>
                      <p className="text-xs text-muted-foreground">اختر عنوان التوصيل</p>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-5">
                    <LocationSelector
                      value={{
                        address: watchedValues.address,
                        districtId: watchedValues.district_id,
                        phone: watchedValues.phone,
                      }}
                      onChange={handleLocationChange}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address.message}</p>
                    )}

                    {/* Phone */}
                    <div className="space-y-2 pt-1 border-t">
                      <Label htmlFor="phone" required>
                        <Phone className="w-4 h-4 inline ml-1.5" />
                        {AR.checkout.phone}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        className={cn(errors.phone && "border-destructive")}
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">
                        <FileText className="w-4 h-4 inline ml-1.5" />
                        {AR.checkout.notes}
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder={AR.checkout.notesPlaceholder}
                        className="min-h-[80px]"
                        {...register("notes")}
                      />
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={() => goToStep("payment")}
                    >
                      متابعة للدفع
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Payment ── */}
              {currentStep === "payment" && (
                <div className="bg-background rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{AR.checkout.paymentMethod}</h2>
                      <p className="text-xs text-muted-foreground">اختر طريقة الدفع</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Cash on Delivery */}
                    <label className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      watchedValues.paymentMethod === "cash"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}>
                      <input type="radio" value="cash" {...register("paymentMethod")} className="sr-only" />
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                        watchedValues.paymentMethod === "cash" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{AR.checkout.cashOnDelivery}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">ادفع نقداً عند استلام طلبك</p>
                      </div>
                      {watchedValues.paymentMethod === "cash" && (
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </label>

                    {/* Wallet - Coming Soon */}
                    <label className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-not-allowed opacity-50 border-border bg-muted/20">
                      <input type="radio" value="wallet" disabled className="sr-only" />
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">المحفظة الإلكترونية</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">قريباً</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">فودافون كاش، اتصالات كاش</p>
                      </div>
                    </label>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep("delivery")} className="gap-2">
                        رجوع
                      </Button>
                      <Button type="button" className="flex-1 gap-2" size="lg" onClick={() => goToStep("review")}>
                        مراجعة الطلب
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Review ── */}
              {currentStep === "review" && (
                <div className="bg-background rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">مراجعة الطلب</h2>
                      <p className="text-xs text-muted-foreground">تحقق من تفاصيل طلبك</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Delivery Summary */}
                    <div className="rounded-xl border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          معلومات التوصيل
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep("delivery")}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          تعديل
                        </button>
                      </div>
                      <div className="px-4 py-3 space-y-2 text-sm">
                        <div className="flex gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-muted-foreground leading-relaxed">{locationData.address || watchedValues.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p dir="ltr" className="text-left">{watchedValues.phone}</p>
                        </div>
                        {watchedValues.notes && (
                          <div className="flex gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">{watchedValues.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="rounded-xl border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          طريقة الدفع
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep("payment")}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          تعديل
                        </button>
                      </div>
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Banknote className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{AR.checkout.cashOnDelivery}</p>
                          <p className="text-xs text-muted-foreground">الدفع عند الاستلام</p>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="rounded-xl border overflow-hidden">
                      <div className="px-4 py-3 bg-muted/30 border-b">
                        <span className="text-sm font-semibold">المنتجات ({cart.items.length})</span>
                      </div>
                      <div className="divide-y">
                        {cart.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {item.product?.image_url ? (
                                <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.product?.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.quantity} × {formatPrice(item.product?.price || 0)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-primary flex-shrink-0">
                              {formatPrice((item.product?.price || 0) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep("payment")}>
                        رجوع
                      </Button>
                      <Button type="submit" className="flex-1 gap-2" size="lg" loading={isLoading}>
                        <CheckCircle className="w-5 h-5" />
                        تأكيد الطلب
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Desktop: Order summary sidebar ── */}
            <div className="hidden md:block">
              <div className="sticky top-20 bg-background rounded-2xl border overflow-hidden">
                {/* Shop header */}
                <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {cart.shop?.logo_url ? (
                      <img src={cart.shop.logo_url} alt={cart.shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{cart.shop?.name || "طلبك"}</p>
                    <p className="text-xs text-muted-foreground">{cart.items.length} منتجات</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Items list */}
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="flex-1 truncate text-muted-foreground text-xs">
                          {item.quantity}× {item.product?.name}
                        </span>
                        <span className="font-medium text-xs">
                          {formatPrice((item.product?.price || 0) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Price breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{AR.cart.subtotal}</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{AR.cart.deliveryFee}</span>
                      <span>
                        {isCalculatingFee ? (
                          <span className="text-xs animate-pulse text-muted-foreground">جاري الاحتساب...</span>
                        ) : deliveryFee !== null ? (
                          formatPrice(deliveryFee)
                        ) : (
                          <span className="text-xs text-muted-foreground">بعد تحديد الموقع</span>
                        )}
                      </span>
                    </div>
                    {platformFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رسوم الخدمة</span>
                        <span>{formatPrice(platformFee)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-base">
                    <span>{AR.cart.total}</span>
                    <span className="text-primary">{formatPrice(totalAmount)}</span>
                  </div>

                  {/* Delivery time */}
                  <div className="flex items-center gap-2.5 text-xs bg-muted/50 rounded-xl p-3">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-muted-foreground">وقت التوصيل المتوقع</p>
                      <p className="font-semibold mt-0.5">30-45 دقيقة</p>
                    </div>
                  </div>

                  {isFallbackFee && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5">
                      ⚠ رسوم التوصيل تقريبية وقد تختلف عند التأكيد
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile fixed bottom bar (shows total + CTA) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">{AR.cart.total}</span>
          <span className="font-bold text-primary text-base">{formatPrice(totalAmount)}</span>
        </div>
        {currentStep === "delivery" && (
          <Button type="button" className="w-full" size="lg" onClick={() => goToStep("payment")}>
            متابعة للدفع
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        )}
        {currentStep === "payment" && (
          <Button type="button" className="w-full" size="lg" onClick={() => goToStep("review")}>
            مراجعة الطلب
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        )}
        {currentStep === "review" && (
          <Button
            type="button"
            className="w-full"
            size="lg"
            loading={isLoading}
            onClick={handleSubmit(onSubmit)}
          >
            <CheckCircle className="w-5 h-5 ml-2" />
            تأكيد الطلب
          </Button>
        )}
      </div>
    </div>
  );
}
