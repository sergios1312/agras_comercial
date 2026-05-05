import "server-only";
import exceljs from "exceljs";
import nodemailer from "nodemailer";
import { SUCURSALES_DATA } from "@/lib/constants";
import type { Caso } from "@/types/casos.types";

const MODO_PRUEBA = true;

// Todas las sucursales posibles donde se puede enviar garantía
export const SUCURSALES_MAESTRAS = [
  "Lima", "Chiclayo", "Ica", "Bellavista", "Nueva Cajamarca",
  "Pucallpa", "Jaen", "Huanuco", "Yurimaguas", "Piura"
];

// Obtiene correo de la sucursal desde constants
function getCorreo(sucursal: string): string {
  const s = SUCURSALES_DATA.find((x) => x.ciudad.toLowerCase() === sucursal.toLowerCase());
  return s?.correo ?? process.env.EMAIL_USER!;
}

const ADMIN_EMAIL_SERGIO = SUCURSALES_DATA.find(s => s.usuario === "admin")?.correo ?? process.env.EMAIL_USER;
const ADMIN_EMAIL_JESUS  = SUCURSALES_DATA.find(s => s.usuario === "admin_oficina")?.correo ?? process.env.EMAIL_USER;
const ADMIN_EMAIL_EDWIN  = "edwin.portilla@quetalcompra.com";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const FROM = `"Sistema Garantías QTC" <${process.env.EMAIL_USER}>`;

/**
 * Calculo de días calendario (incluye día de ingreso + 1)
 */
function calcularDiasCalendario(fechaIngreso: string | null): number {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ingreso = new Date(fechaIngreso);
  ingreso.setHours(0, 0, 0, 0);
  const diffTime = hoy.getTime() - ingreso.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Ya no necesitamos esSucursalMaestra() porque las sucursales vienen en targets

/**
 * Genera un buffer Excel usando exceljs con el styling exacto de la spec
 */
async function generarExcelSucursalBuffer(casos: Caso[]): Promise<Buffer> {
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet("RTAT Duración");

  // Definir columnas (orden estricto)
  worksheet.columns = [
    { header: "Numeración", key: "numeracion", width: 15 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Fecha de ingreso", key: "fechaIngreso", width: 18 },
    { header: "RTAT (Duración)", key: "rtat", width: 18 },
    { header: "Estado", key: "estado", width: 20 },
    { header: "Tipo de Trabajo", key: "tipo", width: 25 },
    { header: "Motivo", key: "motivo", width: 25 },
    { header: "Observaciones", key: "obs", width: 35 },
  ];

  // Insertar título (fila 1) y combinar celdas
  worksheet.spliceRows(1, 0, ["LISTA DE CASOS ABIERTOS - GARANTÍAS"]);
  worksheet.mergeCells("A1:H1");
  const titleCell = worksheet.getCell("A1");
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A4FA0" } };
  titleCell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 14 };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 30;

  // Insertar una fila vacía (fila 2)
  worksheet.spliceRows(2, 0, []);

  // Fila 3 es el Header real de la tabla (fue movido por los splices, ahora es la fila 3)
  const headerRow = worksheet.getRow(3);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Data rows empiezan en la fila 4
  casos.forEach((c) => {
    worksheet.addRow({
      numeracion: c.numeracionCaso,
      cliente: c.cliente,
      fechaIngreso: c.fechaIngreso ?? "NO INGRESADO",
      rtat: c.rtat !== null ? `${c.rtat} días` : "N/A",
      estado: c.estadoCaso,
      tipo: c.tipoTrabajo,
      motivo: "", // Intencionalmente vacío
      obs: "",    // Intencionalmente vacío
    });
  });

  // Striped Columns (Zebra) en filas pares de datos
  // La data empieza en rowIndex = 4. Las filas pares de data son 5, 7, 9...
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 3) {
      // rowNumber 4 es la data[0], 5 es data[1].
      if (rowNumber % 2 !== 0) { // Fila impar de excel (fila par de datos 0-indexed)
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FB" } };
        });
      }
    }
  });

  // Retornar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Genera el diccionario para la vista previa de las tablas (Front-End)
 */
export function obtenerVistaPrevia(casosTotales: Caso[], targetSucursales: string[]): Record<string, Caso[]> {
  const result: Record<string, Caso[]> = {};
  
  const abiertos = casosTotales.filter((c) => 
    c.estadoGeneral === "ABIERTO" && targetSucursales.some(t => t.toLowerCase() === c.sucursal.toLowerCase())
  );

  for (const c of abiertos) {
    if (!result[c.sucursal]) result[c.sucursal] = [];
    result[c.sucursal].push(c);
  }

  // Ordenamos para UX (de mayor edad a menor, ignorando los nulos temporalmente)
  for (const suc in result) {
    result[suc].sort((a, b) => {
      const d1 = calcularDiasCalendario(a.fechaIngreso);
      const d2 = calcularDiasCalendario(b.fechaIngreso);
      return d2 - d1;
    });
  }

  return result;
}

/**
 * Envía notificaciones a cada sucursal con sus casos ABIERTOS
 */
