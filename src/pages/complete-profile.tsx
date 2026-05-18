import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/store";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle } from "lucide-react";
import { AR } from "@/lib/i18n";

const profileSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  phone: z.string().min(10, "رقم الهاتف يجب أن يكون 10 أرقام على الأقل"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (user?.phone) {
        // If they already have a phone, they don't need to be here
        navigate("/");
      } else if (user) {
        // Pre-fill name if available
        if (user.full_name) {
          setValue("fullName", user.full_name);
        }
      }
    }
  }, [isLoading, isAuthenticated, user, navigate, setValue]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      let formattedPhone = data.phone.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = formattedPhone.substring(1);
      }
      if (formattedPhone.startsWith("20")) {
        formattedPhone = `+${formattedPhone}`;
      } else {
        formattedPhone = `+20${formattedPhone}`;
      }

      // Check for intended role from Google sign-up
      const intendedRole = localStorage.getItem("shopydash_intended_role");

      const updateData: any = {
        full_name: data.fullName,
        phone: formattedPhone,
      };

      if (intendedRole === "SHOP_OWNER") {
        updateData.role = "SHOP_OWNER";
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;
      
      localStorage.removeItem("shopydash_intended_role");
      notify.success("تم استكمال البيانات بنجاح");
      // Force a reload to refresh user data globally
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      notify.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <div className="bg-gradient-to-br from-primary to-primary/80 pt-16 pb-28 px-4 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 inline-flex flex-col items-center gap-4 mb-2">
          <div className="p-4 bg-white rounded-3xl shadow-lg">
            <UserCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-bold text-2xl md:text-3xl text-white tracking-tight text-center max-w-[280px]">
            استكمال البيانات
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-16 sm:-mt-20 w-full max-w-[420px] mx-auto relative z-20 pb-12">
        <div className="bg-card rounded-[2.5rem] p-6 sm:p-8 shadow-2xl mb-8 border border-border/50 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              يرجى إكمال البيانات التالية لمتابعة استخدام التطبيق
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-right">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground ml-1" required>
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                placeholder="أدخل اسمك الكامل"
                error={!!errors.fullName}
                className="rounded-2xl h-[52px] bg-muted/40 border-border/50 focus:bg-background px-4 transition-colors text-right"
                dir="rtl"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive ml-1">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground ml-1" required>
                رقم الهاتف
              </Label>
              <div className="relative flex items-center" dir="ltr">
                <span className="absolute left-4 text-muted-foreground font-medium flex items-center gap-1.5 select-none">
                  <span className="text-lg leading-none">🇪🇬</span>
                  <span className="text-sm mt-0.5">+20</span>
                  <div className="w-px h-5 bg-border ml-1"></div>
                </span>
                <Input
                  id="phone"
                  autoComplete="tel"
                  type="tel"
                  placeholder="1x xxx xxxx"
                  error={!!errors.phone}
                  className="rounded-2xl h-[52px] bg-muted/40 border-border/50 focus:bg-background pl-[5.5rem] pr-4 transition-colors text-left tracking-wide"
                  dir="ltr"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive ml-1">{errors.phone.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-[56px] text-base font-bold shadow-lg shadow-primary/25 mt-4"
              size="lg"
              loading={isSubmitting}
            >
              حفظ ومتابعة
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
