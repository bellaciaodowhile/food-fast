const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function setupNotifications() {
  try {
    console.log('🔧 Configurando sistema de notificaciones...');
    
    const sql = fs.readFileSync('create-notifications-table.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Ejecutando:', statement.trim().substring(0, 50) + '...');
        
        // Execute directly using supabase client
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement.trim() + ';' 
        });
        
        if (error) {
          console.error('❌ Error:', error.message);
        } else {
          console.log('✅ Ejecutado correctamente');
        }
      }
    }
    
    console.log('🎉 Sistema de notificaciones configurado correctamente');
    
  } catch (error) {
    console.error('❌ Error configurando notificaciones:', error);
  }
}

setupNotifications();