import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";

// Strong password: 8+ chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const resetSchema = z
  .object({
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
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verify we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
          // No session — invalid or expired token
          notify.error("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
          navigate("/forgot-password");
        }
      } catch {
        navigate("/forgot-password");
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    setIsLoading(true);
    try {
      const { error } = await authService.resetPassword(data.password);
      if (error) {
        notify.error(error.message || "فشل تغيير كلمة المرور");
        return;
      }
      // resetPassword calls globalSignOut internally
      notify.success("تم تغيير كلمة المرور بنجاح");
      navigate("/login?reset=true");
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isValidSession) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              تعيين كلمة مرور جديدة
            </CardTitle>
            <CardDescription>
              أدخل كلمة المرور الجديدة لحسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" required>
                  كلمة المرور الجديدة
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
                  تأكيد كلمة المرور
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
                className="w-full gap-2"
                size="lg"
                loading={isLoading}
              >
                <ShieldCheck className="w-4 h-4" />
                تغيير كلمة المرور
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              سيتم تسجيل خروجك من جميع الأجهزة بعد التغيير
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
