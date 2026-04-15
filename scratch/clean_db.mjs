import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧹 Limpiando historial_pedidos...');
  const { error: err1 } = await supabase.from('historial_pedidos').delete().gt('id', 0);
  if (err1) console.error('Error limpiando historial_pedidos:', err1.message);
  else console.log('✅ historial_pedidos limpio');

  console.log('🧹 Limpiando casos_reposicion...');
  const { error: err2 } = await supabase.from('casos_reposicion').delete().gt('id', 0);
  if (err2) console.error('Error limpiando casos_reposicion:', err2.message);
  else console.log('✅ casos_reposicion limpio');

  console.log('⚙️ Insertando modo_prueba en configuracion_sistema...');
  const { error: err3 } = await supabase.from('configuracion_sistema').upsert([
    { clave: 'modo_prueba', valor: 'false' }
  ], { onConflict: 'clave' });
  
  if (err3) console.error('Error insertando modo_prueba:', err3.message);
  else console.log('✅ modo_prueba insertado en configuracion_sistema');

  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const sql = `
    CREATE TABLE IF NOT EXISTS public.historial_pedidos_prueba (
      LIKE public.historial_pedidos INCLUDING ALL
    );
  `;
  
  console.log('\n=============================================');
  console.log('🚨 IMPORTANTE: ACCIÓN MANUAL REQUERIDA');
  console.log('=============================================');
  console.log('Ejecuta este SQL en el SQL Editor de Supabase:');
  console.log('URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('\n' + sql + '\n');
  console.log('=============================================');
}

main();
