import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Store,
  Truck,
  Star,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/app-context";
import { Category } from "@/types/database";
import { categoriesService, shopsService } from "@/services";
import { ShopCard } from "@/components/ShopCard";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('home-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  
  // Fetch all categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  const shopCategories = categories?.filter(c => c.type === 'SHOP') || [];

  // Only fetch premium shops for the home page
  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["shops", "premium-home"],
    queryFn: () => shopsService.getRankedShops({ limit: 6, premiumOnly: true }),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/10 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 blur-3xl rounded-full opacity-60 animate-pulse mix-blend-multiply pointer-events-none" />
        
        <div className="container-app relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
            <Badge variant="secondary" className="mb-4 md:mb-6 px-4 py-1.5 text-xs md:text-sm rounded-full bg-background/80 backdrop-blur-md border border-primary/20 shadow-sm text-foreground">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 ml-2 text-primary" />
              منصة التسوق المحلية الأولى
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-balance leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-primary/70">تسوق</span> من متاجرك المحلية{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-secondary/70">بسهولة</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed opacity-90">
              اكتشف أفضل المنتجات من المتاجر المحلية في منطقتك واحصل عليها بأسرع وقت
            </p>
            <div className="flex flex-row gap-3 justify-center pt-4 md:pt-8 px-4">
              <Link to="/products" className="flex-1 sm:flex-none">
                <Button size="lg" className="w-full gap-2 text-sm sm:text-base h-12 md:h-14 px-4 sm:px-8 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1">
                  <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden xs:inline">تصفح المنتجات</span>
                  <span className="xs:hidden">المنتجات</span>
                </Button>
              </Link>
              <Link to="/shops" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 text-sm sm:text-base h-12 md:h-14 px-4 sm:px-8 rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background transition-all hover:-translate-y-1"
                >
                  <Store className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden xs:inline">استكشف المتاجر</span>
                  <span className="xs:hidden">المتاجر</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Minimalist (Horizontal Scroll on Mobile) */}
        <div className="container-app mt-10 md:mt-16 relative z-10 hidden sm:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Store, title: "متاجر موثوقة", desc: "متاجر محلية معتمدة" },
              { icon: Truck, title: "توصيل سريع", desc: "أسرع وقت لتوصيل طلبك" },
              { icon: Star, title: "جودة مضمونة", desc: "منتجات عالية الجودة" },
            ].map((feature, i) => (
              <Card
                key={i}
                className="flex items-center gap-4 p-4 md:p-5 bg-background/70 backdrop-blur-xl border-primary/5 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 rounded-2xl"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-primary flex items-center justify-center shadow-inner shadow-white/20">
                  <feature.icon className="w-6 h-6 text-primary-foreground drop-shadow-sm" />
                </div>
                <div className="text-right">
                  <h2 className="font-bold text-lg mb-0.5 text-foreground">{feature.title}</h2>
                  <p className="text-muted-foreground text-sm line-clamp-1">{feature.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Mobile Horizontal Scrolling Pills */}
        <div className="mt-8 relative z-10 sm:hidden">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x pb-4 px-4" dir="rtl">
            {[
              { icon: Store, title: "متاجر موثوقة" },
              { icon: Truck, title: "توصيل سريع" },
              { icon: Star, title: "جودة مضمونة" },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 pr-2 pl-4 py-2 bg-background/80 backdrop-blur-lg border border-primary/10 shadow-sm rounded-full shrink-0 snap-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold text-sm text-foreground">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Wave Divider at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-0 rotate-180">
          <svg className="relative block w-[calc(110%+1.3px)] h-[40px] md:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-background"></path>
          </svg>
        </div>
      </section>

      {/* Shop Categories Horizontal Bar */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative">
        <div className="absolute inset-0 bg-grid-primary/[0.02] bg-[size:32px_32px]" />
        <div className="container-app relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">تصفح المتاجر حسب النوع</h2>
              <p className="text-muted-foreground mt-2 text-lg">اختر نوع المتجر المناسب لك</p>
            </div>
          </div>
          
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 pb-6 pt-2" dir="rtl">
              {categoriesLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-44 rounded-3xl flex-shrink-0" />
                ))
              ) : (
                shopCategories.map((category, i) => (
                  <Link
                    key={category.id}
                    to={`/shops?category=${category.slug}`}
                    className="group flex-shrink-0 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Card 
                      interactive 
                      className="h-36 w-44 rounded-3xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 border-primary/10"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 group-hover:from-primary/15 group-hover:to-secondary/15 transition-all duration-500" />
                      <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-16 h-16 mb-3 rounded-full bg-white/50 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-3xl">{category.icon || "🏪"}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-foreground/90 leading-tight line-clamp-2">{category.name}</h3>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Shops Section - Only show if there are shops or loading */}
      {(shopsLoading || (shops && shops.length > 0)) && (
        <>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent relative z-20" />

          <section className="py-24 bg-gradient-to-br from-primary/5 via-primary/5 to-secondary/5 relative">
            <div className="absolute inset-0 bg-white/40" />
            <div className="container-app relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    {AR.shops.featured}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-lg">
                    أفضل المتاجر المحلية وتقييماتها
                  </p>
                </div>
                <Link to="/shops">
                  <Button variant="ghost" className="gap-2 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                    {AR.common.viewAll}
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {shopsLoading
                  ? Array(3).fill(0).map((_, i) => (
                      <Card key={i} className="p-8 rounded-3xl border-primary/10">
                        <div className="flex items-center gap-6">
                          <Skeleton className="w-20 h-20 rounded-2xl" />
                          <div className="flex-1 space-y-3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                      </Card>
                    ))
                  : shops && shops.length > 0 ? (
                      shops.map((shop: any, i: number) => (
                        <ShopCard key={shop.id} shop={shop} index={i} />
                      ))
                    ) : null}
              </div>
            </div>
          </section>
        </>
      )}

      {/* App Coming Soon Banner */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-background">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent opacity-70 pointer-events-none blur-3xl" />
        
        <div className="container-app relative z-10 px-4 md:px-0">
          <div className="bg-gradient-to-br from-primary/5 via-white to-secondary/5 border border-primary/10 rounded-[32px] p-8 md:p-12 shadow-2xl shadow-primary/5 flex flex-col md:flex-row items-center justify-between gap-10 backdrop-blur-sm relative overflow-hidden">
            {/* Soft decor inside box */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/10 rounded-full blur-[60px] pointer-events-none" />

            <div className="text-center md:text-right flex-1 relative z-10">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors rounded-full px-5 py-1.5 text-sm">
                قريباً جداً
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
                تطبيق شوبي داش على هاتفك
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto md:mx-0 leading-relaxed">
                قريباً على متجر App Store و Google Play. اكتشف العروض وتتبع طلبك بسهولة من أي مكان.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 relative z-10">
              {/* App Store button */}
              <div className="flex items-center gap-3 bg-white border border-primary/15 rounded-2xl px-6 py-4 cursor-not-allowed shadow-sm opacity-90 transition-transform hover:-translate-y-1">
                <svg viewBox="0 0 24 24" className="w-9 h-9 text-slate-800 fill-current drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-slate-800 text-right">
                  <p className="text-[11px] text-slate-500 font-medium">قريباً على</p>
                  <p className="font-bold text-base leading-tight">App Store</p>
                </div>
              </div>
              
              {/* Google Play button */}
              <div className="flex items-center gap-3 bg-white border border-primary/15 rounded-2xl px-6 py-4 cursor-not-allowed shadow-sm opacity-90 transition-transform hover:-translate-y-1">
                <Smartphone className="w-9 h-9 text-primary drop-shadow-sm" />
                <div className="text-slate-800 text-right">
                  <p className="text-[11px] text-slate-500 font-medium">قريباً على</p>
                  <p className="font-bold text-base leading-tight">Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Banner / CTA Separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent relative z-20" />

      {/* CTA Section - Only visible to unauthenticated users */}
      {!user && (
        <section className="py-12 md:py-20 relative overflow-hidden bg-background">
          <div className="container-app text-center relative z-10 px-4 md:px-0">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5 rounded-[40px] p-10 md:p-16 border border-primary/20 shadow-2xl shadow-primary/5 relative overflow-hidden">
               {/* Decorative background vectors inside the box */}
               <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
               <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-secondary/20 rounded-full blur-[80px] pointer-events-none" />
               
               <div className="relative z-10 max-w-3xl mx-auto">
                 <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white mb-8 shadow-xl shadow-primary/10 text-primary">
                   <Store className="w-10 h-10" />
                 </div>
                 <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground tracking-tight text-balance">
                   هل أنت صاحب متجر؟
                 </h2>
                 <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-medium leading-relaxed">
                   انضم إلى منصتنا وابدأ في بيع منتجاتك لآلاف العملاء في منطقتك. ضاعف مبيعاتك اليوم!
                 </p>
                 <Link to="/register?role=shop_owner">
                   <Button size="xl" className="gap-3 text-lg h-16 px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-xl shadow-primary/25 font-bold">
                     <Store className="w-6 h-6" />
                     سجل متجرك مجاناً
                   </Button>
                 </Link>
               </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
