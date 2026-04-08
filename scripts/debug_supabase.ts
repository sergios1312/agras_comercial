import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugData() {
  console.log('🔍 Iniciando depuración de datos en Supabase...');

  const { data: sucursales } = await supabase.from('sucursales').select('*');
  console.log('\n🏠 TABLA SUCURSALES:');
  console.table(sucursales);

  const { data: inventarioCount } = await supabase.from('inventario').select('id', { count: 'exact', head: true });
  console.log(`\n📦 TABLA INVENTARIO (Total registros: ${inventarioCount ? JSON.stringify(inventarioCount) : 0})`);

  const { data: sampleInventario } = await supabase
    .from('inventario')
    .select('*, sucursales(nombre_ciudad)')
    .limit(5);
  console.log('\n📊 MUESTRA DE INVENTARIO:');
  console.table(sampleInventario?.map(i => ({
    id: i.id,
    repuesto_id: i.repuesto_id,
    sucursal_id: i.sucursal_id,
    ciudad_db: i.sucursales?.nombre_ciudad,
    cantidad: i.cantidad
  })));

  console.log('\n✨ Depuración finalizada.');
}

debugData();
