import { Link } from "react-router-dom";
import { Store, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AR } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Shop, WorkingHours } from "@/types/database";
import { getShopOpenState } from "@/lib/shop-helpers";

interface ShopCardProps {
  shop: Shop & { 
    category?: { name: string; icon: string | null } | null;
    working_hours?: WorkingHours[]; 
  };
  className?: string; // Allow external class overrides
  index?: number; // For animation delay
}

export function ShopCard({ shop, className, index = 0 }: ShopCardProps) {
  const { isOpen } = getShopOpenState(
    shop, 
    shop.working_hours || []
  );

  return (
    <Link
      to={`/shops/${shop.slug}`}
      className="animate-fade-in block h-full"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Card
        interactive
        className={cn(
          "p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between",
          shop.is_premium ? "border-2 border-amber-400 bg-amber-50/10 shadow-md" : "",
          className
        )}
      >
        {/* Badges Container - Top Left */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-end">
          {/* Status Badge with Dot (No Text) */}
          <div 
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full shadow-sm border backdrop-blur-sm",
              isOpen ? "bg-white/90 border-green-200" : "bg-white/90 border-red-200"
            )}
            title={isOpen ? AR.shops.open : AR.shops.closed}
          >
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start gap-4" dir="rtl">
          {/* Logo */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 transition-transform duration-300 hover:scale-110 border shadow-sm">
            {shop.logo_url ? (
              <img
                src={`${shop.logo_url}?width=100&quality=80`}
                alt={shop.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <Store className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0 pl-20">
            <h3 className="font-semibold text-lg truncate leading-tight mb-1">
              {shop.name}
            </h3>
            
            {shop.description && (
              <p className="text-muted-foreground text-sm line-clamp-2 h-10 mb-2 leading-relaxed">
                {shop.description}
              </p>
            )}

            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-auto">

              
              {shop.category && (
                <Badge variant="outline" className="text-xs font-normal bg-background/50">
                  {shop.category.icon && <span className="ml-1">{shop.category.icon}</span>}
                  {shop.category.name}
                </Badge>
              )}
              
              {shop.total_orders && (
                <span className="text-xs text-muted-foreground mr-auto bg-muted/50 px-2 py-0.5 rounded-full">
                  {shop.total_orders} {AR.shops.orders}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