export async function procesarCorreosCasosAbiertos(casosTotales: Caso[], targetSucursales: string[]): Promise<{
  success: boolean;
  notificados: number;
  megaReporte: string[];
  error?: string;
}> {
  try {
    // 1. Filtrar solo los ABIERTOS correspondientes
    const abiertos = casosTotales.filter((c) => 
      c.estadoGeneral === "ABIERTO" && targetSucursales.some(t => t.toLowerCase() === c.sucursal.toLowerCase())
    );

    // 2. Agrupar por sucursal
    const porSucursal = new Map<string, Caso[]>();
    for (const c of abiertos) {
      if (!porSucursal.has(c.sucursal)) porSucursal.set(c.sucursal, []);
      porSucursal.get(c.sucursal)!.push(c);
    }

    const megaReporteText: string[] = [];
    let notificados = 0;

    // 3. Iterar por cada sucursal
    for (const [sucursal, casos] of porSucursal.entries()) {
      // Clasificación Multi-Bucket
      const sin_fecha = casos.filter(c => !c.fechaIngreso);
      const sin_tipo = casos.filter(c => c.fechaIngreso && (!c.tipoTrabajo || c.tipoTrabajo === "SIN TIPO" || c.tipoTrabajo === "NAN"));
      
      let completos = casos.filter(c => c.fechaIngreso && c.tipoTrabajo && c.tipoTrabajo !== "SIN TIPO" && c.tipoTrabajo !== "NAN");
      
      // Ordenar completos de mayor antigüedad a menor
      completos.sort((a, b) => {
        const d1 = calcularDiasCalendario(a.fechaIngreso);
        const d2 = calcularDiasCalendario(b.fechaIngreso);
        return d2 - d1;
      });

      megaReporteText.push(`Sucursal ${sucursal}: ${casos.length} abiertos, ${sin_fecha.length} sin fecha`);

      // Generar HTML
      let html = `<div style="font-family: Arial, sans-serif;">
        <h2 style="color:#1e293b;">Resumen de Casos Abiertos - ${sucursal}</h2>
        <p>Tienes <strong>${casos.length}</strong> casos pendientes.</p>
        <p>Se adjunta un Excel con el detalle. Las columnas "Motivo" y "Observaciones" deben ser completadas.</p>
      `;

      if (sin_fecha.length > 0) {
        html += `<div style="background:#fee2e2; border:1px solid #ef4444; padding:10px; border-radius:5px; margin-bottom:15px;">
          <h3 style="color:#991b1b; margin-top:0;">⚠️ Casos Sin Fecha de Ingreso (${sin_fecha.length})</h3>
          <ul>`;
        for (const c of sin_fecha) {
          html += `<li><strong>${c.numeracionCaso}</strong> - ${c.cliente}</li>`;
        }
        html += `</ul></div>`;
      }

      if (sin_tipo.length > 0) {
        html += `<div style="background:#ffedd5; border:1px solid #f97316; padding:10px; border-radius:5px; margin-bottom:15px;">
          <h3 style="color:#9a3412; margin-top:0;">⚠️ Casos Sin Tipo de Trabajo (${sin_tipo.length})</h3>
          <ul>`;
        for (const c of sin_tipo) {
          const dias = calcularDiasCalendario(c.fechaIngreso);
          html += `<li><strong>${c.numeracionCaso}</strong> - ${c.cliente} (${dias} días)</li>`;
        }
        html += `</ul></div>`;
      }

      if (completos.length > 0) {
        html += `<h3>Casos Abiertos Normales (${completos.length})</h3><ul>`;
        for (const c of completos) {
          const dias = calcularDiasCalendario(c.fechaIngreso);
          const flagUrgente = dias > 30 ? " <b><span style='color:red;'>⚠️ URGENTE</span></b>" : "";
          html += `<li><strong>${c.numeracionCaso}</strong> - ${c.cliente}: ${dias} días en proceso${flagUrgente}</li>`;
        }
        html += `</ul>`;
      }

      html += `<br/><p style="color:#64748b; font-size:12px;">Sistema de Garantías 2.0</p></div>`;

      const excelBuffer = await generarExcelSucursalBuffer(casos);

      const correoTecnico = getCorreo(sucursal);
      const to = MODO_PRUEBA ? ADMIN_EMAIL_SERGIO! : correoTecnico;
      const cc = MODO_PRUEBA ? [ADMIN_EMAIL_EDWIN] : [ADMIN_EMAIL_SERGIO!, ADMIN_EMAIL_JESUS!, ADMIN_EMAIL_EDWIN];

      const asunto = `📋 Reporte de Casos Retrasados — DJI AGRAS ${sucursal} (${casos.length} ABIERTOS)`;

      await transporter.sendMail({
        from: FROM,
        to,
        cc: cc.length > 0 ? cc.join(",") : undefined,
        subject: MODO_PRUEBA ? `[PRUEBA] ${asunto}` : asunto,
        html,
        attachments: [
          {
            filename: `Casos_Abiertos_${sucursal}_${new Date().toISOString().slice(0, 10)}.xlsx`,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        ]
      });

      notificados++;

      // Evasión Rate Limit: Sleep aleatorio 2 a 5 segundos
      const pausa = Math.random() * (5000 - 2000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, pausa));
    }

    // 4. Enviar Mega-Reporte final al Admin
    if (megaReporteText.length > 0) {
      const htmlMega = `<div style="font-family: Arial, sans-serif;">
        <h2 style="color:#1e293b;">Mega-Reporte Generado</h2>
        <p>Se enviaron los reportes a las siguientes sucursales con éxito:</p>
        <ul>${megaReporteText.map(t => `<li>${t}</li>`).join("")}</ul>
      </div>`;

      await transporter.sendMail({
        from: FROM,
        to: [ADMIN_EMAIL_JESUS!, ADMIN_EMAIL_EDWIN],
        cc: ADMIN_EMAIL_SERGIO!,
        subject: `📊 Mega-Reporte: Status de Correos Enviados`,
        html: htmlMega,
      });
    }

    return {
      success: true,
      notificados,
      megaReporte: megaReporteText,
    };
  } catch (error: any) {
    console.error("Error al procesar correos:", error);
    return {
      success: false,
      notificados: 0,
      megaReporte: [],
      error: error.message,
    };
  }
}
