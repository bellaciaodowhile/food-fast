import React, { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, Eye, Clock } from 'lucide-react'

interface OrderReadyToast {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  sellerName: string
  createdAt: Date
}

interface OrderReadyToastContextType {
  showOrderReadyToast: (order: Omit<OrderReadyToast, 'id'>) => void
  removeOrderReadyToast: (id: string) => void
}

const OrderReadyToastContext = createContext<OrderReadyToastContextType | undefined>(undefined)

export const OrderReadyToastProvider: React.FC<{ 
  children: React.ReactNode
  onGoToOrder?: (orderId: string) => void
  userRole?: string
}> = ({ children, onGoToOrder, userRole }) => {
  const [orderToasts, setOrderToasts] = useState<OrderReadyToast[]>([])

  const removeOrderReadyToast = useCallback((id: string) => {
    setOrderToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showOrderReadyToast = useCallback((order: Omit<OrderReadyToast, 'id'>) => {
    // Only show toast for admin and seller roles, not kitchen
    if (userRole === 'kitchen') {
      console.log('🚫 Toast not shown - user is kitchen')
      return
    }

    console.log('🍞 Showing order ready toast for role:', userRole)
    const id = Math.random().toString(36).substring(2, 11)
    const newToast = { ...order, id }
    
    setOrderToasts(prev => [...prev, newToast])

    // Auto remove after 15 seconds (longer for order toasts)
    setTimeout(() => {
      removeOrderReadyToast(id)
    }, 15000)
  }, [removeOrderReadyToast, userRole])

  const handleGoToOrder = (orderId: string, toastId: string) => {
    if (onGoToOrder) {
      onGoToOrder(orderId)
    }
    removeOrderReadyToast(toastId)
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins === 1) return 'Hace 1 minuto'
    return `Hace ${diffMins} minutos`
  }

  return (
    <OrderReadyToastContext.Provider value={{ showOrderReadyToast, removeOrderReadyToast }}>
      {children}
      
      {/* Order Ready Toast Container */}
      <div className="fixed top-4 left-4 z-50 space-y-3 max-w-md">
        {orderToasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-green-100 dark:bg-green-800 border-2 border-green-400 rounded-lg shadow-xl shadow-green-500/20 p-4 transform transition-all duration-300 ease-in-out animate-in"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="bg-green-500 rounded-full p-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  🍽️ Pedido Listo para Entregar
                </h3>
              </div>
              <button
                onClick={() => removeOrderReadyToast(toast.id)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Pedido #{toast.orderNumber}
                </span>
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(toast.createdAt)}
                </span>
              </div>
              
              <div className="text-sm text-green-700 dark:text-green-300">
                <p><strong>Cliente:</strong> {toast.customerName}</p>
                <p><strong>Vendedor:</strong> {toast.sellerName}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleGoToOrder(toast.orderId, toast.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2 text-sm"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Pedido</span>
              </button>
              <button
                onClick={() => removeOrderReadyToast(toast.id)}
                className="px-3 py-2 bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50 rounded-md transition-colors duration-200 text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </OrderReadyToastContext.Provider>
  )
}

export const useOrderReadyToast = () => {
  const context = useContext(OrderReadyToastContext)
  if (context === undefined) {
    throw new Error('useOrderReadyToast must be used within an OrderReadyToastProvider')
  }
  return context
}