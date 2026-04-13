import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import ExcelJS from 'exceljs';

// Cargar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── MAPEO DE SUCURSALES (SAP -> DB Name) ─────────────────────────
const ALMACENES_MAP: Record<string, string> = {
  'APRI.016': 'Lima',
  'APRI.DJG': 'Lima', // Almacén central DJI garantía según peek (opcional, consolidado a Lima)
  'DJCST.01': 'Chiclayo',
  'DICST.01': 'Ica',
  'DJABT.01': 'Bellavista',
  'DJCM.001': 'Nueva Cajamarca',
  'DJAPU.01': 'Pucallpa',
  'DJJST.01': 'Jaen',
  'DHUST.01': 'Huanuco',
  'DYUST-01': 'Yurimaguas',
  'DYUST.01': 'Yurimaguas', // Por si acaso hay variantes con punto
  'DSTPI.01': 'Piura'
};

// Mode: Dry run para probar antes de escribir
const DRY_RUN = process.argv.includes('--dry-run');

interface SapRawItem {
  codigoSap: string; // Col: Código de artículo
  descripcion: string; // Col: Descripción del artículo
  codigoBarras: string; // Col: Código de barras (EAN)
  almacenCod: string; // Col: Código de almacén
  stockTotal: number; // Col: Total
  stockDisponible: number; // Col: Disponible
}

interface MaestroItem {
  codigo: string;
  nombre: string;
  codigoSap: string;
  precioVenta: number;
  modelosCompatibles: string;
}

// Representa el repuesto unificado final
interface RepuestoUpsert {
  codigo: string;
  nombre: string;
  codigo_sap: string | null;
  precio_venta: number | null;
  modelos_compatibles: string | null;
}

async function runSync() {
  console.log(`🚀 Iniciando sincronización de stock... ${DRY_RUN ? '[MODO DRY-RUN]' : ''}`);

  // 1. EXTRAER MAESTRO (inventario_unificado.xlsx)
  const maestroMap = new Map<string, MaestroItem>();
  try {
    console.log('📖 Leyendo inventario_unificado.xlsx...');
    const unificadoWb = new ExcelJS.Workbook();
    await unificadoWb.xlsx.readFile(path.join(process.cwd(), 'inventario_unificado.xlsx'));
    const wsMaestro = unificadoWb.worksheets[0];
    
    // Asumimos Headers en la Fila 1
    const headersMaestro = wsMaestro.getRow(1).values as string[];
    const idxCod = headersMaestro.findIndex(h => String(h).trim() === 'codigo');
    const idxNom = headersMaestro.findIndex(h => String(h).trim() === 'nombre');
    const idxSap = headersMaestro.findIndex(h => String(h).trim() === 'codigo_sap');
    const idxPrecio = headersMaestro.findIndex(h => String(h).trim() === 'Precio_venta');
    const idxMod = headersMaestro.findIndex(h => String(h).trim() === 'modelos_compatibles');

    console.log(`Indices Maestro: Cod:${idxCod}, Nom:${idxNom}, Sap:${idxSap}, Pre:${idxPrecio}, Mod:${idxMod}`);

    wsMaestro.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values as any[];
      const codigo = String(values[idxCod] || '').trim();
      const codigoSap = String(values[idxSap] || '').trim();
      if (!codigo && !codigoSap) return; // Fila vacía

      const key = codigo || codigoSap; // Usamos codigo de barras como primary key
      maestroMap.set(key, {
        codigo: codigo,
        nombre: String(values[idxNom] || '').trim(),
        codigoSap: codigoSap,
        precioVenta: parseFloat(values[idxPrecio]) || 0,
        modelosCompatibles: String(values[idxMod] || '').trim(),
      });
      // También mapeamos por SAP si es distinto para cruces cruzados
      if (codigoSap && codigoSap !== codigo) {
        maestroMap.set(codigoSap, maestroMap.get(key)!);
      }
    });
    console.log(`✅ Maestro cargado: ${maestroMap.size} repuestos indexados (incluyendo mapeos duales).`);
  } catch (error) {
    console.warn('⚠️ No se pudo cargar inventario_unificado.xlsx o no existe. Procediendo solo con SAP.');
  }

  // 2. EXTRAER SAP (sap_crudo.xlsx)
  console.log('📖 Leyendo sap_crudo.xlsx...');
  const sapWb = new ExcelJS.Workbook();
  await sapWb.xlsx.readFile(path.join(process.cwd(), 'sap_crudo.xlsx'));
  const wsSap = sapWb.worksheets[0];
  
  const headersSap = wsSap.getRow(1).values as string[];
  const normalizeHeader = (s: string) => String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const idSapCod = headersSap.findIndex(h => normalizeHeader(h).includes('cod.sap') || normalizeHeader(h).includes('codigo de articulo'));
  const idDesc = headersSap.findIndex(h => normalizeHeader(h).includes('descripcion del articulo'));
  const idEan = headersSap.findIndex(h => normalizeHeader(h).includes('codigo de barras'));
  const idAlm = headersSap.findIndex(h => normalizeHeader(h).includes('codigo de almacen'));
  const idTotal = headersSap.findIndex(h => normalizeHeader(h) === 'total');
  
  if (idSapCod === -1) console.warn("⚠️ WARNING: SAP CODE COLUMN NOT FOUND");

  console.log(`Indices SAP: Cod:${idSapCod}, Desc:${idDesc}, Ean:${idEan}, Alm:${idAlm}, Total:${idTotal}`);

  // Mapa para agregar cantidades por Almacén Oficial y SKU
  // Estructura: stockPorCiudad["Lima"]["SKU-123"] = 10
  const stockPorCiudad: Record<string, Record<string, number>> = {};
  Object.values(ALMACENES_MAP).forEach(c => {
    stockPorCiudad[c] = {};
  });

  const allRepuestos = new Map<string, RepuestoUpsert>();

  wsSap.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as any[];
    const codigoSap = String(values[idSapCod] || '').trim();
    const codigoBarras = String(values[idEan] || '').trim();
    const descripcion = String(values[idDesc] || '').trim();
    const almacenCod = String(values[idAlm] || '').trim();
    const total = parseFloat(values[idTotal]) || 0;
    // const disp = parseFloat(values[idDisp]) || 0; // Usaremos Total por spec
    
    if (!codigoSap) return; // Ignorar filas sin código

    const ciudad = ALMACENES_MAP[almacenCod];
    if (!ciudad) return; // Ignorar almacenes no oficiales (transit storage, etc)

    const key = codigoBarras || codigoSap;

    // Sumar stock (SAP a veces saca el mismo código en distintas filas por sub-almacenes)
    if (!stockPorCiudad[ciudad][key]) {
      stockPorCiudad[ciudad][key] = 0;
    }
    stockPorCiudad[ciudad][key] += total;

    // Construir Repuesto Maestro
    if (!allRepuestos.has(key)) {
      const maestroInfo = maestroMap.get(key) || maestroMap.get(codigoSap);
      allRepuestos.set(key, {
        codigo: key, // Usamos codigoBarras si existe, si no codigoSap
        nombre: maestroInfo?.nombre || descripcion,
        codigo_sap: codigoSap,
        precio_venta: maestroInfo?.precioVenta || 0,
        modelos_compatibles: maestroInfo?.modelosCompatibles || null,
      });
    }
  });

  console.log(`✅ SAP Crudo procesado.`);
  console.log(`📊 Repuestos únicos encontrados en stock: ${allRepuestos.size}`);

  // 3. UPSERT A SUPABASE: TABLA REPUESTOS
  console.log(`\n💾 Iniciando actualización de tabla 'repuestos'...`);
  const repuestosArray = Array.from(allRepuestos.values());
  
  if (!DRY_RUN) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < repuestosArray.length; i += CHUNK_SIZE) {
      const chunk = repuestosArray.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('repuestos')
        .upsert(chunk, { onConflict: 'codigo', ignoreDuplicates: false });
        
      if (error) {
        console.error(`❌ Error haciendo upsert de repuestos (chunk ${i}):`, error.message);
        process.exit(1);
      }
    }
    console.log(`✅ Upsert completo para repuestos.`);
  } else {
    console.log(`[DRY-RUN] Simulado Upsert de ${repuestosArray.length} repuestos.`);
  }

  // 4. PREPARACIÓN DE INVENTARIO: OBTENER IDs
  console.log(`\n🔍 Mapeando IDs de Base de Datos para tabla 'inventario'...`);
  
  const { data: sucursalesDb, error: errSuc } = await supabase.from('sucursales').select('id, nombre_ciudad');
  if (errSuc || !sucursalesDb) {
    console.error('❌ Error obteniendo sucursales de BD:', errSuc?.message);
    process.exit(1);
  }

  // Mapear "Nombre Ciudad" -> ID
  const mapSucursalId: Record<string, number> = {};
  sucursalesDb.forEach(s => {
    mapSucursalId[s.nombre_ciudad] = s.id;
  });

  // Obtenemos los repuestos actualizados para tener sus IDs primarios
  // Limit al infinito o usando iteración, pero si son <10000, 1 query masiva sirve en supabase para ETL.
  // Supabase postgREST limita a 1000 filas por defecto, necesitamos iterar
  let repuestosDb: { id: number; codigo: string }[] = [];
  let page = 0;
  while (true) {
    const { data: repPage, error: errRep } = await supabase
      .from('repuestos')
      .select('id, codigo')
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (errRep) {
      console.error('❌ Error obteniendo repuestos de BD:', errRep.message);
      process.exit(1);
    }
    if (!repPage || repPage.length === 0) break;
    repuestosDb = repuestosDb.concat(repPage);
    page++;
    if (repPage.length < 1000) break;
  }

  const mapRepuestoId: Record<string, number> = {}; // codigo -> ID
  repuestosDb.forEach(r => {
    mapRepuestoId[r.codigo] = r.id;
  });

  // 5. UPSERT A SUPABASE: TABLA INVENTARIO
  console.log(`\n💾 Calculando transacciones de inventario...`);
  
  // Vamos a sobreescribir el stock para todo lo que esté en SAP.
  // Pero necesitamos poner a 0 lo que estaba antes y ya no viene en SAP.
  // Obtendremos el inventario actual para contrastar.
  let inventarioActualDb: { id: number; repuesto_id: number; sucursal_id: number, cantidad: number }[] = [];
  page = 0;
  while (true) {
    const { data: invPage, error: errInv } = await supabase
      .from('inventario')
      .select('id, repuesto_id, sucursal_id, cantidad')
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (errInv) {
      console.error('❌ Error obteniendo inventario de BD:', errInv.message);
      process.exit(1);
    }
    if (!invPage || invPage.length === 0) break;
    inventarioActualDb = inventarioActualDb.concat(invPage);
    page++;
    if (invPage.length < 1000) break;
  }

  const invUpsertData: { repuesto_id: number; sucursal_id: number; cantidad: number }[] = [];
  const trackUpsert = new Set<string>(); // para no duplicar en el array

  // Agregamos stock que viene de SAP
  for (const ciudad of Object.keys(stockPorCiudad)) {
    const sucId = mapSucursalId[ciudad];
    if (!sucId) continue;

    for (const [key, cantidad] of Object.entries(stockPorCiudad[ciudad])) {
      const repId = mapRepuestoId[key];
      if (!repId) {
         // console.warn(`⚠️ Warning: Repuesto ${key} no se encontró en DB. (Raro tras el Upsert)`);
         continue;
      }

      invUpsertData.push({
        repuesto_id: repId,
        sucursal_id: sucId,
        cantidad: cantidad
      });
      trackUpsert.add(`${repId}-${sucId}`);
    }
  }

  // Agregamos todo lo demás a 0 si no vino en SAP para limpiarlo, SOLO si su cantidad actual > 0.
  let resetCount = 0;
  inventarioActualDb.forEach(curr => {
    if (curr.cantidad > 0 && !trackUpsert.has(`${curr.repuesto_id}-${curr.sucursal_id}`)) {
      invUpsertData.push({
        repuesto_id: curr.repuesto_id,
        sucursal_id: curr.sucursal_id,
        cantidad: 0
      });
      resetCount++;
    }
  });

  console.log(`Calculado: ${invUpsertData.length - resetCount} registros de inventario validados desde SAP.`);
  console.log(`Calculado: ${resetCount} registros de inventario purgados a 0 (estaban en BD pero ya no en SAP).`);

  if (!DRY_RUN) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < invUpsertData.length; i += CHUNK_SIZE) {
      const chunk = invUpsertData.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('inventario')
        .upsert(chunk, { onConflict: 'repuesto_id, sucursal_id', ignoreDuplicates: false });
        
      if (error) {
        console.error(`❌ Error haciendo upsert de inventario (chunk ${i}):`, error.message);
        process.exit(1);
      }
    }
    console.log(`✅ Upsert completo para inventario.`);

    // 6. Actualizar fecha en config.json
    console.log(`\n📝 Actualizando fecha de última sincronización...`);
    const dateStr = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    const configPath = path.join(process.cwd(), 'src', 'data', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ lastUpdated: dateStr }, null, 2));

    // 7. Git Push Automático
    console.log(`\n🚀 Subiendo cambios a GitHub...`);
    try {
      execSync('git add src/data/config.json sap_crudo.xlsx inventario_unificado.xlsx', { stdio: 'inherit' });
      execSync(`git commit -m "chore: automatización, actualización de inventario al ${dateStr}"`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('✅ Cambios subidos correctamente a GitHub.');
    } catch (gitErr: any) {
      console.warn('⚠️ No se pudo realizar el push automático a GitHub (¿sin cambios o sin permisos?).', gitErr.message);
    }

  } else {
    console.log(`[DRY-RUN] Simulado Upsert de ${invUpsertData.length} registros de inventario.`);
  }

  console.log('\n🎉 Sincronización Finalizada Correctamente.');
}

runSync().catch(err => {
  console.error('Error no controlado en la sincronización:', err);
  process.exit(1);
});
