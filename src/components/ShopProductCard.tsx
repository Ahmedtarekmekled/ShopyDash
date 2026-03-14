import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus } from "lucide-react";
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
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  // Derive quantity directly from cart state (always in sync, no local state needed)
  const cartItem = cart?.items?.find((item: any) => item.product_id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  const requireAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      notify.error("يجب تسجيل الدخول أولاً للإضافة للسلة");
      navigate("/login");
      return false;
    }
    return true;
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canOrder || isPending) return;
    if (!requireAuth(e)) return;

    if (onAddToCart) { onAddToCart(); return; }

    setIsPending(true);
    addToCart(shopId, product.id, 1, product)
      .catch((err: any) => {
        if (err?.message !== 'SILENT_MODAL_LIMIT_EXCEEDED') {
          notify.error(err.message || "فشل إضافة المنتج");
        }
      })
      .finally(() => setIsPending(false));
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    const next = quantity + 1;
    if (next > product.stock_quantity) {
      notify.error(`الكمية المتاحة: ${product.stock_quantity}`);
      return;
    }
    updateCartItem(cartItem.id, next).catch(() => {});
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (quantity <= 1) {
      removeFromCart(cartItem.id).catch(() => {});
    } else {
      updateCartItem(cartItem.id, quantity - 1).catch(() => {});
    }
  };

  const discountPercentage =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  const inCart = quantity > 0;

  return (
    <Link
      to={canOrder ? `/products/${product.id}` : "#"}
      className={cn("group block h-full", !canOrder && "pointer-events-none opacity-60")}
    >
      <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 relative">
        {/* Image Container */}
        <div className="aspect-square relative overflow-hidden bg-muted/50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                product.stock_quantity <= 0 && "grayscale opacity-80"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Discount badge */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="font-bold shadow-sm backdrop-blur-sm">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* Out-of-stock overlay */}
          {product.stock_quantity <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] z-10">
              <Badge variant="secondary" className="font-bold text-sm px-3 py-1 shadow-md opacity-90">
                غير متوفر
              </Badge>
            </div>
          )}

          {/* ── Cart control — bottom-right of image ── */}
          {canOrder && product.stock_quantity > 0 && (
            <div className="absolute bottom-3 right-3 z-20">
              {/* When quantity > 0 show  ─  qty  + pill */}
              {inCart ? (
                <div
                  dir="ltr"
                  className={cn(
                    "flex items-center gap-0 bg-primary rounded-full shadow-lg overflow-hidden",
                    "transition-all duration-300 ease-out",
                    "opacity-100 translate-y-0"
                  )}
                  style={{ animation: "scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                >
                  <button
                    onClick={handleDecrease}
                    className="h-8 w-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors rounded-l-full"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className="text-white font-bold text-sm min-w-[1.5rem] text-center select-none"
                    style={{ animation: "bounceNum 0.2s ease both" }}
                    key={quantity}
                  >
                    {quantity}
                  </span>

                  <button
                    onClick={handleIncrease}
                    className="h-8 w-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors rounded-r-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* When quantity === 0 show plain + button */
                <Button
                  size="icon"
                  className={cn(
                    "rounded-full shadow-lg transition-all duration-300",
                    "opacity-100 md:opacity-0 md:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0",
                    "bg-primary hover:bg-primary/90"
                  )}
                  onClick={handleAdd}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>
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
            </div>
          </div>
        </div>
      </Card>

      {/* Keyframe animations — injected once via a <style> tag */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes bounceNum {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.4); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Link>
  );
}
