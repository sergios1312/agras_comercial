import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TipoDocumentoReporte } from "@/types/database.types";

interface GenerarPDFProps {
  tipoDocumento: TipoDocumentoReporte;
  codigo: string;
  usuario: string;
  fecha: string;
  cliente?: string;
  dni?: string;
  caso?: string;
  descripcion?: string;
  repuestos: any[];
  totales: {
    base: number;
    igv: number;
    total: number;
  };
}

export function generarPDFReporte({
  tipoDocumento,
  codigo,
  usuario,
  fecha,
  cliente,
  dni,
  caso,
  descripcion,
  repuestos,
  totales
}: GenerarPDFProps) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colores profesionales
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const lightGray: [number, number, number] = [245, 245, 245];
  const darkGray: [number, number, number] = [50, 50, 50];
  const accentColor: [number, number, number] = [99, 102, 241];
  const borderColor: [number, number, number] = [200, 200, 200];
  const white: [number, number, number] = [255, 255, 255];

  // ========== ENCABEZADO CON LOGOS ==========
  // Fondo gris claro
  doc.setFillColor(248, 248, 250);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo QTC a la izquierda (texto en lugar de imagen)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("DJI AGRICULTURE", 14, 15);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("GRUPO QTC S.A.C.", 14, 20);
  doc.text("RUC: 20601844916", 14, 25);

  // Información a la derecha
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  
  const docType = tipoDocumento === "cotizacion_venta" ? "COTIZACIÓN" :
                  tipoDocumento === "cotizacion_reparacion" ? "COTIZACIÓN DE REPARACIÓN" : "REPORTE DE SALIDA";
  
  doc.text(docType, pageWidth - 14, 12, { align: "right" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento: ${codigo}`, pageWidth - 14, 18, { align: "right" });
  doc.text(`Fecha: ${fecha}`, pageWidth - 14, 23, { align: "right" });
  doc.text(`Válido hasta: ${new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString('es-PE')}`, pageWidth - 14, 28, { align: "right" });
  doc.text(`Emisor: ${usuario}`, pageWidth - 14, 33, { align: "right" });

  // Línea separadora
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(0, 46, pageWidth, 46);

  // ========== SECCIÓN CLIENTE/CASO ==========
  let startY = 55;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text("INFORMACIÓN DEL CLIENTE", 14, startY);

  // Recuadro de cliente
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.3);
  doc.rect(14, startY + 2, (pageWidth - 28) / 2 - 2, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);
  
  const clienteX = 17;
  let clienteY = startY + 7;
  
  if (cliente) {
    doc.text(`Cliente: ${cliente}`, clienteX, clienteY);
    clienteY += 5;
  }
  if (dni) {
    doc.text(`DNI/RUC: ${dni}`, clienteX, clienteY);
    clienteY += 5;
  }
  doc.text(`Ejecutivo: ${usuario}`, clienteX, clienteY);

  // Recuadro de validez
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.3);
  const boxX = 14 + (pageWidth - 28) / 2;
  doc.rect(boxX, startY + 2, (pageWidth - 28) / 2 - 2, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text("VALIDEZ Y CONDICIONES", boxX + 3, startY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Válido hasta: " + new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString('es-PE'), boxX + 3, startY + 12);
  doc.text("Forma de pago: Contado o crédito", boxX + 3, startY + 17);
  doc.text("Entrega: Sujeto a disponibilidad", boxX + 3, startY + 22);

  startY += 40;

  // ========== TABLA DE PRODUCTOS ==========
  const tableData = repuestos.map((r, index) => [
    (index + 1).toString(),
    r.nombre || "Producto sin nombre",
    r.codigo || "S/C",
    r.cantidad.toString(),
    `S/ ${parseFloat(r.precio_venta || 0).toFixed(2)}`,
    `S/ ${(parseFloat(r.precio_venta || 0) * r.cantidad).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['#', 'Descripción', 'Código', 'Cant.', 'P. Unitario', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      lineColor: primaryColor,
      lineWidth: 0.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkGray,
      lineColor: borderColor,
      lineWidth: 0.3
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 90, halign: 'left' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // ========== SECCIÓN DE TOTALES ==========
  const totalBoxWidth = 75;
  const totalBoxX = pageWidth - totalBoxWidth - 14;

  // Fondo gris
  doc.setFillColor(...lightGray);
  doc.rect(totalBoxX - 2, finalY - 2, totalBoxWidth + 4, 48, "F");

  // Borde principal
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(totalBoxX - 2, finalY - 2, totalBoxWidth + 4, 48);

  // Subtotal
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal (Base):", totalBoxX, finalY + 4);
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.text(`S/ ${totales.base.toFixed(2)}`, totalBoxX + 70, finalY + 4, { align: "right" });

  // IGV
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("IGV (18%):", totalBoxX, finalY + 11);
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.text(`S/ ${totales.igv.toFixed(2)}`, totalBoxX + 70, finalY + 11, { align: "right" });

  // Descuento (si aplica)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Descuento:", totalBoxX, finalY + 18);
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.text("S/ 0.00", totalBoxX + 70, finalY + 18, { align: "right" });

  // Línea separadora
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(totalBoxX, finalY + 23, totalBoxX + 72, finalY + 23);

  // TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("TOTAL:", totalBoxX, finalY + 30);
  doc.text(`S/ ${totales.total.toFixed(2)}`, totalBoxX + 70, finalY + 30, { align: "right" });

  // ========== TÉRMINOS Y CONDICIONES ==========
  const termsY = finalY + 60;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("TÉRMINOS Y CONDICIONES", 14, termsY);

  const termsText = [
    "• Esta cotización es válida por 7 días a partir de la fecha de emisión.",
    "• Grupo QTC S.A.C. no cuenta con políticas de devolución.",
    "• Toda cotización es válida según disponibilidad de stock.",
    "• Garantía: https://agriculture.qtc.pe/politicas-de-servicio-postventa-de-dji-agriculture/.",
    "• Soporte técnico oficial capacitado por DJI AGRICULTURE."
  ];

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  let termsCurrentY = termsY + 4;
  termsText.forEach(term => {
    doc.text(term, 14, termsCurrentY);
    termsCurrentY += 3.5;
  });

  // ========== MÉTODOS DE PAGO ==========
  const paymentY = termsCurrentY + 4;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("MÉTODOS DE PAGO - GRUPO QTC S.A.C.", 14, paymentY);

  const paymentData = [
    ["BANCO", "NRO DE CUENTA", "NRO CCI"],
    ["BCP S/", "193-2372882-0-03", "002193002372882003118"],
    ["BCP S/", "193-2501789-0-94", "002193002501789094115"],
    ["BCP USS", "193-2487371-1-68", "002193002487371168113"],
    ["BBVA S/", "0011-0616-01-00012617", "011-616-000100012617-05"],
    ["BBVA USS", "0011-0616-02-00124951", "011-616-000200124951-01"]
  ];

  autoTable(doc, {
    startY: paymentY + 3,
    head: [paymentData[0]],
    body: paymentData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: white,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      lineWidth: 0.3
    },
    bodyStyles: {
      fontSize: 6,
      textColor: darkGray,
      lineColor: borderColor,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'left' },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 60, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // ========== FOOTER ==========
  const footerY = pageHeight - 12;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Soporte técnico oficial de DJI AGRICULTURE | ", 14, footerY);
  doc.text(`Generado el ${new Date().toLocaleString('es-PE')} | Documento confidencial - Para uso exclusivo del cliente`, pageWidth - 14, footerY, { align: "right" });

  // Línea final
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(14, footerY - 3, pageWidth - 14, footerY - 3);

  // ========== GUARDAR PDF ==========
  doc.save(`${codigo}.pdf`);
}