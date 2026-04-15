// ============================================================
// src/lib/email.ts — Motor de envío de correos (Nodemailer SMTP)
// SERVER ONLY — usa credenciales de .env.local
// ============================================================
import "server-only";
import nodemailer from "nodemailer";
import type { ItemCarrito } from "@/types/database.types";
import {
  agruparPorSucursal,
  resolverReceptorPedido,
  generarCuerpoEmailHTML,
} from "@/lib/transferencias";
import { SUCURSALES_DATA } from "@/lib/constants";

// ─── Transporter SMTP (Gmail con App Password) ────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = `"Sistema Garantías QTC" <${process.env.EMAIL_USER}>`;

// Correo del administrador principal (Sergio) — destino en modo prueba
const ADMIN_EMAIL =
  SUCURSALES_DATA.find((s) => s.usuario === "admin")?.correo ??
  (process.env.EMAIL_USER as string);

/**
 * enviarNotificacionPedido()
 *
 * Implementa el motor inteligente de correos descrito en la spec:
 * 1. Agrupa los ítems del carrito por sucursal_destino (batching)
 * 2. Para cada grupo → resuelve TO + CC con resolverReceptorPedido()
 * 3. Si modoPrueba=true → redirige TODO solo a ADMIN_EMAIL
 * 4. Genera el HTML del email y lo envía
 * 5. Errores de email son silenciados (NO bloquean el pedido)
 */
export async function enviarNotificacionPedido(
  sucursalOrigen: string,
  carrito: ItemCarrito[],
  esSinStock: boolean,
  modoPrueba: boolean = false
): Promise<void> {
  try {
    const grupos = agruparPorSucursal(carrito);

    const envios = [...grupos.entries()].map(async ([destino, items]) => {
      const { to, cc } = resolverReceptorPedido(destino || null, modoPrueba);

      // Override táctico: modo prueba → solo al admin
      const toFinal   = modoPrueba ? ADMIN_EMAIL : to;
      const ccFinal   = modoPrueba ? [] : cc.filter(Boolean);

      const grupoEsSinStock = esSinStock || !destino;
      const html = generarCuerpoEmailHTML(
        sucursalOrigen,
        sucursalOrigen,
        destino || null,
        items,
        grupoEsSinStock
      );

      const asunto = modoPrueba
        ? `[PRUEBA] Solicitud de repuestos — ${sucursalOrigen} → ${destino || "Sin Stock"} (${items.length} ítems)`
        : `📦 Solicitud de repuestos — ${sucursalOrigen} → ${destino || "Sin Stock"} (${items.length} ítems)`;

      await transporter.sendMail({
        from: FROM,
        to: toFinal,
        cc: ccFinal.length > 0 ? ccFinal.join(", ") : undefined,
        subject: asunto,
        html,
      });

      if (modoPrueba) {
        console.log(
          `[EMAIL PRUEBA] Destino real: ${to} → redirigido a ${ADMIN_EMAIL} | ${items.length} ítems para "${destino || "Sin Stock"}"`
        );
      }
    });

    await Promise.allSettled(envios);
  } catch (err) {
    // El error de email nunca bloquea el flujo del pedido
    console.error("[EMAIL ERROR]", err);
  }
}
