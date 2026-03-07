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

// Strong password: 8+ chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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
        "يجب أن تحتوي على حرف كبير، حرف صغير، ورقم واحد على الأقل"
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
      const { error, needsVerification } = await registerUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
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

  // ─── Verification Success Screen ─────────────────────────────────────────
  if (showVerification) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold">تحقق من بريدك الإلكتروني</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تم إرسال رابط التأكيد إلى
                  <br />
                  <span className="font-medium text-foreground" dir="ltr">
                    {registeredEmail}
                  </span>
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">💡 لم تجد الرسالة؟</p>
                <p className="text-xs">
                  تحقق من مجلد <strong>البريد غير المرغوب فيه (Spam)</strong> أو{" "}
                  <strong>Junk</strong>
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
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
                  <p className="text-xs text-muted-foreground">
                    المحاولات المتبقية: {MAX_RESEND_ATTEMPTS - resendCount} من{" "}
                    {MAX_RESEND_ATTEMPTS}
                  </p>
                )}

                <Link to="/login">
                  <Button variant="ghost" className="w-full mt-2">
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Registration Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Store className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">{AR.app.name}</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{AR.auth.register}</CardTitle>
            <CardDescription>أنشئ حسابك الجديد للبدء</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={accountType}
              onValueChange={(v) =>
                setAccountType(v as "customer" | "shop_owner")
              }
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer">عميل</TabsTrigger>
                <TabsTrigger value="shop_owner">صاحب متجر</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" required>
                  {AR.auth.fullName}
                </Label>
                <Input
                  id="fullName"
                  placeholder="أدخل اسمك الكامل"
                  error={!!errors.fullName}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>
                  {AR.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  error={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{AR.auth.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" required>
                  {AR.auth.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    error={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  8 أحرف على الأقل • حرف كبير • حرف صغير • رقم
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" required>
                  {AR.auth.confirmPassword}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                {AR.auth.register}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {AR.auth.hasAccount}{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  {AR.auth.loginNow}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
