import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

export type Notification = Database['public']['Tables']['notifications']['Row'];

export const notificationService = {
  /**
   * Fetch initial batch of notifications (latest 20)
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
    
    return data as Notification[];
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  /**
   * Mark all visible notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

     if (error) {
      console.error("Error marking all as read:", error);
    }
  },

  /**
   * Subscribe to realtime notifications for a specific user
   * Returns unsubscribe function
   */
  subscribeNotifications(
    userId: string, 
    onNewNotification: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNewNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Delete all notifications for user (clear all)
   */
  async clearAll(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error clearing notifications:", error);
    }
  },
};
