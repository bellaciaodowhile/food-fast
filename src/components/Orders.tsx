import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useEvents } from '../contexts/EventContext'
import { useOrderReadyToast } from '../contexts/OrderReadyToastContext'
import { formatCurrency } from '../services/exchangeRate'
import { useNotifications } from '../hooks/useNotifications'
// import { DatabaseNotificationService } from '../services/databaseNotifications'
import { 
  Search,
  Check,
  X,
  Clock,
  User,
  ShoppingBag,
  Calendar,
  DollarSign,
  Eye,
  MessageSquare,
  Edit,
  Plus,
  Minus,
  Trash2
} from 'lucide-react'

// Define interfaces
interface Order {
  id: string
  seller_id: string
  customer_name?: string
  total_usd: number
  total_bs: number
  exchange_rate: number
  status: 'pending' | 'ready' | 'completed' | 'cancelled'
  created_at: string
  completed_by?: string
  completed_at?: string
  cancelled_by?: string
  cancelled_at?: string
  sale_items?: OrderItem[]
  users?: { full_name: string }
  completed_by_user?: { full_name: string }
  cancelled_by_user?: { full_name: string }
}

interface OrderItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price_usd: number
  total_price_usd: number
  custom_description?: string
  products?: { name: string }
}

const Orders: React.FC = () => {
  const { user, isAdmin, isKitchen } = useAuth()
  const { on, emit } = useEvents()
  const { showOrderReadyToast } = useOrderReadyToast()
  const { notifyOrderReady, notifyOrderCancelled } = useNotifications()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    customer_name: '',
    items: [] as OrderItem[]
  })
  const [lastDataHash, setLastDataHash] = useState('')

  // Function to generate a simple hash from order data to detect changes
  const generateDataHash = (orders: Order[]): string => {
    const dataString = orders.map(order => 
      `${order.id}-${order.status}-${order.total_usd}-${order.created_at}-${order.sale_items?.length || 0}`
    ).join('|')
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  // Function to check for any changes in orders data
  const checkForOrderChanges = async (): Promise<{ hasChanges: boolean }> => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          id,
          status,
          total_usd,
          total_bs,
          exchange_rate,
          created_at,
          seller_id,
          customer_name,
          sale_items (id, quantity)
        `)
        .order('created_at', { ascending: false })

      // Apply same filters as loadOrders
      if (!isAdmin && !isKitchen && user) {
        query = query.eq('seller_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error checking for changes:', error)
        return { hasChanges: false }
      }

      // Create a simplified version for hash comparison
      const simplifiedData = (data || []).map(order => ({
        id: order.id,
        status: order.status,
        total_usd: order.total_usd,
        created_at: order.created_at,
        seller_id: order.seller_id,
        sale_items: order.sale_items || []
      }))

      const newHash = generateDataHash(simplifiedData as any)
      const hasChanges = newHash !== lastDataHash

      return { hasChanges }
    } catch (error) {
      console.error('❌ Error in checkForOrderChanges:', error)
      return { hasChanges: false }
    }
  }

  useEffect(() => {
    loadOrders()
    // Set default filter for kitchen users to show only pending orders
    if (isKitchen) {
      setStatusFilter('pending')
    }

    // Check for changes every 1 second
    const changeInterval = setInterval(async () => {
      const { hasChanges } = await checkForOrderChanges()
      
      if (hasChanges) {
        console.log('📊 Database changes detected - updating orders...')
        loadOrders()
      } else {
        console.log('✅ No changes detected in database')
      }
    }, 1000)

    // Listen for new order events (immediate notification from Sales component)
    const unsubscribeOrderCreated = on('orderCreated', (data) => {
      console.log('🔔 New order event received:', data)
      console.log('🔄 Reloading orders due to new order event...')
      loadOrders()
    })

    // Listen for order status change events
    const unsubscribeStatusChanged = on('orderStatusChanged', (data) => {
      console.log('🔄 Order status changed event received:', data)
      console.log('🔄 Reloading orders due to status change...')
      loadOrders()
    })

    return () => {
      clearInterval(changeInterval)
      unsubscribeOrderCreated()
      unsubscribeStatusChanged()
    }
  }, [isKitchen, on, lastDataHash, user, isAdmin])

  // Realtime updates removed - using count-based checking instead
  // const reloadOrders = useCallback(() => {
  //   console.log('📡 Realtime update triggered - reloading orders...')
  //   loadOrders()
  // }, [])

  // useRealtime('sales', reloadOrders, ['INSERT', 'UPDATE'])
  // useRealtime('sale_items', reloadOrders, ['INSERT', 'DELETE'])

  const loadOrders = async () => {
    // Don't show loading spinner for auto-refresh, only for initial load
    if (orders.length === 0) {
      setLoading(true)
    }
    
    try {
      console.log('🔍 Loading orders...', { 
        user: user?.email, 
        isAdmin, 
        isKitchen,
        currentOrdersCount: orders.length 
      })

      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (name)
          ),
          users!sales_seller_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false })

      // If not admin and not kitchen, only show own orders
      if (!isAdmin && !isKitchen && user) {
        query = query.eq('seller_id', user.id)
        console.log('🔒 Filtering orders for seller:', user.id)
      } else {
        console.log('👑 Loading all orders (admin or kitchen)')
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error loading orders:', error)
        throw error
      }

      console.log('✅ Orders loaded successfully:', {
        count: data?.length || 0,
        newOrders: (data?.length || 0) - orders.length
      })
      
      setOrders(data || [])
      setLastDataHash(generateDataHash(data || [])) // Update the data hash
    } catch (error) {
      console.error('❌ Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: 'ready' | 'completed' | 'cancelled') => {
    if (!user) return
    
    try {
      // Find the order to get seller and customer info for notifications
      const order = orders.find(o => o.id === orderId)
      
      const updateData: any = { status }
      
      // Solo actualizar el status, sin campos adicionales por ahora
      const { error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      // Emit event for order status change to update all views
      console.log('📡 Emitting order status change event...')
      emit('orderStatusChanged', {
        orderId,
        newStatus: status,
        customerName: order?.customer_name || 'Cliente sin nombre',
        sellerId: order?.seller_id,
        updatedBy: user.id
      })

      // Send notifications when kitchen marks order as ready or cancelled
      if (isKitchen && order) {
        const customerName = order.customer_name || 'Cliente sin nombre'
        const sellerName = order.users?.full_name || 'Vendedor desconocido'
        const orderNumber = `#${orderId.slice(-8)}`

        console.log('🔔 Enviando notificaciones para pedido:', orderNumber)
        console.log('Estado:', status, 'Cliente:', customerName, 'Vendedor:', sellerName)

        if (status === 'ready') {
          try {
            // Send browser notification
            console.log('📱 Enviando notificación web...')
            await notifyOrderReady(orderId, customerName, sellerName)
            console.log('✅ Notificación web enviada')
            
            // Show order ready toast in the app
            console.log('🍞 Mostrando toast de pedido listo...')
            showOrderReadyToast({
              orderId,
              orderNumber: orderNumber.replace('#', ''),
              customerName,
              sellerName,
              createdAt: new Date()
            })
            console.log('✅ Toast de pedido listo mostrado')
            
            // Send database notification (commented out for testing)
            /*
            console.log('💾 Enviando notificación a BD...')
            await DatabaseNotificationService.notifyOrderStatusChange(
              orderId,
              '🍽️ Pedido Listo para Entregar',
              `El pedido ${orderNumber} de ${customerName} está listo para entregar.`,
              'success'
            )
            console.log('✅ Notificación BD enviada')
            */
          } catch (notifError) {
            console.error('❌ Error enviando notificaciones:', notifError)
          }
        } else if (status === 'cancelled') {
          try {
            // Send browser notification
            console.log('📱 Enviando notificación de cancelación...')
            await notifyOrderCancelled(orderId, customerName, 'No se puede preparar')
            console.log('✅ Notificación de cancelación enviada')
            
            // Send database notification (commented out for testing)
            /*
            console.log('💾 Enviando notificación de cancelación a BD...')
            await DatabaseNotificationService.notifyOrderStatusChange(
              orderId,
              '❌ Pedido Cancelado',
              `El pedido ${orderNumber} de ${customerName} fue cancelado por cocina.`,
              'error'
            )
            console.log('✅ Notificación de cancelación BD enviada')
            */
          } catch (notifError) {
            console.error('❌ Error enviando notificaciones de cancelación:', notifError)
          }
        }
      }

      loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  // Edit order functions
  const openEditModal = (order: Order) => {
    setEditingOrder(order)
    setEditForm({
      customer_name: order.customer_name || '',
      items: order.sale_items || []
    })
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingOrder(null)
    setShowEditModal(false)
    setEditForm({
      customer_name: '',
      items: []
    })
  }

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    
    setEditForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity,
              total_price_usd: item.unit_price_usd * newQuantity
            }
          : item
      )
    }))
  }

  const removeItem = (itemId: string) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const updateItemDescription = (itemId: string, description: string) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, custom_description: description }
          : item
      )
    }))
  }

  const saveOrderChanges = async () => {
    if (!editingOrder || !user) return

    try {
      // Calculate new totals
      const newTotalUsd = editForm.items.reduce((sum, item) => sum + item.total_price_usd, 0)
      const newTotalBs = newTotalUsd * editingOrder.exchange_rate

      // Update order
      const { error: orderError } = await supabase
        .from('sales')
        .update({
          customer_name: editForm.customer_name,
          total_usd: newTotalUsd,
          total_bs: newTotalBs
        })
        .eq('id', editingOrder.id)

      if (orderError) throw orderError

      // Update items
      for (const item of editForm.items) {
        const { error: itemError } = await supabase
          .from('sale_items')
          .update({
            quantity: item.quantity,
            total_price_usd: item.total_price_usd,
            custom_description: item.custom_description
          })
          .eq('id', item.id)

        if (itemError) throw itemError
      }

      // Remove deleted items (items that were in original but not in current form)
      const originalItemIds = editingOrder.sale_items?.map(item => item.id) || []
      const currentItemIds = editForm.items.map(item => item.id)
      const deletedItemIds = originalItemIds.filter(id => !currentItemIds.includes(id))

      for (const itemId of deletedItemIds) {
        const { error: deleteError } = await supabase
          .from('sale_items')
          .delete()
          .eq('id', itemId)

        if (deleteError) throw deleteError
      }

      closeEditModal()
      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'ready':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Entregado'
      case 'ready':
        return 'Listo para Entregar'
      case 'pending':
        return 'Preparando'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const showOrderDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isKitchen ? 'Pedidos de Cocina' : 'Gestión de Pedidos'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isKitchen 
              ? 'Pedidos pendientes para preparar' 
              : isAdmin 
                ? 'Todos los pedidos del sistema' 
                : 'Tus pedidos realizados'
            }
          </p>
        </div>
        
        <button
          onClick={loadOrders}
          disabled={loading}
          className="btn-secondary flex items-center space-x-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por cliente, vendedor o ID..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
            }`}
          >
            <Clock className="w-3 h-3 mr-1 inline" />
            Preparando
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'ready'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
            }`}
          >
            <Check className="w-3 h-3 mr-1 inline" />
            Listos
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
            }`}
          >
            <Check className="w-3 h-3 mr-1 inline" />
            Entregados
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'cancelled'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
            }`}
          >
            <X className="w-3 h-3 mr-1 inline" />
            Cancelados
          </button>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredOrders.length} de {orders.length} pedidos
            {statusFilter !== 'all' && ` (${getStatusText(statusFilter).toLowerCase()})`}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total en BD: {orders.length} | Usuario: {user?.email || 'No autenticado'} | Admin: {isAdmin ? 'Sí' : 'No'}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div 
            key={order.id} 
            className={`card p-6 transition-all duration-200 ${
              order.status === 'ready' 
                ? 'border-l-8 border-green-400 shadow-lg shadow-green-500/20 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/30 dark:to-transparent ring-2 ring-green-400/30' 
                : ''
            }`}
          >
            {isKitchen ? (
              // Kitchen View - Expanded details
              <div className="space-y-4">
                {/* Order Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0 border-b border-gray-200 dark:border-dark-700 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      Pedido #{order.id.slice(-8)}
                    </span>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center space-y-1 lg:space-y-0 lg:space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Cliente: <strong className="text-gray-900 dark:text-white">{order.customer_name || 'Sin nombre'}</strong></span>
                    <span>Vendedor: <strong className="text-gray-900 dark:text-white">{order.users?.full_name || 'Desconocido'}</strong></span>
                    <span>{new Date(order.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Order Items - Detailed for Kitchen */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Productos a Preparar:</h4>
                  <div className="grid gap-3">
                    {order.sale_items?.map((item) => (
                      <div key={item.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border-l-4 border-primary-500">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.products?.name || 'Producto desconocido'}
                            </h5>
                            <div className="flex items-center mt-1">
                              <span className="bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 px-3 py-1 rounded-full text-sm font-medium">
                                Cantidad: {item.quantity}
                              </span>
                            </div>
                            {/* Custom description if exists */}
                            {item.custom_description && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <div className="flex items-start">
                                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                  <span className="text-blue-800 dark:text-blue-300 font-medium">
                                    Instrucciones: {item.custom_description}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary for Kitchen */}
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border-t-2 border-primary-500">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {order.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Hora del Pedido</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {new Date(order.created_at).toLocaleTimeString('es-VE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Kitchen Actions */}
                {order.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-dark-700">
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <Check className="w-5 h-5" />
                      <span>Pedido Listo</span>
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <X className="w-5 h-5" />
                      <span>No se puede hacer</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Admin/Seller View - Compact
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                {/* Order Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{order.id.slice(-8)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Customer */}
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.customer_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                      </div>
                    </div>

                    {/* Seller */}
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.users?.full_name || 'Desconocido'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Vendedor</p>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.total_usd, 'USD')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(order.total_bs, 'BS')}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(order.created_at).toLocaleDateString('es-VE')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('es-VE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => showOrderDetail(order)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver detalles</span>
                  </button>

                  {/* Edit button - only for pending orders and if user is admin or the seller */}
                  {order.status === 'pending' && (isAdmin || order.seller_id === user?.id) && (
                    <button
                      onClick={() => openEditModal(order)}
                      className="px-3 py-2 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 text-sm font-medium flex items-center space-x-1"
                      title="Editar pedido"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  )}

                  {/* Deliver and Cancel buttons - for admin or seller (if it's their order) */}
                  {/* Can only deliver orders that are 'ready' (prepared by kitchen) */}
                  {order.status === 'ready' && (isAdmin || order.seller_id === user?.id) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="px-3 py-2 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 text-sm font-medium flex items-center space-x-1"
                        title="Entregar al cliente"
                      >
                        <Check className="w-4 h-4" />
                        <span>Entregar</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Can cancel pending or ready orders */}
                  {(order.status === 'pending' || order.status === 'ready') && (isAdmin || order.seller_id === user?.id) && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="px-3 py-2 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 text-sm font-medium flex items-center space-x-1"
                      title="Cancelar pedido"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'No se encontraron pedidos con los filtros aplicados' 
              : 'No hay pedidos registrados'}
          </p>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalles del Pedido #{selectedOrder.id.slice(-8)}
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Información del Pedido</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Estado:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.customer_name || 'Sin nombre'}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Vendedor:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.users?.full_name || 'Desconocido'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedOrder.created_at).toLocaleString('es-VE')}
                      </span>
                    </div>
                    
                    {/* Show completion/cancellation info */}
                    {selectedOrder.status === 'completed' && selectedOrder.completed_by_user && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Entregado por:</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {selectedOrder.completed_by_user.full_name}
                          </span>
                        </div>
                        {selectedOrder.completed_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Fecha de entrega:</span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(selectedOrder.completed_at).toLocaleString('es-VE')}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedOrder.status === 'cancelled' && selectedOrder.cancelled_by_user && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Cancelado por:</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {selectedOrder.cancelled_by_user.full_name}
                          </span>
                        </div>
                        {selectedOrder.cancelled_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Fecha de cancelación:</span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(selectedOrder.cancelled_at).toLocaleString('es-VE')}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Totales</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Total USD:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedOrder.total_usd, 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Total BS:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedOrder.total_bs, 'BS')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tasa de cambio:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedOrder.exchange_rate.toFixed(2)} BS/USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Productos</h4>
                <div className="space-y-2">
                  {selectedOrder.sale_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-dark-700 last:border-b-0">
                      <div>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {item.products?.name || 'Producto desconocido'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {formatCurrency(item.total_price_usd, 'USD')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.unit_price_usd, 'USD')} c/u
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {isAdmin && selectedOrder.status === 'pending' && (
                <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
                  <button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'completed')
                      setShowOrderDetails(false)
                    }}
                    className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Marcar como Completado</span>
                  </button>
                  <button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'cancelled')
                      setShowOrderDetails(false)
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar Pedido</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Editar Pedido #{editingOrder.id.slice(-8)}
                </h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="input-field"
                  placeholder="Nombre del cliente"
                />
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Productos del Pedido</h4>
                <div className="space-y-4">
                  {editForm.items.map((item) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {item.products?.name || 'Producto desconocido'}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Precio unitario: {formatCurrency(item.unit_price_usd, 'USD')}
                          </p>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-3 mt-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad:</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                className="p-1 rounded bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="p-1 rounded bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Total: {formatCurrency(item.total_price_usd, 'USD')}
                            </span>
                          </div>

                          {/* Custom Description */}
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Instrucciones especiales:
                            </label>
                            <textarea
                              value={item.custom_description || ''}
                              onChange={(e) => updateItemDescription(item.id, e.target.value)}
                              className="input-field"
                              rows={2}
                              placeholder="Ej: Sin cebolla, extra queso..."
                            />
                          </div>
                        </div>

                        {/* Remove Item Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {editForm.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay productos en este pedido
                  </div>
                )}
              </div>

              {/* Order Summary */}
              {editForm.items.length > 0 && (
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Resumen del Pedido</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total de productos:</span>
                      <span className="font-medium">{editForm.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal USD:</span>
                      <span className="font-medium">
                        {formatCurrency(editForm.items.reduce((sum, item) => sum + item.total_price_usd, 0), 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total BS:</span>
                      <span className="font-medium">
                        {formatCurrency(editForm.items.reduce((sum, item) => sum + item.total_price_usd, 0) * editingOrder.exchange_rate, 'BS')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-500">Tasa de cambio:</span>
                      <span>{editingOrder.exchange_rate.toFixed(2)} BS/USD</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={saveOrderChanges}
                  disabled={editForm.items.length === 0 || !editForm.customer_name.trim()}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={closeEditModal}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders