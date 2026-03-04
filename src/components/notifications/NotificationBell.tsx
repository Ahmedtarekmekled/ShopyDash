import { useState, useEffect } from "react";
import { Bell, Check, ShoppingBag, Truck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/store";
import { notificationService, Notification } from "@/services/notification.service";
import { useLiveQueue } from "@/hooks/useLiveQueue";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/types/database";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // ------------------------------------------------------
  // ROLE: DELIVERY (LIVE QUEUE)
  // ------------------------------------------------------
  const { orders: liveQueue } = useLiveQueue();
  
  // ------------------------------------------------------
  // ROLE: SHOP OWNER (STORED NOTIFICATIONS)
  // ------------------------------------------------------
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'DELIVERY') return; // Delivery uses liveQueue

    // 1. Fetch
    const loadQuery = async () => {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    };
    loadQuery();

    // 2. Subscribe
    const unsubscribe = notificationService.subscribeNotifications(
      user.id,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Handlers for Shop Owner
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await notificationService.markAsRead(id);
  };

  const handleMarkAllRead = async () => {
     if (!user) return;
     setNotifications((prev) => prev.map(n => ({...n, is_read: true})));
     setUnreadCount(0);
     await notificationService.markAllAsRead(user.id);
  };

  const handleClearAll = async () => {
     if (!user) return;
     setNotifications([]);
     setUnreadCount(0);
     await notificationService.clearAll(user.id);
  };

  // Click Handler
  const handleNotificationClick = (item: Notification | Order) => {
    setIsOpen(false);
    
    if (user?.role === 'DELIVERY') {
        const order = item as Order;
        navigate('/dashboard'); // Delivery goes to main dashboard
    } else {
        const notif = item as Notification;
        if (!notif.is_read) {
            handleMarkAsRead(notif.id, { stopPropagation: () => {} } as any);
        }
        if (notif.order_id) {
            // Shop Owner -> Dashboard Orders
            if (user?.role === 'SHOP_OWNER') {
                 navigate('/dashboard/orders');
            } else {
                 navigate(`/orders/${notif.order_id}`);
            }
        }
    }
  };


  if (!user) return null;
  const isDelivery = user.role === 'DELIVERY';

  // Metrics
  const count = isDelivery ? liveQueue.length : unreadCount;
  const hasItems = isDelivery ? liveQueue.length > 0 : notifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isDelivery ? <Truck className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-in zoom-in">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel>
                {isDelivery ? "طلبات متاحة (مباشر)" : "الإشعارات"}
            </DropdownMenuLabel>
            {!isDelivery && notifications.length > 0 && (
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-6 px-2">
                            تحديد كمقروء
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs h-6 px-2 text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3 ml-1" />
                        مسح الكل
                    </Button>
                </div>
            )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {!hasItems ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isDelivery ? "لا توجد طلبات متاحة حالياً" : "لا توجد إشعارات جديدة"}
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {/* DELIVERY VIEW */}
              {isDelivery && liveQueue.map((order) => (
                 <DropdownMenuItem
                  key={order.id}
                  className="flex flex-col gap-3 p-3 cursor-pointer bg-white hover:bg-accent/5 border-b last:border-0 transition-all focus:bg-accent/5"
                  onClick={() => handleNotificationClick(order)}
                  dir="rtl"
                >
                  {/* Header: Icon & Title & Time */}
                  <div className="flex w-full items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                           <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground">طلب جديد</span>
                     </div>
                     <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                        {format(new Date(order.created_at), "h:mm a")}
                     </span>
                  </div>

                  {/* Order Details */}
                  <div className="flex flex-col gap-1 pr-10">
                      <span className="text-xs font-mono text-muted-foreground">
                        {order.order_number}#
                      </span>
                      <span className="text-xs text-foreground font-medium truncate">
                        {order.customer_name || "عميل تطبيق"}
                      </span>
                  </div>

                  {/* Footer Stats Box */}
                  <div className="w-full flex items-center justify-between bg-muted/30 rounded-md p-2 mt-1 border border-border/50">
                      {/* Price (Earnings) */}
                      <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground">الأرباح المتوقعة</span>
                          <span className="text-sm font-extrabold text-emerald-600">
                             {formatPrice(order.total_delivery_fee || order.delivery_fee || 0)}
                          </span>
                      </div>
                      
                      {/* Distance & Status */}
                      <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-1">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                              </span>
                              <span className="text-[10px] text-green-600 font-medium">متاح للقبول</span>
                          </div>
                          {order.route_km && (
                             <span className="text-[10px] text-muted-foreground dir-ltr">
                                {order.route_km} km
                             </span>
                          )}
                      </div>
                  </div>
                </DropdownMenuItem>
              ))}

              {/* SHOP/USER VIEW */}
              {!isDelivery && notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                    !notification.is_read ? "bg-accent/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className={`text-sm ${!notification.is_read ? "font-semibold" : "font-medium"}`}>
                        {notification.message}
                    </span>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "p", { locale: ar })}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
