import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import {
  Eye,
  EyeOff,
  Store,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { useAuth } from "@/store";
import { signInWithGoogle } from "@/lib/supabase";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email(AR.validation.email),
  password: z.string().min(6, AR.validation.minLength.replace("{min}", "6")),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  // Email verification state
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Success messages from URL params
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");
    if (verified === "true") {
      setSuccessMessage("تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.");
    }
    if (reset === "true") {
      setSuccessMessage("تم تغيير كلمة المرور بنجاح! سجّل الدخول بكلمة المرور الجديدة.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const startCooldown = () => {
    setResendCooldown(60);
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

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error } = await authService.resendVerification(unverifiedEmail);
      if (error) {
        notify.error("فشل إعادة إرسال رسالة التأكيد");
      } else {
        notify.success("تم إعادة إرسال رسالة التأكيد");
        startCooldown();
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setShowVerificationAlert(false);
    setSuccessMessage("");
    try {
      const { error, user } = await login(
        data.email.trim().toLowerCase(),
        data.password
      );
      if (error) {
        // Check for email not verified
        if (error.message === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email.trim().toLowerCase());
          setShowVerificationAlert(true);
          setIsLoading(false);
          return;
        }

        // Map common errors to Arabic
        const errorMap: Record<string, string> = {
          "Invalid login credentials": "بيانات الدخول غير صحيحة",
          "Email not confirmed": "يرجى تأكيد البريد الإلكتروني",
        };
        const message =
          errorMap[error.message] || error.message || "فشل تسجيل الدخول";
        notify.error(message);
        setIsLoading(false);
        return;
      }
      notify.success(AR.auth.loginSuccess);
      setIsLoading(false);

      // Redirect based on user role or redirect param
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        navigate(redirectTo);
      } else if (user?.role === "SHOP_OWNER" || user?.role === "ADMIN") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
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
            <CardTitle className="text-2xl">{AR.auth.login}</CardTitle>
            <CardDescription>أدخل بياناتك للدخول إلى حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Success message */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Email not verified alert */}
            {showVerificationAlert && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      البريد الإلكتروني غير مُفعّل
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      يرجى التحقق من بريدك الإلكتروني والضغط على رابط التأكيد.
                      تحقق من مجلد البريد غير المرغوب فيه (Spam).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || isResending}
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`}
                  />
                  {resendCooldown > 0
                    ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                    : "إعادة إرسال رسالة التأكيد"}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {AR.auth.forgotPassword}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                {AR.auth.login}
              </Button>
            </form>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">
                أو
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              تسجيل الدخول بجوجل
            </Button>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {AR.auth.noAccount}{" "}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  {AR.auth.registerNow}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
