-- =====================================================
-- AGREGAR ROL "KITCHEN" A LA TABLA USERS
-- =====================================================

-- Eliminar la restricción existente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Agregar nueva restricción que incluye 'kitchen'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'seller', 'kitchen'));

-- Verificar que la restricción se aplicó correctamente
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_role_check';

-- Mensaje de confirmación
SELECT 'Rol kitchen agregado exitosamente a la tabla users' as status;