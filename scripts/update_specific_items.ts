
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ITEMS_TO_UPDATE = {
  'YC.JG.ZS005016.03': 210,
  'YC.JG.ZS005016.04': 210,
};

async function updateSpecificItems() {
  console.log('🚀 Iniciando actualización de precios en Supabase...');
  
  for (const [codigo, precio] of Object.entries(ITEMS_TO_UPDATE)) {
    console.log(`\n🔍 Procesando item: ${codigo}...`);
    
    // Primero verificamos si existe
    const { data: existing, error: fetchError } = await supabase
      .from('repuestos')
      .select('id, codigo, precio_venta')
      .eq('codigo', codigo)
      .maybeSingle();

    if (fetchError) {
      console.error(`❌ Error buscando ${codigo}:`, fetchError.message);
      continue;
    }

    if (!existing) {
      console.warn(`⚠️ No se encontró el código ${codigo} en la base de datos.`);
      continue;
    }

    console.log(`✨ Encontrado: ${existing.codigo}`);
    console.log(`   Precio actual: ${existing.precio_venta}`);
    console.log(`   Nuevo precio: ${precio}`);

    const { data, error } = await supabase
      .from('repuestos')
      .update({ precio_venta: precio })
      .eq('codigo', codigo)
      .select();

    if (error) {
      console.error(`❌ Error actualizando ${codigo}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Actualizado con éxito.`);
    }
  }

  console.log('\n🎉 Proceso finalizado.');
}

updateSpecificItems().catch(console.error);
