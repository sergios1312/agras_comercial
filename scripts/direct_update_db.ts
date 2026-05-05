
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRICES_TO_UPDATE: Record<string, number> = {
  'YC.JG.ZS005016.03': 210,
  'YC.JG.ZS005016.04': 210,
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
