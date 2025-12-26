import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Define our custom User interface
interface User {
  id: string
  email: string
  role: 'admin' | 'seller' | 'kitchen'
  full_name: string
  created_at: string
}

// Define Supabase User type manually to avoid import issues
interface SupabaseUser {
  id: string
  email?: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isSeller: boolean
  isKitchen: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay una sesión guardada en localStorage
    const savedUser = localStorage.getItem('fast-food-user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setSupabaseUser({ id: userData.id, email: userData.email })
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('fast-food-user')
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with:', email)
      
      // Verificar credenciales contra nuestra tabla de usuarios
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .eq('password', password.trim()) // Nota: En producción deberías usar hash de contraseñas
        .single()
      
      if (error || !userData) {
        console.error('Sign in error:', error)
        return { error: { message: 'Credenciales inválidas' } }
      }
      
      console.log('Sign in successful:', userData)
      
      // Establecer el usuario autenticado
      setUser(userData)
      setSupabaseUser({ id: userData.id, email: userData.email })
      
      // Guardar sesión en localStorage
      localStorage.setItem('fast-food-user', JSON.stringify(userData))
      
      return { error: null }
    } catch (err) {
      console.error('Sign in exception:', err)
      return { error: { message: 'Error de conexión' } }
    }
  }

  const signOut = async () => {
    // Limpiar estado local
    setUser(null)
    setSupabaseUser(null)
    
    // Limpiar localStorage
    localStorage.removeItem('fast-food-user')
  }

  const isAdmin = user?.role === 'admin'
  const isSeller = user?.role === 'seller'
  const isKitchen = user?.role === 'kitchen'

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
    isAdmin,
    isSeller,
    isKitchen,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}