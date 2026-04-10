import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('historial_pedidos')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching historial_pedidos:', error);
    process.exit(1);
  }

  if (data) {
    console.log('Columns in historial_pedidos:', Object.keys(data[0] || {}));
  }
  const { data: invData } = await supabase.from('inventario').select('*').limit(1);
  if (invData) {
    console.log('Columns in inventario:', Object.keys(invData[0] || {}));
  }
  const { data: repData } = await supabase.from('repuestos').select('*').limit(1);
  if (repData) {
    console.log('Columns in repuestos:', Object.keys(repData[0] || {}));
  }
}

checkColumns();
