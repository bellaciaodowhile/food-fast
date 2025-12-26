import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import NotificationCenter from './NotificationCenter'
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  LogOut,
  Moon,
  Sun,
  Utensils,
  Tag,
  ClipboardList,
  DollarSign,
  ChevronDown,
  ChevronRight,
  History
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const navigation = [
    { name: 'Dashboard', icon: Home, id: 'dashboard', roles: ['admin', 'seller', 'kitchen'] },
    { name: 'Productos', icon: Package, id: 'products', roles: ['admin'] },
    { name: 'Categorías', icon: Tag, id: 'categories', roles: ['admin'] },
    { name: 'Ventas', icon: ShoppingCart, id: 'sales', roles: ['admin', 'seller'] },
    { name: 'Pedidos', icon: ClipboardList, id: 'orders', roles: ['admin', 'seller', 'kitchen'] },
    { 
      name: 'Control de Caja', 
      icon: DollarSign, 
      id: 'cashcontrol', 
      roles: ['admin', 'seller'],
      subItems: [
        { name: 'Control Diario', id: 'cashcontrol' },
        { name: 'Historial de Cierres', id: 'cashhistory' }
      ]
    },
    { name: 'Usuarios', icon: Users, id: 'users', roles: ['admin'] },
    { name: 'Reportes', icon: BarChart3, id: 'reports', roles: ['admin'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  )

  const toggleSubMenu = (itemId: string) => {
    setExpandedMenu(expandedMenu === itemId ? null : itemId)
  }

  const renderMenuItem = (item: any, isMobile: boolean = false) => {
    const hasSubItems = item.subItems && item.subItems.length > 0
    const isExpanded = expandedMenu === item.id
    const isActive = currentPage === item.id || (hasSubItems && item.subItems.some((sub: any) => sub.id === currentPage))

    return (
      <div key={item.name}>
        <button
          onClick={() => {
            if (hasSubItems) {
              toggleSubMenu(item.id)
            } else {
              onPageChange(item.id)
              if (isMobile) setSidebarOpen(false)
            }
          }}
          className={`group flex items-center justify-between px-2 py-2 text-${isMobile ? 'base' : 'sm'} font-medium rounded-md w-full text-left ${
            isActive
              ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center">
            <item.icon className={`mr-${isMobile ? '4' : '3'} h-${isMobile ? '6' : '5'} w-${isMobile ? '6' : '5'}`} />
            {item.name}
          </div>
          {hasSubItems && (
            isExpanded ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
          )}
        </button>
        
        {hasSubItems && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {item.subItems.map((subItem: any) => (
              <button
                key={subItem.id}
                onClick={() => {
                  onPageChange(subItem.id)
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`group flex items-center px-2 py-2 text-${isMobile ? 'sm' : 'xs'} font-medium rounded-md w-full text-left ${
                  currentPage === subItem.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-300'
                }`}
              >
                <History className={`mr-2 h-4 w-4`} />
                {subItem.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-dark-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-dark-800 transition ease-in-out duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-between px-4 mb-5">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Fast Food</span>
              </div>
              <button
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="px-2 space-y-1">
              {filteredNavigation.map((item) => renderMenuItem(item, true))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Fast Food</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => renderMenuItem(item, false))}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-dark-700 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Top bar */}
        <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white capitalize">
                  {currentPage === 'dashboard' ? 'Panel Principal' : 
                   currentPage === 'products' ? 'Productos' :
                   currentPage === 'categories' ? 'Categorías' :
                   currentPage === 'sales' ? 'Ventas' :
                   currentPage === 'orders' ? 'Pedidos' :
                   currentPage === 'cashcontrol' ? 'Control de Caja' :
                   currentPage === 'cashhistory' ? 'Historial de Cierres' :
                   currentPage === 'users' ? 'Usuarios' :
                   currentPage === 'reports' ? 'Reportes' : currentPage}
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <NotificationCenter />
                
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout