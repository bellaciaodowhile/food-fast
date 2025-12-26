import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { EventProvider } from './contexts/EventContext'
import { ToastProvider } from './contexts/ToastContext'
import { OrderReadyToastProvider } from './contexts/OrderReadyToastContext'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Products from './components/Products'
import Categories from './components/Categories'
import Sales from './components/Sales'
import Orders from './components/Orders'
import CashControl from './components/CashControl'
import CashClosureHistory from './components/CashClosureHistory'
import Users from './components/Users'
import NotificationPermission from './components/NotificationPermission'
import './index.css'

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />
      case 'products':
        return <Products />
      case 'categories':
        return <Categories />
      case 'sales':
        return <Sales />
      case 'orders':
        return <Orders />
      case 'cashcontrol':
        return <CashControl />
      case 'cashhistory':
        return <CashClosureHistory />
      case 'users':
        return <Users />
      case 'reports':
        return <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Reportes y Análisis
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Esta funcionalidad estará disponible próximamente
          </p>
        </div>
      default:
        return <Dashboard onPageChange={setCurrentPage} />
    }
  }

  const handleGoToOrder = (orderId: string) => {
    // Cambiar a la página de pedidos
    setCurrentPage('orders')
    // Aquí podrías agregar lógica adicional para resaltar el pedido específico
    console.log('Navegando al pedido:', orderId)
  }

  return (
    <OrderReadyToastProvider onGoToOrder={handleGoToOrder} userRole={user?.role}>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        <NotificationPermission />
        {renderPage()}
      </Layout>
    </OrderReadyToastProvider>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EventProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </EventProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App