"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";

// ─── Tipos ──────────────────────────────────────────────────
interface ActionResult {
  success: boolean;
  mensaje?: string;
  error?: string;
}

export interface RepuestoRecord {
  id?: number;
  codigo: string;
  nombre: string;
  codigo_sap: string | null;
  precio_venta: number | null;
  modelos_compatibles: string | null;
}

export interface InventarioRecord {
  repuesto_id: number;
  sucursal_id: number;
  cantidad: number;
}

// ─── Utilidades compartidas ─────────────────────────────────

/**
 * Validar permisos de administrador (Reutilizable para proteger las rutas)
 */
async function verifyAdmin() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    throw new Error("No tienes permisos de administrador.");
  }
}

// ============================================================
// FLUJO: MAESTRO DE REPUESTOS (inventario_unificado.xlsx)
// ============================================================

/**
 * obtenerMaestroExistente()
 * Devuelve todos los repuestos tabla base. Se usa en el cliente para Smart Diffing.
 */
export async function obtenerMaestroExistente(): Promise<RepuestoRecord[]> {
  await verifyAdmin();
  
  const supabase = createAdminClient();
  const rawClient = supabase as any;
  let allRepuestos: RepuestoRecord[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  try {
    while (true) {
      const { data, error } = await rawClient
        .from("repuestos")
        .select("id, codigo, nombre, codigo_sap, precio_venta, modelos_compatibles")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("Error obteniendo repuestos existentes:", error);
        throw error;
      }

      if (!data || data.length === 0) break;
      allRepuestos = allRepuestos.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }
  } catch(e) {
    console.error("Fallo obteniendo maestro:", e);
  }

  return allRepuestos;
}

/**
 * confirmarSubidaMaestro()
 * Recibe un array de repuestos (filtrados por cambios en el cliente)
 * y ejecuta un upsert masivo (batches).
 */
