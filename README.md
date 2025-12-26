# 🍔 Fast Food Sales System

Sistema completo de control de ventas para restaurantes de comida rápida desarrollado con **React.js** y **Supabase**, con conversión automática de moneda USD/BS usando la API oficial del dólar venezolano.

## ✨ Características Principales

### 🔐 **Sistema de Autenticación y Roles**
- **Administrador**: Control total del sistema, gestión de productos, usuarios y reportes
- **Vendedor**: Interfaz optimizada para ventas rápidas y gestión de pedidos

### 🛒 **Gestión de Ventas**
- Carrito de compras intuitivo con cálculo automático
- Conversión en tiempo real USD ↔ BS
- Sistema de pedidos con estados (pendiente, completado, cancelado)
- Acciones rápidas para vendedores

### 📦 **Gestión de Productos**
- CRUD completo de productos con categorías
- Imágenes de productos con URLs externas
- Control de inventario activo/inactivo
- Categorización automática

### 💰 **Conversión de Moneda**
- Integración con **DolarAPI Venezuela** para tasa oficial
- Actualización manual con botón de refresh
- Cálculo automático en ambas monedas
- Fallback en caso de error de API

### 🎨 **Interfaz de Usuario**
- **Tema Oscuro/Claro**: Cambio automático según preferencias
- **Diseño Responsive**: Optimizado para móviles y desktop
- **Acciones Rápidas**: Dashboard funcional con navegación directa
- **Menú Móvil**: Navegación optimizada para dispositivos táctiles

## 🛠️ Stack Tecnológico

- **Frontend**: React.js + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Iconos**: Lucide React
- **API Externa**: DolarAPI Venezuela
- **Despliegue**: Vercel/Netlify ready

## 🚀 Instalación y Configuración

### 1. **Clonar el Repositorio**
```bash
git clone <repository-url>
cd fast-food-sales
```

### 2. **Instalar Dependencias**
```bash
npm install
```

### 3. **Configurar Supabase**

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ir al **SQL Editor** y ejecutar el archivo `supabase-setup-clean.sql`
3. Obtener la URL del proyecto y la clave anónima desde **Settings > API**

### 4. **Variables de Entorno**
Crear archivo `.env` en la raíz:
```env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-aqui
```

### 5. **Crear Usuarios de Prueba**

En **Authentication > Users** de Supabase:

**👨‍💼 Administrador:**
- Email: `admin@test.com`
- Password: `admin123`
- User Metadata:
```json
{
  "full_name": "Administrador",
  "role": "admin"
}
```

**👤 Vendedor:**
- Email: `seller@test.com`
- Password: `seller123`
- User Metadata:
```json
{
  "full_name": "Vendedor",
  "role": "seller"
}
```

### 6. **Ejecutar la Aplicación**
```bash
npm run dev
```

## 👥 Roles y Permisos

### 👨‍💼 **Administrador**
- ✅ Dashboard completo con estadísticas avanzadas
- ✅ Gestión de productos (crear, editar, eliminar)
- ✅ Gestión de categorías y organización
- ✅ Administración de usuarios del sistema
- ✅ Ver todas las ventas y reportes
- ✅ Aprobar/rechazar pedidos pendientes
- ✅ Herramientas de diagnóstico del sistema

### 👤 **Vendedor**
- ✅ Dashboard optimizado con acciones rápidas
- ✅ Sistema de ventas con carrito intuitivo
- ✅ Ver historial de pedidos propios
- ✅ Actualizar tasa de cambio
- ✅ Gestión de pedidos pendientes
- ❌ No puede gestionar productos ni usuarios

## 🏗️ Arquitectura del Proyecto

