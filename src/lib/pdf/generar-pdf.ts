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
  
  const title = tipoDocumento === "cotizacion_venta" ? "COTIZACIÓN DE VENTA" :
                tipoDocumento === "cotizacion_reparacion" ? "COTIZACIÓN DE REPARACIÓN" : "REPORTE DE SALIDA";

  // Header
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Documento N°: ${codigo}`, 14, 32);
  doc.text(`Fecha: ${fecha}`, 14, 38);
  doc.text(`Emitido por: ${usuario}`, 14, 44);

  // Datos Adicionales
  let startY = 54;
  doc.setTextColor(0);

  if (tipoDocumento === "cotizacion_venta") {
    if (cliente) {
      doc.text(`Cliente: ${cliente}`, 14, startY);
      startY += 6;
    }
    if (dni) {
      doc.text(`DNI / RUC: ${dni}`, 14, startY);
      startY += 6;
    }
  } else {
    doc.text(`Número de Caso: ${caso}`, 14, startY);
    startY += 6;
    if (descripcion) {
      const splitDesc = doc.splitTextToSize(`Descripción: ${descripcion}`, 180);
      doc.text(splitDesc, 14, startY);
      startY += (splitDesc.length * 5) + 2;
    }
  }

  startY += 5;

  // Tabla de repuestos
  const tableData = repuestos.map(r => [
    r.codigo,
    r.nombre,
    r.cantidad.toString(),
    `S/ ${r.precio_venta.toFixed(2)}`,
    `S/ ${(r.precio_venta * r.cantidad).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Código', 'Descripción', 'Cant.', 'P. Unit', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totales
  doc.setFontSize(10);
  doc.text(`Subtotal (Base): S/ ${totales.base.toFixed(2)}`, 140, finalY);
  doc.text(`IGV (18%): S/ ${totales.igv.toFixed(2)}`, 140, finalY + 6);
  
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: S/ ${totales.total.toFixed(2)}`, 140, finalY + 14);

  // Guardar PDF
  doc.save(`${codigo}.pdf`);
}
