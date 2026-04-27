// ============================================================
// src/lib/transferencias.ts — Lógica de negocio de transferencias
// Puro TypeScript — sin dependencias de servidor (importable en cliente si fuera necesario)
// ============================================================

import { SUCURSALES_DATA } from "@/lib/constants";
import type { ItemCarrito } from "@/types/database.types";

// ─── Tipos ───────────────────────────────────────────────────
export type TipoReporte = "Abastecimiento" | "Reposición" | "Envío Interno";

export const INTERCOMPANY_BRANCHES = ["bellavista", "pucallpa", "nueva cajamarca", "huánuco", "jaén", "yurimaguas"];

export function getTransferType(sucursal: string | null) {
  if (!sucursal) return "—";
  if (INTERCOMPANY_BRANCHES.some(s => sucursal.toLowerCase().includes(s))) return "Intercompany";
  return "Transferencia";
}

// ─── Resolución de correos desde SUCURSALES_DATA ─────────────
function getCorreo(usuario: string): string {
  return SUCURSALES_DATA.find((s) => s.usuario === usuario)?.correo ?? "";
}

// Destinatarios fijos según spec
const SERGIO = getCorreo("admin");        // sergio.araujo@quetalcompra.com
const JESUS  = getCorreo("admin_oficina"); // jesus.tapia@quetalcompra.com
const WILBER = getCorreo("admin_almacen"); // wilber.mallma@quetalcompra.com

/**
 * calcularTipoReporte()
 * Clasifica el pedido según la sede de destino del repuesto.
 * Regla 1: Lima o Lima-Almacen → Abastecimiento
 * Regla 2: Sin stock (null o vacío) → Reposición
 * Regla 3: Cualquier otra sucursal → Envío Interno
 */
export function calcularTipoReporte(destino: string | null | undefined): TipoReporte {
  if (!destino || destino.trim() === "" || destino === "SIN_STOCK") return "Reposición";
  const d = destino.toLowerCase();
  if (d.includes("lima")) return "Abastecimiento";
  return "Envío Interno";
}

/**
 * resolverReceptorPedido()
 * Devuelve el TO y CC según las reglas de enrutamiento de la spec y si es modo prueba.
 * 
 * @param origenRepuesto Ubicación física de donde sale el repuesto (ej: "Lima", "Chiclayo")
 * @param destinoSolicitante Sede que está pidiendo el repuesto (ej: "Ica")
 */
export function resolverReceptorPedido(
  origenRepuesto: string | null | undefined, 
  destinoSolicitante: string | null | undefined,
  modoPrueba: boolean = false
): {
  to: string;
  cc: string[];
} {
  // Si está en modo prueba, el motor de email lo redirigirá físicamente a Sergio,
  // pero esta función debe devolver quiénes serían los destinatarios reales.
  
  const tipo = calcularTipoReporte(origenRepuesto);

  // 1. Obtener email del responsable de la sucursal solicitante (Destino físico final)
  const sucSolicitante = SUCURSALES_DATA.find(
    (s) => s.ciudad.toLowerCase() === (destinoSolicitante ?? "").toLowerCase()
  );
  const correoSolicitante = sucSolicitante?.correo;

  if (tipo === "Reposición") {
    // Si es reposición, el "To" es Sergio, y el solicitante va en CC junto a Jesus
    return { to: SERGIO, cc: [JESUS, correoSolicitante].filter(Boolean) as string[] };
  }

  if (tipo === "Abastecimiento") {
    // TO: Wilber (Almacen) + Responsable de la sucursal que recibe
    const destinatarios = [WILBER, correoSolicitante].filter(Boolean) as string[];
    return { to: destinatarios.join(", "), cc: [JESUS, SERGIO] };
  }

  // Envío Interno → TO: Responsable de la sucursal origen + Responsable de la sucursal que recibe
  const sucOrigen = SUCURSALES_DATA.find(
    (s) => s.ciudad.toLowerCase() === (origenRepuesto ?? "").toLowerCase()
  );
  const correoOrigen = sucOrigen?.correo ?? SERGIO; // fallback a Sergio si no se encuentra
  
  const destinatarios = [correoOrigen, correoSolicitante].filter(Boolean) as string[];
  return { to: destinatarios.join(", "), cc: [JESUS, SERGIO] };
}

