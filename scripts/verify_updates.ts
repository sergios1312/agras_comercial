
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CODES_TO_VERIFY = [
  'YC.DZ.GR000012.01',
  'YC.DZ.GR000022.01',
  'YC.DZ.GR000433.01',
  'YC.DZ.GR000011.02',
  'YC.DZ.GR000020.01',
  'YC.DZ.GR000030.01',
  'YC.DZ.GR000014.01',
  'YC.DZ.GR000024.01',
  'CP.AG.00000580.02',
  'YC.DZ.BC000062.01',
  'YC.DZ.GR000432.01'
];

async function verify() {
  console.log('🔍 Verificando precios en Supabase...');
  const { data, error } = await supabase
    .from('repuestos')
    .select('codigo, precio_venta')
    .in('codigo', CODES_TO_VERIFY);

  if (error) {
    console.error('❌ Error al consultar Supabase:', error.message);
    return;
  }

  console.table(data);
  
  const missing = CODES_TO_VERIFY.filter(c => !data?.some(d => d.codigo === c));
  if (missing.length > 0) {
    console.warn('⚠️ No se encontraron los siguientes códigos en la BD:', missing);
  } else {
    console.log('✅ Todos los códigos actualizados están presentes en la BD.');
  }
}

verify();
