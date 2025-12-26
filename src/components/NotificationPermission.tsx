import React, { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

const NotificationPermission: React.FC = () => {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [showBanner, setShowBanner] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    // Show banner if notifications are supported and permission is default (not asked yet)
    if (isSupported && permission === 'default') {
      setShowBanner(true)
    }
  }, [isSupported, permission])

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const granted = await requestPermission()
      if (granted) {
        setShowBanner(false)
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    // Store in localStorage that user dismissed the banner
    localStorage.setItem('notification-banner-dismissed', 'true')
  }

  // Don't show if not supported, already granted, or user dismissed
  if (!isSupported || permission === 'granted' || !showBanner) {
    return null
  }

  // Don't show if user previously dismissed
  if (localStorage.getItem('notification-banner-dismissed') === 'true') {
    return null
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Bell className="h-5 w-5 text-blue-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Habilitar Notificaciones
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              Para recibir notificaciones cuando los pedidos estén listos, necesitamos tu permiso 
              para mostrar notificaciones en tu navegador.
            </p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Solicitando...</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Permitir Notificaciones</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <BellOff className="h-4 w-4" />
              <span>Ahora no</span>
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600"
            >
              <span className="sr-only">Cerrar</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationPermission