"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";
import type { Caso } from "@/types/casos.types";

// ─── Tipos del resultado ──────────────────────────────────────
interface ActionResult {
  success: boolean;
  mensaje?: string;
  error?: string;
}

// ─── Mapeo de Sucursal Nombre → ID ────────────────────────────
async function obtenerDictSucursales(
  rawClient: ReturnType<typeof createAdminClient>
): Promise<Map<string, number>> {
  const { data: sucursalesRows, error: errSuc } = await (rawClient as any)
    .from("sucursales")
    .select("id, nombre_ciudad");

  if (errSuc) {
    throw new Error("Error conectando a la base de sucursales: " + errSuc.message);
  }

  const dict = new Map<string, number>();
  for (const row of sucursalesRows ?? []) {
    if (row.nombre_ciudad) {
      dict.set(row.nombre_ciudad.toLowerCase().trim(), row.id);
    }
  }
  return dict;
}

// ─── Nueva Server Action: recibe casos ya parseados desde el cliente ──
export async function confirmarSubidaCasos(
  casosParseados: Caso[]
): Promise<ActionResult> {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  if (!casosParseados || casosParseados.length === 0) {
    return { success: false, error: "No se recibieron casos para procesar." };
  }

  try {
    const rawClient = createAdminClient();
    const dictSucursales = await obtenerDictSucursales(rawClient);

    // Formatear para upsert
    const casosBD = casosParseados.map((c) => {
      let sucId: number | null = null;
      if (c.sucursal) {
        const busqueda = c.sucursal.toLowerCase().trim();
        for (const [nombreDb, idDb] of dictSucursales.entries()) {
          if (busqueda.includes(nombreDb)) {
            sucId = idDb;
            break;
          }
        }
      }

      return {
        numeracion_caso: c.numeracionCaso,
        estado_general: c.estadoGeneral,
        descripcion: c.descripcion || null,
        sucursal_id: sucId,
        cliente: c.cliente || null,
        garantia: c.garantia || null,
        estado_caso: c.estadoCaso || null,
        tipo_trabajo: c.tipoTrabajo || null,
        fecha_ingreso: c.fechaIngreso || null,
        fecha_salida: c.fechaSalida || null,
      };
    });

    // Upsert en lotes de 1000
    const BATCH_SIZE = 1000;
    let procesados = 0;

    for (let i = 0; i < casosBD.length; i += BATCH_SIZE) {
      const lote = casosBD.slice(i, i + BATCH_SIZE);
      const { error: errUpsert } = await (rawClient as any)
        .from("casos")
        .upsert(lote, { onConflict: "numeracion_caso" });

      if (errUpsert) {
        return {
          success: false,
          error: `Fallo en el lote de posición ${i}: ` + errUpsert.message,
        };
      }
      procesados += lote.length;
    }

    return {
      success: true,
      mensaje: `Sincronización completada. ${procesados.toLocaleString()} casos procesados en la base de datos.`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno desconocido.";
    return { success: false, error: "Error fatal de servidor: " + msg };
  }
}

/**
 * obtenerCasosExistentesDetalle()
 * Devuelve un array con los datos clave de todos los casos actuales.
 * Utilizado por el Panel de Carga para detectar cambios reales (Smart Diffing).
 */
export async function obtenerCasosExistentesDetalle(): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("casos")
    .select(`
      numeracion_caso, 
      estado_general, 
      descripcion, 
      cliente, 
      garantia, 
      estado_caso, 
      tipo_trabajo, 
      fecha_ingreso, 
      fecha_salida,
      sucursales(nombre_ciudad)
    `);

  if (error || !data) {
    console.error("Error obteniendo detalle de casos:", error);
    return [];
  }

  return data;
}
