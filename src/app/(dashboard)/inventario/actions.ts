"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/auth";
import type { ItemCarrito, EstadoPedido } from "@/types/database.types";
import { esNumeroCasoValido } from "@/lib/utils";
import { enviarNotificacionPedido } from "@/lib/email";
import { calcularTipoReporte } from "@/lib/transferencias";
import { getConfigPedidos } from "@/app/(dashboard)/inventario/config-actions";


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
  const user = await getSession();
  if (!user) return { error: "Sesión expirada. Por favor inicia sesión nuevamente.", success: null };

  const sucursalOrigen = user.ciudad ?? "desconocido";
  const emailPrefix = user.usuario;
  // IMPORTANTE: sede_destino llega como user.usuario (lowercase, ej: "chiclayo")
  // pero historial_pedidos requiere user.ciudad (ej: "Chiclayo") para consistencia.
  // Si el form envía un valor distinto a sucursalOrigen, usamos ese valor tal cual
  // (solo aplica cuando admin selecciona una sede destino diferente).
  // Para técnicos de sucursal, sedeDestino SIEMPRE debe ser user.ciudad.
  const rawSedeDestino = (formData.get("sede_destino") as string) || "";
  const sedeDestino = rawSedeDestino && rawSedeDestino !== user.usuario
    ? rawSedeDestino   // admin eligió una sede destino diferente → respetar
    : sucursalOrigen;  // técnico de sucursal → usar user.ciudad (capitalización correcta)


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

  // ─── Validación de configuración de pedidos (solo usuarios no-admin) ──
  const isUserAdmin = user.role === "admin";
  const configPedidos = await getConfigPedidos();

  if (!isUserAdmin) {

    for (const item of carrito) {
      const tipo = calcularTipoReporte(item.sucursal_destino);
      if (tipo === "Abastecimiento" && !configPedidos.abastecimiento) {
        return {
          error: "No está permitido realizar pedidos de Abastecimiento por el momento.",
          success: null,
        };
      }
      if (tipo === "Envío Interno" && !configPedidos.internos) {
        return {
          error: "No está permitido realizar Pedidos Internos (entre sucursales) por el momento.",
          success: null,
        };
      }
      if (tipo === "Reposición" && !configPedidos.reposicion) {
        return {
          error: "No está permitido realizar Reposiciones (sin stock) por el momento.",
          success: null,
        };
      }
    }
  }

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
      
      const invId = item.inv_ids?.[item.sucursal_destino];
      
      if (!invId) {
        return {
          error: `Stock insuficiente para "${item.nombre}". Disponible: 0, pedido: ${item.cantidad}.`,
          success: null,
        };
      }

      // Consultar stock actual (validación en servidor, no en cliente)
      const { data: invData } = await supabase
        .from("inventario")
        .select("id, cantidad")
        .eq("id", invId)
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
  const estado: EstadoPedido = "Pendiente";

  const inserts = carrito.map((item) => ({
    tecnico_destino: sedeDestino, // Ahora utiliza la sede de destino seleccionada (o propia)
    sucursal_origen: item.sucursal_destino || "Oficina Central", // De dónde viene el repuesto
    repuesto_codigo: item.codigo,
    repuesto_nombre: item.nombre,
    numero_caso: item.es_venta ? "VENTA" : item.numero_caso.trim(),
    cantidad: item.cantidad,
    tipo_reporte: calcularTipoReporte(item.sucursal_destino),
    estado,
  }));

  // Casting a unknown antes de any para evitar advertencias de tipos si fuera necesario
  const rawClient = supabase as unknown as any;
  const tablaDestino = configPedidos.modo_prueba ? "historial_pedidos_prueba" : "historial_pedidos";

  const { error: insertError } = await rawClient
    .from(tablaDestino)
    .insert(inserts);

  if (insertError) {
    return { error: `Error al registrar el pedido: ${insertError.message}`, success: null };
  }

  // ─── Descuento de inventario (solo consumo normal y no modo prueba) ─
  if (!esSinStock && !configPedidos.modo_prueba) {
    for (const item of carrito.filter((i) => !i.es_venta)) {
      const invIds = (item as unknown as any).inv_ids as Record<string, number> | undefined;
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

  // ── Notificación por email (async, no bloquea respuesta) ─────
  // El error de email es silenciado internamente en enviarNotificacionPedido
  void enviarNotificacionPedido(sucursalOrigen, carrito, esSinStock, configPedidos.modo_prueba);

  return {
    error: null,
    success: `✅ Pedido registrado correctamente. ${carrito.length} ítem(s) enviados.`,
  };
}
