"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";
import { cargarCasos } from "@/lib/casos";

export async function sincronizarCasosHaciaDB() {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  try {
    // Usamos el cliente admin para bypassar RLS — esta acción ya verifica que el usuario sea admin
    const rawClient = createAdminClient() as any;

    // 1. Obtener los casos parseados limpiamente del CSV (usa lógica ya muy madura del sistema)
    const casos = cargarCasos();
    if (!casos || casos.length === 0) {
      return { success: false, error: "No hay casos en el archivo CSV para procesar." };
    }

    // 2. Extraer Sucursales de DB para armar el diccionario "Nombre -> ID"

    const { data: sucursalesRows, error: errSuc } = await rawClient
      .from("sucursales")
      .select("id, nombre_ciudad");

    if (errSuc) {
      return { success: false, error: "Error conectando a la base de sucursales: " + errSuc.message };
    }

    const dictSucursales = new Map<string, number>();
    for (const row of (sucursalesRows || [])) {
      if (row.nombre_ciudad) {
        dictSucursales.set(row.nombre_ciudad.toLowerCase().trim(), row.id);
      }
    }

    // 3. Formatear la Data listos para Upsert
    const casosBD = casos.map(c => {
      // Buscar match de sucursal
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
        sucursal_id: sucId, // Foreign Key a sucursales(id)
        cliente: c.cliente || null,
        garantia: c.garantia || null,
        estado_caso: c.estadoCaso || null,
        tipo_trabajo: c.tipoTrabajo || null,
        fecha_ingreso: c.fechaIngreso || null,
        fecha_salida: c.fechaSalida || null,
      };
    });

    // 4. Batch Upsert hacia la tabla de DB.
    // Enviamos en bloques de 1000 para no reventar la conexión si hay demasiados (el CSV es enorme quizás)
    const BATCH_SIZE = 1000;
    let procesados = 0;
    
    for (let i = 0; i < casosBD.length; i += BATCH_SIZE) {
      const lote = casosBD.slice(i, i + BATCH_SIZE);
      const { error: errUpsert } = await rawClient
        .from("casos")
        .upsert(lote, { onConflict: "numeracion_caso" }); // IMPORTANTE: Requiere Constraint Unique en DB

      if (errUpsert) {
         return { success: false, error: `Fallo lote en posición ${i}: ` + errUpsert.message };
      }
      procesados += lote.length;
    }

    return { 
      success: true, 
      mensaje: `Sincronización Completada con éxito. Casos procesados en BD: ${procesados}` 
    };

  } catch (error: any) {
    return { success: false, error: "Error fatal de servidor interno: " + error.message };
  }
}
