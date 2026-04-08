import { createClient } from '@supabase/supabase-js';
import { SUCURSALES_DATA } from '../src/lib/constants';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUsers() {
  console.log('🚀 Iniciando creación masiva de usuarios...');

  for (const user of SUCURSALES_DATA) {
    console.log(`👤 Creando/Actualizando: ${user.usuario} (${user.correo})...`);
    
    // El método admin.createUser crea al usuario sin necesidad de confirmación de email
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.correo,
      password: user.pin,
      email_confirm: true,
      user_metadata: { 
        usuario: user.usuario,
        role: user.role,
        ciudad: user.ciudad,
        responsable: user.responsable
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`   ℹ️ El usuario ${user.correo} ya existe.`);
      } else {
        console.error(`   ❌ Error creando ${user.usuario}:`, error.message);
      }
    } else {
      console.log(`   ✅ Creado con éxito: ${data.user?.id}`);
    }
  }

  console.log('✨ Proceso finalizado.');
}

seedUsers();
