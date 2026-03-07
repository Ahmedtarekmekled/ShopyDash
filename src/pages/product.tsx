import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Store,
  Minus,
  Plus,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { productsService } from "@/services";
import { useCart, useAuth } from "@/store";
import { SimilarProducts } from "@/components/SimilarProducts";

// ... types and imports
import { getShopOpenState } from "@/lib/shop-helpers";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.getById(id!),
    enabled: !!id,
  });

  // Fetch Shop Open State if product exists
  const { data: shopStatus, isLoading: isShopLoading } = useQuery({
    queryKey: ["shop-status", product?.shop_id],
    queryFn: async () => {
      if (!product?.shop_id) return null;
      // We need working hours.
      const { data, error } = await supabase
        .from("shop_working_hours")
        .select("*")
        .eq("shop_id", product.shop_id);
      
      if (error) throw error;
      
      return getShopOpenState(
        product.shop as any, 
        data || []
      );
    },
    enabled: !!product?.shop_id,
  });

  const isLoading = isProductLoading || isShopLoading;
  const isShopOpen = shopStatus?.isOpen ?? true;
  
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      notify.error("يجب تسجيل الدخول أولاً");
      return;
    }
    
    if (!isShopOpen) {
       notify.error("المتجر مغلق حالياً");
       return;
    }

    if (!product) return;
// ... existing logic

    try {
      const promise = addToCart(product.shop_id, product.id, quantity, product);
      notify.success(AR.cart.itemAdded);
      
      promise.catch(() => {
        // Rollback handled internally by context dispatch
      });
    } catch (error: any) {
      notify.error(error.message || "حدث خطأ أثناء الإضافة");
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container-app">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">المنتج غير موجود</h2>
            <Link to="/products">
              <Button>{AR.products.all}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const discount = product.compare_at_price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  return (
    <div className="pt-4 pb-28 md:py-8">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground">
            {AR.nav.home}
          </Link>
          <ArrowRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-foreground">
            {AR.products.title}
          </Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square rounded-[2rem] overflow-hidden bg-muted/20 relative shadow-sm border border-border/40 group">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
                  <ShoppingBag className="w-24 h-24 text-muted-foreground/40 transition-transform duration-700 group-hover:scale-110" />
                </div>
              )}
              {discount > 0 && (
                <Badge
                  className="absolute top-5 right-5 text-base md:text-lg px-4 py-1.5 shadow-md font-bold"
                  variant="destructive"
                >
                  خصم {discount}%
                </Badge>
              )}
            </div>

            {/* Additional images */}
            {product.images && product.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-5 pt-2 md:pt-0">
            {/* Header: Title & Shop */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
                  {product.name}
                </h1>
                <Link
                  to={`/shops/${product.shop?.slug}`}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 w-fit mt-1"
                >
                  <Store className="w-4 h-4" />
                  {product.shop?.name}
                  <span className={`w-1.5 h-1.5 rounded-full ${isShopOpen ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-red-500'} mr-1.5`} />
                </Link>
              </div>

              {/* Price */}
              <div className="flex flex-col mt-2">
                <div className={`flex items-baseline gap-3 transition-opacity ${product.stock_quantity <= 0 ? 'opacity-50' : ''}`}>
                  <span className="text-4xl md:text-5xl font-black text-primary tracking-tighter">
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-xl text-muted-foreground line-through decoration-destructive/40 font-medium">
                      {formatPrice(product.compare_at_price)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Badges / Meta Info */}
            <div className="flex flex-wrap items-center gap-2.5 py-1">
              {product.category && (
                <Link to={`/categories/${product.category.slug}`}>
                  <Badge variant="secondary" className="hover:bg-secondary/80 font-medium bg-secondary/30 text-secondary-foreground border-transparent px-3 py-1 text-sm shadow-sm">
                    {product.category.name}
                  </Badge>
                </Link>
              )}
              {product.unit && (
                <div className="flex items-center gap-1.5 text-sm bg-muted/40 px-3 py-1 rounded-full text-muted-foreground font-medium border border-border/40 shrink-0 shadow-sm">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {product.unit}
                </div>
              )}
              {product.stock_quantity > 0 ? (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-semibold px-3 py-1 shadow-sm shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 -ml-1 animate-pulse"></span>
                  {AR.products.inStock}
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-bold px-3 py-1 shadow-sm shrink-0">
                  {AR.products.outOfStock}
                </Badge>
              )}
            </div>

            <Separator className="opacity-40 my-1" />

            {/* Description */}
            {product.description && (
              <div className="flex flex-col gap-2 py-1">
                <div className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}

            {/* Add to Cart Area */}
            <div className="mt-auto pt-4 relative">
              {product.stock_quantity > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Quantity Control Desktop & Flow */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-muted-foreground">{AR.products.quantity}:</span>
                    <div className="flex items-center justify-between w-32 border border-border/70 rounded-xl overflow-hidden bg-background shadow-sm hover:border-border transition-colors">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-muted/80 rounded-none border-l border-border/30"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-base flex-1">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-muted/80 rounded-none border-r border-border/30"
                        onClick={() =>
                          setQuantity(
                            Math.min(product.stock_quantity, quantity + 1)
                          )
                        }
                        disabled={quantity >= product.stock_quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sticky Mobile Add to Cart Block or Standard Block */}
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] md:relative md:p-0 md:bg-transparent md:border-t-0 md:shadow-none md:backdrop-blur-none z-40 transition-all">
                    <div className="container-app md:px-0 md:max-w-none">
                      <Button
                        className="w-full h-14 md:h-12 text-lg md:text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-300 relative overflow-hidden group rounded-2xl md:rounded-xl"
                        onClick={handleAddToCart}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        <ShoppingCart className="w-6 h-6 md:w-5 md:h-5 ml-2 relative z-10" />
                        <span className="relative z-10">إضافة • {formatPrice(product.price * quantity)}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 px-6 border border-border/50 rounded-2xl bg-muted/10 text-center flex flex-col items-center justify-center">
                  <p className="font-bold text-destructive mb-2 text-xl flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                    المنتج غير متوفر حالياً
                  </p>
                  <p className="text-sm font-medium text-muted-foreground opacity-90 mb-6">نعتذر، يتم إعادة تعبئة المخزون قريباً.</p>
                  <Button disabled variant="outline" className="w-full md:w-3/4 h-12 rounded-xl opacity-60 cursor-not-allowed text-base font-semibold border-destructive/20 text-destructive/80">
                    <ShoppingBag className="w-5 h-5 ml-2" />
                    غير متاح للطلب
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Similar Products Section */}
        <div className="mt-12">
          <SimilarProducts 
            shopId={product.shop_id} 
            currentProductId={product.id}
            categoryId={product.category_id}
          />
        </div>
      </div>
    </div>
  );
}
