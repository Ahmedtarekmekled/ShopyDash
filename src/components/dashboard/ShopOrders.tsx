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
  Filter, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  ChevronDown, 
  MoreHorizontal,
  X,
  CheckCircle,
  Truck,
  Package,
  ClipboardList,
  Bell,
  Volume2,
  VolumeX,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { useAuth } from "@/store";
import { useShopRealtime } from "@/hooks/useShopRealtime";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import { shopsService } from "@/services/catalog.service";
import { SoundService } from "@/services/sound.service";
import { formatPrice } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Map Component
const OrderMap = ({ latitude, longitude, address }: { latitude?: number | null, longitude?: number | null, address: string }) => {
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
             <MapContainer 
                center={[latitude, longitude]} 
                zoom={15} 
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[latitude, longitude]}>
                    <Popup>
                        {address}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState("newest");

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
        console.error("Cancellation failed:", error);
         toast({ 
          title: "خطأ", 
          description: error.message || "فشل إلغاء الطلب", 
          variant: "destructive" 
      });
    } finally {
        setIsUpdating(false);
    }
  };

  // Load Data
  // Load Data
  const loadData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);

      if (userShop) {
        // Use enhanced service to get parent/driver info
        const shopOrders = await orderService.getShopOrdersEnhanced(userShop.id);
        setOrders(shopOrders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast({
          title: "خطأ",
          description: "فشل تحميل الطلبات",
          variant: "destructive"
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Real-time integration
  // We refresh the full list when any order changes to ensure we get latest status & driver info
  useShopRealtime(shop?.id, () => loadData(true), () => loadData(true));

  // Sound Control
  const toggleMute = () => {
    const newMuteStatus = SoundService.toggleMute();
    setIsMuted(newMuteStatus);
    toast({ description: newMuteStatus ? "تم كتم الصوت" : "تم تفعيل الصوت" });
  };

  const enableAudio = async () => {
    const enabled = await SoundService.enableAudio();
    if (enabled) toast({ description: "تم تفعيل التنبيهات الصوتية" });
  };

  // Logic
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
      console.error("DEBUG: Status update failed", error);
      toast({ 
          title: "خطأ", 
          description: error.message || "فشل تحديث حالة الطلب", 
          variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDialog(true);
  };

  // Helper for Status Flow
  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      PLACED: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY_FOR_PICKUP",
      // Shop stops at READY_FOR_PICKUP usually, letting driver take over.
      // But if they manage their own delivery, they might mark delivered.
      // Based on previous code, they stop at READY_FOR_PICKUP if logic dictates, 
      // but UI had OUT_FOR_DELIVERY too. Assuming standard flow:
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

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Search (Order #, Customer Name, Phone)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(o => 
            o.order_number.toLowerCase().includes(query) ||
            o.customer_name?.toLowerCase().includes(query) ||
            o.customer_phone?.includes(query) ||
            o.delivery_phone?.includes(query)
        );
    }

    // 2. Status Filter
    if (statusFilter !== "ALL") {
        result = result.filter(o => o.status === statusFilter);
    }

    // 3. Sorting
    // Default is newest first (from DB), but explicit sort help
    if (sortBy === "newest") {
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return result;
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  // No Shop State
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{shop.name}</h1>
          <p className="text-muted-foreground">
            إدارة الطلبات • {orders.length} طلب
          </p>
        </div>

        {/* Action Bar */}
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
           {/* Filter Button (Mobile mainly) */}
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative w-full md:w-1/3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="بحث برقم الطلب، اسم العميل..." 
                    className="pr-9" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
              </div>

              {/* Status Tabs (Desktop) */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="hidden md:block flex-1">
                  <TabsList className="grid w-full grid-cols-7 h-10">
                    <TabsTrigger value="ALL">الكل</TabsTrigger>
                    <TabsTrigger value="PLACED">جديد</TabsTrigger>
                    <TabsTrigger value="CONFIRMED">جاري</TabsTrigger>
                    <TabsTrigger value="PREPARING">تجهيز</TabsTrigger>
                    <TabsTrigger value="READY_FOR_PICKUP">جاهز</TabsTrigger>
                    <TabsTrigger value="OUT_FOR_DELIVERY">توصيل</TabsTrigger>
                    <TabsTrigger value="DELIVERED">مكتمل</TabsTrigger>
                  </TabsList>
              </Tabs>

              {/* Status Select (Mobile) */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:hidden">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">جميع الطلبات</SelectItem>
                    <SelectItem value="PLACED">جديدة (%New)</SelectItem>
                    <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
                    <SelectItem value="PREPARING">قيد التجهيز</SelectItem>
                    <SelectItem value="READY_FOR_PICKUP">جاهز للاستلام</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">في الطريق</SelectItem>
                    <SelectItem value="DELIVERED">تم التسليم</SelectItem>
                  </SelectContent>
              </Select>
          </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
         {filteredOrders.length === 0 ? (
             <div className="col-span-full py-20 text-center">
                 <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                     <ClipboardList className="w-10 h-10 text-muted-foreground" />
                 </div>
                 <h3 className="text-xl font-semibold">لا توجد طلبات مطابقة</h3>
                 <p className="text-muted-foreground">حاول تغيير خيارات البحث أو التصفية</p>
             </div>
         ) : (
             filteredOrders.map(order => {
                 // Handle Cancel Trigger from Child
                 const handleCardAction = (id: string, action: string) => {
                    if (action === 'CANCEL_TRIGGER') openCancelDialog(id);
                    else handleUpdateStatus(id, action);
                 };

                 return (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleCardAction} 
                        onViewDetails={() => openOrderDetails(order)}
                        isUpdating={isUpdating}
                        getNextStatus={getNextStatus}
                        getNextStatusLabel={getNextStatusLabel}
                    />
                 );
             })
         )}
      </div>

      {/* Details Dialog */}
      <OrderDetailsDialog 
        order={selectedOrder} 
        open={showOrderDialog} 
        onOpenChange={setShowOrderDialog} 
      />

      {/* Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>إلغاء الطلب</DialogTitle>
                <CardDescription>يرجى ذكر سبب الإلغاء لإتمام العملية.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>سبب الإلغاء (مطلوب)</Label>
                    <Textarea 
                        placeholder="يرجى توضيح سبب الإلغاء..." 
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)}>تراجع</Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleCancelOrder}
                        disabled={isUpdating || !cancelReason.trim()}
                    >
                        {isUpdating ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-components for cleaner file

// Icon Mapping
const ICON_MAP: Record<string, any> = {
  ClipboardList,
  CheckCircle,
  Package,
  Truck,
  CheckCircle2: CheckCircle, // Fallback or import CheckCircle2 if available, assuming CheckCircle for now or aliased
  XCircle: X 
};
// Note: CheckCircle2 and XCircle might need to be imported or mapped to existing. 
// Imported: CheckCircle, X. 
// Let's rely on what IS imported. 
// order.service.ts uses: ClipboardList, CheckCircle, Package, PackageCheck, Truck, CheckCircle2, XCircle.
// ShopOrders imports: ClipboardList, CheckCircle, Package, Truck, X.
// Missing imports for full coverage: PackageCheck, CheckCircle2, XCircle.
// I will map them to best available alternatives.

const OrderCard = ({ order, onUpdateStatus, onViewDetails, isUpdating, getNextStatus, getNextStatusLabel }: any) => {
    const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PLACED;
    const nextStatus = getNextStatus(order.status);
    const driver = order.delivery_user || order.parent_order?.delivery_user;
    
    // Resolve Icon
    const IconComponent = ICON_MAP[statusConfig.icon] || ClipboardList;

    return (
        <Card className="overflow-hidden border-r-4 hover:shadow-md transition-shadow" style={{ borderRightColor: `var(--${statusConfig.color})` }}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg">#{order.order_number.split('-')[1]}</span>
                    <Badge variant={statusConfig.color as any} className="gap-1">
                        <IconComponent className="w-3 h-3" />
                        {statusConfig.label}
                    </Badge>
                    {order.parent_order_id && <Badge variant="outline" className="text-xs">مشترك</Badge>}
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'h:mm a')}</p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {order.customer_name || "عميل زائر"}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">{order.delivery_address}</span>
                        </div>
                        {driver && (
                            <div className="flex items-center gap-2 text-sm text-primary mt-2 bg-primary/5 p-1 px-2 rounded-md w-fit">
                                <Truck className="w-3 h-3" />
                                <span>المندوب: {driver.full_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                    {nextStatus && (
                        <Button 
                            className="flex-1" 
                            onClick={() => onUpdateStatus(order.id, nextStatus)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? "جاري..." : getNextStatusLabel(nextStatus)}
                        </Button>
                    )}
                    <Button variant="outline" className="flex-1" onClick={onViewDetails}>
                        التفاصيل
                    </Button>
                    {['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status) && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => onUpdateStatus(order.id, 'CANCEL_TRIGGER')} // Pass special flag or handle in parent
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function OrderDetailsDialog({ order, open, onOpenChange }: any) {
    if (!order) return null;
    
    const parentOrder = order.parent_order;
    // Use driver from order root (propagated) or fallback to parent (original source)
    const driver = order.delivery_user || parentOrder?.delivery_user; 
    
    // Coordinates
    // Use order's own coordinates first (as ShopOrders query returns them on root `order` object), 
    // or fallback to parentOrder if needed (though query failed on parentOrder, so rely on order root).
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
                    {/* Cancellation Reason Display */}
                    {(order.status === 'CANCELLED' || order.status === 'CANCELLED_BY_SHOP' || order.status === 'CANCELLED_BY_ADMIN') && order.cancellation_reason && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">سبب الإلغاء:</p>
                                <p>{order.cancellation_reason}</p>
                                <p className="text-xs opacity-70 mt-1">
                                    {order.cancelled_by ? (order.status === 'CANCELLED_BY_ADMIN' ? 'بواسطة الإدارة' : 'بواسطة المتجر') : ''} • {order.cancelled_at ? format(new Date(order.cancelled_at), 'p', { locale: ar }) : ''}
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
                                                <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full object-cover"/>
                                            ) : (
                                                <User className="w-5 h-5"/>
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
                                            {parentOrder?.status === 'OUT_FOR_DELIVERY' ? 'جاري التوصيل' : 
                                             parentOrder?.status === 'DELIVERED' ? 'تم التوصيل' : 'تم تعيين المندوب'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>لم يتم تعيين مندوب بعد</p>
                                    {parentOrder?.status === 'DELIVERED' && <p className="text-destructive font-bold text-xs mt-1">(خطأ: الطلب مكتمل ولكن لا يوجد مندوب مسجل)</p>}
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
                                                            + {item.modifiers.map((m: any) => m.name).join(', ')}
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
