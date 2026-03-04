import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { Link } from "react-router-dom";
import {
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
  ExternalLink,
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
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Pipeline column definition ─────────────────────────────────────────
const PIPELINE_COLUMNS = [
  { status: "PLACED",           label: "جديد",           color: "bg-blue-500",   textColor: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  { status: "CONFIRMED",        label: "مؤكد",           color: "bg-indigo-500", textColor: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { status: "PREPARING",        label: "قيد التجهيز",   color: "bg-amber-500",  textColor: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  { status: "READY_FOR_PICKUP", label: "جاهز للاستلام", color: "bg-purple-500", textColor: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { status: "OUT_FOR_DELIVERY", label: "في الطريق",     color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
];

const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];

// ─── Geocoding Minimap ────────────────────────────────────────────────────────
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [lat, lng, map]);
  return null;
}

function AddressMinimap({ address, lat, lng }: { address: string; lat?: number | null; lng?: number | null }) {
  // If we have coordinates from the DB, show map directly — no geocoding needed
  if (lat && lng) {
    return (
      <div className="h-40 rounded-xl overflow-hidden border relative z-0">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={[lat, lng]}>
            <Popup>{address}</Popup>
          </Marker>
          <RecenterMap lat={lat} lng={lng} />
        </MapContainer>
      </div>
    );
  }

  // Fallback: No coordinates — show Google Maps iframe with address search
  return (
    <div className="h-40 rounded-xl overflow-hidden border">
      <iframe
        title="موقع العميل"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
      />
    </div>
  );
}


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
// ─── Pipeline Card ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const PipelineCard = ({ order, onUpdateStatus, onViewDetails, isUpdating }: any) => {
  const nextStatus = getNextStatus(order.status);
  const driver = order.delivery_user || order.parent_order?.delivery_user;
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { locale: ar, addSuffix: true });
  const shortId = order.order_number?.slice(-4) || order.order_number;

  return (
    <div className="rounded-xl border bg-background hover:shadow-md transition-all duration-200">
      {/* Top section */}
      <div className="p-3 space-y-2">
        {/* Order # + badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm">#{shortId}</span>
            {order.parent_order_id && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">مشترك</Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{order.customer_name || "عميل زائر"}</span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{order.delivery_address}</span>
        </div>

        {/* Driver */}
        {driver && (
          <div className="flex items-center gap-1 text-[11px] text-primary bg-primary/5 px-2 py-1 rounded-md w-fit">
            <Truck className="w-3 h-3" />
            <span className="truncate">{driver.full_name}</span>
          </div>
        )}

        {/* Price - always full width, prominent */}
        <div className="bg-primary/5 rounded-lg px-3 py-1.5 text-center" dir="rtl">
          <span className="font-bold text-primary text-base">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-2 border-t bg-muted/20 rounded-b-xl">
        {nextStatus && (
          <Button
            size="sm"
            className="flex-1 h-7 text-[11px] font-semibold"
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? "..." : getNextStatusLabel(nextStatus)}
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px]" onClick={onViewDetails}>
          التفاصيل
        </Button>
        {ACTIVE_STATUSES.includes(order.status) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={() => onUpdateStatus(order.id, "CANCEL_TRIGGER")}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Order Details Dialog ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function OrderDetailsDialog({ order, open, onOpenChange }: any) {
  if (!order) return null;
  const parentOrder = order.parent_order;
  const driver = order.delivery_user || parentOrder?.delivery_user;
  const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG];
  const isCancelled = order.status?.startsWith("CANCELLED");
  const shortOrderNum = order.order_number?.slice(-6) || order.order_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* ── Dialog Header ── */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold mb-1">
                طلب #{shortOrderNum}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-xs", statusConfig?.color)}>
                  {statusConfig?.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "d MMM yyyy • h:mm a", { locale: ar })}
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-primary">{formatPrice(order.total)}</p>
            </div>
          </div>

          {/* Cancellation reason */}
          {isCancelled && order.cancellation_reason && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">سبب الإلغاء:</p>
                <p className="text-xs mt-0.5">{order.cancellation_reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Dialog Body ── */}
        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-5 space-y-6">
            {/* Customer Info Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                بيانات العميل
              </h4>
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{order.customer_name || "عميل زائر"}</span>
                  </div>
                  {(order.delivery_phone || order.customer_phone) && (
                    <a
                      href={`tel:${order.delivery_phone || order.customer_phone}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {order.delivery_phone || order.customer_phone}
                    </a>
                  )}
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                </div>
              </div>
            </div>

            {/* Minimap */}
            <AddressMinimap
              address={order.delivery_address}
              lat={order.parent_order?.delivery_latitude}
              lng={order.parent_order?.delivery_longitude}
            />

            {/* Delivery Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                </div>
                معلومات التوصيل
              </h4>
              {driver ? (
                <div className="bg-primary/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                        {driver.avatar_url ? (
                          <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{driver.full_name}</p>
                        <p className="text-xs text-muted-foreground">مندوب التوصيل</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">
                        {parentOrder?.status === "OUT_FOR_DELIVERY" ? "جاري التوصيل" : parentOrder?.status === "DELIVERED" ? "تم التوصيل" : "تم التعيين"}
                      </span>
                    </div>
                  </div>
                  {driver.phone && (
                    <a href={`tel:${driver.phone}`} className="flex items-center gap-2 text-sm text-primary mt-3 hover:underline" dir="ltr">
                      <Phone className="w-3.5 h-3.5" /> {driver.phone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-muted/20 rounded-xl p-4 text-center border border-dashed border-muted-foreground/20">
                  <Clock className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground/60">لم يتم تعيين مندوب بعد</p>
                </div>
              )}
            </div>

            {/* Products */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
                المنتجات ({order.items?.length || 0})
              </h4>
              <div className="bg-muted/30 rounded-xl divide-y">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {item.quantity}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            + {item.modifiers.map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── Dialog Footer — Total ── */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <span className="font-bold text-base">الإجمالي</span>
          <span className="font-bold text-xl text-primary">{formatPrice(order.total)}</span>
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

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundService.getMuteStatus());
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

  useEffect(() => { loadData(); }, [user]);

  useShopRealtime(shop?.id, () => loadData(true), () => loadData(true));

  const toggleMute = () => {
    const s = SoundService.toggleMute();
    setIsMuted(s);
    toast({ description: s ? "تم كتم الصوت" : "تم تفعيل الصوت" });
  };
  const enableAudio = async () => {
    const ok = await SoundService.enableAudio();
    if (ok) toast({ description: "تم تفعيل التنبيهات الصوتية" });
  };

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

  const activeOrders = useMemo(() => {
    let result = orders
      .filter((o) => ACTIVE_STATUSES.includes(o.status))
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

  const activeCount = useMemo(() => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 space-y-3">
              <div className="h-10 bg-muted rounded-xl" />
              <div className="h-36 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            خط سير الطلبات • <span className="font-medium text-foreground">{activeCount}</span> طلب نشط
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
              {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" onClick={enableAudio} className="h-8 w-8" title="تفعيل">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to="/dashboard/orders/history">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">سجل الطلبات</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث برقم الطلب، اسم العميل، رقم الهاتف..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
        <div className="flex gap-3" style={{ minWidth: `${PIPELINE_COLUMNS.length * 280}px` }}>
          {PIPELINE_COLUMNS.map((col) => {
            const colOrders = activeOrders.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="flex flex-col flex-shrink-0 w-[268px]">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl mb-2", col.bg)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", col.color)} />
                    <span className={cn("text-sm font-semibold", col.textColor)}>{col.label}</span>
                  </div>
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full text-white", col.color)}>
                    {colOrders.length}
                  </span>
                </div>
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

      <OrderDetailsDialog order={selectedOrder} open={showOrderDialog} onOpenChange={setShowOrderDialog} />

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
