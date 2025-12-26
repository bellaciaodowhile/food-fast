-- =====================================================
-- RESET COMPLETO DE BASE DE DATOS
-- =====================================================
-- ADVERTENCIA: Esto eliminará TODOS los datos existentes

-- Deshabilitar RLS temporalmente
ALTER TABLE IF EXISTS public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view their sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can view all sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can create sale items for their sales" ON public.sale_items;

-- Eliminar triggers y funciones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Eliminar tablas en orden correcto (respetando foreign keys)
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- RECREAR ESTRUCTURA COMPLETA
-- =====================================================

-- Create users table (independent from auth.users)
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'seller')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
    image_url TEXT,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT,
    total_usd DECIMAL(10,2) NOT NULL CHECK (total_usd > 0),
    total_bs DECIMAL(15,2) NOT NULL CHECK (total_bs > 0),
    exchange_rate DECIMAL(10,4) NOT NULL CHECK (exchange_rate > 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_usd DECIMAL(10,2) NOT NULL CHECK (unit_price_usd > 0),
    total_price_usd DECIMAL(10,2) NOT NULL CHECK (total_price_usd > 0),
    custom_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONFIGURAR RLS Y POLÍTICAS
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Products policies
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all products" ON public.products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sales policies
CREATE POLICY "Users can view their own sales" ON public.sales
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Admins can view all sales" ON public.sales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create sales" ON public.sales
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admins can update sales" ON public.sales
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sale items policies
CREATE POLICY "Users can view their sale items" ON public.sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales 
            WHERE id = sale_id AND seller_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all sale items" ON public.sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create sale items for their sales" ON public.sale_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales 
            WHERE id = sale_id AND seller_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'seller')
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Insert sample products
INSERT INTO public.products (name, description, price_usd, category, image_url) VALUES
('Hamburguesa Clásica', 'Hamburguesa con carne, lechuga, tomate y queso', 8.50, 'Hamburguesas', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
('Hamburguesa Doble', 'Doble carne con queso, bacon y vegetales', 12.00, 'Hamburguesas', 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400'),
('Pizza Margherita', 'Pizza tradicional con tomate, mozzarella y albahaca', 15.00, 'Pizzas', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400'),
('Coca Cola', 'Refresco de cola 500ml', 2.50, 'Bebidas', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400'),
('Papas Fritas', 'Papas fritas crujientes porción grande', 4.00, 'Acompañantes', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400');

-- Insert test users
INSERT INTO public.users (email, password, full_name, role) VALUES 
('admin@test.com', 'admin123', 'Administrador', 'admin'),
('seller@test.com', 'seller123', 'Vendedor', 'seller')
ON CONFLICT (email) DO UPDATE SET 
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 'Reset completed successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products', 'sales', 'sale_items');