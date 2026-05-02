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
  repuestos: any[]; // RepuestoSeleccionado
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
  
  // Colores
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const lightGray: [number, number, number] = [245, 245, 245];
  const darkGray: [number, number, number] = [50, 50, 50];
  const accentColor: [number, number, number] = [99, 102, 241]; // Indigo más claro

  // ========== ENCABEZADO CON FONDO ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Título principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  
  const title = tipoDocumento === "cotizacion_venta" ? "COTIZACIÓN DE VENTA" :
                tipoDocumento === "cotizacion_reparacion" ? "COTIZACIÓN DE REPARACIÓN" : "REPORTE DE SALIDA";
  
  doc.text(title, 14, 20);

  // Subtítulo
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Documento: ${codigo}`, 14, 32);
  doc.text(`Fecha: ${fecha}`, 14, 39);
  doc.text(`Emitido por: ${usuario}`, 14, 46);

  // ========== INFORMACIÓN DEL CLIENTE/CASO ==========
  let startY = 65;
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);

  // Recuadro de información
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.rect(14, startY - 5, pageWidth - 28, 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  
  if (tipoDocumento === "cotizacion_venta") {
    doc.text("INFORMACIÓN DEL CLIENTE", 17, startY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);
    
    if (cliente) {
      doc.text(`Cliente: ${cliente}`, 17, startY + 8);
    }
    if (dni) {
      doc.text(`DNI / RUC: ${dni}`, 17, startY + 14);
    }
    doc.text(`Fecha: ${fecha}`, 17, startY + 20);
    doc.text(`Emitido por: ${usuario}`, 17, startY + 26);
  } else {
    doc.text("INFORMACIÓN DEL CASO", 17, startY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);
    
    doc.text(`Número de Caso: ${caso}`, 17, startY + 8);
    doc.text(`Fecha: ${fecha}`, 17, startY + 14);
    
    if (descripcion) {
      const splitDesc = doc.splitTextToSize(`Descripción: ${descripcion}`, 160);
      doc.text(splitDesc, 17, startY + 20);
    }
  }

  startY += 45;

  // ========== TABLA DE REPUESTOS ==========
  const tableData = repuestos.map(r => [
    r.codigo || "S/C",
    r.nombre || "Producto sin nombre",
    r.cantidad.toString(),
    `S/ ${parseFloat(r.precio_venta || 0).toFixed(2)}`,
    `S/ ${(parseFloat(r.precio_venta || 0) * r.cantidad).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Código', 'Descripción', 'Cant.', 'P. Unitario', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      lineColor: [100, 100, 100],
      lineWidth: 0.5
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkGray,
      lineColor: [200, 200, 200],
      lineWidth: 0.3
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'left' },
      1: { cellWidth: 80, halign: 'left' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // ========== SECCIÓN DE TOTALES ==========
  const totalBoxWidth = 80;
  const totalBoxX = pageWidth - totalBoxWidth - 14;

  // Fondo de totales
  doc.setFillColor(...lightGray);
  doc.rect(totalBoxX - 2, finalY - 2, totalBoxWidth + 4, 45, "F");

  // Borde
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(totalBoxX - 2, finalY - 2, totalBoxWidth + 4, 45);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  const subtotalLabel = "Subtotal:";
  const igvLabel = "IGV (18%):";
  const totalLabel = "TOTAL:";

  doc.text(subtotalLabel, totalBoxX, finalY + 5);
  doc.text(igvLabel, totalBoxX, finalY + 12);

  // Valores
  doc.setTextColor(...darkGray);
  doc.text(`S/ ${totales.base.toFixed(2)}`, totalBoxX + 60, finalY + 5, { align: 'right' });
  doc.text(`S/ ${totales.igv.toFixed(2)}`, totalBoxX + 60, finalY + 12, { align: 'right' });

  // Total (resaltado)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(totalLabel, totalBoxX, finalY + 22);
  doc.text(`S/ ${totales.total.toFixed(2)}`, totalBoxX + 60, finalY + 22, { align: 'right' });

  // ========== FOOTER ==========
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Este documento es una cotización válida. Consulta nuestros términos y condiciones.", 14, footerY);
  doc.text(`Generado el ${new Date().toLocaleString('es-PE')}`, pageWidth - 14, footerY, { align: 'right' });

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);

  // ========== GUARDAR PDF ==========
  doc.save(`${codigo}.pdf`);
}