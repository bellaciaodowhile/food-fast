-- =====================================================
-- SOLUCIÓN PARA AGREGAR ROL KITCHEN
-- =====================================================
-- Ejecuta este script COMPLETO en tu base de datos Supabase

-- PASO 1: Eliminar la restricción existente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- PASO 2: Agregar nueva restricción que incluye 'kitchen'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'seller', 'kitchen'));

-- PASO 3: Verificar que la restricción se aplicó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_role_check';

-- PASO 4: Ahora insertar el usuario kitchen (ya no debería dar error)
INSERT INTO public.users (email, password, full_name, role) VALUES 
('kitchen@test.com', 'kitchen123', 'Cocina', 'kitchen')
ON CONFLICT (email) DO UPDATE SET 
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- PASO 5: Verificar que el usuario se creó correctamente
SELECT email, full_name, role, created_at 
FROM public.users 
WHERE role = 'kitchen';

-- PASO 6: Mensaje de confirmación
SELECT 'Rol kitchen agregado exitosamente. Ya puedes crear usuarios con rol kitchen desde la interfaz.' as status;