export async function confirmarSubidaMaestro(
  repuestosAModificar: RepuestoRecord[]
): Promise<ActionResult> {
  try {
    await verifyAdmin();

    if (!repuestosAModificar || repuestosAModificar.length === 0) {
      return { success: false, error: "No se recibieron repuestos para procesar." };
    }

    const rawClient = createAdminClient() as any;
    const BATCH_SIZE = 500;
    let procesados = 0;

    for (let i = 0; i < repuestosAModificar.length; i += BATCH_SIZE) {
      const lote = repuestosAModificar.slice(i, i + BATCH_SIZE);
      const { error: errUpsert } = await rawClient
        .from("repuestos")
        .upsert(lote, { onConflict: "codigo" });

      if (errUpsert) {
        return {
          success: false,
          error: `Error en la base de datos (Lote ${i}): ${errUpsert.message}`,
        };
      }
      procesados += lote.length;
    }

    return {
      success: true,
      mensaje: `Maestro sincronizado. ${procesados.toLocaleString()} repuestos actualizados correctamente.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno desconocido.";
    return { success: false, error: "Error de servidor: " + msg };
  }
}

// ============================================================
// FLUJO: SAP CRUDO (sap_crudo.xlsx)
// ============================================================

/**
 * obtenerDatosParaSap()
 * Devuelve Repuestos, Sucursales y el Inventario actual.
 * Fundamental para que el cliente cruce el SAP (cantidades por almacén) y sepa
 * qué inventario purgar (volver a 0 si ya no está en SAP).
 */
export async function obtenerDatosParaSap() {
  await verifyAdmin();
  const rawClient = createAdminClient() as any;

  // 1. Sucursales
  const { data: sucursales, error: errSuc } = await rawClient
    .from("sucursales")
    .select("id, nombre_ciudad");
  if (errSuc) throw new Error("No se obtuvieron las sucursales: " + errSuc.message);

  // 2. Repuestos (necesitamos los IDs para poder relacionarlos al inventario)
  const repuestos = await obtenerMaestroExistente();

  // 3. Inventario actual
  let inventarioActual: any[] = [];
  let page = 0;
  while (true) {
    const { data: invData, error: errInv } = await rawClient
      .from("inventario")
      .select("repuesto_id, sucursal_id, cantidad")
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (errInv) throw new Error("Error obteniendo inventario: " + errInv.message);
    if (!invData || invData.length === 0) break;
    
    inventarioActual = inventarioActual.concat(invData);
    if (invData.length < 1000) break;
    page++;
  }

  return {
    sucursales,
    repuestos, // Para mapear codigo -> repuesto_id
    inventario: inventarioActual, // Para purgar
  };
}

/**
 * confirmarSubidaSap()
 * Recibe:
 * 1. Repuestos 'Fantasma' (nuevos códigos que existen en SAP pero no en nuestra BD, se crean en blanco).
 * 2. Movimientos de inventario (Nuevos/Modificados).
 */
export async function confirmarSubidaSap(
  repuestosNuevos: RepuestoRecord[],
  movimientosInventario: InventarioRecord[]
): Promise<ActionResult> {
  try {
    await verifyAdmin();
    const rawClient = createAdminClient() as any;

    let resRepuestosMsg = "";
    
    // Paso 1: Insertar repuestos fantasmas si los hay
    if (repuestosNuevos.length > 0) {
      const BATCH_SIZE = 500;
      let creados = 0;
      for (let i = 0; i < repuestosNuevos.length; i += BATCH_SIZE) {
        const lote = repuestosNuevos.slice(i, i + BATCH_SIZE);
        // Quitamos id por seguridad (creación nueva)
        const loteAInsertar = lote.map((r) => {
          const { id, ...resto } = r; 
          return resto; 
        });
        
        const { error: errRep } = await rawClient
          .from("repuestos")
          .upsert(loteAInsertar, { onConflict: "codigo", ignoreDuplicates: true });
        
        if (errRep) return { success: false, error: "Fallo insertando repuestos fantasma: " + errRep.message };
        creados += lote.length;
      }
      resRepuestosMsg = ` Se crearon ${creados} repuestos nuevos en blanco descubiertos en SAP.`;
    }

    // Paso 1B: Resolver IDs faltantes y Limpiar campos temporales
    const todosLosRepuestos = await obtenerMaestroExistente();
    const mapaCodId = new Map();
    todosLosRepuestos.forEach(r => {
      mapaCodId.set(r.codigo, r.id);
      if (r.codigo_sap) mapaCodId.set(r.codigo_sap, r.id);
    });

    const movimientosLimpios = movimientosInventario.map((m: any) => {
      const { codigo_temp, ...resto } = m;
      let idFinal = resto.repuesto_id;
      
      // Si no tiene ID o es -1, intentamos resolverlo con el codigo_temp
      if ((!idFinal || idFinal === -1) && codigo_temp) {
        idFinal = mapaCodId.get(codigo_temp);
      }

      return {
        ...resto,
        repuesto_id: idFinal
      };
    }).filter(m => m.repuesto_id && m.repuesto_id !== -1);

    // Paso 2: Ejecutar upsert de inventario (Actualizaciones y purgas a 0)
    if (movimientosLimpios.length > 0) {
      const BATCH_SIZE = 500;
      let movPaginas = 0;
      
      for (let i = 0; i < movimientosInventario.length; i += BATCH_SIZE) {
        const lote = movimientosLimpios.slice(i, i + BATCH_SIZE);
        // Garantizar que vamos a upsertar por combinación única de sucursal y repuesto
        const { error: errInv } = await rawClient
          .from("inventario")
          .upsert(lote, { onConflict: "repuesto_id, sucursal_id" });

        if (errInv) return { success: false, error: "Fallo insertando el stock: " + errInv.message };
        movPaginas += lote.length;
      }
      return {
        success: true,
        mensaje: `Stock sincronizado exitosamente (${movPaginas} registros de almacén impactados).${resRepuestosMsg}`
      }
    }

    return { success: true, mensaje: `Sin cambios en inventario.${resRepuestosMsg}` };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno desconocido.";
    return { success: false, error: "Error de servidor: " + msg };
  }
}
