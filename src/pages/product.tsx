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
  const [isAdding, setIsAdding] = useState(false);

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

    setIsAdding(true);
    try {
      await addToCart(product.shop_id, product.id, quantity, product);
      notify.success(AR.cart.itemAdded);
    } catch (error: any) {
      notify.error(error.message || "حدث خطأ أثناء الإضافة");
    } finally {
      setIsAdding(false);
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
    <div className="py-8">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
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
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  <ShoppingBag className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              {discount > 0 && (
                <Badge
                  className="absolute top-4 right-4 text-lg px-4 py-2"
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
          <div className="space-y-6">
            {/* Shop */}
            <Link
              to={`/shops/${product.shop?.slug}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                {product.shop?.logo_url ? (
                  <img
                    src={product.shop.logo_url}
                    alt={product.shop.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="font-medium text-foreground">{product.shop?.name}</span>
              
              {/* Status Dot */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border ml-2">
                <span className={`w-2 h-2 rounded-full ${isShopOpen ? 'bg-green-500 shadow-[0_0_4px_2px_rgba(34,197,94,0.2)]' : 'bg-red-500'}`} />
                <span className={`text-xs ${isShopOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {isShopOpen ? 'مفتوح' : 'مغلق'}
                </span>
              </div>
            </Link>

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
              {product.category && (
                <Link to={`/categories/${product.category.slug}`}>
                  <Badge variant="secondary" className="mt-2">
                    {product.category.name}
                  </Badge>
                </Link>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price &&
                product.compare_at_price > product.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {product.stock_quantity > 0 ? (
                <>
                  <Badge variant="success">{AR.products.inStock}</Badge>
                  <span className="text-muted-foreground text-sm">
                    {product.stock_quantity} متوفر
                  </span>
                </>
              ) : (
                <Badge variant="destructive">{AR.products.outOfStock}</Badge>
              )}
            </div>

            <Separator />

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">
                  {AR.products.description}
                </h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Unit */}
            {product.unit && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{AR.products.unit}:</span>
                <span className="text-muted-foreground">{product.unit}</span>
              </div>
            )}

            <Separator />

            {/* Add to Cart */}
            {product.stock_quantity > 0 && (
              <div className="space-y-4">
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="font-medium">{AR.products.quantity}:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center text-lg font-medium">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
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

                {/* Total */}
                <div className="flex items-center justify-between py-4 px-6 bg-muted/50 rounded-xl">
                  <span className="font-medium">الإجمالي:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>

                {/* Add Button */}
                <Button
                  className="w-full gap-2"
                  size="xl"
                  onClick={handleAddToCart}
                  loading={isAdding}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {AR.products.addToCart}
                </Button>
              </div>
            )}
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
