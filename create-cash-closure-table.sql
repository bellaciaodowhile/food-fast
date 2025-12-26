-- =====================================================
-- CASH CLOSURE REGISTRY TABLE
-- =====================================================
-- Tabla para registrar los cierres de caja diarios

-- Create cash_closures table
CREATE TABLE IF NOT EXISTS public.cash_closures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    closure_date DATE NOT NULL,
    closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    total_sales_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_sales_bs DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    completed_orders INTEGER NOT NULL DEFAULT 0,
    cancelled_orders INTEGER NOT NULL DEFAULT 0,
    pending_orders INTEGER NOT NULL DEFAULT 0,
    exchange_rate_avg DECIMAL(10,4) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view cash closures" ON public.cash_closures;
DROP POLICY IF EXISTS "Admins can view all cash closures" ON public.cash_closures;
DROP POLICY IF EXISTS "Users can create cash closures" ON public.cash_closures;

-- RLS Policies
-- Users can view their own cash closures
CREATE POLICY "Users can view their own cash closures" ON public.cash_closures
    FOR SELECT USING (closed_by = auth.uid());

-- Admins can view all cash closures
CREATE POLICY "Admins can view all cash closures" ON public.cash_closures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create cash closures
CREATE POLICY "Users can create cash closures" ON public.cash_closures
    FOR INSERT WITH CHECK (closed_by = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cash_closures_date ON public.cash_closures(closure_date);
CREATE INDEX IF NOT EXISTS idx_cash_closures_closed_by ON public.cash_closures(closed_by);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify table was created
SELECT 'Cash closures table created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'cash_closures';

/*
INSTRUCCIONES:

1. Ejecuta este script en tu panel de Supabase (SQL Editor)

2. La tabla cash_closures registrará:
   - Fecha del cierre
   - Quién cerró la caja (usuario)
   - Cuándo se cerró (timestamp)
   - Resumen financiero del día
   - Notas opcionales

3. Políticas de seguridad:
   - Vendedores ven solo sus cierres
   - Admins ven todos los cierres
   - Solo el usuario autenticado puede crear cierres

4. ¡Listo para usar en el Control de Caja!
*/