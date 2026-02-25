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
  ArrowRight,
  Wallet,
  Banknote,
  Package,
  Clock,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Location data from LocationSelector
interface LocationData {
  address: string;
  districtId: string | null;
  deliveryFee: number;
  phone?: string;
  lat?: number;
  lng?: number;
}

const STEPS: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
  { id: "delivery", label: "معلومات التوصيل", icon: Truck },
  { id: "payment", label: "طريقة الدفع", icon: CreditCard },
  { id: "review", label: "مراجعة الطلب", icon: FileText },
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

  useEffect(() => {
    const loadSettings = async () => {
       try {
         const { deliverySettingsService } = await import('@/services/delivery-settings.service');
         const s = await deliverySettingsService.getSettings();

         // 🚨 PLATFORM PAUSE CHECK — Block checkout if platform is paused
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
  // Only show delivery fee if calculated (or if there's a district-based fee fallback for single orders, though we prefer map calculation)
  const deliveryFee = calculatedDeliveryFee;

  // Handle location change from LocationSelector
  const handleLocationChange = (data: LocationData) => {
    setLocationData(data);
    setValue("address", data.address);
    if (data.districtId) {
      setValue("district_id", data.districtId);
    }
    if (data.phone) {
      setValue("phone", data.phone);
    }
  };

  // Trigger Fee Calculation when location changes
  useEffect(() => {
    const calculateFee = async () => {

      
      // Only calculate if we have coordinates and items in cart
      if (!locationData.lat || !locationData.lng || !cart?.items?.length) {

        if (!locationData.lat && locationData.address) {
             // If address is selected but no coords, we rely on the District Fee (which is already set in locationData.deliveryFee)
             // We can optionally set that as the calculated fee if we want to show *something*
             // But usually we wait for Matrix.
             // Let's rely on the user seeing the warning from LocationSelector.
        }
        setCalculatedDeliveryFee(null);
        return;
      }

      setIsCalculatingFee(true);
      try {
        const { user: authUser } = await getCurrentUser();
        if (!authUser) return;

        // Dynamic import to avoid circular dependencies if any
        const { calculateMultiStoreCheckout } = await import('@/services/multi-store-checkout.service');
        
        const calculation = await calculateMultiStoreCheckout({
          userId: authUser.id,
          cartItems: cart.items as any,
          deliveryAddress: locationData.address || "العنوان المحدد على الخريطة", // Use placeholder if empty
          deliveryLatitude: locationData.lat,
          deliveryLongitude: locationData.lng,
          customerName: user?.full_name || authUser.email || "عميل",
          customerPhone: watchedValues.phone || "",
          notes: watchedValues.notes
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

    const timer = setTimeout(() => {
      calculateFee();
    }, 500); // Debounce

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
      // Strict Check: Must have coordinates (from map selection)
      if (!locationData.lat || !locationData.lng) {
        notify.error("يرجى تحديد موقع التوصيل على الخريطة");
        return;
      }
    }
    if (step === "review") {
      const isValid = await trigger();
      if (!isValid) return;
      
      // Calculate delivery fee before review
      await calculateDeliveryFeeForReview();
    }
    setCurrentStep(step);
  };

  const calculateDeliveryFeeForReview = async () => {
    if (!cart || !cart.items || cart.items.length === 0) return;
    
    const { user: authUser } = await getCurrentUser();
    if (!authUser) return;

    // Check if multi-shop
    const uniqueShops = new Set(cart.items.map(item => item.product?.shop_id).filter(Boolean));
    const isMultiShop = uniqueShops.size > 1 || cart.shop_id === null;

    if (!isMultiShop) {
      // Single shop - use district-based fee
      setCalculatedDeliveryFee(locationData.deliveryFee);
      setIsFallbackFee(false);
      return;
    }

    // Multi-shop - calculate with route
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
      // Fallback to district fee on error
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

      // Check if multi-shop cart
      const uniqueShops = new Set(cart.items.map(item => item.product?.shop_id).filter(Boolean));
      const isMultiShop = uniqueShops.size > 1 || cart.shop_id === null;

      if (isMultiShop) {
        // Use new multi-store checkout
        // Use new multi-store checkout
        const { calculateMultiStoreCheckout } = await import('@/services/multi-store-checkout.service');
        
        // Calculate checkout with route/pricing
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

        // Check for validation errors
        if (calculation.validation_errors.length > 0) {
          notify.error(calculation.validation_errors[0]);
          return;
        }

        // Show fallback warning if applicable
        if (calculation.is_fallback && calculation.fallback_warning) {
          notify.warning(calculation.fallback_warning);
        }

        // Create the multi-store order
        // Create the multi-store order
        const result = await orderService.createMultiStoreOrder(calculation);
        
        // Clear cart after successful order
        await clearCart();
        
        notify.success(AR.checkout.success);
        navigate(`/orders/${result.parent_order_id}`, { replace: true });
        
      } else {
        // Legacy single-shop order
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

        // setOrderComplete(...) removed
        
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
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-4">
              قم بتسجيل الدخول لإتمام عملية الشراء
            </p>
            <Link to="/login?redirect=/checkout">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{AR.cart.empty}</h2>
            <p className="text-muted-foreground mb-4">
              أضف منتجات إلى سلة التسوق أولاً
            </p>
            <Link to="/products">
              <Button>{AR.cart.startShopping}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }



  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.checkout.title}</h1>
          <p className="text-muted-foreground mt-1">أكمل طلبك في خطوات بسيطة</p>
        </div>

        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
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
                      "flex flex-col items-center gap-2 transition-colors",
                      isCompleted && "cursor-pointer"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        isActive &&
                          "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                        isCompleted && "bg-success text-success-foreground",
                        !isActive &&
                          !isCompleted &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium hidden sm:block",
                        isActive && "text-primary",
                        isCompleted && "text-success",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-16 sm:w-24 h-1 mx-2 rounded-full transition-colors",
                        index < stepIndex ? "bg-success" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Delivery Info */}
              {currentStep === "delivery" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      {AR.checkout.deliveryInfo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Location Selector */}
                    <LocationSelector
                      value={{
                        address: watchedValues.address,
                        districtId: watchedValues.district_id,
                        phone: watchedValues.phone,
                      }}
                      onChange={handleLocationChange}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">
                        {errors.address.message}
                      </p>
                    )}

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" required>
                        <Phone className="w-4 h-4 inline ml-1" />
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
                        <p className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">
                        <FileText className="w-4 h-4 inline ml-1" />
                        {AR.checkout.notes}
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder={AR.checkout.notesPlaceholder}
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
                      <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Payment Method */}
              {currentStep === "payment" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      {AR.checkout.paymentMethod}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cash on Delivery */}
                    <label
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        watchedValues.paymentMethod === "cash"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="radio"
                        value="cash"
                        {...register("paymentMethod")}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          watchedValues.paymentMethod === "cash"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {AR.checkout.cashOnDelivery}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ادفع نقداً عند استلام طلبك
                        </p>
                      </div>
                      {watchedValues.paymentMethod === "cash" && (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      )}
                    </label>

                    {/* Wallet - Coming Soon */}
                    <label
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-not-allowed opacity-60 transition-all",
                        "border-border bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        value="wallet"
                        disabled
                        className="sr-only"
                      />
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">المحفظة الإلكترونية</p>
                          <Badge variant="secondary">قريباً</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          فودافون كاش، اتصالات كاش، أورانج كاش
                        </p>
                      </div>
                    </label>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("delivery")}
                      >
                        رجوع
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        size="lg"
                        onClick={() => goToStep("review")}
                      >
                        مراجعة الطلب
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Review Order */}
              {currentStep === "review" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      مراجعة الطلب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Delivery Summary */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          معلومات التوصيل
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentStep("delivery")}
                        >
                          تعديل
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">
                            العنوان:
                          </span>{" "}
                          {locationData.address || watchedValues.address}
                        </p>
                        <p dir="ltr" className="text-left">
                          <span className="text-muted-foreground float-right mr-1">
                            الهاتف:
                          </span>{" "}
                          {watchedValues.phone}
                        </p>
                        {watchedValues.notes && (
                          <p>
                            <span className="text-muted-foreground">
                              ملاحظات:
                            </span>{" "}
                            {watchedValues.notes}
                          </p>
                        )}
                        <p>
                          <span className="text-muted-foreground">
                            رسوم التوصيل:
                          </span>{" "}
                          <span className="font-medium text-primary">
                            {isCalculatingFee ? (
                              <span className="text-xs animate-pulse">جاري الاحتساب...</span>
                            ) : deliveryFee !== null ? (
                              formatPrice(deliveryFee)
                            ) : (
                              <span className="text-xs text-muted-foreground">يتم التحديد عند اختيار الموقع</span>
                            )}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          طريقة الدفع
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentStep("payment")}
                        >
                          تعديل
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {AR.checkout.cashOnDelivery}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            الدفع عند الاستلام
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">
                        المنتجات ({cart.items.length})
                      </h4>
                      <div className="space-y-3">
                        {cart.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {item.product?.image_url ? (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.product?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} ×{" "}
                                {formatPrice(item.product?.price || 0)}
                              </p>
                            </div>
                            <span className="font-bold text-primary">
                              {formatPrice(
                                (item.product?.price || 0) * item.quantity
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("payment")}
                      >
                        رجوع
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        size="lg"
                        loading={isLoading}
                      >
                        <CheckCircle className="w-5 h-5 ml-2" />
                        تأكيد الطلب
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-24">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted">
                      {cart.shop?.logo_url ? (
                        <img
                          src={cart.shop.logo_url}
                          alt={cart.shop.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {cart.shop?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {cart.items.length} منتجات
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mini Cart Items */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate flex-1 ml-2">
                          {item.quantity}× {item.product?.name}
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            (item.product?.price || 0) * item.quantity
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {AR.cart.subtotal}
                      </span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {AR.cart.deliveryFee}
                      </span>
                      <span>{formatPrice(deliveryFee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        رسوم الخدمة
                      </span>
                      <span>{formatPrice(platformFee)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>{AR.cart.total}</span>
                    <span className="text-primary">
                      {formatPrice(cartTotal + (deliveryFee || 0) + platformFee)}
                    </span>
                  </div>

                  {/* Estimated Delivery */}
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      وقت التوصيل المتوقع:
                    </span>
                    <span className="font-medium">30-45 دقيقة</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
