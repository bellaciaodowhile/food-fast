import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useEvents } from '../contexts/EventContext'
import { useToast } from '../contexts/ToastContext'
import { getExchangeRate, convertUSDToBS, formatCurrency } from '../services/exchangeRate'
import { useRealtime } from '../hooks/useRealtime'
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Trash2,
  Check,
  X,
  Package,
  Search,
  MessageSquare
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price_usd: number
  image_url?: string
  category: string
  is_active: boolean
  created_at: string
}

interface Category {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

interface CartItem {
  product: Product
  quantity: number
  customDescription?: string
}

const Sales: React.FC = () => {
  const { user } = useAuth()
  const { emit } = useEvents()
  const { success, error } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [exchangeRate, setExchangeRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingOrder, setProcessingOrder] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCartModal, setShowCartModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [tempDescription, setTempDescription] = useState('')
  const [cartAnimation, setCartAnimation] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [tempCustomerName, setTempCustomerName] = useState('')

  useEffect(() => {
    loadData()
    loadCategories()
    const checkMobile = () => setIsMobile(window.innerWidth < 720)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const reloadSales = useCallback(() => loadData(), [])
  useRealtime('sales', reloadSales)
  useRealtime('sale_items', reloadSales)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      const rate = await getExchangeRate()

      setProducts(productsData || [])
      setExchangeRate(rate)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const triggerCartAnimation = useCallback(() => {
    setCartAnimation(true)
    setTimeout(() => setCartAnimation(false), 600)
  }, [])

  const addToCart = useCallback((product: Product, description?: string) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && item.customDescription === description
      )
      
      if (existing) {
        const updated = prev.map(item =>
          item.product.id === product.id && item.customDescription === description
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        triggerCartAnimation()
        return updated
      }
      
      const newItem = { product, quantity: 1, customDescription: description }
      triggerCartAnimation()
      return [...prev, newItem]
    })
  }, [triggerCartAnimation])

