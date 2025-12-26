-- =====================================================
-- FAST FOOD SALES SYSTEM - CLEAN SETUP
-- =====================================================
-- This script handles existing objects gracefully

-- Drop existing objects if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing tables if they exist (uncomment if you want to start fresh)
-- DROP TABLE IF EXISTS public.sale_items CASCADE;
-- DROP TABLE IF EXISTS public.sales CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table (independent from auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Plain text for development only
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'seller', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
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
CREATE TABLE IF NOT EXISTS public.sales (
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
CREATE TABLE IF NOT EXISTS public.sale_items (
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
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
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

CREATE POLICY "Admins and kitchen can view all sales" ON public.sales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
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

CREATE POLICY "Admins and kitchen can view all sale items" ON public.sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
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
-- FUNCTIONS AND TRIGGERS
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
        -- User already exists, just return NEW
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SAMPLE DATA (only insert if table is empty)
-- =====================================================

-- Insert sample products only if the table is empty
INSERT INTO public.products (name, description, price_usd, category, image_url)
SELECT * FROM (VALUES
    ('Hamburguesa Clásica', 'Hamburguesa con carne, lechuga, tomate y queso', 8.50, 'Hamburguesas', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
    ('Hamburguesa Doble', 'Doble carne con queso, bacon y vegetales', 12.00, 'Hamburguesas', 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400'),
    ('Hamburguesa BBQ', 'Hamburguesa con salsa BBQ, cebolla caramelizada y queso cheddar', 10.50, 'Hamburguesas', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400'),
    ('Pizza Margherita', 'Pizza tradicional con tomate, mozzarella y albahaca', 15.00, 'Pizzas', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400'),
    ('Pizza Pepperoni', 'Pizza con pepperoni y queso mozzarella', 18.00, 'Pizzas', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'),
    ('Pizza Hawaiana', 'Pizza con jamón, piña y queso mozzarella', 16.50, 'Pizzas', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'),
    ('Coca Cola', 'Refresco de cola 500ml', 2.50, 'Bebidas', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400'),
    ('Pepsi', 'Refresco de cola 500ml', 2.50, 'Bebidas', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400'),
    ('Agua Mineral', 'Agua mineral natural 500ml', 1.50, 'Bebidas', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'),
    ('Jugo de Naranja', 'Jugo natural de naranja 400ml', 3.00, 'Bebidas', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400'),
    ('Papas Fritas', 'Papas fritas crujientes porción grande', 4.00, 'Acompañantes', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400'),
    ('Aros de Cebolla', 'Aros de cebolla empanizados y fritos', 4.50, 'Acompañantes', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400'),
    ('Nuggets de Pollo', '8 piezas de nuggets de pollo crujientes', 6.00, 'Acompañantes', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400'),
    ('Helado de Vainilla', 'Helado cremoso de vainilla', 3.50, 'Postres', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400'),
    ('Helado de Chocolate', 'Helado cremoso de chocolate', 3.50, 'Postres', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400'),
    ('Brownie', 'Brownie de chocolate con nueces', 4.00, 'Postres', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400')
) AS v(name, description, price_usd, category, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1);

-- Insert test users (sin kitchen por ahora)
INSERT INTO public.users (email, password, full_name, role) VALUES 
('admin@test.com', 'admin123', 'Administrador', 'admin'),
('seller@test.com', 'seller123', 'Vendedor', 'seller')
ON CONFLICT (email) DO UPDATE SET 
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Nota: El usuario kitchen se debe crear después de ejecutar fix-kitchen-role-constraint.sql

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products', 'sales', 'sale_items');

-- Verify sample data
SELECT 'Sample products inserted: ' || COUNT(*) as products_count FROM public.products;

-- =====================================================
-- NEXT STEPS
-- =====================================================

/*
INSTRUCCIONES POST-INSTALACIÓN:

1. Ve a Authentication > Users en tu panel de Supabase

2. Crea los siguientes usuarios:

   ADMINISTRADOR:
   - Email: admin@test.com
   - Password: admin123
   - User Metadata (JSON):
   {
     "full_name": "Administrador",
     "role": "admin"
   }

   VENDEDOR:
   - Email: seller@test.com
   - Password: seller123
   - User Metadata (JSON):
   {
     "full_name": "Vendedor",
     "role": "seller"
   }

   COCINA:
   - Email: kitchen@test.com
   - Password: kitchen123
   - User Metadata (JSON):
   {
     "full_name": "Cocina",
     "role": "kitchen"
   }

3. Configura tu archivo .env:
   VITE_SUPABASE_URL=tu_url_aqui
   VITE_SUPABASE_ANON_KEY=tu_clave_aqui

4. ¡Listo! Ya puedes usar el sistema.

Si tienes problemas, revisa el archivo troubleshooting.sql
*/