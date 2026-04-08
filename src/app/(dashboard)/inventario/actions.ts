"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ItemCarrito, EstadoPedido } from "@/types/database.types";
import { esNumeroCasoValido } from "@/lib/utils";

export interface PedidoState {
  error: string | null;
  success: string | null;
}

/**
 * submitPedido() — Server Action principal del módulo de inventario.
 * Implementa todas las reglas de negocio del Blueprint §3:
 *  1. Consumo normal: valida stock >= cantidad pedida para la sede seleccionada.
 *  2. Venta: solo permitido desde Lima. N° caso = "VENTA".
 *  3. N° caso de exactamente 4 dígitos (excepto ventas).
 *  4. Sin stock: salta validación de inventario, estado = "Pendiente de abastecimiento".
 */
export async function submitPedido(
  _prevState: PedidoState,
  formData: FormData
): Promise<PedidoState> {
  const supabase = await createClient();

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Por favor inicia sesión nuevamente.", success: null };

  const sucursalOrigen = user.email?.split("@")[0] ?? "desconocido";

  // Parsear el carrito desde el formulario
  const carritoRaw = formData.get("carrito") as string;
  let carrito: ItemCarrito[];
  try {
    carrito = JSON.parse(carritoRaw);
  } catch {
    return { error: "El carrito tiene un formato inválido.", success: null };
  }

  if (!carrito || carrito.length === 0) {
    return { error: "El carrito está vacío.", success: null };
  }

  const tipoSolicitud = formData.get("tipo_solicitud") as string;
  const esSinStock = tipoSolicitud === "Solicitud/Reserva sin stock";

  // ─── Validaciones por ítem ─────────────────────────────────
  for (const item of carrito) {
    // Regla 3: N° caso de 4 dígitos obligatorio (excepto ventas)
    if (!item.es_venta && !esNumeroCasoValido(item.numero_caso)) {
      return {
        error: `El N° de caso "${item.numero_caso}" para "${item.nombre}" no es válido. Debe ser exactamente 4 dígitos.`,
        success: null,
      };
    }

    // Regla 2: Ventas solo desde Lima
    if (item.es_venta && sucursalOrigen.toLowerCase() !== "lima") {
      return {
        error: `Las ventas solo pueden generarse desde Lima. Tu sucursal actual es "${sucursalOrigen}".`,
        success: null,
      };
    }

    // Regla 1: En consumo normal, validar stock
    if (!esSinStock && !item.es_venta) {
      if (!item.sucursal_destino) {
        return { error: `Debes seleccionar una sede de destino para "${item.nombre}".`, success: null };
      }
      // Consultar stock actual (validación en servidor, no en cliente)
      const { data: invData } = await supabase
        .from("inventario")
        .select("id, cantidad")
        .eq("repuesto_id", item.repuesto_id)
        .eq("sucursal_id", Number(item.sucursal_destino))
        .single();

      const inv = invData as unknown as { id: number; cantidad: number } | null;
      if (!inv || inv.cantidad < item.cantidad) {
        return {
          error: `Stock insuficiente para "${item.nombre}". Disponible: ${inv?.cantidad ?? 0}, pedido: ${item.cantidad}.`,
          success: null,
        };
      }
    }
  }

  // ─── Inserción masiva en historial_pedidos ─────────────────
  const estado: EstadoPedido = esSinStock ? "Pendiente de abastecimiento" : "Pendiente";

  const inserts = carrito.map((item) => ({
    tecnico_destino: item.sucursal_destino,
    sucursal_origen: sucursalOrigen,
    sucursal_destino: item.sucursal_destino || null,
    codigo: item.codigo,
    nombre_repuesto: item.nombre,
    numero_caso: item.es_venta ? "VENTA" : item.numero_caso.trim(),
    cantidad: item.cantidad,
    es_venta: item.es_venta,
    tipo_solicitud: tipoSolicitud as "Consumo normal" | "Solicitud/Reserva sin stock",
    estado,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawClient = supabase as any;

  const { error: insertError } = await rawClient
    .from("historial_pedidos")
    .insert(inserts);

  if (insertError) {
    return { error: `Error al registrar el pedido: ${insertError.message}`, success: null };
  }

  // ─── Descuento de inventario (solo consumo normal, no venta) ─
  if (!esSinStock) {
    for (const item of carrito.filter((i) => !i.es_venta)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invIds = (item as any).inv_ids as Record<string, number> | undefined;
      const invId = invIds?.[item.sucursal_destino];
      if (invId) {
        const stockNuevo = item.stock_disponible - item.cantidad;
        await rawClient
          .from("inventario")
          .update({ cantidad: stockNuevo })
          .eq("id", invId);
      }
    }
  }

  revalidatePath("/inventario");
  return {
    error: null,
    success: `✅ Pedido registrado correctamente. ${carrito.length} ítem(s) enviados.`,
  };
}