  const updateQuantity = (productId: string, quantity: number, customDesc?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, customDesc)
      return
    }
    
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId && item.customDescription === customDesc
          ? { ...item, quantity }
          : item
      )
    )
  }

  const removeFromCart = (productId: string, customDesc?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && item.customDescription === customDesc)
    ))
  }

  // Memoized calculations
  const totalItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }, [cart])

  const totalUSD = useMemo(() => {
    return cart.reduce((total, item) => total + (item.product.price_usd * item.quantity), 0)
  }, [cart])

  const totalBS = useMemo(() => {
    return convertUSDToBS(totalUSD, exchangeRate)
  }, [totalUSD, exchangeRate])

  const groupedCartItems = useMemo(() => {
    const groups: { [key: string]: CartItem[] } = {}
    cart.forEach(item => {
      if (!groups[item.product.id]) {
        groups[item.product.id] = []
      }
      groups[item.product.id].push(item)
    })
    return groups
  }, [cart])

  const processOrder = async () => {
    if (cart.length === 0 || !user) {
      console.log('Error: Carrito vacío o usuario no autenticado')
      return
    }
    if (!tempCustomerName.trim()) {
      error('Nombre requerido', 'Por favor ingresa el nombre del cliente')
      return
    }

    console.log('Iniciando proceso de pedido...')
    console.log('Usuario:', user.id)
    console.log('Cliente:', tempCustomerName.trim())
    console.log('Carrito:', cart)
    console.log('Total USD:', totalUSD)
    console.log('Total BS:', totalBS)
    console.log('Tasa de cambio:', exchangeRate)

    setProcessingOrder(true)
    try {
      // Crear la venta
      const saleData = {
        seller_id: user.id,
        customer_name: tempCustomerName.trim(),
        total_usd: totalUSD,
        total_bs: totalBS,
        exchange_rate: exchangeRate,
        status: 'pending'
      }
      
      console.log('Datos de venta a insertar:', saleData)

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single()

      if (saleError) {
        console.error('Error al crear la venta:', saleError)
        throw saleError
      }

      console.log('Venta creada exitosamente:', sale)

      // Crear los items de la venta
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price_usd: item.product.price_usd,
        total_price_usd: item.product.price_usd * item.quantity,
        custom_description: item.customDescription
      }))

      console.log('Items de venta a insertar:', saleItems)

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) {
        console.error('Error al crear los items de venta:', itemsError)
        throw itemsError
      }

      console.log('✅ Items de venta creados exitosamente')

      // Emitir evento de nuevo pedido creado
      console.log('📡 Emitiendo evento de nuevo pedido...')
      emit('orderCreated', {
        orderId: sale.id,
        customerName: tempCustomerName.trim(),
        sellerId: user.id,
        totalUSD: totalUSD,
        totalBS: totalBS,
        itemCount: cart.length
      })

      // Limpiar el estado
      setCart([])
      setTempCustomerName('')
      setShowCustomerModal(false)
      setShowCartModal(false)
      
      // Recargar datos para actualizar la vista actual
      console.log('🔄 Recargando datos locales...')
      await loadData()
      
      console.log('🎉 Pedido completado exitosamente')
      success('¡Pedido creado exitosamente!', 'Revisa la sección de Pedidos para ver el nuevo pedido.')
      
    } catch (error: any) {
      console.error('❌ Error completo al procesar el pedido:', error)
      error('Error al procesar el pedido', error?.message || 'Error desconocido')
    } finally {
      setProcessingOrder(false)
    }
  }

  const handleCreateOrder = () => {
    if (cart.length === 0 || !user) return
    setShowCustomerModal(true)
  }

  const handleConfirmOrder = async () => {
    console.log('Confirmando pedido...')
    console.log('Usuario actual:', user)
    console.log('Estado del carrito:', cart)
    console.log('Nombre del cliente:', tempCustomerName)
    
    if (!user) {
      error('Error de autenticación', 'Usuario no autenticado')
      return
    }
    
    if (cart.length === 0) {
      error('Carrito vacío', 'Agrega productos al carrito antes de crear el pedido')
      return
    }
    
    await processOrder()
  }

  const handleCancelOrder = () => {
    setShowCustomerModal(false)
    setTempCustomerName('')
  }

  const toggleGroup = (productId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Expand items by quantity for accordion display
  const expandItemsByQuantity = (items: CartItem[]) => {
    const expandedItems: Array<CartItem & { itemIndex: number }> = []
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({
          ...item,
          quantity: 1,
          itemIndex: i
        })
      }
    })
    return expandedItems
  }

  const startEditingDescription = (productId: string, itemIndex: number, currentDescription?: string) => {
    const editKey = `${productId}-${itemIndex}`
    setEditingDescription(editKey)
    setTempDescription(currentDescription || '')
  }

  const saveDescription = (productId: string, originalCustomDescription?: string) => {
    // Find the original item in cart
    const originalItem = cart.find(item => 
      item.product.id === productId && item.customDescription === originalCustomDescription
    )
    
    if (originalItem && originalItem.quantity > 1) {
      // If original item has quantity > 1, we need to split it
      // Remove one from original item
      updateQuantity(productId, originalItem.quantity - 1, originalCustomDescription)
      
      // Add new item with description
      const newItem = {
        product: originalItem.product,
        quantity: 1,
        customDescription: tempDescription.trim() || undefined
      }
      setCart(prev => [...prev, newItem])
    } else if (originalItem) {
      // Update existing single item
      setCart(prev => prev.map(item =>
        item.product.id === productId && item.customDescription === originalCustomDescription
          ? { ...item, customDescription: tempDescription.trim() || undefined }
          : item
      ))
    }
    
    setEditingDescription(null)
    setTempDescription('')
  }

  const cancelEditingDescription = () => {
    setEditingDescription(null)
    setTempDescription('')
  }

  // Cart Component
  const CartContent = React.memo(() => {
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Carrito ({totalItems})
          </h3>
          {isMobile && (
            <button
              onClick={() => setShowCartModal(false)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {cart.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            El carrito está vacío
          </p>
        ) : (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
              {Object.entries(groupedCartItems).map(([productId, items]) => {
                const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
                const hasMultipleItems = totalQuantity > 1 // Cambio: usar totalQuantity > 1 en lugar de > 2
                const isExpanded = expandedGroups.has(productId)
                const firstItem = items[0]
                
                return (
                  <div key={productId} className="bg-gray-50 dark:bg-dark-700 rounded-lg">
                    {hasMultipleItems ? (
                      // Accordion for products with more than 1 item
                      <div>
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                          onClick={() => toggleGroup(productId)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {firstItem.product.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatCurrency(firstItem.product.price_usd, 'USD')} c/u • {items.length} {items.length === 1 ? 'variación' : 'variaciones'}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <span className="bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 px-2 py-1 rounded-full text-sm font-medium">
                              {totalQuantity} items
                            </span>
                            <div className="transform transition-transform duration-200">
                              {isExpanded ? (
                                <Minus className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Plus className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-dark-600 pt-2">
                            {expandItemsByQuantity(items).map((expandedItem, expandedIndex) => {
                              const editKey = `${productId}-${expandedIndex}`
                              const isEditing = editingDescription === editKey
                              
                              return (
                                <div key={expandedIndex} className="flex items-center justify-between p-2 bg-white dark:bg-dark-800 rounded border">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {expandedItem.product.name} #{expandedIndex + 1}
                                      </p>
                                      <button
                                        onClick={() => startEditingDescription(productId, expandedIndex, expandedItem.customDescription)}
                                        className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                        title="Agregar descripción"
                                      >
                                        Agregar descripción
                                      </button>
                                    </div>
                                    
                                    {isEditing ? (
                                      <div className="mt-2 space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Descripción personalizada..."
                                          className="w-full text-xs p-2 border rounded dark:bg-dark-700 dark:border-dark-600"
                                          value={tempDescription}
                                          onChange={(e) => setTempDescription(e.target.value)}
                                          autoFocus
                                        />
                                        <div className="flex space-x-1">
                                          <button
                                            onClick={() => saveDescription(productId, expandedItem.customDescription)}
                                            className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/40"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={cancelEditingDescription}
                                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : expandedItem.customDescription ? (
                                      <div className="mt-1 p-1 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                        <div className="flex items-start">
                                          <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400 mr-1 mt-0.5 flex-shrink-0" />
                                          <span className="text-blue-800 dark:text-blue-300">
                                            {expandedItem.customDescription}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Sin descripción personalizada
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 ml-2">
                                    <button
                                      onClick={() => {
                                        // Find original item and reduce quantity
                                        const originalItem = items.find(item => 
                                          item.customDescription === expandedItem.customDescription
                                        )
                                        if (originalItem) {
                                          updateQuantity(originalItem.product.id, originalItem.quantity - 1, originalItem.customDescription)
                                        }
                                      }}
                                      className="p-1 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
                                      title="Eliminar este item"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Regular display for products with 1 item only
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.product.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatCurrency(item.product.price_usd, 'USD')} c/u
                              </p>
                              {item.customDescription && (
                                <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                  <div className="flex items-start">
                                    <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400 mr-1 mt-0.5 flex-shrink-0" />
                                    <span className="text-blue-800 dark:text-blue-300 text-xs">
                                      {item.customDescription}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.customDescription)}
                                className="p-1 rounded bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.customDescription)}
                                className="p-1 rounded bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product.id, item.customDescription)}
                                className="p-1 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="border-t border-gray-200 dark:border-dark-600 pt-3 mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Total USD:</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(totalUSD, 'USD')}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total BS:</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(totalBS, 'BS')}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Tasa: {exchangeRate.toFixed(2)} BS/USD
              </div>
              
              <button
                onClick={handleCreateOrder}
                disabled={processingOrder}
                className="w-full btn-primary disabled:opacity-50"
              >
                {processingOrder ? 'Creando pedido...' : 'Crear Pedido'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1f293a;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e5e7eb;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
          }
          /* Firefox */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #e5e7eb #1f293a;
          }
        `
      }} />

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
              }`}
            >
              Todas
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(selectedCategory !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSearchTerm('')
              }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}`}>
        {/* Products */}
        <div className={`${isMobile ? '' : 'lg:col-span-2'} space-y-6`}>
          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products
              .filter(product => {
                const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   product.description.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
                return matchesSearch && matchesCategory
              })
              .map(product => (
                <div key={product.id} className="card p-4">
                  <div className="flex items-center space-x-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {product.description}
                      </p>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(product.price_usd, 'USD')}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => addToCart(product)}
                      className="btn-primary p-2"
                      title="Agregar al carrito"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Cart - Desktop Only */}
        {!isMobile && (
          <div className="space-y-6">
            <div className="card p-4">
              <CartContent />
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Button - Mobile Only */}
      {isMobile && totalItems > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className={`fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg z-40 transition-all duration-200 hover:scale-110 border-2 border-white dark:border-gray-800 ${
            cartAnimation ? 'animate-bounce scale-125' : ''
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border border-white transition-all duration-300 ${
              cartAnimation ? 'animate-pulse scale-110' : ''
            }`}>
              {totalItems}
            </span>
          </div>
        </button>
      )}

      {/* Cart Modal - Mobile Only */}
      {isMobile && showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white dark:bg-dark-800 w-full max-h-[80vh] rounded-t-xl p-6 overflow-y-auto custom-scrollbar">
            <CartContent />
          </div>
        </div>
      )}

      {/* Customer Name Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Finalizar Pedido
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ingresa el nombre del cliente"
                  className="input-field"
                  value={tempCustomerName}
                  onChange={(e) => setTempCustomerName(e.target.value)}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && tempCustomerName.trim()) {
                      handleConfirmOrder()
                    }
                  }}
                />
              </div>

              {/* Order Details */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Detalle del Pedido:
                </h4>
                <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-600 rounded-lg max-h-48 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="p-3 border-b border-gray-100 dark:border-dark-700 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.product.price_usd, 'USD')} × {item.quantity}
                          </p>
                          {item.customDescription && (
                            <div className="mt-1 p-1 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                              <div className="flex items-start">
                                <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400 mr-1 mt-0.5 flex-shrink-0" />
                                <span className="text-blue-800 dark:text-blue-300">
                                  {item.customDescription}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-3">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {formatCurrency(item.product.price_usd * item.quantity, 'USD')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total USD:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(totalUSD, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total BS:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(totalBS, 'BS')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Items:</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalItems} productos
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelOrder}
                  className="flex-1 btn-secondary"
                  disabled={processingOrder}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={processingOrder || !tempCustomerName.trim()}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {processingOrder ? 'Creando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales