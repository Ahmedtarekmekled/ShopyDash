import { Link, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useMemo, ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  BarChart3,
  Store,
  Users,
  Folders,
  MapPin,
  DollarSign,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Ban,
  UserCog,
  Search,
  TrendingUp,
  ShoppingBag,
  Truck,
  Share2,
  QrCode,
  ExternalLink,
  Copy,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  PenSquare,
  BarChart2,
  AlertTriangle,
  Phone,
  MoreVertical,
  Star,
  Menu,
} from "lucide-react";
import { SoundService } from "@/services/sound.service";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";
import { AdminDelivery } from "@/components/delivery/AdminDelivery";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { CourierAccount } from "@/components/delivery/CourierAccount";
import { ShopAnalytics } from "./dashboard/shop-analytics";
import { AdminCategories } from "@/components/dashboard/AdminCategories";
import { cn } from "@/lib/utils";
import { ShopOrders } from "@/components/dashboard/ShopOrders";
import { ShopOrderHistory } from "@/components/dashboard/ShopOrderHistory";
import { DashboardProductCard } from "@/components/dashboard/DashboardProductCard";
import { ShopShareCard } from "@/components/dashboard/ShopShareCard";
import { ProductFilterBar } from "@/components/dashboard/ProductFilterBar";
import { useProductFilters } from "@/hooks/useProductFilters";
import { MapLocationPicker, LocationPreviewMap } from "@/components/MapLocationPicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  useMap, 
  useMapEvents, 
  Polygon, 
  Polyline 
} from "react-leaflet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { uploadImage, deleteImage } from "@/lib/supabase";
import { ImageCropper } from "@/components/ImageCropper";
import {
  productsService,
  categoriesService,
  shopsService,
  regionsService,
} from "@/services/catalog.service";
import { orderService } from "@/services/order.service";
import { profileService } from "@/services/auth.service";
import { analyticsService } from "@/services/analytics.service";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { AdminFinancials } from "@/components/dashboard/AdminFinancials";
import { AdminShopFinancials } from "@/components/dashboard/AdminShopFinancials";
import { LiveOperations } from "@/components/dashboard/LiveOperations";
import type {
  Product,
  Category,
  Shop,
  Region,
  Profile,
  ShopStatus,
} from "@/types/database";

// Sidebar navigation
const shopOwnerNav = [
  { href: "/dashboard", label: AR.dashboard.overview, icon: LayoutDashboard },
  { href: "/dashboard/products", label: AR.dashboard.products, icon: Package },
  { href: "/dashboard/orders", label: AR.dashboard.orders, icon: ShoppingCart },
  { href: "/dashboard/orders/history", label: "سجل الطلبات", icon: Clock },
  { href: "/dashboard/settings", label: AR.dashboard.settings, icon: Settings },
];

const adminNav = [
  { href: "/dashboard", label: AR.dashboard.overview, icon: LayoutDashboard },
  { href: "/dashboard/shops", label: AR.admin.shops, icon: Store },
  { href: "/dashboard/categories", label: AR.admin.categories, icon: Folders },
  { href: "/dashboard/regions", label: AR.admin.regions, icon: MapPin },
  { href: "/dashboard/users", label: AR.admin.users, icon: Users },
  { href: "/dashboard/delivery", label: "إدارة التوصيل", icon: Truck },
];

const deliveryNav = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/account", label: "حسابي", icon: UserCog },
];

// Access Denied Component for non-admin users
function AccessDenied() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-destructive">
              غير مصرح بالوصول
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              عذراً، هذه الصفحة متاحة فقط للمسؤولين. إذا كنت تعتقد أن هذا خطأ،
              يرجى التواصل مع الدعم الفني.
            </p>
            <Link to="/dashboard">
              <Button variant="outline">العودة للوحة التحكم</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Guard Component - Wraps admin-only routes
function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

// Delivery Guard Component - Wraps delivery-only routes
function DeliveryGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isDelivery = user?.role === "DELIVERY";
  const isAdmin = user?.role === "ADMIN";

  // Admins can also access delivery routes for management purposes
  if (!isDelivery && !isAdmin) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

