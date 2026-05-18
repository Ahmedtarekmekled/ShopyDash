import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileCartBar } from "@/components/cart/mobile-cart-bar";
import { useEffect } from "react";
import ReactGA from "react-ga4";
import { useAuth } from "@/store";

export function MainLayout() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const isCheckoutPage = location.pathname.startsWith('/checkout');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const isCompleteProfilePage = location.pathname === '/complete-profile';
  const isProductDetailPage = /^\/products\/.+/.test(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    // Send a pageview tracking event to Google Analytics every time the route changes
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);

  // Global check: if logged in but missing phone number, force them to complete profile
  if (!isLoading && isAuthenticated && user && !user.phone && !isCompleteProfilePage) {
    return <Navigate to="/complete-profile" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isCompleteProfilePage && <Header />}
      <main className="flex-1">
        <Outlet />
      </main>

      {!isCheckoutPage && !isAuthPage && !isCompleteProfilePage && !isProductDetailPage && !isDashboardPage && <Footer />}
      {!isCheckoutPage && !isAuthPage && !isCompleteProfilePage && !isProductDetailPage && !isDashboardPage && <MobileCartBar />}
    </div>
  );
}