/**
 * agruparPorSucursal()
 * Agrupa los ítems del carrito por `sucursal_destino`.
 * Retorna un Map: sucursal_destino → ítems
 * Los ítems sin stock se agrupan bajo la clave "" (string vacío).
 */
export function agruparPorSucursal(
  carrito: ItemCarrito[]
): Map<string, ItemCarrito[]> {
  const mapa = new Map<string, ItemCarrito[]>();
  for (const item of carrito) {
    const key = item.sucursal_destino ?? "";
    if (!mapa.has(key)) mapa.set(key, []);
    mapa.get(key)!.push(item);
  }
  return mapa;
}

/**
 * generarCuerpoEmailHTML()
 * Genera el cuerpo HTML del correo automático según la spec §4.
 * Incluye: encabezado, tabla de repuestos, badge para sin stock.
 */
export function generarCuerpoEmailHTML(
  solicitante: string,
  origenRepuesto: string | null,
  items: ItemCarrito[],
  esSinStock: boolean,
  infoPrueba: { to: string, cc: string[] } | null = null
): string {
  const fecha = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const tipo = calcularTipoReporte(origenRepuesto);

  const badgeSinStock = esSinStock
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:8px 14px;border-radius:6px;font-weight:600;margin-bottom:16px;">
        ⚠️ SOLICITUD SIN STOCK — Requiere gestión de compra / importación
       </div>`
    : "";

  const filas = items
    .map(
      (i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;color:#6366f1;">${i.codigo}</td>
        <td style="padding:8px 12px;font-size:14px;">${i.nombre}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;">${i.cantidad}</td>
        <td style="padding:8px 12px;text-align:center;font-family:monospace;">${i.es_venta ? "VENTA" : i.numero_caso}</td>
        <td style="padding:8px 12px;text-align:center;">${i.es_venta ? "✅ Sí" : "—"}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#1e293b;padding:24px 28px;">
      <h2 style="color:#ffffff;margin:0;font-size:18px;">📦 Nueva Solicitud de Repuestos</h2>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Sistema de Garantías v2.0 — Quetalcompra</p>
    </div>

    <!-- Info de pedido -->
    <div style="padding:24px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      ${badgeSinStock}
      <table style="width:100%;font-size:13px;color:#475569;">
        <tr>
          <td style="padding:4px 0;"><strong>Origen del repuesto:</strong></td>
          <td style="padding:4px 0;">${origenRepuesto ?? "Oficina Central (Sin Stock)"}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Destino (Solicitante):</strong></td>
          <td style="padding:4px 0;">${solicitante}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Tipo:</strong></td>
          <td style="padding:4px 0;">${tipo}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Fecha:</strong></td>
          <td style="padding:4px 0;">${fecha}</td>
        </tr>
      </table>
      ${infoPrueba 
        ? `<div style="background:#e0e7ff;border:1px solid #6366f1;color:#3730a3;padding:12px;border-radius:6px;font-weight:600;margin-top:16px;">
            🧪 MODO PRUEBA ACTIVO<br/>
            <span style="font-weight:normal;font-size:12px;">El correo en modo normal llegaría a:<br/>
            <strong>TO:</strong> ${infoPrueba.to}<br/>
            <strong>CC:</strong> ${infoPrueba.cc.join(", ") || "Ninguno"}</span>
           </div>`
        : ""}
    </div>

    <!-- Tabla de repuestos -->
    <div style="padding:24px 28px;">
      <h3 style="margin:0 0 16px;font-size:14px;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">
        Ítems Solicitados (${items.length})
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;text-align:left;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">Código</th>
            <th style="padding:10px 12px;text-align:left;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">Repuesto</th>
            <th style="padding:10px 12px;text-align:center;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">Cant.</th>
            <th style="padding:10px 12px;text-align:center;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">N° Caso</th>
            <th style="padding:10px 12px;text-align:center;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">Venta</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Este correo fue generado automáticamente por el Sistema de Garantías v2.0. No responder a este email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
