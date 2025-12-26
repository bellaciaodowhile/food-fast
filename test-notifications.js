const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testNotifications() {
  console.log('🔍 Probando sistema de notificaciones...');
  
  try {
    // Test 1: Check if notifications table exists
    console.log('1. Verificando tabla notifications...');
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
      
    if (notifError) {
      console.log('❌ Error con tabla notifications:', notifError.message);
      return;
    } else {
      console.log('✅ Tabla notifications existe');
    }
    
    // Test 2: Check browser notification permissions
    console.log('2. Verificando permisos de notificación del navegador...');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('✅ Notificaciones web soportadas');
      console.log('Permiso actual:', Notification.permission);
    } else {
      console.log('ℹ️ Ejecutándose en Node.js (no hay navegador)');
    }
    
    // Test 3: Check if we can create a test notification in DB
    console.log('3. Probando inserción de notificación...');
    
    // First get a user ID
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (usersError || !users || users.length === 0) {
      console.log('❌ No se encontraron usuarios para probar');
      return;
    }
    
    const testUserId = users[0].id;
    console.log('Usuario de prueba:', testUserId);
    
    // Try to insert a test notification
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUserId,
        title: 'Prueba de Notificación',
        message: 'Esta es una notificación de prueba del sistema',
        type: 'info'
      })
      .select();
      
    if (insertError) {
      console.log('❌ Error insertando notificación:', insertError.message);
    } else {
      console.log('✅ Notificación de prueba creada:', insertData);
      
      // Clean up - delete the test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Notificación de prueba eliminada');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testNotifications();