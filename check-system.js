// System Check Script for Fast Food Sales
// Run with: node check-system.js

import fs from 'fs'
import path from 'path'

console.log('🔍 Verificando sistema Fast Food Sales...\n')

// Check if .env file exists
const envPath = '.env'
if (fs.existsSync(envPath)) {
  console.log('✅ Archivo .env encontrado')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  if (envContent.includes('VITE_SUPABASE_URL=https://')) {
    console.log('✅ VITE_SUPABASE_URL configurado')
  } else {
    console.log('❌ VITE_SUPABASE_URL no configurado correctamente')
  }
  
  if (envContent.includes('VITE_SUPABASE_ANON_KEY=eyJ')) {
    console.log('✅ VITE_SUPABASE_ANON_KEY configurado')
  } else {
    console.log('❌ VITE_SUPABASE_ANON_KEY no configurado correctamente')
  }
} else {
  console.log('❌ Archivo .env no encontrado')
  console.log('   Copia .env.example a .env y configura tus credenciales')
}

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('✅ Dependencias instaladas')
} else {
  console.log('❌ Dependencias no instaladas')
  console.log('   Ejecuta: npm install')
}

// Check key files
const keyFiles = [
  'src/App.tsx',
  'src/contexts/AuthContext.tsx',
  'src/lib/supabase.ts',
  'supabase-setup-fixed.sql'
]

keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`)
  } else {
    console.log(`❌ ${file} no encontrado`)
  }
})

console.log('\n📋 Próximos pasos:')
console.log('1. Configura Supabase usando supabase-setup-fixed.sql')
console.log('2. Actualiza el archivo .env con tus credenciales')
console.log('3. Crea usuarios de prueba en Supabase Auth')
console.log('4. Ejecuta: npm run dev')
console.log('5. Ve a http://localhost:3000')

console.log('\n🎉 ¡Tu sistema está listo para configurar!')