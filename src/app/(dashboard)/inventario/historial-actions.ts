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
  is_test: boolean = false
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
    .update({ estado: nuevoEstado, ...fechaParaEstado(nuevoEstado) })
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
  datos: Omit<import("@/types/database.types").CasoReposicion, "id" | "fecha">
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("casos_reposicion")
    .insert([datos]);

  if (error) {
    if (error.code === "23505") return { error: "El código de caso ya existe." };
    return { error: `Error al crear: ${error.message}` };
  }

  revalidatePath("/inventario");
  return { error: null };
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

export async function crearTransferencia(
  datos: { codigo_transferencia: string; orden_venta: string; factura: string }
): Promise<{ id: number | null; error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { id: null, error: "No autorizado." };

  const rawClient = supabase as unknown as any;
  const { data, error } = await rawClient
    .from("transferencias")
    .insert([{ ...datos, estado: "Pendiente" }])
    .select("id")
    .single();

  if (error) return { id: null, error: `Error al crear transferencia: ${error.message}` };
  
  revalidatePath("/inventario");
  return { id: data.id, error: null };
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
  
  revalidatePath("/inventario");
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

  // 1. Obtener la transferencia
  const { data: trans, error: errTrans } = await rawClient
    .from("transferencias")
    .select("*")
    .eq("id", transferenciaId)
    .single();

  if (errTrans || !trans) return { error: "Transferencia no encontrada." };
  if (trans.estado !== "Pendiente") return { error: "La transferencia ya fue despachada." };

  // 2. Obtener los pedidos para verificar sucursal de destino y estado
  const { data: pedidos, error: errPedidos } = await rawClient
    .from("historial_pedidos")
    .select("id, tecnico_destino, estado")
    .in("id", pedidoIds);
  
  if (errPedidos || !pedidos) return { error: "Error al validar pedidos." };

  // Validaciones
  const invalidState = pedidos.find((p: any) => p.estado !== "Aprobado");
  if (invalidState) return { error: "Solo puedes asignar pedidos en estado 'Aprobado'." };

  // Validar destinos unicos
  const destinos = new Set(pedidos.map((p: any) => p.tecnico_destino));
  if (destinos.size > 1) {
    return { error: "Todos los pedidos seleccionados deben ir a la misma sucursal." };
  }

  const destinoPedidos = destinos.values().next().value as string;
  let destinoTransferencia = trans.sucursal_destino;

  // Si la transferencia estaba vacía, se "ancla" a esta sucursal
  if (!destinoTransferencia) {
    destinoTransferencia = destinoPedidos;
    await rawClient
      .from("transferencias")
      .update({ sucursal_destino: destinoTransferencia })
      .eq("id", transferenciaId);
  } else if (destinoTransferencia !== destinoPedidos) {
    return { error: `La transferencia es para ${destinoTransferencia}. No se pueden añadir pedidos para ${destinoPedidos}.` };
  }

  // 3. Asignar los IDs a la transferencia
  const { error: errUpdate } = await rawClient
    .from("historial_pedidos")
    .update({ transferencia_id: transferenciaId })
    .in("id", pedidoIds);

  if (errUpdate) return { error: `Error al asignar: ${errUpdate.message}` };

  revalidatePath("/inventario");
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

  revalidatePath("/inventario");
  return { error: null };
}

export async function despacharTransferencia(
  transferenciaId: number,
  datosFinales?: { codigo_transferencia: string; orden_venta: string; factura: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await getSession();
  if (!user || user.role !== "admin") return { error: "No autorizado." };

  const rawClient = supabase as unknown as any;

  // Actualizar la transferencia a Enviado
  const { error: errTrans } = await rawClient
    .from("transferencias")
    .update({
      estado: "Enviado",
      ...(datosFinales || {})
    })
    .eq("id", transferenciaId);

  if (errTrans) return { error: `Error al despachar transferencia: ${errTrans.message}` };

  // Ahora actualizar los pedidos que pertenezcan a esta transferencia
  const ahora = new Date().toISOString();
  const { error: errPedidos } = await rawClient
    .from("historial_pedidos")
    .update({
      estado: "Enviado",
      fecha_envio: ahora
    })
    .eq("transferencia_id", transferenciaId);

  if (errPedidos) return { error: `Transferencia marcada como despachada, pero error en repuestos: ${errPedidos.message}` };

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
  
  // Primero desvincular los pedidos
  await rawClient
    .from("historial_pedidos")
    .update({ transferencia_id: null })
    .eq("transferencia_id", transferenciaId);

  const { error } = await rawClient
    .from("transferencias")
    .delete()
    .eq("id", transferenciaId);

  if (error) return { error: `Error al eliminar transferencia: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}
