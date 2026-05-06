import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ItemCotizacionPDF {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number; // precio_venta del catálogo
  descuento_individual: number; // % 0-100
}

export interface DatosClienteCotizacion {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
}

export interface GenerarCotizacionPDFProps {
  items: ItemCotizacionPDF[];
  descuento_total: number; // % 0-100 aplicado sobre el subtotal ya descontado por ítem
  cliente: DatosClienteCotizacion;
  fecha?: string; // ISO string; si no se pasa se usa la fecha actual
}

/** Calcula los totales de una cotización. */
export function calcularTotalesCotizacion(
  items: ItemCotizacionPDF[],
  descuento_total: number
) {
  const subtotalBruto = items.reduce(
    (acc, it) => acc + it.precio_unitario * it.cantidad,
    0
  );

  const subtotalConDescuentosIndividuales = items.reduce((acc, it) => {
    const subPrecio = it.precio_unitario * it.cantidad;
    const factor = 1 - (it.descuento_individual ?? 0) / 100;
    return acc + subPrecio * factor;
  }, 0);

  const descuentoGlobal =
    subtotalConDescuentosIndividuales * (descuento_total / 100);
  const totalFinal = subtotalConDescuentosIndividuales - descuentoGlobal;

  return {
    subtotalBruto,
    subtotalConDescuentosIndividuales,
    descuentoGlobal,
    totalFinal,
  };
}

export function generarCotizacionPDF({
  items,
  descuento_total,
  cliente,
  fecha,
}: GenerarCotizacionPDFProps): void {
  const doc = new jsPDF();

  const fechaStr = fecha
    ? new Date(fecha).toLocaleDateString("es-PE")
    : new Date().toLocaleDateString("es-PE");

  const codigoCotizacion = `COT-${Date.now()}`;

  // ── Paleta ──────────────────────────────────────────────────
  const INDIGO: [number, number, number] = [79, 70, 229];
  const DARK: [number, number, number] = [15, 23, 42];
  const GRAY: [number, number, number] = [100, 116, 139];

  // ── Cabecera ─────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("COTIZACIÓN DE REPUESTOS", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 220);
  doc.text(`Código: ${codigoCotizacion}`, 14, 22);
  doc.text(`Fecha: ${fechaStr}`, 14, 28);

  // ── Datos del cliente ─────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.text("DATOS DEL CLIENTE", 14, 42);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  const col1X = 14;
  const col2X = 110;
  doc.text(`Nombre:  ${cliente.nombre}`, col1X, 50);
  doc.text(`DNI:        ${cliente.dni}`, col2X, 50);
  doc.text(`Teléfono: ${cliente.telefono}`, col1X, 57);
  doc.text(`Email:      ${cliente.email}`, col2X, 57);

  // Separador
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.3);
  doc.line(14, 62, 196, 62);

  // ── Tabla de repuestos ────────────────────────────────────────
  const tableBody = items.map((it) => {
    const subBruto = it.precio_unitario * it.cantidad;
    const factor = 1 - (it.descuento_individual ?? 0) / 100;
    const subNeto = subBruto * factor;
    return [
      it.codigo,
      it.nombre,
      it.cantidad.toString(),
      `S/ ${it.precio_unitario.toFixed(2)}`,
      it.descuento_individual > 0 ? `${it.descuento_individual}%` : "—",
      `S/ ${subNeto.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 67,
    head: [["Código", "Descripción", "Cant.", "P. Unit.", "Dto. Ind.", "Subtotal"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: INDIGO, fontSize: 8, halign: "center" },
    styles: { fontSize: 8.5, textColor: [20, 20, 20] },
    columnStyles: {
      0: { cellWidth: 28, halign: "center" },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "center", cellWidth: 22 },
      5: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;

  // ── Bloque de totales ─────────────────────────────────────────
  const { subtotalConDescuentosIndividuales, descuentoGlobal, totalFinal } =
    calcularTotalesCotizacion(items, descuento_total);

  const totalesX = 120;
  let ty = finalY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Subtotal c/dto. individual:", totalesX, ty);
  doc.text(`S/ ${subtotalConDescuentosIndividuales.toFixed(2)}`, 196, ty, { align: "right" });

  if (descuento_total > 0) {
    ty += 6;
    doc.text(`Descuento total (${descuento_total}%):`, totalesX, ty);
    doc.text(`- S/ ${descuentoGlobal.toFixed(2)}`, 196, ty, { align: "right" });
  }

  // Línea separadora
  ty += 3;
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.line(totalesX, ty, 196, ty);
  ty += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("TOTAL:", totalesX, ty);
  doc.text(`S/ ${totalFinal.toFixed(2)}`, 196, ty, { align: "right" });

  // ── Pie de página ─────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.height;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    "Cotización generada automáticamente — válida por 7 días hábiles.",
    14,
    pageHeight - 10
  );

  // ── Descarga ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  doc.save(`cotizacion_${today}.pdf`);
}
