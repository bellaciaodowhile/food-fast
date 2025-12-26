# 🔧 Solución al Error de Estado 'ready'

## ❌ **Error Actual:**
```
Error updating order status: {
  code: '23514', 
  message: 'new row for relation "sales" violates check constraint "sales_status_check"'
}
```

## 🎯 **Causa del Problema:**
La base de datos no reconoce el estado 'ready' porque el constraint de la tabla `sales` solo permite: `pending`, `completed`, `cancelled`.

## ✅ **Solución Rápida:**

### **Opción 1: Ejecutar SQL en Supabase (Recomendado)**

1. **Ir al panel de Supabase**
2. **Abrir SQL Editor**
3. **Ejecutar este SQL:**

```sql
-- Eliminar constraint existente
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;

-- Agregar nuevo constraint con estado 'ready'
ALTER TABLE sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('pending', 'ready', 'completed', 'cancelled'));

-- Agregar comentario de documentación
COMMENT ON COLUMN sales.status IS 'Order status: pending (created) → ready (kitchen finished) → completed (delivered to customer) | cancelled';
```

4. **Hacer clic en "Run"**
5. **Verificar que no hay errores**

### **Opción 2: Solución Temporal (Si no puedes ejecutar SQL)**

Si no puedes ejecutar el SQL ahora, puedes usar esta solución temporal:

1. **Cambiar Kitchen para que marque como 'completed'** (temporalmente)
2. **Ejecutar el SQL cuando sea posible**
3. **Volver al flujo correcto**

## 🧪 **Verificar que Funciona:**

Después de ejecutar el SQL:

1. **Kitchen**: Hacer clic en "Pedido Listo"
2. **Verificar**: Estado debe cambiar a "Listo para Entregar" (azul)
3. **Vendedor/Admin**: Debe ver botón "Entregar"
4. **Entregar**: Estado debe cambiar a "Entregado" (verde)

## 📋 **Estados Después de la Actualización:**

- 🟡 **pending** → Preparando (Kitchen puede marcar como listo)
- 🔵 **ready** → Listo para Entregar (Vendedor/Admin puede entregar)
- 🟢 **completed** → Entregado (Estado final)
- 🔴 **cancelled** → Cancelado (Estado final)

## 🔍 **Verificar Constraint Actual:**

Para ver el constraint actual, ejecuta:

```sql
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'sales'::regclass 
AND conname = 'sales_status_check';
```

## 🚨 **Si Sigue Fallando:**

Si después de ejecutar el SQL sigue dando error:

1. **Verificar que el SQL se ejecutó correctamente**
2. **Refrescar la página de la aplicación**
3. **Verificar en Supabase que el constraint se actualizó**
4. **Contactar si persiste el problema**

## 📝 **Nota Importante:**

Este error es normal cuando se agrega un nuevo estado a la base de datos. Una vez ejecutado el SQL, el sistema funcionará perfectamente con el nuevo flujo:

```
Crear pedido → [pending] → Kitchen: "Pedido Listo" → [ready] → Vendedor: "Entregar" → [completed]
```

¡Ejecuta el SQL y el sistema funcionará perfectamente! 🚀