import { Link, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store";
import { formatPrice } from "@/lib/utils";
import { AR } from "@/lib/i18n";

export function MobileCartBar() {
  const { cartItemCount, cartTotal } = useCart();
  const location = useLocation();

  // Hide on cart, checkout pages, and product details page (where AddToCart is sticky)
  const hiddenPaths = ["/cart", "/checkout"];
  const isProductDetailsPage = location.pathname.startsWith('/products/');
  
  if (cartItemCount === 0 || hiddenPaths.includes(location.pathname) || isProductDetailsPage) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t p-4 md:hidden animate-slide-up">
      <Link to="/cart">
        <Button className="w-full gap-3" size="lg">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-sm">
              {cartItemCount}
            </span>
          </div>
          <span className="flex-1">{AR.cart.title}</span>
          <span className="font-bold">{formatPrice(cartTotal)}</span>
        </Button>
      </Link>
    </div>
  );
}
