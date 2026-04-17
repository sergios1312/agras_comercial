const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('casos').select('numeracion_caso, sucursales(nombre_ciudad)').eq('numeracion_caso', '0718');
  console.log('Result for string 0718:', JSON.stringify(data, null, 2), error);
  const { data: data2 } = await supabase.from('casos').select('numeracion_caso, sucursales(nombre_ciudad)').eq('numeracion_caso', 718);
  console.log('Result for int 718:', JSON.stringify(data2, null, 2));
}
test();
