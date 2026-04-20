"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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
 *  2. Venta: el repuesto DEBE provenir de Lima (sucursal_destino del ítem = Lima).
 *     Cualquier sucursal puede solicitarlo, pero la sede de origen debe ser Lima.
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

  // ─── Validación de Casos en BD (Lark) ──────────────────────────
  if (!configPedidos.modo_prueba) {
    const numerosDeCasoRequeridos = Array.from(
      new Set(
        carrito
          .filter((item) => !item.es_venta)
          .map((item) => item.numero_caso.trim())
      )
    );

    if (numerosDeCasoRequeridos.length > 0) {
      const dbAdmin = createAdminClient() as any;
      const { data: casosExistentes, error: errorCasos } = await dbAdmin
        .from("casos")
        .select("numeracion_caso, sucursales(nombre_ciudad)")
        .in("numeracion_caso", numerosDeCasoRequeridos);

      if (errorCasos) {
        return { error: `Error al validar los casos en BD: ${errorCasos.message}`, success: null };
      }

      const casoMap = new Map((casosExistentes || []).map((c: any) => [
        c.numeracion_caso,
        c.sucursales ? c.sucursales.nombre_ciudad : null
      ]));

      for (const item of carrito) {
        if (item.es_venta) continue;
        const num = item.numero_caso.trim();
        
        if (!casoMap.has(num)) {
          return { error: `El número de caso ${num} no existe en la base de datos de casos. Verifica nuevamente.`, success: null };
        }
        
        const sedeDelCaso = casoMap.get(num);
        if (typeof sedeDelCaso === "string") {
          const sedeDelCasoLower = sedeDelCaso.toLowerCase();
          const sedeDestinoLower = sedeDestino.toLowerCase();
          
          if (!sedeDelCasoLower.includes(sedeDestinoLower) && !sedeDestinoLower.includes(sedeDelCasoLower)) {
            return { error: `El caso ${num} pertenece a "${sedeDelCaso}", pero tu destino es "${sedeDestino}". El repuesto debe ser solicitado para la misma sede a la que pertenece el caso.`, success: null };
          }
        }
      }
    }
  }

  // ─── Validación de ítems (reglas sin DB) ────────────────────
  for (const item of carrito) {
    // Regla 3: N° caso de 4 dígitos obligatorio (excepto ventas)
    if (!item.es_venta && !esNumeroCasoValido(item.numero_caso)) {
      return {
        error: `El N° de caso "${item.numero_caso}" para "${item.nombre}" no es válido. Debe ser exactamente 4 dígitos.`,
        success: null,
      };
    }

    // Regla 2: Ventas solo cuando el repuesto proviene de Lima
    if (item.es_venta && !item.sucursal_destino.toLowerCase().includes("lima")) {
      return {
        error: `Las ventas solo pueden realizarse cuando la sede de origen del repuesto es Lima. El ítem "${item.nombre}" tiene como origen "${item.sucursal_destino || 'Sin asignar'}".`,
        success: null,
      };
    }

    // Regla 1: En consumo normal verificar que hay sede seleccionada
    if (!esSinStock && !item.es_venta && !item.sucursal_destino) {
      return { error: `Debes seleccionar una sede de destino para "${item.nombre}".`, success: null };
    }
  }

  // ─── Validación de stock en LOTE (1 sola consulta) ──────────
  // Recopilamos todos los inv_ids de ítems que necesitan validación de stock.
  if (!esSinStock) {
    const itemsConStock = carrito.filter(i => !i.es_venta && i.sucursal_destino);

    // Mapa invId → item para poder reportar el nombre al fallar
    const invIdAItem = new Map<number, ItemCarrito>();
    for (const item of itemsConStock) {
      const invId = item.inv_ids?.[item.sucursal_destino];
      if (!invId) {
        return {
          error: `Stock insuficiente para "${item.nombre}". Disponible: 0, pedido: ${item.cantidad}.`,
          success: null,
        };
      }
      invIdAItem.set(invId, item);
    }

    if (invIdAItem.size > 0) {
      // UNA sola consulta para todos los ítems
      const { data: stocks } = await supabase
        .from("inventario")
        .select("id, cantidad")
        .in("id", [...invIdAItem.keys()]);

      const stockMap = new Map(
        (stocks as unknown as { id: number; cantidad: number }[] ?? []).map(r => [r.id, r.cantidad])
      );

      for (const [invId, item] of invIdAItem) {
        const disponible = stockMap.get(invId) ?? 0;
        if (disponible < item.cantidad) {
          return {
            error: `Stock insuficiente para "${item.nombre}". Disponible: ${disponible}, pedido: ${item.cantidad}.`,
            success: null,
          };
        }
      }
    }
  }

  // Usamos cliente admin para la inserción y comprobaciones para evitar problemas de RLS
  const dbAdmin = createAdminClient() as any;

  // Si hay alguna venta, asegurar que el caso genérico '0000' exista en BD
  if (carrito.some((item) => item.es_venta)) {
    await dbAdmin.from("casos").upsert({
      numeracion_caso: "0000",
      estado_general: "CERRADO",
      descripcion: "Caso contenedor para repuestos vendidos",
      cliente: "VENTA DIRECTA",
      equipo: "VENTA",
      tipo_trabajo: "VENTA",
    }, { onConflict: "numeracion_caso" });
  }

  // ─── Inserción masiva en historial_pedidos ─────────────────
  const estado: EstadoPedido = "Pendiente";

  const inserts = carrito.map((item) => ({
    tecnico_destino: sedeDestino, // Ahora utiliza la sede de destino seleccionada (o propia)
    sucursal_origen: item.sucursal_destino || "Oficina Central", // De dónde viene el repuesto
    repuesto_id: item.repuesto_id,   // FK → repuestos(id)
    numero_caso: item.es_venta ? "0000" : item.numero_caso.trim(),
    cantidad: item.cantidad,
    tipo_reporte: calcularTipoReporte(item.sucursal_destino),
    estado,
  }));

  const tablaDestino = configPedidos.modo_prueba ? "historial_pedidos_prueba" : "historial_pedidos";

  const { error: insertError } = await dbAdmin
    .from(tablaDestino)
    .insert(inserts);

  if (insertError) {
    return { error: `Error al registrar el pedido: ${insertError.message}`, success: null };
  }

  // ─── Descuento de inventario en PARALELO (no modo prueba) ───
  if (!esSinStock && !configPedidos.modo_prueba) {
    const updates = carrito
      .filter(i => !i.es_venta)
      .flatMap(item => {
        const invId = (item.inv_ids as Record<string, number> | undefined)?.[item.sucursal_destino];
        if (!invId) return [];
        const stockNuevo = item.stock_disponible - item.cantidad;
        return [dbAdmin.from("inventario").update({ cantidad: stockNuevo }).eq("id", invId)];
      });
    // Todos los UPDATEs en paralelo — un solo roundtrip de latencia
    await Promise.all(updates);
  }

  revalidatePath("/inventario");

  // ── Notificación por email (async vía `after` de Next.js 15) ──
  // El envío de SMTP tarda 2-4 segundos. Al envolverlo en `after`, 
  // le decimos a Vercel que procese esto DESPUÉS de enviarle la 
  // respuesta final al usuario, cortando la demora a cero.
  const solicitanteStr = user.usuario ?? "desconocido";
  const modoPrueba = configPedidos.modo_prueba;
  after(async () => {
    await enviarNotificacionPedido(solicitanteStr, sedeDestino, carrito, esSinStock, modoPrueba);
  });

  return {
    error: null,
    success: `✅ Pedido registrado correctamente. ${carrito.length} ítem(s) enviados.`,
  };
}
