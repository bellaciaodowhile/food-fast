# 🔐 Guía de Seguridad - Fast Food Sales System

## ✅ **Protección de Datos Sensibles Implementada**

### 🎯 **Archivos Protegidos**

#### **🔒 Variables de Entorno (.env)**
```bash
# ❌ NUNCA subir a GitHub
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

#### **🔑 Credenciales y Configuraciones**
```bash
# ❌ NUNCA subir a GitHub
config.json
secrets.json
credentials.json
*.db
*.sqlite
```

#### **📁 Directorios Sensibles**
```bash
# ❌ NUNCA subir a GitHub
.supabase/          # Configuración local de Supabase
build/              # Archivos compilados
.vercel/            # Configuración de deployment
node_modules/       # Dependencias
```

---

## 🛡️ **Configuración de Seguridad**

### **📋 .gitignore Mejorado**
```gitignore
# Environment variables and sensitive data
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*.local

# Database and API keys
*.db
*.sqlite
*.sqlite3
config.json
secrets.json
credentials.json

# Supabase local development
.supabase/
```

### **📄 .env.example Creado**
```bash
# Archivo de ejemplo para otros desarrolladores
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

---

## 🚀 **Mejores Prácticas de Seguridad**

### **1. 🔐 Variables de Entorno**

#### **✅ Hacer:**
- Usar `.env` para datos sensibles
- Crear `.env.example` como plantilla
- Diferentes archivos para cada entorno
- Validar variables en el código

#### **❌ Nunca Hacer:**
- Subir `.env` a GitHub
- Hardcodear credenciales en el código
- Compartir credenciales por chat/email
- Usar las mismas credenciales en producción y desarrollo

### **2. 🔑 Credenciales de Supabase**

#### **✅ Configuración Segura:**
```typescript
// ✅ Correcto - usando variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ❌ Incorrecto - hardcodeado
const supabaseUrl = "https://abc123.supabase.co"
```

#### **🔒 Niveles de Seguridad:**
- **Desarrollo**: Proyecto separado de Supabase
- **Producción**: Proyecto diferente con RLS habilitado
- **Testing**: Base de datos temporal

### **3. 📊 Row Level Security (RLS)**

#### **✅ Políticas Implementadas:**
```sql
-- Usuarios solo ven sus datos
CREATE POLICY "Users see own data" ON sales
FOR SELECT USING (seller_id = auth.uid());

-- Admins ven todo
CREATE POLICY "Admins see all" ON sales  
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

### **4. 🌐 Deployment Seguro**

#### **✅ Vercel/Netlify:**
- Variables de entorno en el dashboard
- Diferentes valores por entorno
- Regenerar claves periódicamente

#### **✅ Variables de Producción:**
```bash
# En el dashboard de Vercel/Netlify
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=clave_de_produccion_diferente
```

---

## 🔍 **Verificación de Seguridad**

### **✅ Checklist de Seguridad:**

#### **Archivos:**
- [ ] `.env` está en `.gitignore`
- [ ] `.env.example` existe como plantilla
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Archivos de base de datos están excluidos

#### **Supabase:**
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas de seguridad configuradas
- [ ] Diferentes proyectos para dev/prod
- [ ] Claves rotadas regularmente

#### **Deployment:**
- [ ] Variables de entorno configuradas en el hosting
- [ ] HTTPS habilitado
- [ ] Dominio personalizado (opcional)
- [ ] Monitoreo de accesos

---

## 🚨 **Qué Hacer si se Comprometen las Credenciales**

### **1. 🔄 Regenerar Inmediatamente**
```bash
1. Ve a Supabase Dashboard
2. Settings > API
3. Regenerar claves
4. Actualizar en todas las aplicaciones
5. Revocar accesos antiguos
```

### **2. 🔍 Auditar Accesos**
```bash
1. Revisar logs de Supabase
2. Verificar usuarios creados
3. Comprobar cambios en datos
4. Cambiar contraseñas de usuarios
```

### **3. 📧 Notificar al Equipo**
```bash
1. Informar sobre el compromiso
2. Coordinar actualización de credenciales
3. Revisar procesos de seguridad
4. Documentar el incidente
```

---

## 📚 **Recursos Adicionales**

### **🔗 Enlaces Útiles:**
- [Supabase Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Git Security](https://docs.github.com/en/code-security)

### **🛠️ Herramientas Recomendadas:**
- **git-secrets**: Previene commits con credenciales
- **truffleHog**: Detecta secretos en repositorios
- **dotenv-vault**: Gestión segura de variables de entorno

---

## 📞 **Contacto de Seguridad**

### **🚨 En Caso de Emergencia:**
1. **Regenerar credenciales** inmediatamente
2. **Notificar al administrador** del sistema
3. **Documentar el incidente** para prevención futura
4. **Revisar logs** para detectar accesos no autorizados

---

¡La seguridad es responsabilidad de todos! Mantén siempre las mejores prácticas y protege los datos sensibles del sistema. 🛡️