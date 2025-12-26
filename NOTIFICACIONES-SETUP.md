# 🔔 Configuración del Sistema de Notificaciones

## 📋 Instrucciones de Configuración

### 1. Configurar Base de Datos

Ejecuta el siguiente SQL en tu panel de Supabase (SQL Editor):

```sql
-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  order_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Kitchen and admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'kitchen' OR users.role = 'admin')
    )
  );

-- Función para enviar notificaciones automáticamente
CREATE OR REPLACE FUNCTION notify_order_status_change(
  p_order_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id UUID;
  v_admin_id UUID;
BEGIN
  -- Obtener ID del vendedor del pedido
  SELECT seller_id INTO v_seller_id
  FROM sales
  WHERE id = p_order_id;

  -- Obtener ID del admin (primer admin encontrado)
  SELECT id INTO v_admin_id
  FROM users
  WHERE role = 'admin'
  LIMIT 1;

  -- Insertar notificación para el vendedor
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, order_id, created_by)
    VALUES (v_seller_id, p_title, p_message, p_type, p_order_id, auth.uid());
  END IF;

  -- Insertar notificación para el admin (si es diferente del vendedor)
  IF v_admin_id IS NOT NULL AND v_admin_id != v_seller_id THEN
    INSERT INTO notifications (user_id, title, message, type, order_id, created_by)
    VALUES (v_admin_id, p_title, p_message, p_type, p_order_id, auth.uid());
  END IF;
END;
$$;
```

### 2. Funcionalidades Implementadas

#### 🔔 **Notificaciones Web (Browser)**
- Solicita permisos automáticamente al abrir la app
- Notificaciones push nativas del navegador
- Se muestran incluso si la app está en segundo plano

#### 📱 **Centro de Notificaciones**
- Icono de campana en la barra superior
- Contador de notificaciones no leídas
- Dropdown con historial de notificaciones
- Marcar como leída individual o todas

#### ⚡ **Tiempo Real**
- Las notificaciones llegan instantáneamente
- Sincronización automática entre dispositivos
- Actualización en vivo del contador

### 3. Flujo de Notificaciones

#### 🍳 **Cuando Kitchen marca un pedido como "Listo":**
1. **Notificación Web**: Aparece en el navegador del vendedor y admin
2. **Notificación en App**: Se guarda en la base de datos
3. **Tiempo Real**: Se actualiza automáticamente en todos los dispositivos conectados

#### ❌ **Cuando Kitchen cancela un pedido:**
1. **Notificación Web**: Informa sobre la cancelación
2. **Notificación en App**: Se registra el motivo
3. **Tiempo Real**: Actualización inmediata

### 4. Destinatarios de Notificaciones

#### 📤 **Pedido Listo:**
- ✅ **Vendedor que tomó el pedido**
- ✅ **Administrador** (siempre)

#### 📤 **Pedido Cancelado:**
- ✅ **Vendedor que tomó el pedido**
- ✅ **Administrador** (siempre)

### 5. Tipos de Notificación

| Tipo | Icono | Descripción |
|------|-------|-------------|
| `success` | ✅ | Pedido listo para entregar |
| `error` | ❌ | Pedido cancelado |
| `warning` | ⚠️ | Advertencias |
| `info` | ℹ️ | Información general |

### 6. Permisos del Navegador

#### 🔐 **Estados de Permisos:**
- **`default`**: No se ha preguntado → Muestra banner
- **`granted`**: Permitido → Notificaciones funcionan
- **`denied`**: Bloqueado → Solo notificaciones en app

#### 📱 **Banner de Permisos:**
- Aparece automáticamente al abrir la app
- Se puede descartar temporalmente
- Se recuerda la decisión del usuario

### 7. Características Técnicas

#### 🔄 **Realtime Updates:**
- Usa Supabase Realtime para sincronización
- Escucha cambios en tabla `notifications`
- Actualización automática sin recargar página

#### 🎯 **Targeting Inteligente:**
- Solo notifica al vendedor específico del pedido
- Siempre incluye al administrador
- Evita notificaciones duplicadas

#### 📱 **Responsive Design:**
- Funciona en desktop y móvil
- Dropdown adaptativo
- Iconos y textos optimizados

### 8. Uso en Producción

#### ✅ **Para que funcione correctamente:**
1. Ejecutar el SQL en Supabase
2. Configurar permisos de notificación en el navegador
3. Tener usuarios con roles `kitchen`, `admin`, y `seller`
4. Probar el flujo completo: Kitchen → Pedido Listo → Notificación

#### 🔧 **Troubleshooting:**
- Si no llegan notificaciones web: Verificar permisos del navegador
- Si no aparecen en el centro: Verificar que la tabla `notifications` existe
- Si no hay tiempo real: Verificar configuración de Supabase Realtime

¡El sistema está listo para usar! 🎉