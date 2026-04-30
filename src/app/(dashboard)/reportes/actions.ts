"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { TipoDocumentoReporte } from "@/types/database.types";

export interface CrearDocumentoPayload {
  tipo_documento: TipoDocumentoReporte;
  nombre_cliente?: string;
  dni_cliente?: string;
  numero_caso?: string;
  descripcion_trabajo?: string;
  repuestos: { id: number; cantidad: number; precio_unitario: number }[];
}

export async function crearDocumentoReporte(payload: CrearDocumentoPayload) {
  console.log("Creando documento reporte:", payload.tipo_documento);
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return { error: "No autorizado. Solo los administradores pueden crear documentos." };
    }

    const db = createAdminClient();

    let clienteId: string | null = null;
    let casoId: number | null = null;

    // Lógica para Cotización de Venta (Clientes)
    if (payload.tipo_documento === "cotizacion_venta" && payload.nombre_cliente) {
      // Buscar si el cliente existe por nombre (case insensitive)
      const { data: clienteExistente } = await db
        .from("clientes")
        .select("id_cliente")
        .ilike("nombre_razon_social", payload.nombre_cliente)
        .limit(1)
        .maybeSingle();

      if (clienteExistente) {
        clienteId = (clienteExistente as any).id_cliente;
      } else {
        // Crear nuevo cliente
        const { data: nuevoClienteUntyped, error: errCliente } = await db
          .from("clientes")
          .insert({
            nombre_razon_social: payload.nombre_cliente,
            datos_contacto: payload.dni_cliente ? `DNI: ${payload.dni_cliente}` : null
          } as any)
          .select("id_cliente")
          .single();
          
        const nuevoCliente = nuevoClienteUntyped as any;

        if (errCliente) throw new Error("Error creando el cliente: " + errCliente.message);
        clienteId = nuevoCliente.id_cliente;
      }
    }

    // Lógica para Reparación y Salida (Casos)
    if (payload.tipo_documento !== "cotizacion_venta" && payload.numero_caso) {
      // Validar contra la tabla casos
      const { data: casoDataUntyped, error: errCaso } = await db
        .from("casos")
        .select("id")
        .eq("numeracion_caso", payload.numero_caso)
        .limit(1)
        .single();
        
      const casoData = casoDataUntyped as any;

      if (errCaso || !casoData) {
        return { error: `El número de caso '${payload.numero_caso}' no existe en la base de datos.` };
      }
      casoId = casoData.id;
    }

    // Calcular totales
    let totalGeneral = 0;
    const detalles = payload.repuestos.map(r => {
      const subtotal = r.cantidad * r.precio_unitario;
      totalGeneral += subtotal;
      return {
        repuesto_id: r.id,
        cantidad: r.cantidad,
        precio_unitario: r.precio_unitario,
        subtotal
      };
    });

    const precioBase = totalGeneral / 1.18;
    const igv = totalGeneral - precioBase;

    // Generar código único (simple timestamp o sequence based)
    const prefijo = payload.tipo_documento === "cotizacion_venta" ? "COT-V" :
                    payload.tipo_documento === "cotizacion_reparacion" ? "COT-R" : "REP-S";
    const codigoGenerado = `${prefijo}-${Date.now().toString().slice(-6)}`;

    // Insertar Documento
    const { data: docDataUnyped, error: errDoc } = await db
      .from("documentos_reporte")
      .insert({
        tipo_documento: payload.tipo_documento,
        codigo_generado: codigoGenerado,
        usuario_emisor: user.usuario || "desconocido",
        cliente_id: clienteId,
        caso_id: casoId,
        descripcion_trabajo: payload.descripcion_trabajo,
        subtotal: precioBase,
        igv: igv,
        total: totalGeneral
      } as any)
      .select("id")
      .single();

    const docData = docDataUnyped as any;

    if (errDoc) {
      console.error("Error Supabase (documentos_reporte):", errDoc);
      throw new Error("Error creando documento: " + errDoc.message);
    }

    // Insertar Detalles
    const detallesAInsertar = detalles.map(d => ({
      documento_id: docData.id,
      ...d
    }));

    const { error: errDetalles } = await db
      .from("detalle_documento_reporte")
      .insert(detallesAInsertar as any);

    if (errDetalles) throw new Error("Error insertando detalles: " + errDetalles.message);

    revalidatePath("/reportes");
    return { success: "Documento generado exitosamente.", codigo: codigoGenerado, id: docData.id };

  } catch (error: any) {
    console.error("Error en crearDocumentoReporte:", error);
    return { error: error.message || "Ocurrió un error inesperado." };
  }
}
