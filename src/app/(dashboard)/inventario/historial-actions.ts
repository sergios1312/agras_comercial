"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/auth";
import { calcularTipoReporte } from "@/lib/transferencias";
import type { EstadoPedido, HistorialPedido, TipoReporte } from "@/types/database.types";

// ─── Utilidad: fecha correspondiente al estado ────────────────────────
function fechaParaEstado(estado: string): Record<string, string> {
  const ahora = new Date().toISOString();
  if (estado === "Aprobado")  return { fecha_aprobacion: ahora };
  if (estado === "Enviado")   return { fecha_envio: ahora };
  if (estado === "Recibido" || estado === "Finalizado") return { fecha_recepcion: ahora };
  return {};
}

// ─── actualizarEstadoPedidoTecnico ───────────────────────────────────
/**
 * Permite a un TÉCNICO de sucursal cambiar el estado de un pedido
 * a "Enviado" (despachar) o "Finalizado" (confirmar recepción).
 * Auto-graba la fecha correspondiente al nuevo estado.
 */
export async function actualizarEstadoPedidoTecnico(
  id: number,
  nuevoEstado: "Enviado" | "Finalizado",
  is_test: boolean = false
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const rawClient = supabase as unknown as any;
  const tabla = is_test ? "historial_pedidos_prueba" : "historial_pedidos";
  const { error } = await rawClient
    .from(tabla)
    .update({ estado: nuevoEstado, ...fechaParaEstado(nuevoEstado) })
    .eq("id", id);

  if (error) return { error: `Error al actualizar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── actualizarEstadoPedido ───────────────────────────────────
/**
 * Permite al ADMIN cambiar el estado de un pedido en historial_pedidos.
 * Auto-graba la fecha correspondiente al nuevo estado.
 */
export async function actualizarEstadoPedido(
  id: number,
  nuevoEstado: EstadoPedido,
  is_test: boolean = false,
  extraData: any = {}
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede cambiar estados." };

  const rawClient = supabase as unknown as any;
  const tabla = is_test ? "historial_pedidos_prueba" : "historial_pedidos";
  const { error } = await rawClient
    .from(tabla)
    .update({ 
      estado: nuevoEstado, 
      ...fechaParaEstado(nuevoEstado),
      ...extraData 
    })
    .eq("id", id);

  if (error) return { error: `Error al actualizar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── editarFechasPedido ───────────────────────────────────────
/**
 * Permite al ADMIN editar manualmente las fechas de trazabilidad de un pedido.
 * Solo accesible para admins.
 */
export async function editarFechasPedido(
  id: number,
  fechas: {
    fecha_pedido?: string | null;
    fecha_aprobacion?: string | null;
    fecha_envio?: string | null;
    fecha_recepcion?: string | null;
  },
  is_test: boolean = false
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede editar fechas." };

  // Filtrar campos undefined para no sobrescribir con null involuntariamente
  const payload: Record<string, string | null> = {};
  if (fechas.fecha_pedido    !== undefined) payload.fecha_pedido    = fechas.fecha_pedido    ?? null;
  if (fechas.fecha_aprobacion !== undefined) payload.fecha_aprobacion = fechas.fecha_aprobacion ?? null;
  if (fechas.fecha_envio     !== undefined) payload.fecha_envio     = fechas.fecha_envio     ?? null;
  if (fechas.fecha_recepcion !== undefined) payload.fecha_recepcion  = fechas.fecha_recepcion ?? null;

  const rawClient = supabase as unknown as any;
  const tabla = is_test ? "historial_pedidos_prueba" : "historial_pedidos";
  const { error } = await rawClient
    .from(tabla)
    .update(payload)
    .eq("id", id);

  if (error) return { error: `Error al editar fechas: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── editarPedidoAdmin ────────────────────────────────────────
/**
 * Permite al ADMIN editar todos los campos de un pedido.
 */
export async function editarPedidoAdmin(
  id: number,
  datos: Partial<Omit<HistorialPedido, "id">>,
  is_test: boolean = false
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede editar pedidos de forma completa." };

  const rawClient = supabase as unknown as any;
  const tabla = is_test ? "historial_pedidos_prueba" : "historial_pedidos";

  if (datos.estado) {
    const { data: currentPedido } = await rawClient.from(tabla).select("estado").eq("id", id).single();
    if (currentPedido && currentPedido.estado !== datos.estado) {
      const fechas = fechaParaEstado(datos.estado);
      Object.assign(datos, fechas);
    }
  }

  const { error } = await rawClient
    .from(tabla)
    .update(datos)
    .eq("id", id);

  if (error) return { error: `Error al actualizar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── eliminarPedidoAdmin ────────────────────────────────────────
/**
 * Permite al ADMIN eliminar un pedido del historial por completo.
 */
export async function eliminarPedidoAdmin(
  id: number,
  is_test: boolean = false
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede eliminar pedidos." };

  const rawClient = supabase as unknown as any;
  const tabla = is_test ? "historial_pedidos_prueba" : "historial_pedidos";
  const { error } = await rawClient
    .from(tabla)
    .delete()
    .eq("id", id);

  if (error) return { error: `Error al eliminar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── exportarHistorialCSV ─────────────────────────────────────
/**
 * Genera un string CSV en memoria con los pedidos filtrados.
 *
 * filtro:
 *   - "todos"     → todos los registros (solo admin)
 *   - "Abastecimiento" | "Reposición" | "Envío Interno" → por tipo (admin)
 *   - "realizados" → pedidos donde sucursal_origen = sucursalUsuario (técnico)
 *   - "recibidos"  → pedidos donde tecnico_destino = sucursalUsuario (técnico)
 */
export async function exportarHistorialCSV(
  filtro: "todos" | "realizados" | "recibidos" | TipoReporte,
  sucursalUsuario: string
): Promise<{ csv: string | null; error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { csv: null, error: "Sesión expirada." };

  const isAdmin = user.role === "admin";

  // Seguridad: técnicos solo pueden exportar sus propias bandejas
  if (!isAdmin && filtro === "todos") {
    return { csv: null, error: "Sin permisos para exportar todo el historial." };
  }

  const rawClient = supabase as unknown as any;
  const { data, error } = await rawClient
    .from("historial_pedidos")
    .select("*, repuestos(codigo, nombre, codigo_sap)")
    .order("fecha_pedido", { ascending: false });

  if (error) return { csv: null, error: error.message };

  let pedidos = (data as HistorialPedido[]) ?? [];

  // Aplicar filtro
  if (filtro === "realizados") {
    // Pedidos realizados por el usuario actual
    pedidos = pedidos.filter((p) => p.tecnico_destino === sucursalUsuario);
  } else if (filtro === "recibidos") {
    // Pedidos donde el usuario actual es el "origen" (debe despachar)
    // Nota: sucursalUsuario es el prefix (piura), necesitamos el nombre de ciudad si se cruza
    // Pero en el sistema 1.0, sucursalUsuario solía ser el nombre de la ciudad en algunos contextos.
    // Vamos a usar la lógica de tecnico_destino para identificar al usuario.
    pedidos = pedidos.filter(
      (p) => p.sucursal_origen === sucursalUsuario && p.tecnico_destino !== sucursalUsuario
    );
  } else if (filtro !== "todos") {
    // Es un TipoReporte → filtrar por tipo calculado (ya está en el DB como tipo_reporte)
    const tipoStr = (filtro as string).toLowerCase();
    pedidos = pedidos.filter(
      (p) => p.tipo_reporte.toLowerCase() === tipoStr
    );
  }

  if (pedidos.length === 0) {
    return { csv: null, error: "No hay pedidos para exportar con los filtros seleccionados." };
  }

  // Generar CSV
  const headers = [
    "ID", "Fecha", "Origen", "Destino", "Código", "Repuesto",
    "N° Caso", "Cantidad", "Tipo", "¿Venta?", "Estado",
  ];

  const filas = pedidos.map((p) => [
    p.id,
    new Date(p.fecha_pedido).toLocaleDateString("es-PE"),
    p.sucursal_origen,
    p.tecnico_destino, // Destino es el técnico que solicita
    p.repuestos?.codigo ?? "N/A",
    `"${(p.repuestos?.nombre ?? "N/A").replace(/"/g, '""')}"`, // escape comillas
    p.numero_caso,
    p.cantidad,
    p.tipo_reporte,
    "No", // es_venta no está en el esquema real actual
    p.estado,
  ]);

  const csv = [headers.join(","), ...filas.map((f) => f.join(","))].join("\n");

  return { csv, error: null };
}

// ─── CRUD: Casos de Reposición ────────────────────────────────

export async function crearCasoReposicion(
  datos: Omit<import("@/types/database.types").CasoReposicion, "id" | "fecha" | "codigo_caso">
): Promise<{ error: string | null; caso?: any }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  
  // 1. Insert with a temporary code to satisfy NOT NULL constraint if present
  const { data: insertedData, error: insertError } = await rawClient
    .from("casos_reposicion")
    .insert([{ ...datos, codigo_caso: `TMP-${Date.now()}` }])
    .select("id")
    .single();

  if (insertError) {
    return { error: `Error al crear: ${insertError.message}` };
  }

  // 2. Update with the actual ID
  const newId = insertedData.id;
  const newCodigo = newId.toString();

  const { data: finalData, error: updateError } = await rawClient
    .from("casos_reposicion")
    .update({ codigo_caso: newCodigo })
    .eq("id", newId)
    .select()
    .single();

  if (updateError) {
    return { error: `Error al generar código: ${updateError.message}` };
  }

  revalidatePath("/inventario");
  return { error: null, caso: finalData };
}

