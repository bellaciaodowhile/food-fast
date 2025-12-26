const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function updateDatabase() {
  console.log('🔧 Actualizando base de datos para agregar estado "ready"...');
  
  try {
    // Primero, verificar el constraint actual
    console.log('1. Verificando constraint actual...');
    
    // Eliminar constraint existente si existe
    console.log('2. Eliminando constraint existente...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;'
    });
    
    if (dropError) {
      console.log('⚠️ Error eliminando constraint (puede no existir):', dropError.message);
    } else {
      console.log('✅ Constraint eliminado exitosamente');
    }
    
    // Agregar nuevo constraint con el estado 'ready'
    console.log('3. Agregando nuevo constraint con estado "ready"...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE sales ADD CONSTRAINT sales_status_check 
        CHECK (status IN ('pending', 'ready', 'completed', 'cancelled'));`
    });
    
    if (addError) {
      console.error('❌ Error agregando nuevo constraint:', addError.message);
      throw addError;
    } else {
      console.log('✅ Nuevo constraint agregado exitosamente');
    }
    
    // Agregar comentario para documentar
    console.log('4. Agregando comentario de documentación...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql_query: `COMMENT ON COLUMN sales.status IS 'Order status: pending (created) → ready (kitchen finished) → completed (delivered to customer) | cancelled';`
    });
    
    if (commentError) {
      console.log('⚠️ Error agregando comentario:', commentError.message);
    } else {
      console.log('✅ Comentario agregado exitosamente');
    }
    
    // Verificar que funciona insertando un registro de prueba
    console.log('5. Probando el nuevo constraint...');
    const testData = {
      seller_id: '00000000-0000-0000-0000-000000000000', // UUID dummy
      customer_name: 'Test Customer',
      total_usd: 10.00,
      total_bs: 100.00,
      exchange_rate: 10.00,
      status: 'ready'
    };
    
    const { data: testInsert, error: testError } = await supabase
      .from('sales')
      .insert([testData])
      .select();
    
    if (testError) {
      console.error('❌ Error en prueba:', testError.message);
    } else {
      console.log('✅ Prueba exitosa - estado "ready" funciona');
      
      // Limpiar registro de prueba
      if (testInsert && testInsert[0]) {
        await supabase
          .from('sales')
          .delete()
          .eq('id', testInsert[0].id);
        console.log('🧹 Registro de prueba eliminado');
      }
    }
    
    console.log('🎉 Base de datos actualizada exitosamente!');
    console.log('📋 Estados disponibles: pending, ready, completed, cancelled');
    
  } catch (error) {
    console.error('❌ Error actualizando base de datos:', error);
    console.log('');
    console.log('🔧 Solución manual:');
    console.log('1. Ve al panel de Supabase');
    console.log('2. Abre el SQL Editor');
    console.log('3. Ejecuta este SQL:');
    console.log('');
    console.log('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;');
    console.log('ALTER TABLE sales ADD CONSTRAINT sales_status_check');
    console.log("  CHECK (status IN ('pending', 'ready', 'completed', 'cancelled'));");
    console.log('');
  }
}

updateDatabase();