import { supabase } from '../lib/supabase'

export interface DatabaseNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  order_id?: string
  read: boolean
  created_at: string
  created_by?: string
}

export class DatabaseNotificationService {
  // Send notification to database (will trigger function to notify seller and admin)
  static async notifyOrderStatusChange(
    orderId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('notify_order_status_change', {
        p_order_id: orderId,
        p_title: title,
        p_message: message,
        p_type: type
      })

      if (error) {
        console.error('Error sending database notification:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in notifyOrderStatusChange:', error)
    }
  }

  // Get user notifications
  static async getUserNotifications(userId: string, limit: number = 50): Promise<DatabaseNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserNotifications:', error)
      return []
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in markAsRead:', error)
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error)
    }
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getUnreadCount:', error)
      return 0
    }
  }
}