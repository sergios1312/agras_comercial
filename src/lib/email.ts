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
  getTransferType
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
  solicitante: string,
  sedeDestinoFisico: string,
  carrito: ItemCarrito[],
  esSinStock: boolean,
  modoPrueba: boolean = false
): Promise<void> {
  try {
    const grupos = agruparPorSucursal(carrito);

    const envios = [...grupos.entries()].map(async ([destino, items]) => {
      const { to, cc } = resolverReceptorPedido(destino || null, sedeDestinoFisico, modoPrueba);

      // Override táctico: modo prueba → solo al admin
      const toFinal   = modoPrueba ? ADMIN_EMAIL : to;
      const ccFinal   = modoPrueba ? [] : cc.filter(Boolean);

      const grupoEsSinStock = esSinStock || !destino;
      const html = generarCuerpoEmailHTML(
        sedeDestinoFisico.charAt(0).toUpperCase() + sedeDestinoFisico.slice(1),
        destino || null,
        items,
        grupoEsSinStock,
        modoPrueba ? { to, cc } : null
      );

      const asunto = modoPrueba
        ? `[PRUEBA] Envío de repuestos — ${destino || "Sin Stock"} → ${sedeDestinoFisico} (${items.length} ítems)`
        : `📦 Envío de repuestos — ${destino || "Sin Stock"} → ${sedeDestinoFisico} (${items.length} ítems)`;

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

export async function enviarCorreoTransferencia(datos: {
  sucursalDestino: string;
  identifier: string;
  bultos: string;
  empresa: string;
  ordenVenta: string;
  factura: string;
  pdfFileName: string;
}) {
  const { to, cc: ccOriginal } = resolverReceptorPedido("Lima", datos.sucursalDestino, false);
  
  // Agregar Edson y Fernando a CC (junto con Jesus y Sergio que ya vienen en ccOriginal)
  const cc = [...ccOriginal, "edson.quispe@quetalcompra.com", "fernando.chung@quetalcompra.com"];

  const asunto = `Envío a ${datos.sucursalDestino || 'Varias'} - ${datos.identifier}`;
  
  const pdfUrl = datos.pdfFileName 
      ? `https://ffaqsyprvehybfprfmyf.supabase.co/storage/v1/object/public/transferencias_pdfs/${datos.pdfFileName}.pdf`
      : undefined;

  const tipo = getTransferType(datos.sucursalDestino);
  const isNormal = tipo === "Transferencia";

  const html = `
    <div style="font-family: sans-serif; color: #333;">
      <p>Estimados,</p>
      <p>Se ha procedido con el despacho de la transferencia con destino a <b>${datos.sucursalDestino || 'Varias'}</b>.</p>
      
      <p><b>Detalles del Envío:</b></p>
      <ul>
        <li><b>Empresa de Transportes:</b> ${datos.empresa || "No especificado"}</li>
        <li><b>Cantidad de Bultos:</b> ${datos.bultos || "No especificado"}</li>
        ${!isNormal ? `
        <li><b>Número de Orden de Venta:</b> ${datos.ordenVenta || "No especificado"}</li>
        <li><b>Código de Factura:</b> ${datos.factura || "No especificado"}</li>
        ` : ''}
      </ul>
      
      ${pdfUrl ? `<p>Se ha adjuntado el documento PDF con el comprobante de despacho.</p>` : ''}
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      cc: cc.length > 0 ? cc.join(", ") : undefined,
      subject: asunto,
      html,
      attachments: pdfUrl ? [
        {
          filename: datos.pdfFileName,
          path: pdfUrl,
        }
      ] : []
    });
    console.log(`[EMAIL TRANSFERENCIA] Enviado a ${to} (CC: ${cc.join(", ")}) para transferencia ${datos.identifier}`);
  } catch (err) {
    console.error("[EMAIL ERROR] Transferencia:", err);
  }
}
