
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRICES_TO_UPDATE: Record<string, number> = {
  'YC.DZ.GR000012.01': 2970,
  'YC.DZ.GR000022.01': 2175,
  'YC.DZ.GR000433.01': 3985,
  'YC.DZ.GR000011.02': 4250,
  'YC.DZ.GR000020.01': 5275,
  'YC.DZ.GR000030.01': 3045,
  'YC.DZ.GR000014.01': 2370,
  'YC.DZ.GR000024.01': 1305,
  'CP.AG.00000580.02': 3945,
  'YC.DZ.BC000062.01': 2650,
  'YC.DZ.GR000432.01': 2160,
};

async function runDirectUpdate() {
  console.log('🚀 Iniciando actualización directa en Supabase...');
  
  for (const [codigo, precio] of Object.entries(PRICES_TO_UPDATE)) {
    const { data, error } = await supabase
      .from('repuestos')
      .update({ precio_venta: precio })
      .eq('codigo', codigo)
      .select();

    if (error) {
      console.error(`❌ Error actualizando ${codigo}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Actualizado ${codigo} a ${precio}`);
    } else {
      console.warn(`⚠️ No se encontró el código ${codigo} en la base de datos para actualizar.`);
    }
  }

  console.log('🎉 Actualización directa finalizada.');
}

runDirectUpdate();
