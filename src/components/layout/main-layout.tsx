import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileCartBar } from "@/components/cart/mobile-cart-bar";
import { useEffect } from "react";
import ReactGA from "react-ga4";

export function MainLayout() {
  const location = useLocation();
  const isCheckoutPage = location.pathname.startsWith('/checkout');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const isProductDetailPage = /^\/products\/.+/.test(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    // Send a pageview tracking event to Google Analytics every time the route changes
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isCheckoutPage && !isAuthPage && !isProductDetailPage && !isDashboardPage && <Footer />}
      {!isCheckoutPage && !isAuthPage && !isProductDetailPage && !isDashboardPage && <MobileCartBar />}
    </div>
  );
}
