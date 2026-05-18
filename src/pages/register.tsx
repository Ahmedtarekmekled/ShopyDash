import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { Eye, EyeOff, Store, MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { useAuth } from "@/store";
import { authService } from "@/services/auth.service";
import { signInWithGoogle } from "@/lib/supabase";

// Simplified password: 8+ chars, at least one letter and one number
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

const registerSchema = z
  .object({
    fullName: z.string().min(2, AR.validation.minLength.replace("{min}", "2")),
    email: z.string().email(AR.validation.email),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .regex(
        passwordRegex,
        "يجب أن تحتوي على حروف وأرقام"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AR.validation.passwordMatch,
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const MAX_RESEND_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [accountType, setAccountType] = useState<"customer" | "shop_owner">(
    searchParams.get("role") === "shop_owner" ? "shop_owner" : "customer"
  );

  // Verification screen state
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'SHOP_OWNER' || user.role === 'ADMIN') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Cooldown timer
  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendCount >= MAX_RESEND_ATTEMPTS || isResending)
      return;

    setIsResending(true);
    try {
      const { error } = await authService.resendVerification(registeredEmail);
      if (error) {
        notify.error("فشل إعادة إرسال رسالة التأكيد");
      } else {
        notify.success("تم إعادة إرسال رسالة التأكيد");
        setResendCount((prev) => prev + 1);
        startCooldown();
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      let formattedPhone = data.phone;
      if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
          formattedPhone = formattedPhone.substring(1);
        }
        if (formattedPhone.startsWith("20")) {
          formattedPhone = `+${formattedPhone}`;
        } else {
          formattedPhone = `+20${formattedPhone}`;
        }
      }

      const { error, needsVerification } = await registerUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        fullName: data.fullName,
        phone: formattedPhone,
        role: accountType === "shop_owner" ? "SHOP_OWNER" : "CUSTOMER",
      });
      if (error) {
        const errorMap: Record<string, string> = {
          "User already registered": "البريد الإلكتروني مسجل بالفعل",
          "البريد الإلكتروني مسجل بالفعل": "البريد الإلكتروني مسجل بالفعل",
          "Invalid email": "البريد الإلكتروني غير صالح",
          "Password should be at least 6 characters":
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        };
        const message =
          errorMap[error.message] || error.message || "فشل إنشاء الحساب";
        notify.error(message);
        return;
      }

      if (needsVerification) {
        setRegisteredEmail(data.email.trim().toLowerCase());
        setShowVerification(true);
        return;
      }

      // If no verification needed (email confirmation disabled)
      notify.success(AR.auth.registerSuccess);
      navigate(accountType === "shop_owner" ? "/dashboard" : "/");
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    // Save intended role so we can apply it when they complete their profile
    localStorage.setItem("shopydash_intended_role", accountType === "shop_owner" ? "SHOP_OWNER" : "CUSTOMER");
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        notify.error(error.message || "فشل تسجيل الدخول بجوجل");
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Verification Success Screen ─────────────────────────────────────────
  if (showVerification) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
        <div className="bg-gradient-to-br from-primary to-primary/80 pt-16 pb-28 px-4 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 inline-flex flex-col items-center gap-4 mb-2">
            <div className="p-4 bg-white rounded-3xl shadow-lg">
              <MailCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-bold text-2xl md:text-3xl text-white tracking-tight text-center max-w-[280px]">
              تحقق من بريدك
            </h1>
          </div>
        </div>

        <div className="flex-1 px-4 -mt-16 sm:-mt-20 w-full max-w-[420px] mx-auto relative z-20 pb-12">
          <div className="bg-card rounded-[2.5rem] p-6 sm:p-8 shadow-2xl mb-8 border border-border/50 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                تم إرسال رابط التأكيد إلى
                <br />
                <span className="font-medium text-foreground block mt-2 text-base" dir="ltr">
                  {registeredEmail}
                </span>
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">💡 لم تجد الرسالة؟</p>
              <p className="text-xs">
                تحقق من مجلد <strong>البريد غير المرغوب فيه (Spam)</strong> أو{" "}
                <strong>Junk</strong>
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl h-[52px]"
                onClick={handleResend}
                disabled={
                  resendCooldown > 0 ||
                  resendCount >= MAX_RESEND_ATTEMPTS ||
                  isResending
                }
              >
                <RefreshCw
                  className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
                />
                {resendCooldown > 0
                  ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                  : resendCount >= MAX_RESEND_ATTEMPTS
                    ? "تم استنفاد المحاولات"
                    : "إعادة إرسال رسالة التأكيد"}
              </Button>

              {resendCount > 0 && resendCount < MAX_RESEND_ATTEMPTS && (
                <p className="text-xs text-muted-foreground font-medium">
                  المحاولات المتبقية: {MAX_RESEND_ATTEMPTS - resendCount} من{" "}
                  {MAX_RESEND_ATTEMPTS}
                </p>
              )}

              <Link to="/login" className="block w-full">
                <Button variant="ghost" className="w-full mt-2 rounded-xl h-12 text-muted-foreground hover:text-foreground">
                  العودة لتسجيل الدخول
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 pt-16 pb-28 px-4 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-4 w-12 h-12 border-2 border-white/20 rounded-full"></div>
        <div className="absolute top-1/4 right-8 w-6 h-6 bg-white/20 rounded-full"></div>
        
        <Link to="/" className="relative z-10 inline-flex flex-col items-center gap-4 mb-2">
          <div className="p-3 bg-white rounded-2xl shadow-lg">
            <img src="/logo.png" alt="Shopydash Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="font-bold text-3xl md:text-4xl text-white tracking-tight text-center max-w-[320px]" style={{ fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif" }}>
            إنشاء حساب في <br /> Shopydash
          </h1>
        </Link>
      </div>

      {/* Bottom Form Section */}
      <div className="flex-1 px-4 -mt-16 sm:-mt-20 w-full max-w-[420px] mx-auto relative z-20 pb-8">
        <div className="bg-card rounded-[2rem] p-5 sm:p-7 shadow-2xl mb-6 border border-border/50">
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-foreground">{AR.auth.register}</h2>
            <p className="text-muted-foreground text-xs mt-1.5">أنشئ حسابك الجديد للبدء</p>
          </div>

          <Tabs
            value={accountType}
            onValueChange={(v) =>
              setAccountType(v as "customer" | "shop_owner")
            }
            className="mb-5"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl h-11">
              <TabsTrigger value="customer" className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs h-full">عميل</TabsTrigger>
              <TabsTrigger value="shop_owner" className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs h-full">صاحب متجر</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground ml-1" required>
                {AR.auth.fullName}
              </Label>
              <Input
                id="fullName"
                autoComplete="name"
                placeholder="أدخل اسمك الكامل"
                error={!!errors.fullName}
                className="rounded-xl h-11 bg-muted/40 border-border/50 focus:bg-background px-3 transition-colors text-right text-sm"
                dir="rtl"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive ml-1">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground ml-1" required>
                {AR.auth.email}
              </Label>
              <Input
                id="email"
                autoComplete="email"
                type="email"
                placeholder="example@email.com"
                error={!!errors.email}
                className="rounded-xl h-11 bg-muted/40 border-border/50 focus:bg-background px-3 transition-colors text-right text-sm"
                dir="rtl"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground ml-1">{AR.auth.phone}</Label>
              <div className="relative flex items-center" dir="ltr">
                <span className="absolute left-3 text-muted-foreground font-medium flex items-center gap-1 select-none">
                  <span className="text-base leading-none">🇪🇬</span>
                  <span className="text-xs mt-0.5">+20</span>
                  <div className="w-px h-4 bg-border ml-1"></div>
                </span>
                <Input
                  id="phone"
                  autoComplete="tel"
                  type="tel"
                  placeholder="1x xxx xxxx"
                  className="rounded-xl h-11 bg-muted/40 border-border/50 focus:bg-background pl-20 pr-3 transition-colors text-left tracking-wide text-sm"
                  dir="ltr"
                  {...register("phone")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground ml-1" required>
                {AR.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  error={!!errors.password}
                  className="rounded-xl h-11 bg-muted/40 border-border/50 focus:bg-background px-3 pl-10 transition-colors text-right text-sm"
                  dir="rtl"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive ml-1">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground ml-1 font-medium">
                8 أحرف على الأقل • حروف وأرقام
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground ml-1" required>
                {AR.auth.confirmPassword}
              </Label>
              <Input
                id="confirmPassword"
                autoComplete="new-password"
                type="password"
                placeholder="••••••••"
                error={!!errors.confirmPassword}
                className="rounded-xl h-11 bg-muted/40 border-border/50 focus:bg-background px-3 transition-colors text-right text-sm"
                dir="rtl"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive ml-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-12 text-sm font-bold shadow-lg shadow-primary/25 mt-2"
              size="lg"
              loading={isLoading}
            >
              {AR.auth.register}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-3 text-muted-foreground">أو</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full h-11 text-sm font-medium border-border/60 hover:bg-muted/50 transition-colors"
            size="default"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <span className="animate-spin mr-3">⏳</span>
            ) : (
              <svg className="w-5 h-5 ml-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            التسجيل باستخدام جوجل
          </Button>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              {AR.auth.hasAccount}{" "}
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-bold transition-colors"
              >
                {AR.auth.loginNow}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