export async function agregarRepuestoACaso(
  caso_reposicion_id: number,
  datosItem: {
    repuesto_id: number;
    numero_caso: string;
    cantidad: number;
    tecnico_destino: string;
  }
): Promise<{ error: string | null; pedido?: any }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  
  const nuevoPedido = {
    ...datosItem,
    sucursal_origen: "SIN_STOCK",
    tipo_reporte: "Reposición",
    estado: "Pendiente",
    caso_reposicion_id: caso_reposicion_id,
  };

  const { data, error } = await rawClient
    .from("historial_pedidos")
    .insert([nuevoPedido])
    .select("*, repuestos(codigo, nombre, codigo_sap)")
    .single();

  if (error) return { error: `Error al agregar repuesto: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null, pedido: data };
}

export async function editarCasoReposicion(
  id: number,
  datos: Partial<Omit<import("@/types/database.types").CasoReposicion, "id" | "fecha">>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("casos_reposicion")
    .update(datos)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "El código de caso ya existe." };
    return { error: `Error al editar: ${error.message}` };
  }

  revalidatePath("/inventario");
  return { error: null };
}

export async function eliminarCasoReposicion(
  id: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("casos_reposicion")
    .delete()
    .eq("id", id);

  if (error) return { error: `Error al eliminar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── CRUD: Transferencias de Abastecimiento ────────────────────────
// NOTA: Las funciones de transferencia NO usan revalidatePath.
// El cliente gestiona el estado de forma optimista (Optimistic UI),
// actualizando la UI instantáneamente sin esperar al servidor.

export async function crearTransferencia(
  datos: { codigo_transferencia: string; orden_venta: string; factura: string }
): Promise<{ transferencia: { id: number; codigo_transferencia: string; orden_venta: string; factura: string; sucursal_destino: string | null; estado: string } | null; error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { transferencia: null, error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { data, error } = await rawClient
    .from("transferencias")
    .insert([{ ...datos, estado: "Pendiente" }])
    .select("id, codigo_transferencia, orden_venta, factura, sucursal_destino, estado")
    .single();

  if (error) return { transferencia: null, error: `Error al crear transferencia: ${error.message}` };
  return { transferencia: data, error: null };
}

export async function editarTransferencia(
  transferenciaId: number,
  datos: { codigo_transferencia?: string; orden_venta?: string; factura?: string; sucursal_destino?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("transferencias")
    .update(datos)
    .eq("id", transferenciaId);

  if (error) return { error: `Error al editar transferencia: ${error.message}` };
  return { error: null };
}

export async function asignarATransferencia(
  pedidoIds: number[],
  transferenciaId: number
): Promise<{ error: string | null }> {
  if (pedidoIds.length === 0) return { error: null };
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;

  // Paralelizar: obtener la transferencia y los pedidos al mismo tiempo
  const [{ data: trans, error: errTrans }, { data: pedidos, error: errPedidos }] = await Promise.all([
    rawClient.from("transferencias").select("id, estado, sucursal_destino").eq("id", transferenciaId).single(),
    rawClient.from("historial_pedidos").select("id, tecnico_destino, estado").in("id", pedidoIds),
  ]);

  if (errTrans || !trans) return { error: "Transferencia no encontrada." };
  if (trans.estado !== "Pendiente") return { error: "La transferencia ya fue despachada." };
  if (errPedidos || !pedidos || pedidos.length === 0) return { error: "No se encontraron los pedidos a asignar." };

  // Validaciones
  const invalidState = pedidos.find((p: any) => p.estado !== "Aprobado");
  if (invalidState) return { error: "Solo puedes asignar pedidos en estado 'Aprobado'." };

  const destinos = new Set(pedidos.map((p: any) => p.tecnico_destino));
  if (destinos.size > 1) return { error: "Todos los pedidos seleccionados deben ir a la misma sucursal." };

  const destinoPedidos = destinos.values().next().value as string;
  let destinoTransferencia = trans.sucursal_destino;

  // Si la transferencia estaba vacía, anclarla a esta sucursal en paralelo con la asignación
  const promises: Promise<any>[] = [
    rawClient.from("historial_pedidos").update({ transferencia_id: transferenciaId }).in("id", pedidoIds),
  ];

  if (!destinoTransferencia) {
    promises.push(
      rawClient.from("transferencias").update({ sucursal_destino: destinoPedidos }).eq("id", transferenciaId)
    );
  } else if (destinoTransferencia !== destinoPedidos) {
    return { error: `La transferencia es para ${destinoTransferencia}. No se pueden añadir pedidos para ${destinoPedidos}.` };
  }

  const results = await Promise.all(promises);
  const errUpdate = results[0].error;
  if (errUpdate) return { error: `Error al asignar: ${errUpdate.message}` };

  return { error: null };
}

export async function removerDeTransferencia(
  pedidoIds: number[]
): Promise<{ error: string | null }> {
  if (pedidoIds.length === 0) return { error: null };
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("historial_pedidos")
    .update({ transferencia_id: null })
    .in("id", pedidoIds);

  if (error) return { error: `Error al remover: ${error.message}` };
  return { error: null };
}

export async function despacharTransferencia(
  transferenciaId: number,
  datosFinales?: { codigo_transferencia: string; orden_venta: string; factura: string },
  fecha_envio_custom?: string,
  datosCorreo?: { bultos: string; empresa: string; sucursal_destino: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const ahora = fecha_envio_custom || new Date().toISOString();

  // Paralelizar: actualizar la transferencia y los pedidos al mismo tiempo
  const [{ error: errTrans }, { error: errPedidos }] = await Promise.all([
    rawClient.from("transferencias").update({ estado: "Enviado", ...(datosFinales || {}) }).eq("id", transferenciaId),
    rawClient.from("historial_pedidos").update({ estado: "Enviado", fecha_envio: ahora }).eq("transferencia_id", transferenciaId),
  ]);

  if (errTrans) return { error: `Error al despachar transferencia: ${errTrans.message}` };
  if (errPedidos) return { error: `Transferencia marcada, pero error en repuestos: ${errPedidos.message}` };

  if (datosCorreo) {
    try {
      const { enviarCorreoTransferencia } = await import("@/lib/email");
      await enviarCorreoTransferencia({
        sucursalDestino: datosCorreo.sucursal_destino,
        identifier: datosFinales?.codigo_transferencia || `TR-${transferenciaId}`,
        bultos: datosCorreo.bultos,
        empresa: datosCorreo.empresa,
        ordenVenta: datosFinales?.orden_venta || "",
        factura: datosFinales?.factura || "",
        pdfFileName: datosFinales?.codigo_transferencia || ""
      });
    } catch (e) {
      console.error("Error enviando correo de transferencia:", e);
    }
  }

  revalidatePath("/inventario");
  return { error: null };
}

export async function eliminarTransferencia(
  transferenciaId: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;

  // Desanclar pedidos y luego eliminar la transferencia
  await rawClient.from("historial_pedidos").update({ transferencia_id: null }).eq("transferencia_id", transferenciaId);

  const { error } = await rawClient.from("transferencias").delete().eq("id", transferenciaId);
  if (error) return { error: `Error al eliminar transferencia: ${error.message}` };

  return { error: null };
}


