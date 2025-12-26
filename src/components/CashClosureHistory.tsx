import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../services/exchangeRate'
import { 
  History,
  Search,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  FileText,
  Download,
  Eye,
  Package,
  ShoppingBag,
  Clock,
  XCircle
} from 'lucide-react'

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

interface SaleDetail {
  id: string
  customer_name: string
  seller_name: string
  total_usd: number
  total_bs: number
  exchange_rate: number
  status: string
  created_at: string
  items: SaleItem[]
}

interface SaleItem {
  id: string
  product_name: string
  quantity: number
  unit_price_usd: number
  total_price_usd: number
  custom_description?: string
}

interface ClosureDetails {
  sales: SaleDetail[]
  productSummary: ProductSummary[]
}

interface ProductSummary {
  product_name: string
  total_quantity: number
  total_revenue_usd: number
  total_revenue_bs: number
  average_price: number
}

const CashClosureHistory: React.FC = () => {
  const { user } = useAuth()
  const { error: showErrorToast } = useToast()
  const [closures, setClosures] = useState<CashClosure[]>([])
  const [filteredClosures, setFilteredClosures] = useState<CashClosure[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [expandedClosure, setExpandedClosure] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([])
  const [closureDetails, setClosureDetails] = useState<Record<string, ClosureDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

  const loadClosures = async () => {
    if (!user) return
    
    setLoading(true)
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
        .order('closure_date', { ascending: false })
        .limit(50)

      // If user is seller, only show their closures
      if (user.role === 'seller') {
        query = query.eq('closed_by', user.id)
      }

      const { data: closuresData, error } = await query

      if (error) throw error

      const formattedClosures: CashClosure[] = closuresData?.map(closure => ({
        id: closure.id,
        closure_date: closure.closure_date,
        closed_by: closure.closed_by,
        closed_by_name: (closure.users as any)?.full_name || 'Usuario',
        closed_at: closure.closed_at,
        total_sales_usd: closure.total_sales_usd,
        total_sales_bs: closure.total_sales_bs,
        total_orders: closure.total_orders,
        completed_orders: closure.completed_orders,
        cancelled_orders: closure.cancelled_orders,
        pending_orders: closure.pending_orders,
        exchange_rate_avg: closure.exchange_rate_avg,
        notes: closure.notes
      })) || []

      setClosures(formattedClosures)
      setFilteredClosures(formattedClosures)

      // Extract unique users for filter
      const users = formattedClosures.reduce((acc, closure) => {
        if (!acc.find(u => u.id === closure.closed_by)) {
          acc.push({ id: closure.closed_by, name: closure.closed_by_name })
        }
        return acc
      }, [] as {id: string, name: string}[])
      setAvailableUsers(users)

    } catch (error) {
      console.error('Error loading closures:', error)
      showErrorToast('Error al cargar el historial de cierres')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClosures()
  }, [user])

  // Filter closures based on search term, date, and user
  useEffect(() => {
    let filtered = closures

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(closure => 
        closure.closed_by_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        closure.closure_date.includes(searchTerm) ||
        closure.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (closure.notes && closure.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(closure => closure.closure_date === dateFilter)
    }

    // Filter by user
    if (userFilter !== 'all') {
      filtered = filtered.filter(closure => closure.closed_by === userFilter)
    }

    setFilteredClosures(filtered)
  }, [searchTerm, dateFilter, userFilter, closures])

  const loadClosureDetails = async (closureDate: string) => {
    if (closureDetails[closureDate] || loadingDetails[closureDate]) return

    setLoadingDetails(prev => ({ ...prev, [closureDate]: true }))

    try {
      const startDate = new Date(closureDate)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(closureDate)
      endDate.setHours(23, 59, 59, 999)

      // Get all sales for that date with items
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
          users!seller_id(full_name),
          sale_items(
            id,
            quantity,
            unit_price_usd,
            total_price_usd,
            custom_description,
            products(name)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      // If user is seller, only show their sales
      if (user?.role === 'seller') {
        salesQuery = salesQuery.eq('seller_id', user.id)
      }

      const { data: salesData, error } = await salesQuery

      if (error) throw error

      // Format sales data
      const formattedSales: SaleDetail[] = salesData?.map(sale => ({
        id: sale.id,
        customer_name: sale.customer_name || 'Cliente',
        seller_name: (sale.users as any)?.full_name || 'Vendedor',
        total_usd: sale.total_usd,
        total_bs: sale.total_bs,
        exchange_rate: sale.exchange_rate,
        status: sale.status,
        created_at: sale.created_at,
        items: sale.sale_items?.map((item: any) => ({
          id: item.id,
          product_name: item.products?.name || 'Producto Desconocido',
          quantity: item.quantity,
          unit_price_usd: item.unit_price_usd,
          total_price_usd: item.total_price_usd,
          custom_description: item.custom_description
        })) || []
      })) || []

      // Calculate product summary
      const productMap = new Map<string, ProductSummary>()
      
      formattedSales.forEach(sale => {
        if (sale.status === 'completed') {
          sale.items.forEach(item => {
            const key = item.product_name
            if (!productMap.has(key)) {
              productMap.set(key, {
                product_name: item.product_name,
                total_quantity: 0,
                total_revenue_usd: 0,
                total_revenue_bs: 0,
                average_price: 0
              })
            }
            
            const product = productMap.get(key)!
            product.total_quantity += item.quantity
            product.total_revenue_usd += item.total_price_usd
            product.total_revenue_bs += item.total_price_usd * sale.exchange_rate
          })
        }
      })

      // Calculate averages and sort by revenue
      const productSummary = Array.from(productMap.values()).map(product => ({
        ...product,
        average_price: product.total_revenue_usd / product.total_quantity
      })).sort((a, b) => b.total_revenue_usd - a.total_revenue_usd)

      setClosureDetails(prev => ({
        ...prev,
        [closureDate]: {
          sales: formattedSales,
          productSummary
        }
      }))

    } catch (error) {
      console.error('Error loading closure details:', error)
      showErrorToast('Error al cargar los detalles del cierre')
    } finally {
      setLoadingDetails(prev => ({ ...prev, [closureDate]: false }))
    }
  }

  const getSuccessRate = (closure: CashClosure): string => {
    if (closure.total_orders === 0) return '0'
    return ((closure.completed_orders / closure.total_orders) * 100).toFixed(1)
  }

  const exportToCSV = () => {
    const headers = [
      'Fecha',
      'Cerrado Por',
      'Hora de Cierre',
      'Total USD',
      'Total Bs.',
      'Total Pedidos',
      'Completados',
      'Cancelados',
      'Tasa Éxito (%)',
      'Tasa Promedio',
      'Notas'
    ]

    const csvData = filteredClosures.map(closure => [
      closure.closure_date,
      closure.closed_by_name,
      new Date(closure.closed_at).toLocaleString(),
      closure.total_sales_usd.toFixed(2),
      closure.total_sales_bs.toFixed(2),
      closure.total_orders,
      closure.completed_orders,
      closure.cancelled_orders,
      getSuccessRate(closure),
      closure.exchange_rate_avg.toFixed(2),
      closure.notes || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cierres_caja_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <History className="w-6 h-6 mr-2" />
            Historial de Cierres de Caja
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registro completo de todos los cierres de caja
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por usuario, fecha, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* User Filter */}
          {user?.role === 'admin' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Todos los Usuarios</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {filteredClosures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cierres</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{filteredClosures.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendido</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(Number(filteredClosures.reduce((sum, c) => sum + c.total_sales_usd, 0)), 'USD')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pedidos Totales</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {filteredClosures.reduce((sum, c) => sum + c.total_orders, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuarios Únicos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {new Set(filteredClosures.map(c => c.closed_by)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Closures Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredClosures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cerrado Por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total USD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Bs.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Éxito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClosures.map((closure) => (
                  <React.Fragment key={closure.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(closure.closure_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{closure.closed_by_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(closure.closed_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(closure.total_sales_usd, 'USD')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(closure.total_sales_bs, 'BS')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{closure.completed_orders}</span>
                          <span>/</span>
                          <span>{closure.total_orders}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          parseFloat(getSuccessRate(closure)) >= 90 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : parseFloat(getSuccessRate(closure)) >= 80
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {getSuccessRate(closure)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <button
                          onClick={() => {
                            if (expandedClosure === closure.id) {
                              setExpandedClosure(null)
                            } else {
                              setExpandedClosure(closure.id)
                              loadClosureDetails(closure.closure_date)
                            }
                          }}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedClosure === closure.id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-6 bg-gray-50 dark:bg-gray-700">
                          {loadingDetails[closure.closure_date] ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                              <span className="ml-3 text-gray-600 dark:text-gray-400">
                                Cargando detalles completos...
                              </span>
                            </div>
                          ) : closureDetails[closure.closure_date] ? (
                            <div className="space-y-6">
                              {/* Closure Summary */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                    <FileText className="w-5 h-5 mr-2" />
                                    Información del Cierre
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">ID:</span>
                                      <span className="font-mono text-gray-900 dark:text-white">
                                        {closure.id.slice(0, 8)}...
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                      <span className="text-gray-900 dark:text-white">
                                        {new Date(closure.closure_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Cerrado por:</span>
                                      <span className="text-gray-900 dark:text-white">{closure.closed_by_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Hora de cierre:</span>
                                      <span className="text-gray-900 dark:text-white">
                                        {new Date(closure.closed_at).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Tasa promedio:</span>
                                      <span className="text-gray-900 dark:text-white">
                                        {closure.exchange_rate_avg.toFixed(2)} Bs/$
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                    <DollarSign className="w-5 h-5 mr-2" />
                                    Resumen Financiero
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(closure.total_sales_usd, 'USD')}
                                      </div>
                                      <div className="text-xs text-green-600 dark:text-green-400">Total USD</div>
                                    </div>
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(closure.total_sales_bs, 'BS')}
                                      </div>
                                      <div className="text-xs text-blue-600 dark:text-blue-400">Total Bs.</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                        {closure.completed_orders}
                                      </div>
                                      <div className="text-xs text-purple-600 dark:text-purple-400">Completados</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                        {closure.cancelled_orders}
                                      </div>
                                      <div className="text-xs text-red-600 dark:text-red-400">Cancelados</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Product Summary */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                  <Package className="w-5 h-5 mr-2" />
                                  Resumen de Productos Vendidos ({closureDetails[closure.closure_date].productSummary.length})
                                </h4>
                                {closureDetails[closure.closure_date].productSummary.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                      <thead className="bg-gray-50 dark:bg-gray-600">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            Producto
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            Cantidad
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            Ingresos USD
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            Ingresos Bs.
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            Precio Prom.
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {closureDetails[closure.closure_date].productSummary.map((product, index) => (
                                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                              {product.product_name}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                                              {product.total_quantity}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                                              {formatCurrency(product.total_revenue_usd, 'USD')}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                                              {formatCurrency(product.total_revenue_bs, 'BS')}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                                              {formatCurrency(product.average_price, 'USD')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                    No hay productos vendidos
                                  </p>
                                )}
                              </div>

                              {/* All Sales Details */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                  <ShoppingBag className="w-5 h-5 mr-2" />
                                  Todas las Ventas del Día ({closureDetails[closure.closure_date].sales.length})
                                </h4>
                                <div className="space-y-3">
                                  {closureDetails[closure.closure_date].sales.map((sale) => (
                                    <div key={sale.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                      {/* Sale Header */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-4">
                                          <div className="flex items-center space-x-2">
                                            {sale.status === 'completed' ? (
                                              <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : sale.status === 'cancelled' ? (
                                              <XCircle className="w-5 h-5 text-red-500" />
                                            ) : (
                                              <Clock className="w-5 h-5 text-yellow-500" />
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-white">
                                              {sale.customer_name}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                            <User className="w-4 h-4" />
                                            <span>{sale.seller_name}</span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(sale.total_usd, 'USD')}
                                          </div>
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatCurrency(sale.total_bs, 'BS')}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {new Date(sale.created_at).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sale Items */}
                                      {sale.items.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Productos ({sale.items.length})
                                          </h5>
                                          <div className="space-y-2">
                                            {sale.items.map((item) => (
                                              <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className="flex-1">
                                                  <span className="font-medium text-gray-900 dark:text-white">
                                                    {item.product_name}
                                                  </span>
                                                  {item.custom_description && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                      {item.custom_description}
                                                    </div>
                                                  )}
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Cantidad: {item.quantity} × {formatCurrency(item.unit_price_usd, 'USD')}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-medium text-gray-900 dark:text-white">
                                                    {formatCurrency(item.total_price_usd, 'USD')}
                                                  </div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatCurrency(item.total_price_usd * sale.exchange_rate, 'BS')}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Notes */}
                              {closure.notes && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    Notas del Cierre
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {closure.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-gray-500 dark:text-gray-400">
                                No se pudieron cargar los detalles del cierre
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No hay cierres de caja
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || dateFilter || userFilter !== 'all' 
                ? 'No se encontraron cierres que coincidan con los filtros'
                : 'Aún no se han registrado cierres de caja'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CashClosureHistory