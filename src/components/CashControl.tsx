import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../services/exchangeRate'
import { 
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Download,
  Search,
  Lock,
  User,
  ChevronDown,
  ChevronRight,
  Package,
  Filter,
  BarChart3,
  Target,
  Award
} from 'lucide-react'

interface DailySales {
  totalSalesUSD: number
  totalSalesBS: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  pendingOrders: number
  averageOrderUSD: number
  averageOrderBS: number
}

interface ProductSales {
  productId: string
  productName: string
  quantitySold: number
  totalRevenueUSD: number
  totalRevenueBS: number
  averagePriceUSD: number
}

interface SaleDetail {
  id: string
  customer_name: string
  seller_name: string
  total_usd: number
  total_bs: number
  exchange_rate: number
  status: string
  created_at: string
  items_count: number
}

interface SaleItem {
  id: string
  product_name: string
  quantity: number
  unit_price_usd: number
  total_price_usd: number
  custom_description?: string
}

interface CashClosure {
  id: string
  closure_date: string
  closed_by: string
  closed_by_name: string
  closed_at: string
  total_sales_usd: number
  total_sales_bs: number
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  pending_orders: number
  exchange_rate_avg: number
  notes?: string
}

const CashControl: React.FC = () => {
  const { user } = useAuth()
  const { error: showErrorToast, info: showInfoToast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailySales, setDailySales] = useState<DailySales | null>(null)
  const [productSales, setProductSales] = useState<ProductSales[]>([])
  const [saleDetails, setSaleDetails] = useState<SaleDetail[]>([])
  const [filteredSaleDetails, setFilteredSaleDetails] = useState<SaleDetail[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isCashClosed, setIsCashClosed] = useState(false)
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [saleItems, setSaleItems] = useState<Record<string, SaleItem[]>>({})
  const [cashClosure, setCashClosure] = useState<CashClosure | null>(null)

  const loadDailySummary = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      // Get sales summary for the selected date
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          customer_name,
          total_usd,
          total_bs,
          exchange_rate,
          status,
          created_at,
          sale_items(quantity),
          users!seller_id(full_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // If user is seller, only show their sales
      if (user.role === 'seller') {
        salesQuery = salesQuery.eq('seller_id', user.id)
      }

      const { data: sales, error: salesError } = await salesQuery

      if (salesError) throw salesError

      // Calculate daily summary
      const summary: DailySales = {
        totalSalesUSD: 0,
        totalSalesBS: 0,
        totalOrders: sales?.length || 0,
        completedOrders: 0,
        cancelledOrders: 0,
        pendingOrders: 0,
        averageOrderUSD: 0,
        averageOrderBS: 0
      }

      const saleDetailsData: SaleDetail[] = []

      sales?.forEach(sale => {
        if (sale.status === 'completed') {
          summary.totalSalesUSD += sale.total_usd
          summary.totalSalesBS += sale.total_bs
          summary.completedOrders++
        } else if (sale.status === 'cancelled') {
          summary.cancelledOrders++
        } else {
          summary.pendingOrders++
        }

        saleDetailsData.push({
          id: sale.id,
          customer_name: sale.customer_name || 'Cliente',
          seller_name: (sale.users as any)?.full_name || 'Vendedor',
          total_usd: sale.total_usd,
          total_bs: sale.total_bs,
          exchange_rate: sale.exchange_rate,
          status: sale.status,
          created_at: sale.created_at,
          items_count: sale.sale_items?.length || 0
        })
      })

      if (summary.completedOrders > 0) {
        summary.averageOrderUSD = summary.totalSalesUSD / summary.completedOrders
        summary.averageOrderBS = summary.totalSalesBS / summary.completedOrders
      }

      setDailySales(summary)
      setSaleDetails(saleDetailsData)
      setFilteredSaleDetails(saleDetailsData)

      // Get product sales details
      await loadProductSales(startDate, endDate)

    } catch (error) {
      console.error('Error loading daily summary:', error)
      showErrorToast('Error al cargar el resumen diario')
    } finally {
      setLoading(false)
    }
  }

  const loadProductSales = async (startDate: Date, endDate: Date) => {
    try {
      let query = supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          unit_price_usd,
          total_price_usd,
          products(name),
          sales!inner(
            id,
            status,
            created_at,
            exchange_rate,
            seller_id
          )
        `)
        .gte('sales.created_at', startDate.toISOString())
        .lte('sales.created_at', endDate.toISOString())
        .eq('sales.status', 'completed')

      // If user is seller, only show their sales
      if (user?.role === 'seller') {
        query = query.eq('sales.seller_id', user.id)
      }

      const { data: saleItems, error } = await query

      if (error) throw error

      // Group by product
      const productMap = new Map<string, ProductSales>()

      saleItems?.forEach(item => {
        const productId = item.product_id
        const productName = (item.products as any)?.name || 'Producto Desconocido'
        const sale = item.sales as any // Type assertion for the joined sales data
        
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            quantitySold: 0,
            totalRevenueUSD: 0,
            totalRevenueBS: 0,
            averagePriceUSD: 0
          })
        }

        const product = productMap.get(productId)!
        product.quantitySold += item.quantity
        product.totalRevenueUSD += item.total_price_usd
        product.totalRevenueBS += item.total_price_usd * sale.exchange_rate
      })

      // Calculate averages and sort by revenue
      const productSalesArray = Array.from(productMap.values()).map(product => ({
        ...product,
        averagePriceUSD: product.totalRevenueUSD / product.quantitySold
      })).sort((a, b) => b.totalRevenueUSD - a.totalRevenueUSD)

      setProductSales(productSalesArray)

    } catch (error) {
      console.error('Error loading product sales:', error)
    }
  }

  useEffect(() => {
    loadDailySummary()
    checkExistingClosure()
  }, [selectedDate, user])

  const checkExistingClosure = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('cash_closures')
        .select(`
          id,
          closure_date,
          closed_by,
          closed_at,
          total_sales_usd,
          total_sales_bs,
          total_orders,
          completed_orders,
          cancelled_orders,
          pending_orders,
          exchange_rate_avg,
          notes,
          users!closed_by(full_name)
        `)
        .eq('closure_date', selectedDate)

      // If user is seller, only show their closures
      if (user.role === 'seller') {
        query = query.eq('closed_by', user.id)
      }

      const { data: closures, error } = await query.single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (closures) {
        const closure: CashClosure = {
          id: closures.id,
          closure_date: closures.closure_date,
          closed_by: closures.closed_by,
          closed_by_name: (closures.users as any)?.full_name || 'Usuario',
          closed_at: closures.closed_at,
          total_sales_usd: closures.total_sales_usd,
          total_sales_bs: closures.total_sales_bs,
          total_orders: closures.total_orders,
          completed_orders: closures.completed_orders,
          cancelled_orders: closures.cancelled_orders,
          pending_orders: closures.pending_orders,
          exchange_rate_avg: closures.exchange_rate_avg,
          notes: closures.notes
        }
        setCashClosure(closure)
        setIsCashClosed(true)
      } else {
        setCashClosure(null)
        setIsCashClosed(false)
      }
    } catch (error) {
      console.error('Error checking existing closure:', error)
    }
  }

  // Filter sales based on search term and status
  useEffect(() => {
    let filtered = saleDetails

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(sale => 
        sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter)
    }

    setFilteredSaleDetails(filtered)
  }, [searchTerm, statusFilter, saleDetails])

  const closeCash = async () => {
    if (!dailySales || dailySales.pendingOrders > 0) {
      showErrorToast('No se puede cerrar la caja con pedidos pendientes')
      return
    }

    if (!user) {
      showErrorToast('Usuario no autenticado')
      return
    }

    const confirmClose = window.confirm(
      `¿Está seguro de cerrar la caja del ${selectedDate}?\n\n` +
      `Total del día: ${formatCurrency(dailySales.totalSalesUSD, 'USD')} / ${formatCurrency(dailySales.totalSalesBS, 'BS')}\n` +
      `Pedidos completados: ${dailySales.completedOrders}\n\n` +
      `Esta acción no se puede deshacer.`
    )

    if (confirmClose) {
      try {
        // Calculate average exchange rate
        const avgExchangeRate = dailySales.totalSalesUSD > 0 
          ? dailySales.totalSalesBS / dailySales.totalSalesUSD 
          : 0

        // Save closure record to database
        const { data: closureData, error } = await supabase
          .from('cash_closures')
          .insert({
            closure_date: selectedDate,
            closed_by: user.id,
            total_sales_usd: dailySales.totalSalesUSD,
            total_sales_bs: dailySales.totalSalesBS,
            total_orders: dailySales.totalOrders,
            completed_orders: dailySales.completedOrders,
            cancelled_orders: dailySales.cancelledOrders,
            pending_orders: dailySales.pendingOrders,
            exchange_rate_avg: avgExchangeRate,
            notes: `Caja cerrada por ${user.full_name} el ${new Date().toLocaleString()}`
          })
          .select(`
            id,
            closure_date,
            closed_by,
            closed_at,
            total_sales_usd,
            total_sales_bs,
            total_orders,
            completed_orders,
            cancelled_orders,
            pending_orders,
            exchange_rate_avg,
            notes
          `)
          .single()

        if (error) throw error

        // Create closure object
        const newClosure: CashClosure = {
          id: closureData.id,
          closure_date: closureData.closure_date,
          closed_by: closureData.closed_by,
          closed_by_name: user.full_name,
          closed_at: closureData.closed_at,
          total_sales_usd: closureData.total_sales_usd,
          total_sales_bs: closureData.total_sales_bs,
          total_orders: closureData.total_orders,
          completed_orders: closureData.completed_orders,
          cancelled_orders: closureData.cancelled_orders,
          pending_orders: closureData.pending_orders,
          exchange_rate_avg: closureData.exchange_rate_avg,
          notes: closureData.notes
        }

        setCashClosure(newClosure)
        setIsCashClosed(true)
        showInfoToast(`Caja cerrada exitosamente para el ${selectedDate}`)

      } catch (error) {
        console.error('Error closing cash:', error)
        showErrorToast('Error al cerrar la caja')
      }
    }
  }

  const loadSaleItems = async (saleId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          quantity,
          unit_price_usd,
          total_price_usd,
          custom_description,
          products(name)
        `)
        .eq('sale_id', saleId)

      if (error) throw error

      const formattedItems: SaleItem[] = items?.map(item => ({
        id: item.id,
        product_name: (item.products as any)?.name || 'Producto Desconocido',
        quantity: item.quantity,
        unit_price_usd: item.unit_price_usd,
        total_price_usd: item.total_price_usd,
        custom_description: item.custom_description
      })) || []

      setSaleItems(prev => ({
        ...prev,
        [saleId]: formattedItems
      }))

    } catch (error) {
      console.error('Error loading sale items:', error)
      showErrorToast('Error al cargar los detalles de la venta')
    }
  }

  const toggleSaleExpansion = async (saleId: string) => {
    const newExpanded = new Set(expandedSales)
    
    if (expandedSales.has(saleId)) {
      newExpanded.delete(saleId)
    } else {
      newExpanded.add(saleId)
      // Load sale items if not already loaded
      if (!saleItems[saleId]) {
        await loadSaleItems(saleId)
      }
    }
    
    setExpandedSales(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return 'Pendiente'
    }
  }

  const exportToPDF = () => {
    showInfoToast('Función de exportar PDF próximamente')
  }

  const printReport = () => {
    window.print()
  }

  const generateDailySummary = () => {
    if (!dailySales) return

    const summary = `
📊 RESUMEN DIARIO - ${selectedDate}
${user?.role === 'admin' ? '👨‍💼 Vista Administrador' : '👨‍💻 Vista Vendedor'}

💰 TOTALES FINANCIEROS:
• Total USD: ${formatCurrency(dailySales.totalSalesUSD, 'USD')}
• Total Bs.: ${formatCurrency(dailySales.totalSalesBS, 'BS')}
• Promedio por pedido: ${formatCurrency(dailySales.averageOrderUSD, 'USD')}

📈 ESTADÍSTICAS DE PEDIDOS:
• Total pedidos: ${dailySales.totalOrders}
• Completados: ${dailySales.completedOrders} (${dailySales.totalOrders > 0 ? ((dailySales.completedOrders / dailySales.totalOrders) * 100).toFixed(1) : 0}%)
• Pendientes: ${dailySales.pendingOrders}
• Cancelados: ${dailySales.cancelledOrders} (${dailySales.totalOrders > 0 ? ((dailySales.cancelledOrders / dailySales.totalOrders) * 100).toFixed(1) : 0}%)

🏆 PRODUCTOS MÁS VENDIDOS:
${productSales.slice(0, 3).map((product, index) => 
  `${index + 1}. ${product.productName}: ${product.quantitySold} unidades - ${formatCurrency(product.totalRevenueUSD, 'USD')}`
).join('\n')}

⏰ Generado: ${new Date().toLocaleString()}
    `.trim()

    navigator.clipboard.writeText(summary).then(() => {
      showInfoToast('Resumen copiado al portapapeles')
    }).catch(() => {
      // Fallback: show summary in alert
      alert(summary)
    })
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Control de Caja
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Resumen de ventas y control diario
          </p>
        </div>
      </div>

    <div className="flex items-center flex-wrap space-x-3 mt-4 sm:mt-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          
          {/* Close Cash Button */}
          {dailySales && !isCashClosed && (
            <button
              onClick={closeCash}
              disabled={dailySales.pendingOrders > 0}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 font-medium ${
                dailySales.pendingOrders > 0
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={dailySales.pendingOrders > 0 ? 'No se puede cerrar con pedidos pendientes' : 'Cerrar caja del día'}
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Caja</span>
            </button>
          )}

          {isCashClosed && cashClosure && (
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="font-medium">Caja Cerrada</span>
                <span className="text-xs">
                  por {cashClosure.closed_by_name} - {new Date(cashClosure.closed_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={printReport}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={generateDailySummary}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Resumen</span>
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>


      {/* Summary Cards */}
      {dailySales && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex flex-col items-start">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total USD
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dailySales.totalSalesUSD, 'USD')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex flex-col items-start">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Bs.
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dailySales.totalSalesBS, 'BS')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex flex-col items-start">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pedidos Completados
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dailySales.completedOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex flex-col items-start">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Promedio por Pedido
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dailySales.averageOrderUSD, 'USD')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Statistics */}
      {dailySales && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Métricas de Rendimiento
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tasa de Éxito</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${dailySales.totalOrders > 0 ? (dailySales.completedOrders / dailySales.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {dailySales.totalOrders > 0 ? ((dailySales.completedOrders / dailySales.totalOrders) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tasa de Cancelación</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${dailySales.totalOrders > 0 ? (dailySales.cancelledOrders / dailySales.totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {dailySales.totalOrders > 0 ? ((dailySales.cancelledOrders / dailySales.totalOrders) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Eficiencia Operativa</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {dailySales.completedOrders > 0 ? 'Excelente' : dailySales.pendingOrders > 0 ? 'En Proceso' : 'Sin Actividad'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button 
                onClick={() => setStatusFilter('completed')}
                className="p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Ver Completados</span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {dailySales.completedOrders} pedidos
                </div>
              </button>

              <button 
                onClick={() => setStatusFilter('cancelled')}
                className="p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Ver Cancelados</span>
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {dailySales.cancelledOrders} pedidos
                </div>
              </button>

              <button 
                onClick={() => setStatusFilter('pending')}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ver Pendientes</span>
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {dailySales.pendingOrders} pedidos
                </div>
              </button>

              <button 
                onClick={() => {
                  setStatusFilter('all')
                  setSearchTerm('')
                  setShowDetails(true)
                }}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Ver Todo</span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {dailySales.totalOrders} pedidos
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Status Summary */}
      {dailySales && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resumen de Pedidos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dailySales.totalOrders}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Pedidos
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dailySales.completedOrders}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completados
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {dailySales.pendingOrders}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pendientes
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {dailySales.cancelledOrders}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cancelados
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Sales */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Productos Más Vendidos
        </h3>
        {productSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ingresos USD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ingresos Bs.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Precio Promedio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {productSales.map((product) => (
                  <tr key={product.productId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {product.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {product.quantitySold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(product.totalRevenueUSD, 'USD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(product.totalRevenueBS, 'BS')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(product.averagePriceUSD, 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No hay ventas de productos para esta fecha
          </p>
        )}
      </div>

      {/* Sales Details */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detalle de Ventas
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showDetails ? 'Ocultar' : 'Ver'} Detalles</span>
          </button>
        </div>

        {showDetails && (
          <>
            {/* Search and Filter Bar */}
            <div className="mb-4 flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por cliente, vendedor o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="completed">Completados</option>
                    <option value="pending">Pendientes</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredSaleDetails.length > 0 ? (
              <div className="space-y-2">
                {filteredSaleDetails.map((sale) => (
                  <div key={sale.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Sale Header - Clickable */}
                    <div 
                      className="bg-gray-50 dark:bg-gray-700 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => toggleSaleExpansion(sale.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {expandedSales.has(sale.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {sale.customer_name}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{sale.seller_name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(sale.status)}
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                              {getStatusText(sale.status)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(sale.total_usd, 'USD')}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatCurrency(sale.total_bs, 'BS')}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {new Date(sale.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sale Details - Expandable */}
                    {expandedSales.has(sale.id) && (
                      <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Sale Information */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Información de la Venta
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">ID de Venta:</span>
                                <span className="font-mono text-gray-900 dark:text-white">{sale.id.slice(0, 8)}...</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                                <span className="text-gray-900 dark:text-white">{sale.customer_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Vendedor:</span>
                                <span className="text-gray-900 dark:text-white">{sale.seller_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fecha y Hora:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {new Date(sale.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Tasa de Cambio:</span>
                                <span className="text-gray-900 dark:text-white">{sale.exchange_rate.toFixed(2)} Bs/$</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600 dark:text-gray-400">Total USD:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(sale.total_usd, 'USD')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Bs.:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(sale.total_bs, 'BS')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Sale Items */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                              <Package className="w-4 h-4 mr-2" />
                              Productos ({sale.items_count})
                            </h4>
                            
                            {saleItems[sale.id] ? (
                              <div className="space-y-3">
                                {saleItems[sale.id].map((item) => (
                                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-900 dark:text-white">
                                          {item.product_name}
                                        </h5>
                                        {item.custom_description && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {item.custom_description}
                                          </p>
                                        )}
                                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                          <span>Cantidad: {item.quantity}</span>
                                          <span>Precio: {formatCurrency(item.unit_price_usd, 'USD')}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                          {formatCurrency(item.total_price_usd, 'USD')}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          {formatCurrency(item.total_price_usd * sale.exchange_rate, 'BS')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                  Cargando productos...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {searchTerm ? 'No se encontraron ventas que coincidan con la búsqueda' : 'No hay ventas para esta fecha'}
              </p>
            )}
          </>
        )}

        {!showDetails && saleDetails.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No hay ventas para esta fecha
          </p>
        )}
      </div>
    </div>
  )
}

export default CashControl