// Real-time hook for Shop Orders
function useShopRealtime(shopId: string | undefined, onNewOrder: () => void, onOrderUpdate: () => void) {
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`shop-orders-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
             // New order -> Play Sound + Refresh List
             await SoundService.playNewOrderSound();
             notify.info(`طلب جديد وصل! رقم الطلب: ${(payload.new as any).order_number}`);
             onNewOrder();
          } else if (payload.eventType === "UPDATE") {
             // Order update -> Refresh List
             onOrderUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, onNewOrder, onOrderUpdate]);
}



// Admin Overview Dashboard - Platform-wide statistics
function OverviewTab() {
  const [period, setPeriod] = useState<"7D" | "30D" | "ALL">("30D");

  const startDate = useMemo(() => {
    if (period === "7D") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (period === "30D") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return undefined;
  }, [period]);

  // Global Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['admin_global_metrics', startDate],
    queryFn: () => analyticsService.getGlobalMetrics(startDate),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Growth Chart
  const { data: growthChart, isLoading: isChartLoading } = useQuery({
    queryKey: ['admin_growth_chart', startDate],
    queryFn: () => analyticsService.getPlatformGrowth(startDate),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Recent Shops
  const { data: recentShops } = useQuery({
    queryKey: ['recent_pending_shops'],
    queryFn: async () => {
      const allShops = await shopsService.getAll({});
      return allShops.sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "قيد المراجعة" },
      APPROVED: { variant: "success", label: "مقبول" },
      REJECTED: { variant: "destructive", label: "مرفوض" },
      SUSPENDED: { variant: "destructive", label: "موقوف" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  if (isMetricsLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">لوحة تحكم المسؤول</h1>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-muted"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsConfig = [
    {
      label: "إجمالي الإيرادات",
      value: formatPrice(metrics.total_revenue),
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-500/10",
      subtext: `العمولة: ${formatPrice(metrics.total_commission)}`
    },
    {
      label: "متوسط قيمة الطلب",
      value: formatPrice(metrics.avg_order_value),
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "المتاجر (نشط / مراجعة)",
      value: metrics.active_shops.toString(),
      icon: Store,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      subtext: `${metrics.pending_shops} بانتظار المراجعة`,
    },
    {
      label: "المناديب المسجلين",
      value: metrics.active_drivers.toString(),
      icon: Truck,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      subtext: `${metrics.online_drivers} متصل الآن`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">نظرة عامة على المنصة</h1>
          <p className="text-muted-foreground">
            مؤشرات الأداء الرئيسية والنمو
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant={period === "7D" ? "default" : "outline"} onClick={() => setPeriod("7D")}>7 أيام</Button>
           <Button variant={period === "30D" ? "default" : "outline"} onClick={() => setPeriod("30D")}>30 يوم</Button>
           <Button variant={period === "ALL" ? "default" : "outline"} onClick={() => setPeriod("ALL")}>الكل</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.subtext && (
                  <Badge variant="outline" className="text-xs">
                    {stat.subtext}
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Reports */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>نمو المنصة (الطلبات)</CardTitle>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">جاري تحميل الرسم البياني...</div>
            ) : growthChart && growthChart.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="day_date" 
                      tickFormatter={(d) => format(new Date(d), 'd MMM', { locale: ar })} 
                      fontSize={12} 
                    />
                    <YAxis yAxisId="left" fontSize={12} />
                    <Tooltip 
                      labelFormatter={(d) => format(new Date(d), 'd MMMM yyyy', { locale: ar })}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="total_orders" 
                      name="إجمالي الطلبات"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات كافية للرسم البياني</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Pending Shops */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              المتاجر الأخيرة
            </CardTitle>
            <Link to="/dashboard/shops">
              <Button variant="ghost" size="sm">عرض الكل</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentShops || recentShops.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد متاجر حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentShops.map((shop) => {
                  const statusInfo = getStatusBadge(shop.status as string);
                  return (
                    <div
                      key={shop.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        shop.status === "PENDING"
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{shop.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(shop.created_at).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant} className="text-[10px]">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminOverview() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="financials">المالية والتقارير</TabsTrigger>
          <TabsTrigger value="live">العمليات المباشرة</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="financials" className="mt-6">
          <AdminFinancials />
        </TabsContent>
        <TabsContent value="live" className="mt-6">
          <LiveOperations />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingOrdersList, setPendingOrdersList] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; amount: number }[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string; label: string; count: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Get user's shop
        const userShop = await shopsService.getByOwnerId(user.id);
        setShop(userShop);

        if (userShop) {
          // Load shop orders
          const shopOrders = await orderService.getByShop(userShop.id);

          // Calculate stats
          const totalOrders = shopOrders.length;
          const totalRevenue = shopOrders
            .filter((o: any) => o.status !== "CANCELLED")
            .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          const pendingOrders = shopOrders.filter(
            (o: any) => o.status === "PLACED" || o.status === "CONFIRMED"
          ).length;

          // Today's stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayOrders = shopOrders.filter((o: any) => new Date(o.created_at) >= today);
          const todayRevenue = todayOrders
            .filter((o: any) => o.status !== "CANCELLED")
            .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

          // Load products count
          const shopProducts = await productsService.getAll({
            shopId: userShop.id,
          });

          setStats({
            totalOrders,
            totalRevenue,
            totalProducts: shopProducts.length,
            pendingOrders,
            todayOrders: todayOrders.length,
            todayRevenue,
          });

          // Pending orders list (PLACED or CONFIRMED)
          const pending = shopOrders.filter(
            (o: any) => o.status === "PLACED" || o.status === "CONFIRMED"
          );
          setPendingOrdersList(pending.slice(0, 5));

          // Get recent orders (latest 5)
          setRecentOrders(shopOrders.slice(0, 5));

          // Build 7-day revenue chart data
          const days: { day: string; amount: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);
            const dayRevenue = shopOrders
              .filter((o: any) => {
                const created = new Date(o.created_at);
                return created >= d && created < nextD && o.status !== "CANCELLED";
              })
              .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
            days.push({
              day: d.toLocaleDateString("ar-EG", { weekday: "short" }),
              amount: dayRevenue,
            });
          }
          setDailyRevenue(days);

          // Orders by status breakdown
          const statusMap: Record<string, { label: string; count: number; color: string }> = {
            PLACED: { label: "جديد", count: 0, color: "bg-blue-500" },
            CONFIRMED: { label: "مؤكد", count: 0, color: "bg-amber-500" },
            PREPARING: { label: "قيد التحضير", count: 0, color: "bg-orange-500" },
            READY: { label: "جاهز", count: 0, color: "bg-purple-500" },
            PICKED_UP: { label: "مع المندوب", count: 0, color: "bg-indigo-500" },
            DELIVERED: { label: "تم التسليم", count: 0, color: "bg-green-500" },
            CANCELLED: { label: "ملغي", count: 0, color: "bg-red-500" },
          };
          shopOrders.forEach((o: any) => {
            if (statusMap[o.status]) statusMap[o.status].count++;
          });
          setOrdersByStatus(
            Object.entries(statusMap)
              .filter(([, v]) => v.count > 0)
              .map(([k, v]) => ({ status: k, ...v }))
          );
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء النور";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <div className="h-9 w-44 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded animate-pulse mt-2" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-4 md:p-6">
                <div className="animate-pulse space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                  <div className="h-8 bg-muted rounded w-16" />
                  <div className="h-4 bg-muted rounded w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Content columns skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted" />
                    <div className="h-5 w-28 bg-muted rounded" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </div>
                      <div className="h-5 w-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-40 bg-muted rounded" />
                        <div className="h-4 w-24 bg-muted rounded" />
                      </div>
                      <div className="space-y-1 items-end">
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-5 w-16 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Analytics skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted" />
                    <div className="h-5 w-40 bg-muted rounded" />
                  </div>
                  <div className="h-48 bg-muted rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Status Banner Logic
  const renderStatusBanner = () => {
    if (!shop) return null;
    
    if (shop.approval_status === 'PENDING' || shop.status === 'PENDING') {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800">الحساب قيد المراجعة</h3>
            <p className="text-sm text-amber-700">طلبك لإنشاء المتجر قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك قريباً.</p>
          </div>
        </div>
      );
    }
    
    if (shop.approval_status === 'REJECTED' || shop.status === 'REJECTED') {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">تم رفض الطلب</h3>
            <p className="text-sm text-destructive/90">عذراً، تم رفض طلبك للسبب التالي:</p>
            <p className="text-sm font-medium mt-1 bg-white/50 p-2 rounded">{shop.rejection_reason || "لا يوجد سبب محدد"}</p>
            <Link to="/dashboard/settings">
              <Button size="sm" className="mt-3">تعديل البيانات وإعادة الإرسال</Button>
            </Link>
          </div>
        </div>
      );
    }

    if (!shop.is_active && shop.approval_status === 'APPROVED') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <Ban className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">الحساب موقوف</h3>
            <p className="text-sm text-red-700">تم إيقاف حساب المتجر مؤقتاً.</p>
            {shop.disabled_reason && <p className="text-sm font-medium mt-1">السبب: {shop.disabled_reason}</p>}
          </div>
        </div>
      );
    }

    return null;
  };

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {getGreeting()} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {shop ? `لوحة تحكم ${shop.name}` : "مرحباً بك في لوحة التحكم"}
        </p>
      </div>

      {renderStatusBanner()}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Orders */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.totalOrders}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{AR.dashboard.totalOrders}</p>
            {stats.todayOrders > 0 && (
              <p className="text-xs text-blue-600 font-medium mt-1">+{stats.todayOrders} اليوم</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{formatPrice(stats.totalRevenue)}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{AR.dashboard.totalRevenue}</p>
            {stats.todayRevenue > 0 && (
              <p className="text-xs text-green-600 font-medium mt-1">+{formatPrice(stats.todayRevenue)} اليوم</p>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.totalProducts}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{AR.dashboard.totalProducts}</p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className={`rounded-xl shadow-sm ${stats.pendingOrders > 0 ? 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/10' : ''}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.pendingOrders > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                <Clock className={`w-5 h-5 ${stats.pendingOrders > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              {stats.pendingOrders > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.pendingOrders}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{AR.dashboard.pendingOrders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pending Orders — Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 px-4 md:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  طلبات معلقة
                  {stats.pendingOrders > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {stats.pendingOrders}
                    </Badge>
                  )}
                </CardTitle>
                <Link to="/dashboard/orders">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    عرض الكل
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {pendingOrdersList.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-500/50 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">لا توجد طلبات معلقة</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ممتاز! كل الطلبات تمت معالجتها</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingOrdersList.map((order) => (
                    <Link
                      key={order.id}
                      to="/dashboard/orders"
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={order.status === "PLACED" ? "placed" : "preparing"}
                            className="text-[10px] h-5"
                          >
                            {order.status === "PLACED" ? "جديد" : "مؤكد"}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {order.customer_name || order.delivery_phone}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                          {order.order_number}
                        </p>
                      </div>
                      <div className="text-left flex-shrink-0 mr-2">
                        <p className="font-bold text-sm text-primary">{formatPrice(order.total)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders — Right Column */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 px-4 md:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  آخر الطلبات
                </CardTitle>
                <Link to="/dashboard/orders">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    {AR.common.viewAll}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-muted-foreground truncate">{order.order_number}</p>
                        <p className="text-sm font-medium truncate">
                          {order.customer_name || order.delivery_phone || "عميل"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div className="text-left flex-shrink-0 mr-2 flex flex-col items-end gap-1">
                        <p className="font-bold text-sm text-primary">
                          {formatPrice(order.total)}
                        </p>
                        <Badge
                          variant={
                            order.status === "DELIVERED"
                              ? "delivered"
                              : order.status === "PREPARING"
                              ? "preparing"
                              : order.status === "CANCELLED"
                              ? "cancelled"
                              : order.status === "CONFIRMED"
                              ? "confirmed"
                              : order.status === "READY" || order.status === "PICKED_UP" || order.status === "OUT_FOR_DELIVERY"
                              ? "outForDelivery"
                              : "placed"
                          }
                          className="text-[10px] h-5"
                        >
                          {
                            AR.orderStatus[
                              order.status as keyof typeof AR.orderStatus
                            ] || order.status
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Revenue Chart */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2 px-4 md:px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-green-600" />
              </div>
              الإيرادات — آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6">
            {dailyRevenue.every(d => d.amount === 0) ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">لا توجد مبيعات خلال هذه الفترة</p>
              </div>
            ) : (
              <div className="h-48 flex items-end gap-2 pt-4">
                {dailyRevenue.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {d.amount > 0 ? formatPrice(d.amount) : ""}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/70 transition-all duration-500 min-h-[4px]"
                      style={{ height: `${Math.max((d.amount / maxRevenue) * 140, 4)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2 px-4 md:px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              </div>
              توزيع الطلبات حسب الحالة
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6">
            {ordersByStatus.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {ordersByStatus.map((s) => (
                  <div key={s.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.color} transition-all duration-500`}
                        style={{ width: `${(s.count / stats.totalOrders) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Card for approved shops */}
      {shop && shop.approval_status === 'APPROVED' && shop.is_active && (
        <ShopShareCard shop={shop} />
      )}
    </div>
  );
}

function DashboardProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    category_id: "",
    stock_quantity: "10",
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Crop state
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Initialize Filter Hook
  const {
     filteredProducts,
     searchQuery,
     setSearchQuery,
     selectedCategory,
     setSelectedCategory,
     stockFilter,
     setStockFilter,
     sortBy,
     setSortBy,
     stats
  } = useProductFilters(products);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get user's shop
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);

      if (userShop) {
        // Load shop products
        const shopProducts = await productsService.getAll({
          shopId: userShop.id,
        });
        setProducts(shopProducts);
      }

      // Load categories scoped to shop type
      if (userShop?.category_id) {
        const cats = await categoriesService.getAll({ 
          type: 'PRODUCT', 
          parentId: userShop.category_id 
        });
        setCategories(cats);
      } else {
        // Fallback or allow all if no type selected yet (migration support)
        const cats = await categoriesService.getAll({ type: 'PRODUCT' });
        setCategories(cats);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      compare_at_price: "",
      category_id: "",
      stock_quantity: "10",
      is_featured: false,
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      compare_at_price: product.compare_at_price?.toString() || "",
      category_id: product.category_id,
      stock_quantity: product.stock_quantity.toString(),
      is_featured: product.is_featured,
    });
    setImagePreview(product.image_url || null);
    setImageFile(null);
    setShowAddDialog(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        notify.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so re-selecting same file works
    e.target.value = "";
  };

  const handleCropComplete = (croppedFile: File) => {
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setShowCropper(false);
    setRawImageSrc(null);
  };

  const handleRemoveImage = async () => {
    // If editing and the product had an existing image, delete from storage
    if (editingProduct?.image_url && !imageFile) {
      try {
        const url = editingProduct.image_url;
        const parts = url.split('/storage/v1/object/public/products/');
        if (parts.length > 1) {
          const path = decodeURIComponent(parts[1]);
          await deleteImage('products', path);
        }
        // Clear from DB
        await productsService.update(editingProduct.id, { image_url: null } as any);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, image_url: null } as any : p));
        notify.success('تم حذف الصورة');
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!shop) {
      notify.error("يجب إنشاء متجر أولاً");
      return;
    }

    if (!formData.name || !formData.price || !formData.category_id) {
      notify.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = editingProduct?.image_url || null;

      // Upload image if a new one is selected
      if (imageFile) {
        setIsUploading(true);
        const fileName = `${shop.id}/${Date.now()}-${imageFile.name}`;
        const { url, error: uploadError } = await uploadImage(
          "products",
          fileName,
          imageFile
        );
        setIsUploading(false);

        if (uploadError) {
          notify.error("فشل رفع الصورة");
          console.error("Upload error:", uploadError);
        } else {
          imageUrl = url;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price
          ? parseFloat(formData.compare_at_price)
          : null,
        category_id: formData.category_id,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_featured: formData.is_featured,
        shop_id: shop.id,
        slug: `product-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        is_active: true,
        image_url: imageUrl,
      };

      if (editingProduct) {
        const updated = await productsService.update(editingProduct.id, productData);
        setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } as any : p));
        notify.success("تم تحديث المنتج بنجاح");
      } else {
        const created = await productsService.create(productData as any);
        setProducts(prev => [created as any, ...prev]);
        notify.success("تم إضافة المنتج بنجاح");
      }

      setShowAddDialog(false);
      resetForm();
      // Removed loadData() to avoid full refetch delay
    } catch (error: any) {
      console.error("Failed to save product:", error);
      notify.error(error.message || "فشل حفظ المنتج");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      await productsService.delete(productId);
      notify.success("تم حذف المنتج");
      loadData();
    } catch (error) {
      notify.error("فشل حذف المنتج");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
        {/* Filter bar skeleton */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
        </div>
        {/* Product cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="rounded-xl overflow-hidden">
              <div className="animate-pulse">
                <div className="h-40 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="flex justify-between pt-2">
                    <div className="h-6 w-20 bg-muted rounded" />
                    <div className="h-8 w-16 bg-muted rounded-lg" />
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.products}</h1>
          <p className="text-muted-foreground">إدارة منتجات متجرك</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد متجر</h3>
              <p className="text-muted-foreground mb-4">
                يجب إنشاء متجر أولاً لإضافة المنتجات
              </p>
              <Link to="/dashboard/settings">
                <Button>إنشاء متجر</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {shop?.approval_status !== "APPROVED" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
           <div>
             <h3 className="font-semibold text-amber-800">إضافة المنتجات متوقفة</h3>
             <p className="text-sm text-amber-700">لا يمكنك إضافة أو تعديل المنتجات حتى تتم الموافقة على متجرك من قبل الإدارة.</p>
           </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.products}</h1>
          <p className="text-muted-foreground">
            إدارة منتجات متجرك ({products.length} منتج)
          </p>
        </div>
        <Button 
          className="gap-2 shrink-0" 
          onClick={openAddDialog}
          disabled={shop?.approval_status !== "APPROVED"}
        >
          <Plus className="w-4 h-4" />
          {AR.dashboard.addProduct}
        </Button>
      </div>

      <ProductFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        categories={categories}
        lowStockCount={stats.lowStockCount}
      />

      {/* Stock Warning Banners */}
      {stats.outOfStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {stats.outOfStockCount} منتج نفذت الكمية!
              </p>
              <p className="text-xs text-red-600">
                هذه المنتجات لن تظهر للعملاء حتى يتم تحديث المخزون
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0"
            onClick={() => setStockFilter("OUT")}
          >
            عرض المنتجات
          </Button>
        </div>
      )}

      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {stats.lowStockCount} منتج المخزون على وشك النفاذ
              </p>
              <p className="text-xs text-amber-600">
                يُنصح بتحديث الكميات قبل نفاذ المخزون
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0"
            onClick={() => setStockFilter("LOW")}
          >
            عرض المنتجات
          </Button>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground mb-4">
                لا توجد منتجات تطابق معايير البحث
              </p>
              {products.length === 0 && (
                <Button 
                  onClick={openAddDialog}
                  disabled={shop?.approval_status !== "APPROVED"}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة منتج
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
             <DashboardProductCard
                key={product.id}
                product={{
                  ...product,
                  category_name: categories.find(c => c.id === product.category_id)?.name // Enrich with category name
                }}
                onEdit={openEditDialog}
                onDelete={handleDelete}
             />
          ))}
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "قم بتعديل بيانات المنتج ثم اضغط تحديث" : "أدخل بيانات المنتج الجديد"}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Image Upload — Top */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">صورة المنتج</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors bg-muted/20">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="معاينة"
                        className="w-full h-40 object-contain rounded-lg bg-white"
                      />
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 opacity-90 hover:opacity-100"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <label className="absolute bottom-2 left-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs gap-1 opacity-90 hover:opacity-100 pointer-events-none"
                        >
                          <Upload className="w-3 h-3" />
                          تغيير
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2 py-6">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          اضغط لرفع صورة
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG — حتى 5 ميجابايت — سيتم قصها تلقائياً
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">اسم المنتج <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: طماطم طازجة"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="وصف مختصر عن المنتج..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Separator />

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm font-medium">السعر (ج.م) <span className="text-destructive">*</span></Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="25"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="compare_price" className="text-sm font-medium">السعر قبل الخصم</Label>
                  <Input
                    id="compare_price"
                    type="number"
                    value={formData.compare_at_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        compare_at_price: e.target.value,
                      })
                    }
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Category + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm font-medium">التصنيف <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="text-sm font-medium">الكمية المتوفرة</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_quantity: e.target.value })
                    }
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-background mt-auto flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="flex-1"
              size="lg"
            >
              {isUploading
                ? "جاري رفع الصورة..."
                : isSaving
                ? "جاري الحفظ..."
                : editingProduct
                ? "تحديث"
                : "إضافة المنتج"}
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      {rawImageSrc && (
        <ImageCropper
          open={showCropper}
          onClose={() => { setShowCropper(false); setRawImageSrc(null); }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          aspect={1}
        />
      )}
    </div>
  );
}

