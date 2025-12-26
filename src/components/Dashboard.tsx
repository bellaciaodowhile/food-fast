import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getExchangeRate, formatCurrency } from '../services/exchangeRate'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Users,
  RefreshCw,
  Settings,
  Database,
  Clock
} from 'lucide-react'

interface DashboardStats {
  totalSales: number
  totalSalesBS: number
  todaySales: number
  totalProducts: number
  totalUsers: number
  exchangeRate: number
  pendingOrders: number
}

interface DashboardProps {
  onPageChange: (page: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalSalesBS: 0,
    todaySales: 0,
    totalProducts: 0,
    totalUsers: 0,
    exchangeRate: 0,
    pendingOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshingRate, setRefreshingRate] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Realtime updates for dashboard stats
  const reloadDashboard = useCallback(() => {
    loadDashboardData()
  }, [])

  useRealtime('sales', reloadDashboard)

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Get exchange rate (todos pueden ver)
      const rate = await getExchangeRate()
      
      // Get pending orders count (todos pueden ver)
      const { count: pendingOrdersCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      let totalSales = 0
      let totalSalesBS = 0
      let productsCount = 0
      let usersCount = 0

      // Solo cargar datos adicionales para administradores
      if (isAdmin) {
        // Get sales data (solo admin)
        const { data: sales } = await supabase
          .from('sales')
          .select('total_usd, total_bs, created_at')
          .eq('status', 'completed')

        // Get products count (solo admin)
        const { count: productsCountResult } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)

        // Get users count (solo admin)
        const { count: usersCountResult } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })

        totalSales = sales?.reduce((sum, sale) => sum + sale.total_usd, 0) || 0
        totalSalesBS = sales?.reduce((sum, sale) => sum + sale.total_bs, 0) || 0
        productsCount = productsCountResult || 0
        usersCount = usersCountResult || 0
      }

      setStats({
        totalSales,
        totalSalesBS,
        todaySales: 0, // No se usa más
        totalProducts: productsCount,
        totalUsers: usersCount,
        exchangeRate: rate,
        pendingOrders: pendingOrdersCount || 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshExchangeRate = async () => {
    setRefreshingRate(true)
    try {
      const rate = await getExchangeRate()
      setStats(prev => ({ ...prev, exchangeRate: rate }))
    } catch (error) {
      console.error('Error refreshing exchange rate:', error)
    } finally {
      setRefreshingRate(false)
    }
  }

  // Quick Actions Component
  const QuickActionsSection = () => (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Acciones Rápidas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button 
          onClick={() => onPageChange('sales')}
          className="btn-primary text-left p-4 h-auto hover:bg-primary-700 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 mb-2" />
          <div>
            <p className="font-medium">Nueva Venta</p>
            <p className="text-sm opacity-90">Registrar una nueva venta</p>
          </div>
        </button>
        
        <button 
          onClick={() => onPageChange('orders')}
          className="btn-secondary text-left p-4 h-auto hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors"
        >
          <Settings className="w-5 h-5 mb-2" />
          <div>
            <p className="font-medium">Ver Pedidos</p>
            <p className="text-sm opacity-75">
              {isAdmin ? 'Gestionar todos los pedidos' : 'Ver mis pedidos'}
            </p>
          </div>
        </button>

        <button 
          onClick={refreshExchangeRate}
          disabled={refreshingRate}
          className="btn-secondary text-left p-4 h-auto hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 mb-2 ${refreshingRate ? 'animate-spin' : ''}`} />
          <div>
            <p className="font-medium">Actualizar Tasa</p>
            <p className="text-sm opacity-75">Refrescar tipo de cambio USD/BS</p>
          </div>
        </button>
        
        {isAdmin && (
          <>
            <button 
              onClick={() => onPageChange('products')}
              className="btn-secondary text-left p-4 h-auto hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors"
            >
              <Database className="w-5 h-5 mb-2" />
              <div>
                <p className="font-medium">Gestionar Productos</p>
                <p className="text-sm opacity-75">Agregar o editar productos</p>
              </div>
            </button>
            
            <button 
              onClick={() => onPageChange('categories')}
              className="btn-secondary text-left p-4 h-auto hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors"
            >
              <Settings className="w-5 h-5 mb-2" />
              <div>
                <p className="font-medium">Gestionar Categorías</p>
                <p className="text-sm opacity-75">Organizar productos por categorías</p>
              </div>
            </button>
            
            <button 
              onClick={() => onPageChange('users')}
              className="btn-secondary text-left p-4 h-auto hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors"
            >
              <Users className="w-5 h-5 mb-2" />
              <div>
                <p className="font-medium">Gestionar Usuarios</p>
                <p className="text-sm opacity-75">Administrar vendedores y admins</p>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  )

  // Funciones de diagnóstico (solo para admin)
  const testAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        alert(`Error de autenticación: ${error.message}`)
      } else {
        alert(`Estado de auth: ${user ? 'Autenticado como ' + user.email : 'No autenticado'}`)
      }
    } catch (err) {
      alert('Error de prueba de auth: ' + err)
    }
  }

  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price_usd')
        .eq('is_active', true)
        .limit(3)
      
      if (error) {
        alert(`Error de conexión: ${error.message}\nCódigo: ${error.code}`)
      } else {
        alert(`¡Conexión exitosa! Productos encontrados: ${data?.length || 0}`)
      }
    } catch (err) {
      alert('Error de prueba: ' + err)
    }
  }

  const statCards = [
    // Cards que todos pueden ver
    {
      title: 'Tasa de Cambio USD/BS',
      value: `${stats.exchangeRate.toFixed(2)} BS`,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    }
  ]

  // Cards adicionales solo para administradores
  if (isAdmin) {
    statCards.push(
      {
        title: 'Ventas Totales (USD)',
        value: formatCurrency(stats.totalSales, 'USD'),
        icon: TrendingUp,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20'
      },
      {
        title: 'Ventas Totales (BS)',
        value: formatCurrency(stats.totalSalesBS, 'BS'),
        icon: TrendingUp,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20'
      },
      {
        title: 'Productos Activos',
        value: stats.totalProducts.toString(),
        icon: ShoppingCart,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20'
      },
      {
        title: 'Total Usuarios',
        value: stats.totalUsers.toString(),
        icon: Users,
        color: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
      }
    )
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
      {/* Welcome message */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¡Bienvenido, {user?.full_name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isAdmin 
            ? 'Aquí tienes un resumen completo de tu sistema de ventas'
            : 'Aquí puedes gestionar tus pedidos y ver la información del día'
          }
        </p>
      </div>

      {/* Exchange rate card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tasa de Cambio USD/BS
            </h3>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-2">
              {stats.exchangeRate.toFixed(2)} BS
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Fuente: DolarAPI Venezuela
            </p>
          </div>
          <button
            onClick={refreshExchangeRate}
            disabled={refreshingRate}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingRate ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Quick actions for sellers - positioned right after exchange rate */}
      {!isAdmin && <QuickActionsSection />}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions for admins - positioned after stats grid */}
      {isAdmin && <QuickActionsSection />}

      {/* Admin diagnostic tools */}
      {isAdmin && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Herramientas de Administrador
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={testAuth}
              className="btn-secondary text-left p-4 h-auto"
            >
              <Database className="w-5 h-5 mb-2" />
              <div>
                <p className="font-medium">Probar Autenticación</p>
                <p className="text-sm opacity-75">Verificar estado de auth</p>
              </div>
            </button>
            
            <button 
              onClick={testConnection}
              className="btn-secondary text-left p-4 h-auto"
            >
              <Database className="w-5 h-5 mb-2" />
              <div>
                <p className="font-medium">Probar Conexión BD</p>
                <p className="text-sm opacity-75">Verificar acceso a productos</p>
              </div>
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p>Herramientas de diagnóstico para solucionar problemas de conexión</p>
            <p>URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 50) || 'No configurada'}...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard