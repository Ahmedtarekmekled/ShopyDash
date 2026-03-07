import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/store";
import { formatPrice, cn } from "@/lib/utils";
import { AR } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useEffect, useRef } from "react";

interface CartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDropdown({ isOpen, onClose }: CartDropdownProps) {
  const { cart, updateCartItem, removeFromCart, cartTotal, cartItemCount } = useCart();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hide on cart, checkout pages, and product details page (where AddToCart is sticky)
  const hiddenPaths = ["/cart", "/checkout"];
  const isProductDetailsPage = location.pathname.startsWith("/products/");

  // Close on route change
  useEffect(() => {
    return () => onClose();
  }, [navigate]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is on the trigger button (cart icon) is tricky without ref to it, 
      // but usually the trigger prevents immediate close if it toggles state.
      // However, here we just check if it's NOT in the dropdown.
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to dim the background and cover sticky elements */}
      <div 
         className={cn(
           "fixed inset-0 bg-black/60 z-[48] top-16 backdrop-blur-sm",
           "animate-in fade-in duration-200"
         )}
         onClick={onClose}
      />
      {/* Dropdown Panel */}
      <div
        ref={dropdownRef}
        dir="rtl"
        className={cn(
          "fixed bg-background shadow-xl border border-t-0 rounded-b-xl overflow-hidden flex flex-col",
          // Positioning: Below Header (top-16)
          "top-16 z-[49]", 
          // Mobile: Full width
          "left-0 right-0 w-full rounded-none h-[calc(100vh-4rem)] sm:h-auto sm:max-h-[600px]",
          // Desktop: Aligned left (actions side), max width
          "sm:left-4 sm:right-auto sm:w-[400px] sm:rounded-xl",
          // Animation
          "animate-in slide-in-from-top-2 fade-in duration-200 ease-out"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">{AR.cart.title}</h2>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
              {cartItemCount}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Cart Items List */}
        <ScrollArea className="flex-1 p-0">
          {cartItemCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-medium text-lg">{AR.cart.empty}</p>
                <p className="text-sm text-muted-foreground mt-1">تصفح المنتجات وأضفها إلى سلتك</p>
              </div>
              <Button variant="outline" onClick={onClose} className="mt-2">
                {AR.cart.startShopping}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {cart?.items?.map((item) => (
                <div key={item.id} className="flex gap-3 p-4 hover:bg-muted/10 transition-colors">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted border shrink-0">
                    {item.product?.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-sm truncate" title={item.product?.name}>
                        {item.product?.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                         <span>{item.product?.shop?.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold text-sm text-primary">{formatPrice(item.product?.price || 0)}</p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-muted rounded-md border h-7">
                        <button
                          className="w-7 h-full flex items-center justify-center hover:bg-background rounded-r-md transition-colors disabled:opacity-50"
                          onClick={() => updateCartItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          className="w-7 h-full flex items-center justify-center hover:bg-background rounded-l-md transition-colors disabled:opacity-50"
                          onClick={() => {
                            updateCartItem(item.id, item.quantity + 1).catch((err: any) => {
                               notify.error(err.message || "حدث خطأ أثناء تعديل الكمية");
                            });
                          }}
                          disabled={item.product?.stock_quantity ? item.quantity >= item.product.stock_quantity : false}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors self-start"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        {cartItemCount > 0 && (
          <div className="p-4 border-t bg-muted/10">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{AR.cart.total}</span>
                <span className="font-bold text-lg text-primary">
                  {formatPrice(cartTotal)}
                  <span className="text-xs font-normal text-muted-foreground mr-1">+ التوصيل</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                 رسوم التوصيل تُحسب عند الدفع
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  navigate('/cart');
                  onClose();
                }}
              >
                عرض السلة
              </Button>
              <Button 
                className="w-full"
                onClick={() => {
                  navigate('/checkout');
                  onClose();
                }}
              >
                إتمام الطلب
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
