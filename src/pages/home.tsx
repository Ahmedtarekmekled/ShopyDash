import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Store,
  Truck,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Category } from "@/types/database";
import { categoriesService, productsService, shopsService } from "@/services";
import { ShopCard } from "@/components/ShopCard";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const queryClient = useQueryClient();

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('home-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Fetch all categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  // Filter shop categories for the shop categories bar
  const shopCategories = categories?.filter(c => c.type === 'SHOP') || [];
  
  // Product categories for the existing categories section
  const productCategories = categories?.filter(c => c.type === 'PRODUCT') || [];

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsService.getAll({ featured: true, limit: 8 }),
  });

  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["shops", "featured"],
    queryFn: () => shopsService.getRankedShops({ limit: 6 }),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 py-16 md:py-24 overflow-hidden">
        <div className="container-app relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <TrendingUp className="w-3 h-3 ml-1" />
              منصة التسوق المحلية الأولى
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance">
              <span className="text-primary">تسوق</span> من متاجرك المحلية{" "}
              <span className="text-secondary">بسهولة</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              اكتشف أفضل المنتجات من المتاجر المحلية في منطقتك واحصل عليها بأسرع
              وقت
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/products">
                <Button size="xl" className="w-full sm:w-auto gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  تصفح المنتجات
                </Button>
              </Link>
              <Link to="/shops">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  <Store className="w-5 h-5" />
                  استكشف المتاجر
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container-app mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                title: "متاجر موثوقة",
                desc: "متاجر محلية معتمدة وموثوقة",
              },
              {
                icon: Truck,
                title: "توصيل سريع",
                desc: "احصل على طلبك في أسرع وقت",
              },
              {
                icon: Star,
                title: "جودة مضمونة",
                desc: "منتجات طازجة وعالية الجودة",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="text-center p-6 bg-background/80 backdrop-blur-sm border-primary/10"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="font-semibold text-lg mb-2">{feature.title}</h2>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shop Categories Horizontal Bar - NEW */}
      <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container-app">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">تصفح المتاجر حسب النوع</h2>
              <p className="text-muted-foreground mt-1">اختر نوع المتجر المناسب لك</p>
            </div>
          </div>
          
          {/* Horizontal Scrollable Categories */}
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-4 pb-2" dir="rtl">
              {categoriesLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-40 rounded-xl flex-shrink-0" />
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
                      className="h-32 w-40 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300" />
                      <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                        <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
                          {category.icon || "🏪"}
                        </div>
                        <h3 className="font-semibold text-sm">{category.name}</h3>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-muted/30">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {AR.products.featured}
              </h2>
              <p className="text-muted-foreground mt-1">منتجات مختارة بعناية</p>
            </div>
            <Link to="/products">
              <Button variant="ghost" className="gap-2">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {productsLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-square" />
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-1/3" />
                      </CardContent>
                    </Card>
                  ))
              : featuredProducts && featuredProducts.length > 0 ? (
                  featuredProducts.map((product: any) => (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <Card interactive className="overflow-hidden h-full">
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {product.image_url ? (
                          <img
                            src={`${product.image_url}?width=150&quality=80`}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {product.compare_at_price &&
                          product.compare_at_price > product.price && (
                            <Badge
                              className="absolute top-2 right-2"
                              variant="destructive"
                            >
                              خصم{" "}
                              {Math.round(
                                (1 - product.price / product.compare_at_price) *
                                  100
                              )}
                              %
                            </Badge>
                          )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          {product.shop?.name}
                        </p>
                        <h3 className="font-medium line-clamp-2 mb-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-lg">
                            {formatPrice(product.price)}
                          </span>
                          {product.compare_at_price &&
                            product.compare_at_price > product.price && (
                              <span className="text-muted-foreground line-through text-sm">
                                {formatPrice(product.compare_at_price)}
                              </span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">لا توجد منتجات متاحة حالياً</p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Shops Section */}
      <section className="py-16 bg-background">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {AR.shops.featured}
              </h2>
              <p className="text-muted-foreground mt-1">
                أفضل المتاجر في منطقتك
              </p>
            </div>
            <Link to="/shops">
              <Button variant="ghost" className="gap-2">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shopsLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    </Card>
                  ))
              : shops && shops.length > 0 ? (
                  shops.map((shop: any, i: number) => (
                  <ShopCard key={shop.id} shop={shop} index={i} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground mb-4">لا توجد متاجر متاحة حالياً</p>
                  <Link to="/register?role=shop_owner">
                    <Button>سجل متجرك الآن</Button>
                  </Link>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container-app text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            هل أنت صاحب متجر؟
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            انضم إلى منصتنا وابدأ في بيع منتجاتك لآلاف العملاء في منطقتك
          </p>
          <Link to="/register?role=shop_owner">
            <Button size="xl" variant="secondary" className="gap-2">
              <Store className="w-5 h-5" />
              سجل متجرك الآن
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
