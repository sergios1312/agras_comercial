/**
 * generar-pdf-casos.ts
 * Generación de PDFs para el módulo de Casos:
 *  - Registro de Ingreso
 *  - Reporte de Salida
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Tipos ────────────────────────────────────────────────────

export interface DatosRegistroIngreso {
  numeroCaso: string;
  cliente: string;
  equipo: string;
  sucursal: string;
  fechaIngreso: string; // YYYY-MM-DD
  horaIngreso?: string; // HH:MM
  emisor: string;
}

export interface DatosReporteSalida {
  numeroCaso: string;
  cliente: string;
  equipo: string;
  sucursal: string;
  tipoTrabajo: string;
  descripcion: string;
  garantia: string;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  rtat: number | null;
  clasificacionSLA: string | null;
  estadoGeneral: string;
  emisor: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Paleta de colores ────────────────────────────────────────
const INDIGO: [number, number, number] = [79, 70, 229];
const DARK: [number, number, number] = [30, 30, 40];
const GRAY: [number, number, number] = [100, 100, 110];
const LIGHT: [number, number, number] = [245, 245, 250];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [200, 200, 210];
const GREEN: [number, number, number] = [22, 163, 74];

// ─── Header común ────────────────────────────────────────────

function dibujarHeader(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  codigo: string,
  fecha: string
) {
  const w = doc.internal.pageSize.getWidth();

  // Fondo del header
  doc.setFillColor(20, 20, 35);
  doc.rect(0, 0, w, 40, "F");

  // Franja de color izquierda
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, 4, 40, "F");

  // Título empresa
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("DJI AGRICULTURE", 12, 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 200);
  doc.text("GRUPO QTC S.A.C.  |  RUC: 20601844916", 12, 20);

  // Tipo de documento (derecha)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INDIGO);
  doc.text(titulo, w - 12, 13, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 180);
  doc.text(subtitulo, w - 12, 19, { align: "right" });
  doc.text(`Código: ${codigo}`, w - 12, 25, { align: "right" });
  doc.text(`Emitido: ${fecha}`, w - 12, 31, { align: "right" });

  // Línea decorativa inferior
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(1);
  doc.line(0, 41, w, 41);
}

// ─── Sección de datos en 2 columnas ──────────────────────────

function campoInfo(
  doc: jsPDF,
  label: string,
  valor: string,
  x: number,
  y: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(valor || "—", x, y + 5);
}

// ════════════════════════════════════════════════════════════
// PDF 1: REGISTRO DE INGRESO
// ════════════════════════════════════════════════════════════

export function generarPDFRegistroIngreso(datos: DatosRegistroIngreso) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const codigo = `ING-${datos.numeroCaso}-${Date.now().toString().slice(-4)}`;
  const ahora = new Date().toLocaleDateString("es-PE");

  dibujarHeader(doc, "REGISTRO DE INGRESO", "Comprobante de recepción", codigo, ahora);

  // ── Cuerpo ───────────────────────────────────────────────
  let y = 54;

  // Título sección
  doc.setFillColor(...LIGHT);
  doc.rect(12, y, w - 24, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INDIGO);
  doc.text("INFORMACIÓN DEL CASO", 16, y + 5.5);
  y += 16;

  // Datos del caso — 2 columnas
  const col1 = 14;
  const col2 = w / 2 + 4;

  campoInfo(doc, "N° de Caso", datos.numeroCaso, col1, y);
  campoInfo(doc, "Sucursal", datos.sucursal, col2, y);
  y += 18;

  campoInfo(doc, "Cliente", datos.cliente, col1, y);
  campoInfo(doc, "Equipo", datos.equipo, col2, y);
  y += 18;

  // Fecha y hora — destacado
  doc.setFillColor(230, 230, 255);
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.roundedRect(col1, y, w - 28, 20, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INDIGO);
  doc.text("FECHA Y HORA DE INGRESO REGISTRADA", col1 + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  const textoFechaHora = `${formatFecha(datos.fechaIngreso)}${datos.horaIngreso ? `  |  ${datos.horaIngreso}` : ""}`;
  doc.text(textoFechaHora, col1 + 4, y + 16);
  y += 30;

  // Nota informativa
  doc.setFillColor(255, 248, 220);
  doc.setDrawColor(200, 160, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(col1, y, w - 28, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 100, 0);
  doc.text("⚠  IMPORTANTE", col1 + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Esta fecha de ingreso es definitiva y no podrá ser modificada una vez registrada.",
    col1 + 4,
    y + 10
  );
  y += 22;

  // Firma del técnico
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);

  const fw = (w - 28 - 10) / 2;
  doc.line(col1, y + 20, col1 + fw, y + 20);
  doc.line(col2, y + 20, col2 + fw, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Firma del Técnico Receptor", col1, y + 25);
  doc.text("Firma del Cliente", col2, y + 25);
  y += 35;

  // Emisor
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`Documento emitido por: ${datos.emisor}`, col1, y);

  // ── Footer ───────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 170);
  doc.text(
    "Soporte técnico oficial DJI AGRICULTURE  |  Grupo QTC S.A.C.",
    w / 2,
    h - 8,
    { align: "center" }
  );
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(12, h - 12, w - 12, h - 12);

  doc.save(`Registro_Ingreso_${datos.numeroCaso}.pdf`);
}

// ════════════════════════════════════════════════════════════
// PDF 2: REPORTE DE SALIDA
// ════════════════════════════════════════════════════════════

export function generarPDFReporteSalida(datos: DatosReporteSalida) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const codigo = `SAL-${datos.numeroCaso}-${Date.now().toString().slice(-4)}`;
  const ahora = new Date().toLocaleDateString("es-PE");

  dibujarHeader(doc, "REPORTE DE SALIDA", "Resumen de cierre del caso", codigo, ahora);

  let y = 54;
  const col1 = 14;
  const col2 = w / 2 + 4;

  // ── Sección: Información del Caso ────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(12, y, w - 24, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INDIGO);
  doc.text("INFORMACIÓN DEL CASO", 16, y + 5.5);
  y += 14;

  campoInfo(doc, "N° de Caso", datos.numeroCaso, col1, y);
  campoInfo(doc, "Estado Final", datos.estadoGeneral, col2, y);
  y += 16;

  campoInfo(doc, "Cliente", datos.cliente, col1, y);
  campoInfo(doc, "Equipo / Modelo", datos.equipo, col2, y);
  y += 16;

  campoInfo(doc, "Sucursal", datos.sucursal, col1, y);
  campoInfo(doc, "Garantía", datos.garantia, col2, y);
  y += 16;

  // ── Sección: Detalles Técnicos ───────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(12, y, w - 24, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INDIGO);
  doc.text("DETALLES TÉCNICOS", 16, y + 5.5);
  y += 14;

  campoInfo(doc, "Tipo de Trabajo", datos.tipoTrabajo, col1, y);
  y += 14;

  // Descripción (puede ser larga)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("DESCRIPCIÓN / TRABAJO REALIZADO", col1, y);
  y += 5;

  doc.setFillColor(250, 250, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(col1, y, w - 28, 22, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const descLines = doc.splitTextToSize(datos.descripcion || "Sin descripción registrada.", w - 36);
  doc.text(descLines.slice(0, 3), col1 + 3, y + 6);
  y += 28;

  // ── Sección: Registro Temporal ───────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(12, y, w - 24, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INDIGO);
  doc.text("REGISTRO TEMPORAL", 16, y + 5.5);
  y += 14;

  campoInfo(doc, "Fecha de Ingreso", formatFecha(datos.fechaIngreso), col1, y);
  campoInfo(doc, "Fecha de Salida", formatFecha(datos.fechaSalida), col2, y);
  y += 16;

  // RTAT y SLA destacados
  const slaColor: Record<string, [number, number, number]> = {
    "A TIEMPO": GREEN,
    APLAZADO: [202, 138, 4],
    ATRASADO: [220, 38, 38],
  };
  const colorSLA = datos.clasificacionSLA ? slaColor[datos.clasificacionSLA] ?? GRAY : GRAY;

  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.roundedRect(col1, y, (w - 28) / 2 - 4, 22, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("RTAT (DÍAS HÁBILES)", col1 + 4, y + 6);
  doc.setFontSize(18);
  doc.setTextColor(...INDIGO);
  doc.text(datos.rtat !== null ? String(datos.rtat) : "—", col1 + 4, y + 18);

  doc.setFillColor(240, 255, 245);
  doc.setDrawColor(...colorSLA);
  doc.roundedRect(col2, y, (w - 28) / 2 - 4, 22, 3, 3, "FD");

  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("CLASIFICACIÓN SLA", col2 + 4, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorSLA);
  doc.text(datos.clasificacionSLA ?? "SIN CLASIFICAR", col2 + 4, y + 18);
  y += 32;

  // Firma
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  const fw2 = (w - 28 - 10) / 2;
  doc.line(col1, y + 20, col1 + fw2, y + 20);
  doc.line(col2, y + 20, col2 + fw2, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Firma del Técnico Responsable", col1, y + 25);
  doc.text("Conformidad del Cliente", col2, y + 25);
  y += 35;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(`Documento emitido por: ${datos.emisor}`, col1, y);

  // Footer
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 170);
  doc.text(
    "Soporte técnico oficial DJI AGRICULTURE  |  Grupo QTC S.A.C.",
    w / 2,
    h - 8,
    { align: "center" }
  );
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(12, h - 12, w - 12, h - 12);

  doc.save(`Reporte_Salida_${datos.numeroCaso}.pdf`);
}
