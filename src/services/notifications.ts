// Notification service for web push notifications
export class NotificationService {
  private static instance: NotificationService
  private permission: NotificationPermission = 'default'

  private constructor() {
    this.checkPermission()
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones')
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    if (this.permission === 'denied') {
      console.warn('Las notificaciones están bloqueadas por el usuario')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error)
      return false
    }
  }

  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    console.log('🔔 Intentando mostrar notificación:', title)
    
    if (!('Notification' in window)) {
      console.warn('❌ Este navegador no soporta notificaciones')
      return
    }

    console.log('📋 Permiso actual:', this.permission)

    if (this.permission !== 'granted') {
      console.log('🔐 Solicitando permisos...')
      const granted = await this.requestPermission()
      if (!granted) {
        console.warn('❌ No se pueden mostrar notificaciones sin permisos')
        return
      }
    }

    try {
      console.log('✨ Creando notificación...')
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })

      console.log('✅ Notificación creada exitosamente')

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close()
        console.log('🔕 Notificación cerrada automáticamente')
      }, 5000)

      return Promise.resolve()
    } catch (error) {
      console.error('❌ Error al mostrar notificación:', error)
    }
  }

  public async notifyOrderReady(orderId: string, customerName: string, sellerName: string): Promise<void> {
    console.log('🍽️ Preparando notificación de pedido listo:', orderId)
    
    const title = '🍽️ Pedido Listo para Entregar'
    const body = `Pedido #${orderId.slice(-8)} de ${customerName} está listo. Vendedor: ${sellerName}`
    
    console.log('📝 Título:', title)
    console.log('📝 Mensaje:', body)
    
    await this.showNotification(title, {
      body,
      tag: `order-ready-${orderId}`,
      icon: '/favicon.ico',
      requireInteraction: true
    })
  }

  public async notifyOrderCancelled(orderId: string, customerName: string, reason: string = 'No se puede preparar'): Promise<void> {
    console.log('❌ Preparando notificación de pedido cancelado:', orderId)
    
    const title = '❌ Pedido Cancelado'
    const body = `Pedido #${orderId.slice(-8)} de ${customerName} fue cancelado. Motivo: ${reason}`
    
    console.log('📝 Título:', title)
    console.log('📝 Mensaje:', body)
    
    await this.showNotification(title, {
      body,
      tag: `order-cancelled-${orderId}`,
      icon: '/favicon.ico',
      requireInteraction: true
    })
  }

  public isSupported(): boolean {
    return 'Notification' in window
  }

  public getPermission(): NotificationPermission {
    return this.permission
  }
}

export const notificationService = NotificationService.getInstance()