// Deprecated: DashboardOrders replaced by ShopOrders
function DashboardOrders_Deprecated() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundService.getMuteStatus());

  // Sound Controls
  const toggleMute = () => {
    const newMuteStatus = SoundService.toggleMute();
    setIsMuted(newMuteStatus);
    notify.success(newMuteStatus ? "تم كتم الصوت" : "تم تفعيل الصوت");
  };

  const enableAudio = async () => {
    const enabled = await SoundService.enableAudio();
    if (enabled) {
      notify.success("تم تفعيل التنبيهات الصوتية");
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);

      if (userShop) {
        const shopOrders = await orderService.getByShop(userShop.id);
        setOrders(shopOrders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time integration
  useShopRealtime(shop?.id, loadData, loadData);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await orderService.updateStatus(orderId, newStatus as any, user.id);
      notify.success("تم تحديث حالة الطلب");
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      console.error("DEBUG: Status update failed", error);
      notify.error(error.message || "فشل تحديث حالة الطلب");
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDialog(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PLACED":
        return "placed";
      case "CONFIRMED":
        return "default";
      case "PREPARING":
        return "preparing";
      case "OUT_FOR_DELIVERY":
        return "secondary";
      case "DELIVERED":
        return "delivered";
      case "CANCELLED":
        return "destructive";
      default:
        return "default";
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      PLACED: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY_FOR_PICKUP",
      // Shop cannot move beyond READY_FOR_PICKUP
      // OUT_FOR_DELIVERY: "DELIVERED", 
    };
    return transitions[currentStatus] || null;
  };

  const getNextStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      CONFIRMED: "تأكيد الطلب",
      PREPARING: "بدء التجهيز",
      READY_FOR_PICKUP: "جاهز للاستلام",
      OUT_FOR_DELIVERY: "خرج للتوصيل",
      DELIVERED: "تم التسليم",
    };
    return labels[status] || status;
  };

  const filteredOrders =
    statusFilter === "ALL"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
          <p className="text-muted-foreground">إدارة طلبات العملاء</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد متجر</h3>
              <p className="text-muted-foreground mb-4">
                يجب إنشاء متجر أولاً لاستقبال الطلبات
              </p>
              <Link to="/dashboard/settings">
                <Button>إنشاء متجر</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
          <p className="text-muted-foreground">
            إدارة طلبات العملاء ({orders.length} طلب)
          </p>
        </div>
        <div className="flex gap-2 items-center">
           <Button variant="outline" size="icon" onClick={toggleMute} title={isMuted ? "تفعيل الصوت" : "كتم الصوت"}>
             {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
           </Button>
           <Button variant="outline" onClick={enableAudio} className="gap-2">
             <Bell className="w-4 h-4" />
             تفعيل التنبيهات
           </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الطلبات</SelectItem>
            <SelectItem value="PLACED">جديدة</SelectItem>
            <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
            <SelectItem value="PREPARING">قيد التجهيز</SelectItem>
            <SelectItem value="OUT_FOR_DELIVERY">في الطريق</SelectItem>
            <SelectItem value="DELIVERED">تم التسليم</SelectItem>
            <SelectItem value="CANCELLED">ملغية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground">
                {statusFilter === "ALL"
                  ? "لم تتلقى أي طلبات حتى الآن"
                  : "لا توجد طلبات بهذه الحالة"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold">
                          {order.order_number}
                        </span>
                        <Badge
                          variant={getStatusBadgeVariant(order.status) as any}
                        >
                          {
                            AR.orderStatus[
                              order.status as keyof typeof AR.orderStatus
                            ]
                          }
                        </Badge>
                        {order.parent_order_id && (
                          <Badge variant="outline" className="border-primary text-primary">
                            طلب مجمّع
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.delivery_phone} • {order.delivery_address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mr-auto md:mr-0">
                    <div className="text-left">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} منتجات
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {getNextStatus(order.status) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              getNextStatus(order.status)!
                            )
                          }
                          disabled={isUpdating}
                        >
                          {getNextStatusLabel(getNextStatus(order.status)!)}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrderDetails(order)}
                      >
                        التفاصيل
                      </Button>
                      {order.status === "PLACED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleUpdateStatus(order.id, "CANCELLED")
                          }
                          disabled={isUpdating}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>طلب {selectedOrder?.order_number}</span>
              {selectedOrder && (
                <Badge
                  variant={getStatusBadgeVariant(selectedOrder.status) as any}
                >
                  {
                    AR.orderStatus[
                      selectedOrder.status as keyof typeof AR.orderStatus
                    ]
                  }
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  معلومات التوصيل
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{selectedOrder.delivery_phone}</p>
                  <p className="text-sm">{selectedOrder.delivery_address}</p>
                  {selectedOrder.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">ملاحظات:</span>{" "}
                      {selectedOrder.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  المنتجات
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-muted-foreground">
                            النوع: {item.variant_name}
                          </p>
                        )}
                        {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.modifiers.map((mod: any, idx: number) => (
                              <span key={idx} className="block">
                                + {mod.name} ({formatPrice(mod.price)})
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPrice(item.unit_price || item.product_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span>{formatPrice(selectedOrder.delivery_fee || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  تاريخ الطلب
                </h4>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedOrder.created_at).toLocaleString("ar-EG", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </div>
              </div>

              {/* Actions */}
              {getNextStatus(selectedOrder.status) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleUpdateStatus(
                        selectedOrder.id,
                        getNextStatus(selectedOrder.status)!
                      );
                    }}
                    disabled={isUpdating}
                  >
                    {getNextStatusLabel(getNextStatus(selectedOrder.status)!)}
                  </Button>
                  {selectedOrder.status === "PLACED" && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "CANCELLED");
                      }}
                      disabled={isUpdating}
                    >
                      إلغاء الطلب
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { ShopHoursSettings } from "@/components/dashboard/ShopHoursSettings";

// Shop Settings / Registration
function DashboardSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [shop, setShop] = useState<Shop | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Shop Categories
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Media Upload State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Image Cropper State
  const [showCropperSettings, setShowCropperSettings] = useState(false);
  const [rawImageSrcSettings, setRawImageSrcSettings] = useState("");
  const [cropTypeSettings, setCropTypeSettings] = useState<'logo' | 'cover'>('logo');

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    address: "",
    region_id: "",
    category_id: "", // New field
    latitude: 0,
    longitude: 0,
  });

  // React Query for Shop
  const { data: userShop, isLoading: isShopLoading } = useQuery({
    queryKey: ["shop", "owner", user?.id],
    queryFn: () => user?.id ? shopsService.getByOwnerId(user.id) : Promise.resolve(null),
    enabled: !!user,
  });

  // Fetch meta data (Regions/Categories) separately or keep inside useEffect? 
  // Better to use useQuery for them too, or keep concise. Let's keep meta data simple for now.

  useEffect(() => {
    loadMetaData();
  }, []);

  useEffect(() => {
    if (userShop) {
      setShop(userShop); // Keep local state for compatibility or remove it? using userShop directly is better but setShop is used elsewhere?
      // Check if setShop is used elsewhere for optimist updates? 
      // Actually, let's keep setShop synced with userShop
      
      setFormData({
          name: userShop.name,
          description: userShop.description || "",
          phone: userShop.phone,
          whatsapp: userShop.whatsapp || "",
          address: userShop.address,
          region_id: userShop.region_id,
          category_id: userShop.category_id || "",
          latitude: userShop.latitude || 30.7865, 
          longitude: userShop.longitude || 31.0004, 
      });
      if (userShop.logo_url) setLogoPreview(userShop.logo_url);
      if (userShop.cover_url) setCoverPreview(userShop.cover_url);
    }
  }, [userShop]);

  const loadMetaData = async () => {
      try {
        const [regs, cats] = await Promise.all([
            regionsService.getAll(),
            categoriesService.getAll()
        ]);
        setRegions(regs);
        setCategories(cats.filter(c => c.type === 'SHOP'));
      } catch (e) { console.error(e); }
      setIsLoading(false); // Overrides pure query loading
  };

  // Sync loading states
  const showLoading = isLoading || isShopLoading;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
     if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       if (file.size > 5 * 1024 * 1024) {
         notify.error("حجم الملف يجب أن لا يتجاوز 5 ميجابايت");
         return;
       }

       // Open cropper instead of directly setting
       const reader = new FileReader();
       reader.onloadend = () => {
         setRawImageSrcSettings(reader.result as string);
         setCropTypeSettings(type);
         setShowCropperSettings(true);
       };
       reader.readAsDataURL(file);
       // Reset input so the same file can be re-selected
       e.target.value = '';
     }
  };

  const handleCropCompleteSettings = (croppedFile: File) => {
    const preview = URL.createObjectURL(croppedFile);
    if (cropTypeSettings === 'logo') {
      setLogoFile(croppedFile);
      setLogoPreview(preview);
    } else {
      setCoverFile(croppedFile);
      setCoverPreview(preview);
    }
  };

  const uploadShopImage = async (file: File, bucket: string): Promise<string> => {
     const fileExt = file.name.split(".").pop();
     const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
     const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

     if (error) throw error;
     
     const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
     return data.publicUrl;
  };

  // Extract storage path from a public URL
  const extractStoragePath = (url: string, bucket: string): string | null => {
    try {
      const parts = url.split(`/storage/v1/object/public/${bucket}/`);
      return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
    } catch {
      return null;
    }
  };

  // Delete image from storage bucket AND clear from DB
  const handleDeleteImage = async (type: 'logo' | 'cover') => {
    if (!shop) return;
    const url = type === 'logo' ? shop.logo_url : shop.cover_url;
    const bucket = type === 'logo' ? 'shop-logos' : 'shop-covers';
    const dbField = type === 'logo' ? 'logo_url' : 'cover_url';

    try {
      // Remove from storage
      if (url) {
        const path = extractStoragePath(url, bucket);
        if (path) {
          await supabase.storage.from(bucket).remove([path]);
        }
      }

      // Clear from DB
      await supabase.from('shops').update({ [dbField]: null }).eq('id', shop.id);

      // Update local state
      if (type === 'logo') {
        setLogoPreview(null);
        setLogoFile(null);
      } else {
        setCoverPreview(null);
        setCoverFile(null);
      }
      setShop({ ...shop, [dbField]: null } as any);
      queryClient.invalidateQueries({ queryKey: ["shop", "owner", user?.id] });
      notify.success(type === 'logo' ? 'تم حذف الشعار' : 'تم حذف الغلاف');
    } catch (error: any) {
      console.error('Delete image error:', error);
      notify.error('فشل حذف الصورة');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (
      !formData.name ||
      !formData.phone ||
      !formData.address ||
      !formData.region_id ||
      !formData.category_id // Mandatory
    ) {
      notify.error("يرجى ملء جميع الحقول المطلوبة (بما في ذلك نوع المتجر)");
      return;
    }

    if (!formData.latitude || !formData.longitude || (formData.latitude === 30.7865 && formData.longitude === 31.0004)) {
       notify.error("يرجى تحديد موقع المتجر على الخريطة بدقة");
       return;
    }

    setIsSaving(true);
    setIsUploading(true);

    try {
      let logoUrl = shop?.logo_url;
      let coverUrl = shop?.cover_url;

      // Upload Images if changed (and clean up old ones from storage)
      if (logoFile) {
        // Delete old logo from storage before uploading new one
        if (shop?.logo_url) {
          const oldPath = extractStoragePath(shop.logo_url, 'shop-logos');
          if (oldPath) await supabase.storage.from('shop-logos').remove([oldPath]);
        }
        logoUrl = await uploadShopImage(logoFile, "shop-logos");
      }
      if (coverFile) {
        // Delete old cover from storage before uploading new one
        if (shop?.cover_url) {
          const oldPath = extractStoragePath(shop.cover_url, 'shop-covers');
          if (oldPath) await supabase.storage.from('shop-covers').remove([oldPath]);
        }
        coverUrl = await uploadShopImage(coverFile, "shop-covers");
      }

      setIsUploading(false); // Done uploading

      const shopData = {
        name: formData.name,
        description: formData.description || null,
        phone: formData.phone,
        whatsapp: formData.whatsapp || null,
        address: formData.address,
        region_id: formData.region_id,
        category_id: formData.category_id,
        latitude: formData.latitude,
        longitude: formData.longitude,
        owner_id: user.id,
        logo_url: logoUrl,
        cover_url: coverUrl,
        slug: shop?.slug || `shop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };

      if (shop) {
        // If updating, do we reset status? 
        // For now, let's keep status unless it was rejected, then reset to PENDING?
        // Or simple rule: if it was REJECTED, reset to PENDING to request review again.
        let newStatus = shop.status;
        if (shop.approval_status === "REJECTED") {
           newStatus = "PENDING"; // Resubmit
        }

        await shopsService.update(shop.id, {
           ...shopData,
           // @ts-ignore
           approval_status: shop.approval_status === 'REJECTED' ? 'PENDING' : shop.approval_status,
           rejection_reason: shop.approval_status === 'REJECTED' ? null : shop.rejection_reason,
           status: newStatus as any
        });
        notify.success("تم تحديث بيانات المتجر");
      } else {
        // New Shop -> PENDING
        await shopsService.create({
          ...shopData,
          status: "PENDING",
          // @ts-ignore
          approval_status: "PENDING",
          is_active: false,
          is_open: true // Open by default but inactive until approved
        } as any);
        notify.success("تم إنشاء المتجر بنجاح! سيتم مراجعته قريباً.");
      }
        // Invalidate to refresh data
        queryClient.invalidateQueries({ queryKey: ["shop", "owner", user?.id] });
    } catch (error: any) {
      console.error("Failed to save shop:", error);
      notify.error(error.message || "فشل حفظ المتجر");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  if (showLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </div>
        {/* Tab skeleton */}
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
        </div>
        {/* Cover + Logo skeleton */}
        <Card className="rounded-xl overflow-hidden">
          <div className="animate-pulse">
            <div className="h-40 bg-muted" />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4 -mt-12">
                <div className="w-20 h-20 rounded-xl bg-muted border-4 border-background" />
                <div className="pt-8 space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-10 w-full bg-muted rounded-lg" />
                <div className="h-10 w-full bg-muted rounded-lg" />
                <div className="h-20 w-full bg-muted rounded-lg" />
              </div>
            </CardContent>
          </div>
        </Card>
        {/* Contact skeleton */}
        <Card className="rounded-xl">
          <div className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-5 w-36 bg-muted rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 bg-muted rounded-lg" />
                <div className="h-10 bg-muted rounded-lg" />
                <div className="h-10 bg-muted rounded-lg" />
                <div className="h-10 bg-muted rounded-lg" />
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  }

  // Status Banner Logic
  const renderStatusBanner = () => {
     if (!shop) return null; // New shop doesn't have status yet
     
     if (shop.approval_status === 'PENDING' || shop.status === 'PENDING') {
       return (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
           <div>
             <h3 className="font-semibold text-amber-800">الحساب قيد المراجعة</h3>
             <p className="text-sm text-amber-700">طلبك لإنشاء المتجر قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك قريباً.</p>
           </div>
         </div>
       );
     }
     
     if (shop.approval_status === 'REJECTED' || shop.status === 'REJECTED') {
       return (
         <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start gap-3">
           <XCircle className="w-5 h-5 text-destructive mt-0.5" />
           <div>
             <h3 className="font-semibold text-destructive">تم رفض الطلب</h3>
             <p className="text-sm text-destructive/90">عذراً، تم رفض طلبك للسبب التالي:</p>
             <p className="text-sm font-medium mt-1 bg-white/50 p-2 rounded">{shop.rejection_reason || "لا يوجد سبب محدد"}</p>
             <p className="text-xs text-muted-foreground mt-2">يمكنك تعديل البيانات وإعادة الإرسال للمراجعة.</p>
           </div>
         </div>
       );
     }

     if (!shop.is_active && shop.approval_status === 'APPROVED') {
        return (
         <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
           <Ban className="w-5 h-5 text-red-600 mt-0.5" />
           <div>
             <h3 className="font-semibold text-red-800">الحساب موقوف</h3>
             <p className="text-sm text-red-700">تم إيقاف حساب المتجر مؤقتاً.</p>
             {shop.disabled_reason && <p className="text-sm font-medium mt-1">السبب: {shop.disabled_reason}</p>}
           </div>
         </div>
       );
     }

     return null;
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {shop ? "إعدادات المتجر" : "إنشاء متجر جديد"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {shop ? "قم بتحديث بيانات متجرك، الشعار، والموقع" : "أنشئ متجرك للبدء في بيع المنتجات"}
        </p>
      </div>

      {renderStatusBanner()}

      <Tabs defaultValue="general" className="space-y-6" dir="rtl">
        <TabsList className="w-full md:w-auto">
            <TabsTrigger value="general" className="flex-1 md:flex-none">بيانات المتجر</TabsTrigger>
            {shop && <TabsTrigger value="hours" className="flex-1 md:flex-none">ساعات العمل والحالة</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* ──────────── Card 1: Store Identity ──────────── */}
          <Card className="rounded-xl shadow-sm overflow-hidden">
            {/* Cover Photo Banner */}
            <div className="relative h-36 md:h-44 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60">
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-xs">اضغط لرفع غلاف المتجر</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => handleFileChange(e, 'cover')}
              />
              {coverPreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 left-2 h-7 text-xs gap-1 opacity-90 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage('cover'); }}
                >
                  <Trash2 className="w-3 h-3" />
                  حذف
                </Button>
              )}
            </div>

            {/* Logo overlapping cover */}
            <div className="px-4 md:px-6 -mt-12 relative z-10">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-xl border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-md">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center pointer-events-none">
                        <Store className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e, 'logo')}
                    />
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => handleDeleteImage('logo')}
                      className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium">{formData.name || "اسم المتجر"}</p>
                  <p className="text-xs text-muted-foreground">اضغط على الشعار أو الغلاف لتغييره</p>
                </div>
              </div>
            </div>

            <CardContent className="pt-6 px-4 md:px-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shopName" className="text-sm font-medium">اسم المتجر <span className="text-destructive">*</span></Label>
                  <Input
                    id="shopName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: سوبر ماركت النور"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm font-medium">نوع المتجر <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المتجر" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span>{cat.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shopDesc" className="text-sm font-medium">وصف المتجر</Label>
                <Textarea
                  id="shopDesc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر عن متجرك ومنتجاتك..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">يظهر هذا الوصف للعملاء في صفحة متجرك</p>
              </div>
            </CardContent>
          </Card>

          {/* ──────────── Card 2: Contact Information ──────────── */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-4 px-4 md:px-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                معلومات التواصل والموقع
              </CardTitle>
              <CardDescription>رقم الهاتف، الواتساب، العنوان، والمنطقة</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">رقم الهاتف <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp" className="text-sm font-medium">واتساب</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    dir="ltr"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">اختياري — للتواصل السريع مع العملاء</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium">العنوان التفصيلي <span className="text-destructive">*</span></Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="شارع، مبنى، علامة مميزة..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-sm font-medium">المنطقة <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.region_id}
                    onValueChange={(value) => setFormData({ ...formData, region_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ──────────── Card 3: Location Map ──────────── */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-4 px-4 md:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">موقع المتجر</CardTitle>
                    <CardDescription className="mt-0.5">حدد موقعك الدقيق ليتمكن المناديب من الوصول إليك</CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMapPicker(true)}
                  className="gap-1.5 hidden md:flex"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {formData.latitude && formData.latitude !== 30.7865 ? "تغيير الموقع" : "تحديد الموقع"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6 space-y-3">
              <div 
                className="h-[200px] md:h-[260px] w-full rounded-xl overflow-hidden border cursor-pointer hover:shadow-md transition-shadow relative bg-muted"
                onClick={() => setShowMapPicker(true)}
              >
                  {formData.latitude && !showMapPicker ? (
                    <LocationPreviewMap 
                      position={{ lat: formData.latitude, lng: formData.longitude }} 
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <MapPin className="w-8 h-8 text-muted-foreground/40" />
                      <span className="text-sm">اضغط لتحديد الموقع على الخريطة</span>
                    </div>
                  )}
              </div>

              {/* Mobile button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMapPicker(true)}
                className="w-full md:hidden gap-1.5"
              >
                <MapPin className="w-4 h-4" />
                {formData.latitude && formData.latitude !== 30.7865 ? "تغيير الموقع" : "تحديد الموقع"}
              </Button>

              <MapLocationPicker 
                open={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                initialPosition={
                    formData.latitude && formData.longitude 
                    ? { lat: formData.latitude, lng: formData.longitude }
                    : undefined
                }
                onLocationSelect={(loc) => {
                    setFormData(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }));
                }}
                regionBoundary={(regions.find(r => r.id === formData.region_id) as any)?.boundary_coordinates}
                regionName={regions.find(r => r.id === formData.region_id)?.name}
              />
            </CardContent>
          </Card>

          {/* ──────────── Desktop Save Button ──────────── */}
          <div className="hidden md:block">
            <Button
              onClick={handleSave}
              disabled={isSaving || isUploading}
              size="lg"
              className="w-full gap-2"
            >
              {isUploading ? "جاري رفع الملفات..." : isSaving ? "جاري الحفظ..." : shop ? "حفظ التغييرات" : "إنشاء المتجر"}
            </Button>
          </div>
        </TabsContent>

        {shop && (
          <TabsContent value="hours">
            <ShopHoursSettings shop={shop} />
          </TabsContent>
        )}
      </Tabs>

      {/* ──────────── Mobile Sticky Save ──────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg md:hidden z-40">
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          size="lg"
          className="w-full gap-2"
        >
          {isUploading ? "جاري رفع الملفات..." : isSaving ? "جاري الحفظ..." : shop ? "حفظ التغييرات" : "إنشاء المتجر"}
        </Button>
      </div>

      {/* Image Cropper for Settings */}
      <ImageCropper
        open={showCropperSettings}
        onClose={() => setShowCropperSettings(false)}
        imageSrc={rawImageSrcSettings}
        onCropComplete={handleCropCompleteSettings}
        aspect={cropTypeSettings === 'logo' ? 1 : 16 / 9}
      />
    </div>
  );
}

// Admin Categories Management
// Admin Categories Management


// Admin Regions Management
function AdminRegions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    delivery_fee: string;
    boundary_coordinates: { lat: number; lng: number }[];
  }>({
    name: "",
    delivery_fee: "15",
    boundary_coordinates: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Map drawing status
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadRegions();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadRegions = async () => {
    setIsLoading(true);
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", delivery_fee: "15", boundary_coordinates: [] });
    setEditingRegion(null);
    setIsDrawing(false);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      delivery_fee: (region as any).delivery_fee?.toString() || "15",
      boundary_coordinates: (region as any).boundary_coordinates || [],
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      notify.error("يرجى إدخال اسم المنطقة");
      return;
    }

    if (formData.boundary_coordinates.length < 3) {
      notify.error("يرجى تحديد حدود المنطقة (3 نقاط على الأقل)");
      return;
    }

    setIsSaving(true);
    try {
      // Ensure first and last points match to close the polygon (Leaflet does this visually, but good for data)
      // Actually typically we store points, visualization handles closure.
      
      const regionData = {
        name: formData.name,
        // delivery_fee: parseFloat(formData.delivery_fee) || 15,
        slug: `region-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        is_active: true,
        boundary_coordinates: formData.boundary_coordinates
      };

      if (editingRegion) {
        await regionsService.update(editingRegion.id, regionData);
        notify.success("تم تحديث المنطقة بنجاح");
      } else {
        await regionsService.create(regionData as any);
        notify.success("تم إضافة المنطقة بنجاح");
      }

      setShowDialog(false);
      resetForm();
      loadRegions();
    } catch (error: any) {
      console.error("Failed to save region:", error);
      notify.error(error.message || "فشل حفظ المنطقة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (regionId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المنطقة؟")) return;

    try {
      await regionsService.delete(regionId);
      notify.success("تم حذف المنطقة");
      loadRegions();
    } catch (error) {
      notify.error("فشل حذف المنطقة - قد تكون مرتبطة بمتاجر");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.regions}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.regions}</h1>
          <p className="text-muted-foreground">
            إدارة مناطق التوصيل ({regions.length} منطقة)
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="w-4 h-4" />
          إضافة منطقة
        </Button>
      </div>

      {regions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مناطق</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة منطقة جديدة
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة منطقة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <Card key={region.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{region.name}</h3>
                    <p className="text-sm text-muted-foreground">
                       {/* رسوم التوصيل: {formatPrice((region as any).delivery_fee || 15)} */}
                       {(region as any).boundary_coordinates?.length > 0 ? "تم تحديد الحدود" : "لم يتم تحديد الحدود"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(region)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(region.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? "تعديل المنطقة" : "إضافة منطقة جديدة"}
            </DialogTitle>
            <DialogDescription>
              قم برسم حدود المنطقة على الخريطة لتحديد نطاق التوصيل.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            {/* Form Fields & Instructions */}
            <div className="space-y-4 md:col-span-1">
              <div className="space-y-2">
                <Label htmlFor="regionName">اسم المنطقة *</Label>
                <Input
                  id="regionName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: أبو حمص"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  رسم الحدود
                </h4>
                <p className="text-muted-foreground">
                  1. اضغط على الخريطة لإضافة نقاط الحدود.
                </p>
                <p className="text-muted-foreground">
                  2. حدد 3 نقاط على الأقل لإغلاق الشكل.
                </p>
                <p className="text-muted-foreground">
                  3. يمكنك سحب النقاط لتعديل مكانها.
                </p>
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="w-full mt-2 text-destructive hover:bg-destructive/10"
                   onClick={() => setFormData(prev => ({ ...prev, boundary_coordinates: [] }))}
                >
                  <Trash2 className="w-3 h-3 ml-2" />
                  مسح الحدود الحالية
                </Button>
              </div>
            </div>

            {/* Map Area */}
            <div className="md:col-span-2 h-[400px] border rounded-lg overflow-hidden relative">
               <RegionMapDrawer 
                  initialCoordinates={formData.boundary_coordinates}
                  onCoordinatesChange={(coords) => setFormData(prev => ({ ...prev, boundary_coordinates: coords }))}
               />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "جاري الحفظ..." : editingRegion ? "تحديث" : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// NEW: Map Drawer Helper Component for Admin
// -----------------------------------------------------------------------------

function RegionMapDrawer({ 
   initialCoordinates, 
   onCoordinatesChange 
}: { 
   initialCoordinates: {lat: number, lng: number}[],
   onCoordinatesChange: (coords: {lat: number, lng: number}[]) => void
}) {
  // Center map on existing polygon or default
  const defaultCenter = initialCoordinates.length > 0
    ? [initialCoordinates[0].lat, initialCoordinates[0].lng]
    : [31.0603, 30.3254]; // Abo Hommos

  return (
    <div className="h-full w-full">
       <MapContainer
          center={defaultCenter as [number, number]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
       >
          <TileLayer
             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             attribution='&copy; OpenStreetMap contributors'
          />
          <MapClickAccumulator 
             points={initialCoordinates} 
             onChange={onCoordinatesChange} 
          />
       </MapContainer>
    </div>
  );
}

// Handles clicks to add points and rendering of partial polygon
function MapClickAccumulator({points, onChange}: {points: {lat:number, lng:number}[], onChange: (pts: {lat:number, lng:number}[]) => void}) {
   useMapEvents({
      click(e) {
         onChange([...points, {lat: e.latlng.lat, lng: e.latlng.lng}]);
      }
   });

   // Convert points to Leaflet format
   // Explicit cast to fix TS error: number[][] not assignable to LatLngExpression[]
   const positions = points.map(p => [p.lat, p.lng] as [number, number]);

   return (
      <>
         {/* Render Markers for each point to allow deletion/drag (future enhancement) */}
         {positions.map((pos, idx) => (
            <Marker 
               key={idx} 
               position={pos}
               eventHandlers={{
                  click: () => {
                     // Click existing marker to remove it
                     const newPoints = points.filter((_, i) => i !== idx);
                     onChange(newPoints);
                  }
               }}
            />
         ))}

         {/* Render Polyline if open, Polygon if closed (3+ points) */}
         {points.length >= 3 ? (
             <Polygon positions={positions} pathOptions={{ color: 'blue' }} />
         ) : points.length > 0 ? (
             <Polyline positions={positions} pathOptions={{ color: 'blue', dashArray: '5, 5' }} />
         ) : null}
      </>
   );
}

// Admin Shops Management
function AdminShops() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Status Management
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedFinancialShop, setSelectedFinancialShop] = useState<Shop | null>(null);
  const [actionDialog, setActionDialog] = useState<'REJECT' | 'SUSPEND' | null>(null);
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadShops();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const data = await shopsService.getAll({ approvedOnly: false });
      setShops(data);
    } catch (error) {
      console.error("Failed to load shops:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (shop: Shop, newStatus: ShopStatus) => {
    if (newStatus === "REJECTED") {
      setSelectedShop(shop);
      setReason("");
      setActionDialog("REJECT");
      return;
    }
    
    if (newStatus === "SUSPENDED") {
      setSelectedShop(shop);
      setReason("");
      setActionDialog("SUSPEND");
      return;
    }

    try {
      await shopsService.updateStatus(shop.id, newStatus);
      
      // If approving, also ensure active
      if (newStatus === 'APPROVED') {
         await shopsService.update(shop.id, { 
             is_active: true,
             approval_status: 'APPROVED',
             approved_at: new Date().toISOString(),
             approved_by: user?.id,
             rejection_reason: null
         });
      }

      notify.success("تم تحديث حالة المتجر بنجاح");
      loadShops();
    } catch (error) {
      notify.error("فشل تحديث الحالة");
    }
  };

  const handleProcessAction = async () => {
    if (!selectedShop || !reason) {
      notify.error("يرجى ذكر السبب");
      return;
    }

    setIsProcessing(true);
    try {
      if (actionDialog === 'REJECT') {
        await shopsService.update(selectedShop.id, {
          approval_status: 'REJECTED',
          rejection_reason: reason,
          is_active: false // Rejected shops are inactive
        });
        notify.success("تم رفض المتجر");
      } else if (actionDialog === 'SUSPEND') {
        await shopsService.toggleActive(selectedShop.id, {
          is_active: false,
          disabled_reason: reason,
          disabled_at: new Date().toISOString(),
          disabled_by: user?.id
        });
        notify.success("تم إيقاف المتجر");
      }
      
      setActionDialog(null);
      loadShops();
    } catch (error) {
      console.error(error);
      notify.error("فشل تنفيذ الإجراء");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePremium = async (shop: Shop) => {
    try {
      await shopsService.update(shop.id, { is_premium: !shop.is_premium });
      notify.success(shop.is_premium ? "تم إلغاء التميز" : "تم تمييز المتجر");
      loadShops();
    } catch (error) {
       notify.error("فشل تحديث التميز");
    }
  };

  const handleToggleOpen = async (shop: Shop) => {
    try {
      await shopsService.update(shop.id, { is_open: !shop.is_open });
      notify.success(shop.is_open ? "تم إغلاق المتجر" : "تم فتح المتجر");
      loadShops();
    } catch (error) {
      notify.error("فشل تحديث حالة المتجر");
    }
  };

  const filteredShops = shops.filter((shop) => {
    // Tab Filtering
    let matchesTab = false;
    if (activeTab === 'ALL') matchesTab = true;
    else if (activeTab === 'PENDING') matchesTab = shop.approval_status === 'PENDING';
    else if (activeTab === 'APPROVED') matchesTab = shop.approval_status === 'APPROVED' && shop.is_active; // Active approved
    else if (activeTab === 'REJECTED') matchesTab = shop.approval_status === 'REJECTED';
    else if (activeTab === 'SUSPENDED') matchesTab = shop.approval_status === 'APPROVED' && !shop.is_active; // Approved but suspended

    // Fallback for old data migration (if approval_status is null but status matches)
    if (!matchesTab && !shop.approval_status) {
         if (activeTab === 'PENDING' && shop.status === 'PENDING') matchesTab = true;
         if (activeTab === 'APPROVED' && shop.status === 'APPROVED') matchesTab = true;
         if (activeTab === 'SUSPENDED' && shop.status === 'SUSPENDED') matchesTab = true;
    }

    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phone?.includes(searchQuery) ||
      shop.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesTab && matchesSearch;
  });

  const pendingCount = shops.filter(s => s.approval_status === 'PENDING' || (!s.approval_status && s.status === 'PENDING')).length;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.shops}</h1>
          <p className="text-muted-foreground">
            إدارة المتاجر ({shops.length})
            {pendingCount > 0 && <span className="text-amber-600 mr-2 font-medium">• {pendingCount} بانتظار المراجعة</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
         </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex flex-nowrap md:grid md:grid-cols-5 md:w-[600px] h-auto p-1 gap-1 no-scrollbar">
          <TabsTrigger value="PENDING" className="relative flex-shrink-0 min-w-[100px]">
             قيد المراجعة
             {pendingCount > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="flex-shrink-0 min-w-[100px]">مقبولة (نشطة)</TabsTrigger>
          <TabsTrigger value="SUSPENDED" className="flex-shrink-0 min-w-[80px]">موقوفة</TabsTrigger>
          <TabsTrigger value="REJECTED" className="flex-shrink-0 min-w-[80px]">مرفوضة</TabsTrigger>
          <TabsTrigger value="ALL" className="flex-shrink-0 min-w-[60px]">الكل</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid gap-4">
          {filteredShops.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد متاجر في هذه القائمة</p>
              </CardContent>
            </Card>
          ) : (
            filteredShops.map((shop) => (
              <Card key={shop.id} className={cn("transition-all", shop.is_premium ? "border-amber-400 shadow-md bg-amber-50/10" : "")}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-20 h-40 md:h-20 rounded-lg bg-muted flex-shrink-0 relative overflow-hidden">
                       {shop.logo_url ? (
                         <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Store className="w-8 h-8" /></div>
                       )}
                       {shop.is_premium && <div className="absolute top-0 right-0 bg-amber-500 text-white p-1 rounded-bl-lg shadow-sm"><CheckCircle className="w-3 h-3" /></div>}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg">{shop.name}</h3>
                        {shop.is_premium && <Badge className="bg-amber-500 hover:bg-amber-600">مميز</Badge>}
                        <Badge variant={shop.approval_status === 'APPROVED' ? 'success' : shop.approval_status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {shop.approval_status === 'APPROVED' ? 'مقبول' : shop.approval_status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {shop.address}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {shop.phone}</p>
                      {shop.rejection_reason && <p className="text-sm text-destructive mt-1">سبب الرفض: {shop.rejection_reason}</p>}
                      {!shop.is_active && shop.disabled_reason && <p className="text-sm text-destructive mt-1">سبب الإيقاف: {shop.disabled_reason}</p>}
                    </div>

                    <div className="flex flex-col justify-end w-full md:w-auto mt-4 md:mt-0">
                      {/* Actions based on Status */}
                      {shop.approval_status === 'PENDING' ? (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button size="sm" className="flex-1 md:w-24 bg-green-600 hover:bg-green-700 h-9" onClick={() => handleUpdateStatus(shop, 'APPROVED')}>
                            قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 md:w-24 h-9" onClick={() => handleUpdateStatus(shop, 'REJECTED')}>
                            رفض
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center justify-end w-full md:w-auto">
                           {shop.approval_status === 'APPROVED' && (
                               <Button size="sm" variant="outline" className="flex-1 md:flex-none h-9 border-blue-200 hover:bg-blue-50 text-blue-700" onClick={() => setSelectedFinancialShop(shop)}>
                                  <DollarSign className="w-4 h-4 ml-2" /> المالية
                               </Button>
                           )}

                           <Link to={`/dashboard/shops/analytics/${shop.id}`} className="flex-1 md:flex-none">
                             <Button variant="secondary" size="sm" className="w-full h-9">
                               <BarChart2 className="w-4 h-4 ml-2" /> التحليلات
                             </Button>
                           </Link>

                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex-shrink-0">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-48">
                               {shop.approval_status === 'APPROVED' && (
                                  <>
                                    <DropdownMenuLabel>إجراءات المتجر</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    
                                    {shop.is_premium ? (
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <Star className="w-4 h-4 ml-2 rtl:mr-0 text-amber-500 fill-amber-500"/> ترتيب التميز
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => {
                                             shopsService.update(shop.id, { is_premium: true, premium_sort_order: 1 }).then(() => { notify.success("تم تحديث ترتيب التميز"); loadShops(); });
                                          }}>مساحة مميزة #1</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                             shopsService.update(shop.id, { is_premium: true, premium_sort_order: 2 }).then(() => { notify.success("تم تحديث ترتيب التميز"); loadShops(); });
                                          }}>مساحة مميزة #2</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                             shopsService.update(shop.id, { is_premium: true, premium_sort_order: 99 }).then(() => { notify.success("تم تحديث ترتيب التميز"); loadShops(); });
                                          }}>مميز (عام)</DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleTogglePremium(shop)}>
                                            إلغاء التميز
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleTogglePremium(shop)}>
                                        <Star className="w-4 h-4 ml-2" /> تمييز المتجر
                                      </DropdownMenuItem>
                                    )}

                                    {shop.is_active ? (
                                      <DropdownMenuItem onClick={() => handleToggleOpen(shop)}>
                                        {shop.is_open ? <><Store className="w-4 h-4 ml-2"/> إغلاق المتجر</> : <><Store className="w-4 h-4 ml-2"/> فتح المتجر</>}
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(shop, 'APPROVED')}>
                                        <CheckCircle className="w-4 h-4 ml-2 text-green-600" /> تفعيل المتجر الموقوف
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    {shop.is_active && (
                                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleUpdateStatus(shop, 'SUSPENDED')}>
                                        <Ban className="w-4 h-4 ml-2" /> إيقاف مؤقت
                                      </DropdownMenuItem>
                                    )}
                                  </>
                               )}
                               
                               {shop.approval_status === 'REJECTED' && (
                                  <>
                                    <DropdownMenuLabel>مراجعة الرفض</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(shop, 'APPROVED')}>
                                      <CheckCircle className="w-4 h-4 ml-2 text-green-600" /> قبول المتجر (تراجع عن الرفض)
                                    </DropdownMenuItem>
                                  </>
                               )}
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Tabs>

      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
           <DialogHeader>
             <DialogTitle>
               {actionDialog === 'REJECT' ? 'رفض المتجر' : 'إيقاف المتجر'}
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>السبب (مطلوب)</Label>
                <Textarea 
                  placeholder={actionDialog === 'REJECT' ? 'سبب رفض المتجر...' : 'سبب الإيقاف المؤقت...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleProcessAction}
                disabled={!reason.trim() || isProcessing}
              >
                {isProcessing ? "جاري الحفظ..." : "تأكيد واستمرار"}
              </Button>
            </div>
         </DialogContent>
      </Dialog>
      
      {/* Financials Modal */}
      {selectedFinancialShop && (
         <AdminShopFinancials
           shopId={selectedFinancialShop.id}
           shopName={selectedFinancialShop.name}
           isOpen={!!selectedFinancialShop}
           onClose={() => setSelectedFinancialShop(null)}
           isPremiumActive={(selectedFinancialShop as any).is_premium_active}
           premiumExpiresAt={(selectedFinancialShop as any).premium_expires_at}
         />
      )}
    </div>
  );
}

// Admin Users Management
function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      notify.error("فشل تحميل المستخدمين");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRoleDialog = (profile: Profile) => {
    setSelectedUser(profile);
    setNewRole(profile.role);
    setShowRoleDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    setIsUpdating(true);
    try {
      // Use supabase directly for role update
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", selectedUser.id);

      if (error) throw error;

      notify.success("تم تحديث صلاحية المستخدم بنجاح");
      setShowRoleDialog(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to update role:", error);
      notify.error("فشل تحديث صلاحية المستخدم");
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      ADMIN: { variant: "destructive", label: "مسؤول" },
      SHOP_OWNER: { variant: "default", label: "صاحب متجر" },
      CUSTOMER: { variant: "secondary", label: "عميل" },
      DELIVERY: { variant: "outline", label: "مندوب توصيل" },
    };
    return variants[role] || { variant: "secondary", label: role };
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    shopOwners: users.filter((u) => u.role === "SHOP_OWNER").length,
    customers: users.filter((u) => u.role === "CUSTOMER").length,
    delivery: users.filter((u) => u.role === "DELIVERY").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.users}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{AR.admin.users}</h1>
        <p className="text-muted-foreground">
          إدارة المستخدمين ({users.length} مستخدم)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">مسؤولين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.shopOwners}</p>
                <p className="text-xs text-muted-foreground">أصحاب متاجر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.customers}</p>
                <p className="text-xs text-muted-foreground">عملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats as any).delivery}</p>
                <p className="text-xs text-muted-foreground">مناديب</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الصلاحية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع المستخدمين</SelectItem>
            <SelectItem value="ADMIN">المسؤولين</SelectItem>
            <SelectItem value="SHOP_OWNER">أصحاب المتاجر</SelectItem>
            <SelectItem value="CUSTOMER">العملاء</SelectItem>
            <SelectItem value="DELIVERY">المناديب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد مستخدمين</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== "ALL"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يسجل أي مستخدم بعد"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((profile) => {
            const roleInfo = getRoleBadge(profile.role);
            return (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-primary">
                          {profile.full_name?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{profile.full_name}</h3>
                        <Badge variant={roleInfo.variant}>
                          {roleInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.email}
                      </p>
                      {profile.phone && (
                        <p className="text-sm text-muted-foreground">
                          {profile.phone}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        انضم في:{" "}
                        {new Date(profile.created_at).toLocaleDateString(
                          "ar-EG"
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleDialog(profile)}
                        disabled={profile.id === user?.id}
                      >
                        <UserCog className="w-4 h-4 ml-1" />
                        تغيير الصلاحية
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير صلاحية المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {selectedUser.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الصلاحية الجديدة</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصلاحية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">عميل</SelectItem>
                    <SelectItem value="SHOP_OWNER">صاحب متجر</SelectItem>
                    <SelectItem value="DELIVERY">مندوب توصيل</SelectItem>
                    <SelectItem value="ADMIN">مسؤول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRole === "ADMIN" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <strong>تحذير:</strong> منح صلاحية المسؤول يعطي هذا المستخدم
                  وصولاً كاملاً لجميع وظائف الإدارة.
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateRole}
                  disabled={isUpdating || newRole === selectedUser.role}
                  className="flex-1"
                >
                  {isUpdating ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRoleDialog(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Auto-close sidebar on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  // Show loading while auth state is being determined
  if (isLoading) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <LayoutDashboard className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <Link to="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isDelivery = user?.role === "DELIVERY";
  const navItems = isDelivery ? deliveryNav : isAdmin ? adminNav : shopOwnerNav;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Header overlay */}
          <div className="lg:hidden flex items-center justify-between mb-4 bg-background p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold">لوحة التحكم</h2>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader className="sr-only">
                  <SheetTitle>لوحة التحكم</SheetTitle>
                  <SheetDescription>قائمة تنقل لوحة التحكم</SheetDescription>
                </SheetHeader>
                <nav className="space-y-2 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        location.pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        location.pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Routes>
              <Route
                index
                element={
                  isAdmin ? (
                    <AdminOverview />
                  ) : isDelivery ? (
                    <DeliveryDashboard initialTab="available" />
                  ) : (
                    <DashboardOverview />
                  )
                }
              />
              <Route path="products" element={<DashboardProducts />} />
              <Route path="orders" element={isDelivery ? <Navigate to="/dashboard" replace /> : <ShopOrders />} />
              <Route path="orders/history" element={isDelivery ? <Navigate to="/dashboard" replace /> : <ShopOrderHistory />} />
              <Route path="settings" element={<DashboardSettings />} />
              <Route
                path="account"
                element={
                  isDelivery ? (
                    <DeliveryGuard>
                      <CourierAccount />
                    </DeliveryGuard>
                  ) : (
                    <DashboardSettings />
                  )
                }
              />
              <Route
                path="delivery"
                element={
                  isAdmin ? (
                    <AdminDelivery />
                  ) : (
                    <DeliveryGuard>
                      <DeliveryDashboard />
                    </DeliveryGuard>
                  )
                }
              />
              {/* Admin-only routes - Protected by AdminGuard */}
// ... existing imports

              <Route
                path="shops"
                element={
                  <AdminGuard>
                    <AdminShops />
                  </AdminGuard>
                }
              />
              <Route
                path="shops/analytics/:id"
                element={
                  <AdminGuard>
                    <ShopAnalytics />
                  </AdminGuard>
                }
              />
              <Route
                path="categories"
                element={
                  <AdminGuard>
                    <AdminCategories />
                  </AdminGuard>
                }
              />
              <Route
                path="regions"
                element={
                  <AdminGuard>
                    <AdminRegions />
                  </AdminGuard>
                }
              />
              <Route
                path="users"
                element={
                  <AdminGuard>
                    <AdminUsers />
                  </AdminGuard>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
