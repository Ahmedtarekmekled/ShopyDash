import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy Loaded Pages
const HomePage = lazy(() => import("@/pages/home"));
const ShopsPage = lazy(() => import("@/pages/shops"));
const ShopPage = lazy(() => import("@/pages/shop"));
const ProductsPage = lazy(() => import("@/pages/products"));
const ProductPage = lazy(() => import("@/pages/product"));
const CartPage = lazy(() => import("@/pages/cart"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const OrderPage = lazy(() => import("@/pages/order"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AccountPage = lazy(() => import("@/pages/account"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AuthCallback = lazy(() => import("@/pages/auth/callback"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Auth Callback - outside layout */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<MainLayout />}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/shops/:slug" element={<ShopPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductPage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer (Protected) */}
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

            {/* Dashboard (has its own internal auth check) */}
            <Route path="/dashboard/*" element={<DashboardPage />} />
            
            {/* 404 - Must be last */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
