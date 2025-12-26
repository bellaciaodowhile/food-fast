import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../services/exchangeRate'
import Switch from './Switch'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Package,
  X
} from 'lucide-react'

// Define Product interface locally
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

// Define Category interface
interface Category {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_usd: '',
    category: '',
    image_url: '',
    is_active: true
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price_usd: parseFloat(formData.price_usd),
        category: formData.category,
        image_url: formData.image_url || null,
        is_active: formData.is_active
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData])
        
        if (error) throw error
      }

      setShowModal(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        price_usd: '',
        category: '',
        image_url: '',
        is_active: true
      })
      loadProducts()
      loadCategories()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price_usd: product.price_usd.toString(),
      category: product.category,
      image_url: product.image_url || '',
      is_active: product.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      loadProducts()
    } catch (error) {
      console.error('Error updating product status:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    const matchesStatus = !showActiveOnly || product.is_active
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const defaultCategories = ['Hamburguesas', 'Pizzas', 'Bebidas', 'Postres', 'Acompañantes', 'Otros']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Productos
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Administra el catálogo de productos
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Category Filter with Tags */}
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

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={showActiveOnly}
              onChange={setShowActiveOnly}
              label="Solo productos activos"
              size="sm"
            />
          </div>

          {/* Clear Filters */}
          {(selectedCategory !== 'all' || showActiveOnly || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setShowActiveOnly(false)
                setSearchTerm('')
              }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Filter Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {filteredProducts.length} de {products.length} productos
          {selectedCategory !== 'all' && ` en "${selectedCategory}"`}
          {showActiveOnly && ' (solo activos)'}
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-dark-700 flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(product.price_usd, 'USD')}
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>
                
                {/* Product Status Switch */}
                <div className="mb-3">
                  <Switch
                    checked={product.is_active}
                    onChange={() => toggleProductStatus(product)}
                    label={product.is_active ? 'Activo' : 'Inactivo'}
                    size="sm"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 btn-secondary flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="input-field"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Precio (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input-field"
                    value={formData.price_usd}
                    onChange={(e) => setFormData({ ...formData, price_usd: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Seleccionar categoría</option>
                    {defaultCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL de Imagen (opcional)
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                    Producto activo
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                      setFormData({
                        name: '',
                        description: '',
                        price_usd: '',
                        category: '',
                        image_url: '',
                        is_active: true
                      })
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {editingProduct ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products