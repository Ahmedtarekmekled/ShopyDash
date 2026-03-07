import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  Store,
  LayoutDashboard,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AR } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useCart } from "@/store";
import { getInitials } from "@/lib/utils";

const navLinks = [
  { href: "/", label: AR.nav.home },
  { href: "/shops", label: AR.nav.shops },
  { href: "/products", label: AR.nav.products },
];

import { CartDropdown } from "@/components/cart/cart-drawer";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Header() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          
          {/* Right Section: Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
             {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Shopydash Logo" className="h-14 w-14 object-contain" />
            </Link>
          </div>

          {/* Center Section: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "nav-link",
                  location.pathname === link.href && "active"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Left Section: Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {isAuthenticated && <NotificationBell />}

            {/* Cart */}
            <Button 
               variant="ghost" 
               size="icon" 
               className="relative"
               onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="default"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {user?.full_name ? getInitials(user.full_name) : "م"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.full_name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {user?.role === "SHOP_OWNER"
                          ? "صاحب متجر"
                          : user?.role === "ADMIN"
                          ? "مدير"
                          : user?.role === "DELIVERY"
                          ? "مندوب توصيل"
                          : "عميل"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      <User className="ml-2 h-4 w-4" />
                      {AR.nav.account}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer">
                      <ShoppingCart className="ml-2 h-4 w-4" />
                      {AR.nav.orders}
                    </Link>
                  </DropdownMenuItem>
                  {(user?.role === "SHOP_OWNER" ||
                    user?.role === "ADMIN" ||
                    user?.role === "DELIVERY") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="ml-2 h-4 w-4" />
                          {user.role === "DELIVERY" ? "لوحة التوصيل" : AR.dashboard.title}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    {AR.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    {AR.nav.login}
                  </Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button size="sm">{AR.nav.register}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="py-4 lg:hidden border-t animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg transition-colors",
                    location.pathname === link.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>

      <CartDropdown isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
