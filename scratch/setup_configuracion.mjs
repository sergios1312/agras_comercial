/**
 * setup_configuracion.mjs
 * Crea la tabla configuracion_sistema en Supabase y la inicializa con valores por defecto.
 * Uso: node scratch/setup_configuracion.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Usar la API de administración de Supabase para ejecutar SQL
async function createTable() {
  console.log('📋 Creando tabla configuracion_sistema en Supabase...');

  // Supabase permite ejecutar SQL arbitrario via la API REST con el service role
  const sql = `
    CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
      id SERIAL PRIMARY KEY,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    // Si exec_sql no existe, usar el endpoint de queries directas de Supabase Management API
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    console.log(`   → exec_sql no disponible, intentando Management API (project: ${projectRef})...`);
    
    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!mgmtResponse.ok) {
      const err = await mgmtResponse.text();
      console.error('❌ Error con Management API:', err);
      console.log('\n💡 Ejecuta manualmente este SQL en el panel de Supabase (SQL Editor):');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
    } else {
      console.log('✅ Tabla creada via Management API');
    }
  } else {
    console.log('✅ Tabla creada via exec_sql');
  }
}

async function seedData() {
  console.log('🌱 Insertando configuración inicial...');

  const { data, error } = await supabase
    .from('configuracion_sistema')
    .upsert([
      { clave: 'pedidos_abastecimiento', valor: 'true' },
      { clave: 'pedidos_internos', valor: 'true' },
      { clave: 'pedidos_reposicion', valor: 'true' },
    ], { onConflict: 'clave' });

  if (error) {
    console.error('❌ Error al insertar datos:', error.message);
    console.log('\n💡 Asegúrate de crear la tabla primero con el SQL del panel de Supabase');
    return false;
  }

  console.log('✅ Configuración inicial insertada correctamente');
  return true;
}

async function verifyTable() {
  console.log('🔍 Verificando tabla...');
  
  const { data, error } = await supabase
    .from('configuracion_sistema')
    .select('*');

  if (error) {
    console.error('❌ La tabla no existe o no es accesible:', error.message);
    return false;
  }

  console.log('✅ Tabla verificada. Contenido actual:');
  console.table(data);
  return true;
}

async function main() {
  console.log('🚀 Setup de configuracion_sistema\n');

  // Intentar seed directamente (si la tabla ya existe)
  const tableExists = await verifyTable();
  
  if (!tableExists) {
    await createTable();
    // Intentar seed después de crear
    await seedData();
    // Verificar de nuevo
    await verifyTable();
  } else {
    // Tabla ya existe, solo aseguramos que las filas existan
    await seedData();
  }

  console.log('\n✨ Setup completado');
}

main().catch(console.error);
