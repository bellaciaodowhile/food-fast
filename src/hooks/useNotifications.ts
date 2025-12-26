import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '../services/notifications'

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(notificationService.isSupported())
    setPermission(notificationService.getPermission())
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission()
    setPermission(notificationService.getPermission())
    return granted
  }, [])

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    await notificationService.showNotification(title, options)
  }, [])

  const notifyOrderReady = useCallback(async (orderId: string, customerName: string, sellerName: string) => {
    await notificationService.notifyOrderReady(orderId, customerName, sellerName)
  }, [])

  const notifyOrderCancelled = useCallback(async (orderId: string, customerName: string, reason?: string) => {
    await notificationService.notifyOrderCancelled(orderId, customerName, reason)
  }, [])

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    notifyOrderReady,
    notifyOrderCancelled
  }
}