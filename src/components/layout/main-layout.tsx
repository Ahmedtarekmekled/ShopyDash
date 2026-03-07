import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileCartBar } from "@/components/cart/mobile-cart-bar";

export function MainLayout() {
  const location = useLocation();
  const isCheckoutPage = location.pathname.startsWith('/checkout');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isCheckoutPage && <Footer />}
      {!isCheckoutPage && <MobileCartBar />}
    </div>
  );
}
