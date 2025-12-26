-- =====================================================
-- DIAGNÓSTICO DE BASE DE DATOS
-- =====================================================

-- 1. Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products', 'sales', 'sale_items');

-- 2. Verificar estructura de la tabla products
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla sales
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar estructura de la tabla sale_items
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sale_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- 6. Verificar si hay datos de prueba
SELECT 'products' as table_name, COUNT(*) as count FROM public.products
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'sales' as table_name, COUNT(*) as count FROM public.sales;