```
fast-food-sales/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Dashboard.tsx    # Panel principal con acciones rápidas
│   │   ├── Layout.tsx       # Layout principal con navegación
│   │   ├── Login.tsx        # Autenticación de usuarios
│   │   ├── Products.tsx     # Gestión de productos (admin)
│   │   ├── Categories.tsx   # Gestión de categorías (admin)
│   │   ├── Sales.tsx        # Sistema de ventas con carrito
│   │   ├── Orders.tsx       # Gestión de pedidos
│   │   ├── Users.tsx        # Administración de usuarios (admin)
│   │   └── Switch.tsx       # Componente de switch reutilizable
│   ├── contexts/            # Contextos React
│   │   ├── AuthContext.tsx  # Contexto de autenticación
│   │   └── ThemeContext.tsx # Contexto de tema oscuro/claro
│   ├── hooks/               # Hooks personalizados
│   │   └── useRealtime.ts   # Hook para actualizaciones en tiempo real
│   ├── lib/                 # Configuraciones
│   │   └── supabase.ts      # Cliente de Supabase
│   ├── services/            # Servicios externos
│   │   └── exchangeRate.ts  # Servicio de tasa de cambio
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
├── supabase-setup-clean.sql # Script de configuración de BD
├── tailwind.config.js       # Configuración de Tailwind
├── vercel.json             # Configuración de despliegue
└── README.md               # Este archivo
```

## 🎯 Funcionalidades Destacadas

### ⚡ **Acciones Rápidas**
- **Vendedores**: Acciones prominentes justo después de la tasa de cambio
- **Administradores**: Acciones completas después de revisar estadísticas
- **Navegación directa** a secciones principales
- **Actualización de tasa** con un clic

### 📱 **Diseño Responsive**
- **Menú móvil** con navegación optimizada
- **Grid adaptativo** que se ajusta al dispositivo
- **Botones táctiles** optimizados para móviles
- **Tema automático** según preferencias del sistema

### 🔄 **Tiempo Real**
- **Actualizaciones automáticas** de estadísticas para administradores
- **Sincronización** de pedidos entre usuarios
- **Estados en vivo** de productos y ventas

### 🛡️ **Seguridad**
- **Row Level Security (RLS)** en todas las tablas
- **Políticas granulares** por rol de usuario
- **Autenticación JWT** con Supabase
- **Validación** tanto en frontend como backend

## 🚀 Despliegue

### **Vercel (Recomendado)**
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Despliegue automático

### **Netlify**
1. Conectar repositorio a Netlify
2. Comando de build: `npm run build`
3. Directorio de publicación: `dist`
4. Configurar variables de entorno

## 🔧 Configuración Avanzada

### **Base de Datos**
- **PostgreSQL** con Supabase
- **Políticas RLS** para seguridad
- **Triggers** para sincronización de usuarios
- **Índices optimizados** para consultas rápidas

### **API Externa**
- **DolarAPI**: `https://ve.dolarapi.com/v1/dolares/oficial`
- **Manejo de errores** con fallback
- **Cache local** para mejor rendimiento

## 🆘 Solución de Problemas

### **Error de Conexión**
- Verificar variables de entorno en `.env`
- Comprobar URL y clave de Supabase
- Revisar configuración de RLS

### **Problemas de Login**
- Verificar que los usuarios tengan roles correctos
- Comprobar User Metadata en Supabase
- Revisar políticas de seguridad

### **Tasa de Cambio No Funciona**
- API externa puede estar caída
- Usar botón "Actualizar Tasa"
- Verificar conexión a internet

### **Productos No Aparecen**
- Ejecutar script SQL completo
- Verificar que productos estén activos
- Comprobar permisos de usuario

## 🔮 Roadmap

- [ ] **Módulo de Reportes Avanzados**
- [ ] **Notificaciones Push en Tiempo Real**
- [ ] **Integración con Sistemas de Pago**
- [ ] **App Móvil con React Native**
- [ ] **Exportación de Datos (PDF/Excel)**
- [ ] **Dashboard de Analytics Avanzado**
- [ ] **Sistema de Inventario Automático**
- [ ] **Integración con APIs de Delivery**

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para problemas o preguntas:
- Revisar la documentación de [Supabase](https://supabase.com/docs)
- Verificar que DolarAPI esté funcionando
- Comprobar configuración de variables de entorno
- Revisar logs de la consola del navegador

---

**Desarrollado con ❤️ para optimizar la gestión de ventas en restaurantes de comida rápida**

*Sistema completo, seguro y escalable para el control total de tu negocio.*