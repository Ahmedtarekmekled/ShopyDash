import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, MailCheck, ArrowRight } from "lucide-react";
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
import { AR } from "@/lib/i18n";
import { authService } from "@/services/auth.service";

const forgotSchema = z.object({
  email: z.string().email(AR.validation.email),
});

type ForgotForm = z.infer<typeof forgotSchema>;

const COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: ForgotForm) => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      // Always returns success (anti-enumeration)
      await authService.forgotPassword(data.email.trim().toLowerCase());
      setShowSuccess(true);
      startCooldown();
    } finally {
      setIsLoading(false);
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
            <CardTitle className="text-2xl">استعادة كلمة المرور</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showSuccess ? (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <MailCheck className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">تم إرسال رابط الاستعادة</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي
                    على رابط لإعادة تعيين كلمة المرور.
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                  <p className="text-xs">
                    💡 تحقق من مجلد{" "}
                    <strong>البريد غير المرغوب فيه (Spam)</strong>
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSuccess(false)}
                    disabled={cooldown > 0}
                  >
                    {cooldown > 0
                      ? `إعادة الإرسال بعد ${cooldown} ثانية`
                      : "إعادة الإرسال"}
                  </Button>
                  <Link to="/login">
                    <Button variant="ghost" className="w-full gap-2">
                      <ArrowRight className="w-4 h-4" />
                      العودة لتسجيل الدخول
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" required>
                      البريد الإلكتروني
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

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={isLoading}
                    disabled={cooldown > 0}
                  >
                    إرسال رابط الاستعادة
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
