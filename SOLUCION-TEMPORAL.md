# 🔧 Solución Temporal al Error 'ready'

## 🎯 **Problema:**
La base de datos no reconoce el estado 'ready' y da error al intentar actualizar.

## ✅ **Solución Inmediata:**

### **Ejecutar este SQL en Supabase:**

1. **Ir a Supabase Dashboard**
2. **SQL Editor**
3. **Ejecutar:**

```sql 
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('pending', 'ready', 'completed', 'cancelled'));
```

## 🚀 **Después del SQL:**

1. **Refrescar la aplicación**
2. **Probar Kitchen → "Pedido Listo"**
3. **Debe cambiar a estado "Listo para Entregar" (azul)**
4. **Vendedor puede hacer clic "Entregar"**

## 📋 **Flujo Correcto:**
```
pending → Kitchen: "Pedido Listo" → ready → Vendedor: "Entregar" → completed
```

¡Ejecuta el SQL y funcionará perfectamente! 🎉