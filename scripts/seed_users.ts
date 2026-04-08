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
  console.log('🚀 Iniciando creación masiva de usuarios y sincronización de sucursales...');

  for (const user of SUCURSALES_DATA) {
    console.log(`👤 Procesando: ${user.usuario} (${user.correo})...`);
    
    // 1. Sincronizar Autenticación (Auth)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   ℹ️ El usuario Auth ${user.correo} ya existe.`);
      } else {
        console.error(`   ❌ Error creando Auth ${user.usuario}:`, authError.message);
      }
    } else {
      console.log(`   ✅ Usuario Auth creado: ${authData.user?.id}`);
    }

    // 2. Sincronizar Tabla Pública (sucursales) - Solo si tiene id_db (entidades de stock)
    if ('id_db' in user && user.id_db) {
      console.log(`   🏠 Sincronizando tabla 'sucursales' para ${user.ciudad} (ID: ${user.id_db})...`);
      const { error: dbError } = await supabase
        .from('sucursales')
        .upsert({
          id: user.id_db,
          nombre_ciudad: user.ciudad,
          nombre_tecnico: user.responsable,
          numero_telefono: user.telefono || null,
          correo: user.correo
        });

      if (dbError) {
        console.error(`   ❌ Error sincronizando tabla pública ${user.ciudad}:`, dbError.message);
      } else {
        console.log(`   ✅ Tabla 'sucursales' actualizada.`);
      }
    }
  }

  console.log('✨ Proceso finalizado.');
}

seedUsers();
