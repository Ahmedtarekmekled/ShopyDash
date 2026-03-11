import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, Loader2, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, useAuth } from "@/store/app-context";
import { Product } from "@/types/database";
import { formatPrice, cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface ShopProductCardProps {
  product: Product;
  shopId: string;
  canOrder: boolean;
  onAddToCart?: () => void;
}

export function ShopProductCard({ product, shopId, canOrder, onAddToCart }: ShopProductCardProps) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Helper to handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    if (!canOrder) return;

    // Block unauthenticated users
    if (!isAuthenticated) {
      notify.error("يجب تسجيل الدخول أولاً للإضافة للسلة");
      navigate("/login");
      return;
    }

    // Use external handler if provided (for custom warnings etc)
    if (onAddToCart) {
      onAddToCart();
      return;
    }

    try {
      const promise = addToCart(shopId, product.id, 1, product);
      notify.success("تمت الإضافة للسلة");
      
      promise.catch(() => {
        // Silently caught, UI rolls back via dispatch inside addToCart
      });
    } catch (error: any) {
      notify.error(error.message || "فشل إضافة المنتج");
    }
  };

  const discountPercentage = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <Link
      to={canOrder ? `/products/${product.id}` : "#"}
      className={cn(
        "group block h-full",
        !canOrder && "pointer-events-none opacity-60"
      )}
    >
      <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 relative">
        {/* Image Container */}
        <div className="aspect-square relative overflow-hidden bg-muted/50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-110", product.stock_quantity <= 0 && "grayscale opacity-80")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="font-bold shadow-sm backdrop-blur-sm">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* Out of Stock Overlay */}
          {product.stock_quantity <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] z-10">
               <Badge variant="secondary" className="font-bold text-sm px-3 py-1 shadow-md opacity-90">غير متوفر</Badge>
            </div>
          )}
          
          {/* Quick Add Button - Appears on Hover (Desktop) / Always Visible (Mobile) */}
          {canOrder && product.stock_quantity > 0 && (
             <Button
                size="icon"
                className={cn(
                  "absolute bottom-3 right-3 rounded-full shadow-lg transition-all duration-300 opacity-100 md:opacity-0 md:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 z-20",
                  "bg-primary hover:bg-primary/90"
                )}
                onClick={handleAddToCart}
              >
                <Plus className="w-5 h-5" />
              </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 md:p-4 flex flex-col gap-1.5 flex-1">
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>
          
          <div className="flex items-end justify-between mt-auto pt-1">
             <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base md:text-lg text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-muted-foreground line-through text-[10px] md:text-xs decoration-destructive/50">
                      {formatPrice(product.compare_at_price)}
                    </span>
                  )}
                </div>
                {/* Optional: Unit or weight if available */}
             </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
