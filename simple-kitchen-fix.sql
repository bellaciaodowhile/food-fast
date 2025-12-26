-- =====================================================
-- SOLUCIÓN SIMPLE PARA ROL KITCHEN
-- =====================================================
-- Si el script anterior no funciona, ejecuta SOLO estas líneas:

-- Eliminar restricción existente
ALTER TABLE public.users DROP CONSTRAINT users_role_check;

-- Agregar nueva restricción
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'seller', 'kitchen'));

-- Verificar
SELECT 'Restricción actualizada correctamente' as mensaje;