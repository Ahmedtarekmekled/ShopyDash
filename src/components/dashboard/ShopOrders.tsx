import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Store,
  Search,
  MapPin,
  Phone,
  User,
  Clock,
  X,
  CheckCircle,
  Truck,
  Package,
  ClipboardList,
  Bell,
  Volume2,
  VolumeX,
  AlertCircle,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

import { useAuth } from "@/store";
import { useShopRealtime } from "@/hooks/useShopRealtime";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import { shopsService } from "@/services/catalog.service";
import { SoundService } from "@/services/sound.service";
import { formatPrice, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Pipeline column definition ─────────────────────────────────────────
const PIPELINE_COLUMNS = [
  { status: "PLACED",           label: "جديد",           color: "bg-blue-500",   textColor: "text-blue-700",   bg: "bg-blue-50 dark:bg-blue-950/30",   ring: "ring-blue-200" },
  { status: "CONFIRMED",        label: "مؤكد",           color: "bg-indigo-500", textColor: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-950/30", ring: "ring-indigo-200" },
  { status: "PREPARING",        label: "قيد التجهيز",   color: "bg-amber-500",  textColor: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30",  ring: "ring-amber-200" },
  { status: "READY_FOR_PICKUP", label: "جاهز للاستلام", color: "bg-purple-500", textColor: "text-purple-700", bg: "bg-purple-50 dark:bg-purple-950/30", ring: "ring-purple-200" },
  { status: "OUT_FOR_DELIVERY", label: "في الطريق",     color: "bg-orange-500", textColor: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-950/30", ring: "ring-orange-200" },
  { status: "DELIVERED",        label: "مكتمل",          color: "bg-green-500",  textColor: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30",  ring: "ring-green-200" },
];

// ─── Active statuses (pipeline shows only active orders) ─────────────────
const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];

// ─── Map Component ───────────────────────────────────────────────────────
const OrderMap = ({ latitude, longitude, address }: { latitude?: number | null; longitude?: number | null; address: string }) => {
  if (!latitude || !longitude) {
    return (
      <div className="bg-muted/30 rounded-lg h-40 flex flex-col items-center justify-center text-center p-4">
        <MapPin className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">الإحداثيات غير متوفرة</p>
        <p className="text-xs text-muted-foreground mt-1">{address}</p>
      </div>
    );
  }
  return (
    <div className="h-48 rounded-lg overflow-hidden border relative z-0">
      <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Marker position={[latitude, longitude]}>
          <Popup>{address}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// ─── Icon Mapping ────────────────────────────────────────────────────────
const ICON_MAP: Record<string, any> = {
  ClipboardList,
  CheckCircle,
  Package,
  Truck,
  CheckCircle2: CheckCircle,
  XCircle: X,
};

// ─── Status helpers ──────────────────────────────────────────────────────
const getNextStatus = (currentStatus: string): string | null => {
  const transitions: Record<string, string> = {
    PLACED: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "READY_FOR_PICKUP",
  };
  return transitions[currentStatus] || null;
};

const getNextStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    CONFIRMED: "قبول الطلب",
    PREPARING: "بدء التجهيز",
    READY_FOR_PICKUP: "جاهز للاستلام",
    OUT_FOR_DELIVERY: "خرج للتوصيل",
    DELIVERED: "تم التسليم",
  };
  return labels[status] || status;
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Pipeline Order Card ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const PipelineCard = ({ order, onUpdateStatus, onViewDetails, isUpdating }: any) => {
  const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PLACED;
  const nextStatus = getNextStatus(order.status);
  const driver = order.delivery_user || order.parent_order?.delivery_user;
  const IconComponent = ICON_MAP[statusConfig.icon] || ClipboardList;
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { locale: ar, addSuffix: true });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border border-border/60">
      {/* Card Header */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm">#{order.order_number?.split("-")[1] || order.order_number}</span>
            {order.parent_order_id && <Badge variant="outline" className="text-[10px] px-1 py-0">مشترك</Badge>}
          </div>
          <span className="font-bold text-primary">{formatPrice(order.total)}</span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <User className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{order.customer_name || "عميل زائر"}</span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{order.delivery_address}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{timeAgo}</span>
        </div>

        {/* Driver badge */}
        {driver && (
          <div className="flex items-center gap-1.5 text-xs text-primary mt-2 bg-primary/5 px-2 py-1 rounded-md w-fit">
            <Truck className="w-3 h-3" />
            <span>المندوب: {driver.full_name}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-1.5 p-2 pt-0 border-t mt-1">
        {nextStatus && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? "جاري..." : getNextStatusLabel(nextStatus)}
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onViewDetails}>
          التفاصيل
        </Button>
        {ACTIVE_STATUSES.includes(order.status) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={() => onUpdateStatus(order.id, "CANCEL_TRIGGER")}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Order Details Dialog ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function OrderDetailsDialog({ order, open, onOpenChange }: any) {
  if (!order) return null;
  const parentOrder = order.parent_order;
  const driver = order.delivery_user || parentOrder?.delivery_user;
  const lat = order.delivery_latitude || parentOrder?.delivery_latitude;
  const lng = order.delivery_longitude || parentOrder?.delivery_longitude;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>تفاصيل الطلب #{order.order_number}</span>
              <Badge className={ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.color}>
                {ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.label}
              </Badge>
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {format(new Date(order.created_at), "PPP p", { locale: ar })}
            </span>
          </DialogTitle>
          {(order.status === "CANCELLED" || order.status === "CANCELLED_BY_SHOP" || order.status === "CANCELLED_BY_ADMIN") && order.cancellation_reason && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">سبب الإلغاء:</p>
                <p>{order.cancellation_reason}</p>
                <p className="text-xs opacity-70 mt-1">
                  {order.cancelled_by ? (order.status === "CANCELLED_BY_ADMIN" ? "بواسطة الإدارة" : "بواسطة المتجر") : ""} •{" "}
                  {order.cancelled_at ? format(new Date(order.cancelled_at), "p", { locale: ar }) : ""}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          {/* Customer & Location */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
              <User className="w-4 h-4" /> بيانات العميل
            </h4>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[24px_1fr] gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{order.customer_name || "عميل زائر"}</p>
                  <p className="text-muted-foreground">الاسم</p>
                </div>
              </div>
              <div className="grid grid-cols-[24px_1fr] gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <a href={`tel:${order.delivery_phone || order.customer_phone}`} className="font-medium hover:underline text-primary">
                    {order.delivery_phone || order.customer_phone}
                  </a>
                  <p className="text-muted-foreground">رقم الهاتف (اضغط للاتصال)</p>
                </div>
              </div>
              <div className="grid grid-cols-[24px_1fr] gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{order.delivery_address}</p>
                  <p className="text-muted-foreground">العنوان</p>
                </div>
              </div>
              <OrderMap latitude={lat} longitude={lng} address={order.delivery_address} />
            </div>
          </div>

          {/* Order Details & Delivery */}
          <div className="space-y-6">
            {/* Delivery Info */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                <Truck className="w-4 h-4" /> معلومات التوصيل
              </h4>
              {driver ? (
                <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {driver.avatar_url ? (
                        <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground">مندوب التوصيل</p>
                    </div>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${driver.phone}`} className="hover:underline" dir="ltr">{driver.phone}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>
                      {parentOrder?.status === "OUT_FOR_DELIVERY" ? "جاري التوصيل" : parentOrder?.status === "DELIVERED" ? "تم التوصيل" : "تم تعيين المندوب"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>لم يتم تعيين مندوب بعد</p>
                  {parentOrder?.status === "DELIVERED" && <p className="text-destructive font-bold text-xs mt-1">(خطأ: الطلب مكتمل ولكن لا يوجد مندوب مسجل)</p>}
                </div>
              )}
            </div>

            {/* Order Items Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                <Package className="w-4 h-4" /> المنتجات ({order.items.length})
              </h4>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                      <div className="flex gap-2">
                        <div className="font-medium bg-muted w-6 h-6 flex items-center justify-center rounded text-xs">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              + {item.modifiers.map((m: any) => m.name).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="font-medium">{formatPrice(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>الإجمالي</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main ShopOrders Component (Pipeline View) ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function ShopOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Interactions
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundService.getMuteStatus());

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Cancellation
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const openCancelDialog = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) return;
    setIsUpdating(true);
    try {
      await orderService.cancelOrder(orderToCancel, cancelReason, "SHOP");
      toast({ title: "تم بنجاح", description: "تم إلغاء الطلب" });
      setShowCancelDialog(false);
      setOrderToCancel(null);
      setCancelReason("");
      loadData(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل إلغاء الطلب", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Load Data
  const loadData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);
      if (userShop) {
        const shopOrders = await orderService.getShopOrdersEnhanced(userShop.id);
        setOrders(shopOrders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast({ title: "خطأ", description: "فشل تحميل الطلبات", variant: "destructive" });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Real-time
  useShopRealtime(shop?.id, () => loadData(true), () => loadData(true));

  // Sound
  const toggleMute = () => {
    const newMuteStatus = SoundService.toggleMute();
    setIsMuted(newMuteStatus);
    toast({ description: newMuteStatus ? "تم كتم الصوت" : "تم تفعيل الصوت" });
  };
  const enableAudio = async () => {
    const enabled = await SoundService.enableAudio();
    if (enabled) toast({ description: "تم تفعيل التنبيهات الصوتية" });
  };

  // Status updates
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await orderService.updateStatus(orderId, newStatus as any, user.id);
      toast({ title: "تم بنجاح", description: "تم تحديث حالة الطلب" });
      loadData(true);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل تحديث حالة الطلب", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDialog(true);
  };

  // Filter: active orders only, + search
  const activeOrders = useMemo(() => {
    let result = orders
      .filter((o) => [...ACTIVE_STATUSES, "DELIVERED"].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.delivery_phone?.includes(q)
      );
    }
    return result;
  }, [orders, searchQuery]);

  // Count active (non-delivered) for the header
  const activeCount = useMemo(() => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length, [orders]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 space-y-3">
              <div className="h-10 bg-muted rounded-xl" />
              <div className="h-36 bg-muted rounded-xl" />
              <div className="h-36 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── No Shop ──
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Store className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-bold">لا يوجد متجر</h2>
        <p className="text-muted-foreground">يجب إنشاء متجر لاستقبال الطلبات</p>
        <Button asChild><Link to="/dashboard/settings">إنشاء متجر</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            خط سير الطلبات • <span className="font-medium text-foreground">{activeCount}</span> طلب نشط
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound Controls */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
              {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" onClick={enableAudio} className="h-8 w-8" title="تفعيل">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
          {/* History link */}
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to="/dashboard/orders/history">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">سجل الطلبات</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث برقم الطلب، اسم العميل، رقم الهاتف..."
          className="pr-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Pipeline Board ── */}
      <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
        <div className="flex gap-3" style={{ minWidth: `${PIPELINE_COLUMNS.length * 280}px` }}>
          {PIPELINE_COLUMNS.map((col) => {
            const colOrders = activeOrders.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="flex flex-col flex-shrink-0 w-[268px]">
                {/* Column Header */}
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl mb-2", col.bg)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", col.color)} />
                    <span className={cn("text-sm font-semibold", col.textColor)}>{col.label}</span>
                  </div>
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full text-white", col.color)}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex flex-col gap-2 min-h-[180px]">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-muted text-muted-foreground/40">
                      <ClipboardList className="w-5 h-5 mb-1" />
                      <p className="text-xs">لا توجد طلبات</p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <PipelineCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={(id: string, action: string) => {
                          if (action === "CANCEL_TRIGGER") openCancelDialog(id);
                          else handleUpdateStatus(id, action);
                        }}
                        onViewDetails={() => openOrderDetails(order)}
                        isUpdating={isUpdating}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Details Dialog ── */}
      <OrderDetailsDialog order={selectedOrder} open={showOrderDialog} onOpenChange={setShowOrderDialog} />

      {/* ── Cancellation Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <CardDescription>يرجى ذكر سبب الإلغاء لإتمام العملية.</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الإلغاء (مطلوب)</Label>
              <Textarea placeholder="يرجى توضيح سبب الإلغاء..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>تراجع</Button>
              <Button variant="destructive" onClick={handleCancelOrder} disabled={isUpdating || !cancelReason.trim()}>
                {isUpdating ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
