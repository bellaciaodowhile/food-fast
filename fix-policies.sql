-- =====================================================
-- CORRECCIÓN DE POLÍTICAS RLS - SIN RECURSIÓN
-- =====================================================

-- Eliminar todas las políticas problemáticas
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

-- =====================================================
-- POLÍTICAS CORREGIDAS SIN RECURSIÓN
-- =====================================================

-- USERS: Políticas simplificadas sin recursión
CREATE POLICY "Enable read access for authenticated users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- PRODUCTS: Acceso completo para usuarios autenticados
CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

-- SALES: Acceso completo para usuarios autenticados
CREATE POLICY "Enable read access for authenticated users" ON public.sales
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.sales
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.sales
    FOR UPDATE USING (auth.role() = 'authenticated');

-- SALE_ITEMS: Acceso completo para usuarios autenticados
CREATE POLICY "Enable read access for authenticated users" ON public.sale_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.sale_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.sale_items
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'Policies fixed successfully' as status;

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;