"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { calcularTipoReporte } from "@/lib/transferencias";
import type { EstadoPedido, HistorialPedido, TipoReporte } from "@/types/database.types";

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const isAdmin =
    user.email?.startsWith("admin@") ||
    user.user_metadata?.role === "admin";
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { csv: null, error: "Sesión expirada." };

  const isAdmin =
    user.email?.startsWith("admin@") ||
    user.user_metadata?.role === "admin";

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
