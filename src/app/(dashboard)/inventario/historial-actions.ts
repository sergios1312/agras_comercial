"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/auth";
import { calcularTipoReporte } from "@/lib/transferencias";
import type { EstadoPedido, HistorialPedido, TipoReporte } from "@/types/database.types";

// ─── actualizarEstadoPedidoTecnico ───────────────────────────────────
/**
 * Permite a un TÉCNICO de sucursal cambiar el estado de un pedido
 * a "Enviado" (despachar) o "Finalizado" (confirmar recepción).
 * NO requiere ser admin. Solo puede mover a esos dos estados.
 */
export async function actualizarEstadoPedidoTecnico(
  id: number,
  nuevoEstado: "Enviado" | "Finalizado"
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("historial_pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) return { error: `Error al actualizar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── actualizarEstadoPedido ───────────────────────────────────
/**
 * Permite al ADMIN cambiar el estado de un pedido en historial_pedidos.
 * Protección: verifica que el usuario sea admin antes del UPDATE.
 */
export async function actualizarEstadoPedido(
  id: number,
  nuevoEstado: EstadoPedido
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede cambiar estados." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("historial_pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) return { error: `Error al actualizar: ${error.message}` };

  revalidatePath("/inventario");
  return { error: null };
}

// ─── editarPedidoAdmin ────────────────────────────────────────
/**
 * Permite al ADMIN editar todos los campos de un pedido.
 */
export async function editarPedidoAdmin(
  id: number,
  datos: Partial<Omit<HistorialPedido, "id">>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede editar pedidos de forma completa." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("historial_pedidos")
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
  id: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const user = await getSession();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin = user.role === "admin";
  if (!isAdmin) return { error: "Solo el administrador puede eliminar pedidos." };

  const rawClient = supabase as unknown as any;
  const { error } = await rawClient
    .from("historial_pedidos")
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
    .select("*")
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
    p.repuesto_codigo,
    `"${p.repuesto_nombre.replace(/"/g, '""')}"`, // escape comillas
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
