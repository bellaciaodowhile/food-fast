// Database types for the Fast Food Sales System

export interface User {
  id: string
  email: string
  role: 'admin' | 'seller'
  full_name: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  price_usd: number
  image_url?: string
  category: string
  is_active: boolean
  created_at: string
}

export interface Sale {
  id: string
  seller_id: string
  total_usd: number
  total_bs: number
  exchange_rate: number
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  sale_items?: SaleItem[]
  users?: { full_name: string }
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price_usd: number
  total_price_usd: number
  products?: Product
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface DashboardStats {
  totalSales: number
  totalSalesBS: number
  todaySales: number
  totalProducts: number
  totalUsers: number
  exchangeRate: number
}

export interface ExchangeRateResponse {
  fecha: string
  promedio: number
  compra: number
  venta: number
}