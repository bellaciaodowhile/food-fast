# 🔔 Cómo Probar las Notificaciones

## 📋 Pasos para Probar

### 1. **Preparar el Entorno**
1. Abrir la aplicación en el navegador
2. **Permitir notificaciones** cuando aparezca el banner
3. Tener al menos 3 usuarios:
   - 1 Admin
   - 1 Kitchen 
   - 1 Seller

### 2. **Crear un Pedido de Prueba**
1. Iniciar sesión como **Seller** o **Admin**
2. Ir a **Ventas** → Crear nueva venta
3. Agregar productos y cliente
4. Completar la venta (esto crea un pedido pendiente)

### 3. **Probar Notificaciones desde Kitchen**
1. **Abrir otra pestaña/ventana** del navegador
2. Iniciar sesión como **Kitchen**
3. Ir a **Pedidos**
4. Encontrar el pedido pendiente
5. Hacer clic en **"Pedido Listo"**

### 4. **Verificar Notificaciones**
1. **En la consola del navegador** (F12) deberías ver:
   ```
   🔔 Enviando notificaciones para pedido: #12345
   📱 Enviando notificación web...
   🍽️ Preparando notificación de pedido listo: abc123...
   📝 Título: 🍽️ Pedido Listo para Entregar
   📝 Mensaje: Pedido #12345 de Juan está listo...
   🔔 Intentando mostrar notificación: 🍽️ Pedido Listo para Entregar
   📋 Permiso actual: granted
   ✨ Creando notificación...
   ✅ Notificación creada exitosamente
   ✅ Notificación web enviada
   ```

2. **Notificación del navegador** debería aparecer con:
   - Título: "🍽️ Pedido Listo para Entregar"
   - Mensaje: "Pedido #12345 de [Cliente] está listo. Vendedor: [Nombre]"

### 5. **Troubleshooting**

#### ❌ **Si no aparece la notificación:**

1. **Verificar permisos:**
   ```javascript
   // En consola del navegador:
   console.log('Permiso:', Notification.permission)
   ```
   - Debe ser `"granted"`
   - Si es `"denied"`, resetear permisos del sitio

2. **Verificar soporte:**
   ```javascript
   // En consola del navegador:
   console.log('Soportado:', 'Notification' in window)
   ```
   - Debe ser `true`

3. **Probar notificación manual:**
   ```javascript
   // En consola del navegador:
   new Notification('Prueba', { body: 'Esto es una prueba' })
   ```

#### ❌ **Si no aparecen los logs:**
- Verificar que estás logueado como **Kitchen**
- Verificar que el pedido está en estado **"Pendiente"**
- Verificar que hay datos del vendedor y cliente

#### ❌ **Si hay errores en consola:**
- Verificar que todos los imports están correctos
- Verificar que el hook `useNotifications` se está usando
- Verificar que el servicio `NotificationService` está funcionando

### 6. **Configuración del Navegador**

#### **Chrome/Edge:**
1. Ir a Configuración → Privacidad y seguridad → Configuración del sitio
2. Buscar "Notificaciones"
3. Verificar que el sitio tiene permisos

#### **Firefox:**
1. Hacer clic en el icono de candado en la barra de direcciones
2. Verificar permisos de notificaciones

#### **Safari:**
1. Safari → Preferencias → Sitios web → Notificaciones
2. Verificar permisos para el sitio

### 7. **Logs Esperados**

#### **Flujo Completo Exitoso:**
```
🔔 Enviando notificaciones para pedido: #12345
Estado: completed Cliente: Juan Pérez Vendedor: María González
📱 Enviando notificación web...
🍽️ Preparando notificación de pedido listo: abc123-def456-ghi789
📝 Título: 🍽️ Pedido Listo para Entregar
📝 Mensaje: Pedido #12345 de Juan Pérez está listo. Vendedor: María González
🔔 Intentando mostrar notificación: 🍽️ Pedido Listo para Entregar
📋 Permiso actual: granted
✨ Creando notificación...
✅ Notificación creada exitosamente
✅ Notificación web enviada
🔕 Notificación cerrada automáticamente (después de 5 segundos)
```

### 8. **Notas Importantes**

- ⏰ **Las notificaciones se cierran automáticamente** después de 5 segundos
- 🔄 **Solo funciona cuando Kitchen** marca como "Pedido Listo"
- 👥 **Funciona en múltiples pestañas** del mismo navegador
- 🌐 **Funciona incluso si la pestaña está en segundo plano**
- 📱 **Compatible con desktop y móvil** (donde el navegador lo soporte)

¡Sigue estos pasos y las notificaciones deberían funcionar perfectamente! 🎉