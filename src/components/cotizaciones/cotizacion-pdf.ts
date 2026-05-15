// ============================================================
// src/components/cotizaciones/cotizacion-pdf.ts
// Generador de PDF replicando el layout del Excel
// ============================================================
import jsPDF from "jspdf";
import { DATOS_EMPRESA, IGV_RATE } from "./productos-data";
import { DJI_LOGO_BASE64 } from "./logo-base64";

export interface LineaCotizacion {
  item: number;
  descripcion: string;
  codSAP: string;
  cantidad: number;
  precioUnitario: number; // sin IGV
  igv: number;
  total: number;          // con IGV
}

export interface DatosCotizacion {
  // Empresa
  ejecutivo: string;
  telefonoEjecutivo: string;
  correoEjecutivo: string;
  // Cliente
  rucDni: string;
  nombreCliente: string;
  telefonoCliente: string;
  correoCliente: string;
  // Cotización
  numeroCotizacion: number;
  fecha: string;
  validoHasta: string;
  tipoCotizacion: string;
  descuento: number; // porcentaje (0-1)
  // Líneas
  lineas: LineaCotizacion[];
  // Totales
  subtotal: number;
  totalIGV: number;
  total: number;
}

export function generarCotizacionPDF(datos: DatosCotizacion): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Colores corporativos
  const colorVerde: [number, number, number] = [106, 168, 79];  // #6AA84F
  const colorVerdeOscuro: [number, number, number] = [80, 140, 55];
  const colorGris: [number, number, number] = [100, 100, 100];
  const colorGrisClaro: [number, number, number] = [200, 200, 200];
  const colorBlanco: [number, number, number] = [255, 255, 255];
  const colorFondo: [number, number, number] = [245, 247, 250];
  const colorNegro: [number, number, number] = [30, 30, 30];

  // ======= HEADER CON LOGO =======
  // Barra superior verde #6AA84F
  doc.setFillColor(...colorVerde);
  doc.rect(0, 0, pageW, 32, "F");

  // Logo DJI Agriculture (lado izquierdo)
  try {
    // Logo original es 2160x544, ratio ~3.97:1
    const logoH = 14;
    const logoW = logoH * 3.97;
    doc.addImage(DJI_LOGO_BASE64, "PNG", margin, 5, logoW, logoH);
  } catch {
    // Fallback: texto si el logo falla
    doc.setTextColor(...colorBlanco);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("DJI AGRICULTURE", margin, 14);
  }

  // Título cotización (debajo del logo)
  doc.setTextColor(...colorBlanco);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(DATOS_EMPRESA.titulo, margin, 26);

  // Número de cotización (derecha)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`#${datos.numeroCotizacion}`, pageW - margin, 14, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(DATOS_EMPRESA.tipoVenta, pageW - margin, 21, { align: "right" });

  // Fecha
  doc.setFontSize(8);
  doc.text(`Fecha: ${datos.fecha}`, pageW - margin, 28, { align: "right" });

  y = 39;

  // ======= INFO EMPRESA Y CLIENTE (2 columnas) =======
  // Columna izquierda - Empresa
  doc.setTextColor(...colorVerde);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE LA EMPRESA", margin, y);
  y += 4;

  doc.setDrawColor(...colorVerde);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 80, y);
  y += 4;

  doc.setTextColor(...colorGris);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(DATOS_EMPRESA.nombre, margin, y); y += 3.5;
  doc.text(`RUC: ${DATOS_EMPRESA.ruc}`, margin, y); y += 3.5;
  doc.text(DATOS_EMPRESA.direccion, margin, y, { maxWidth: 80 }); y += 7;
  doc.text(DATOS_EMPRESA.ciudad, margin, y); y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Ejecutivo Comercial:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(datos.ejecutivo, margin + 35, y); y += 3.5;
  doc.text(`Tel: ${datos.telefonoEjecutivo}`, margin, y); y += 3.5;
  doc.text(datos.correoEjecutivo, margin, y);

  // Columna derecha - Cliente
  const colDer = 115;
  let yDer = 39;

  doc.setTextColor(...colorVerde);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", colDer, yDer);
  yDer += 4;

  doc.setDrawColor(...colorVerde);
  doc.line(colDer, yDer, colDer + 80, yDer);
  yDer += 4;

  doc.setTextColor(...colorGris);
  doc.setFontSize(7.5);

  doc.setFont("helvetica", "bold");
  doc.text("RUC/DNI:", colDer, yDer);
  doc.setFont("helvetica", "normal");
  doc.text(datos.rucDni, colDer + 18, yDer); yDer += 3.5;

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", colDer, yDer);
  doc.setFont("helvetica", "normal");
  doc.text(datos.nombreCliente, colDer + 18, yDer, { maxWidth: 62 }); yDer += 3.5;

  doc.setFont("helvetica", "bold");
  doc.text("Telefono:", colDer, yDer);
  doc.setFont("helvetica", "normal");
  doc.text(datos.telefonoCliente, colDer + 18, yDer); yDer += 3.5;

  doc.setFont("helvetica", "bold");
  doc.text("Correo:", colDer, yDer);
  doc.setFont("helvetica", "normal");
  doc.text(datos.correoCliente, colDer + 18, yDer); yDer += 5;

  // Box con validez
  doc.setFillColor(...colorFondo);
  doc.setDrawColor(...colorGrisClaro);
  doc.roundedRect(colDer, yDer, 80, 12, 2, 2, "FD");
  doc.setTextColor(...colorVerde);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`Valido hasta: ${datos.validoHasta}`, colDer + 4, yDer + 5);
  doc.text(`Cotizacion: ${datos.tipoCotizacion}`, colDer + 4, yDer + 9);

  if (datos.descuento > 0) {
    doc.setTextColor(200, 50, 50);
    doc.text(`Descuento: ${(datos.descuento * 100).toFixed(0)}%`, colDer + 55, yDer + 5);
  }

  y = Math.max(y, yDer + 15) + 5;

  // ======= TABLA DE PRODUCTOS =======
  const colWidths = [10, 70, 25, 12, 25, 20, 25];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }
  const headers = ["#", "DESCRIPCION", "COD. SAP", "CANT.", "P. UNIT.", "IGV", "TOTAL"];

  // Header bg verde
  doc.setFillColor(...colorVerde);
  doc.rect(margin, y, contentW, 7, "F");

  doc.setTextColor(...colorBlanco);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => {
    const align = i >= 3 ? "right" : "left";
    const xPos = align === "right" ? colX[i] + colWidths[i] - 2 : colX[i] + 2;
    doc.text(h, xPos, y + 4.5, { align });
  });
  y += 7;

  // Filas de productos
  datos.lineas.forEach((linea, idx) => {
    const rowH = 7;
    if (y + rowH > 260) {
      doc.addPage();
      y = margin;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(...colorFondo);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    doc.text(String(linea.item), colX[0] + 2, y + 4.5);
    doc.text(linea.descripcion.substring(0, 45), colX[1] + 2, y + 4.5);
    doc.setFontSize(5.5);
    doc.text(linea.codSAP, colX[2] + 2, y + 4.5);
    doc.setFontSize(7);
    doc.text(String(linea.cantidad), colX[3] + colWidths[3] - 2, y + 4.5, { align: "right" });
    doc.text(`S/ ${linea.precioUnitario.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[4] + colWidths[4] - 2, y + 4.5, { align: "right" });
    doc.text(`S/ ${linea.igv.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[5] + colWidths[5] - 2, y + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`S/ ${linea.total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[6] + colWidths[6] - 2, y + 4.5, { align: "right" });

    y += rowH;
  });

  // Línea separadora
  doc.setDrawColor(...colorGrisClaro);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 3;

  // ======= TOTALES =======
  const totX = colX[4];
  const totW = colWidths[4] + colWidths[5] + colWidths[6];

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorGris);
  doc.text("Subtotal:", totX, y + 3);
  doc.text(`S/ ${datos.subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, totX + totW - 2, y + 3, { align: "right" });
  y += 5;

  doc.text("IGV (18%):", totX, y + 3);
  doc.text(`S/ ${datos.totalIGV.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, totX + totW - 2, y + 3, { align: "right" });
  y += 5;

  // Total con fondo verde
  doc.setFillColor(...colorVerde);
  doc.roundedRect(totX - 2, y, totW + 4, 8, 1, 1, "F");
  doc.setTextColor(...colorBlanco);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totX + 2, y + 5.5);
  doc.text(`S/ ${datos.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, totX + totW, y + 5.5, { align: "right" });
  y += 14;

  // ======= MÉTODOS DE PAGO =======
  // Check if we need a new page (~45mm for table + ~60mm for legal)
  if (y > 175) { doc.addPage(); y = margin; }

  doc.setTextColor(...colorVerde);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("MÉTODOS DE PAGO", margin, y);
  y += 5;

  // Table header
  const payColW = [45, 55, 80]; // Banco, Nro Cuenta, Nro CCI
  const payColX = [margin, margin + payColW[0], margin + payColW[0] + payColW[1]];
  const payHeaders = ["Banco", "Nro de Cuenta", "Nro CCI"];
  const payRowH = 5.5;

  doc.setFillColor(...colorVerde);
  doc.rect(margin, y, contentW, payRowH, "F");
  doc.setTextColor(...colorBlanco);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  payHeaders.forEach((h, i) => {
    doc.text(h, payColX[i] + 2, y + 3.8);
  });
  y += payRowH;

  // Bank account rows
  const cuentas = [
    { banco: "BCP S/",   cuenta: "193-2372882-0-03",        cci: "00219300237288200318" },
    { banco: "BCP S/",   cuenta: "193-2501789-0-94",        cci: "00219300250178909415" },
    { banco: "BCP US$",  cuenta: "193-2487371-1-68",        cci: "00219300248737116813" },
    { banco: "BBVA S/",  cuenta: "0011-0616-01-00012617",   cci: "011-616-000100012617-05" },
    { banco: "BBVA US$", cuenta: "0011-0616-02-00124951",   cci: "011-616-000200124951-01" },
  ];

  cuentas.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...colorFondo);
      doc.rect(margin, y, contentW, payRowH, "F");
    }

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(row.banco, payColX[0] + 2, y + 3.8);
    doc.text(row.cuenta, payColX[1] + 2, y + 3.8);
    doc.text(row.cci, payColX[2] + 2, y + 3.8);

    y += payRowH;
  });

  // Bottom border of table
  doc.setDrawColor(...colorGrisClaro);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  // ======= DESCARGOS LEGALES =======
  // Check if we need a new page for legal text (~60mm needed)
  if (y > 215) { doc.addPage(); y = margin; }

  // Sección 1: Notas numeradas
  doc.setTextColor(...colorGris);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");

  const notasNumeradas = [
    "\u00B9 Esta cotizacion es valida para Que Tal Compra.",
    "\u00B2 Que Tal Compra del Peru S.A.C no cuenta con politicas de devolucion.",
    "\u00B2 Vigencia segun indica el documento.",
    "\u2074 Toda cotizacion es valida segun disponibilidad de stock.",
    "\u2075 Politica de garantia en: https://agras.dji.pe/politicas-de-servicio-postventa-de-dji-agricultura/",
  ];

  notasNumeradas.forEach(nota => {
    doc.text(nota, margin, y, { maxWidth: contentW });
    y += 3;
  });

  y += 2;

  // Sección 2: Desistimiento
  doc.setDrawColor(...colorGrisClaro);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentW, y);
  y += 3;

  doc.setFontSize(5.5);
  doc.text(
    "En caso el cliente desista de su compra, luego de haber realizado el pago, se realizara una retencion de S/1,500 por gastos operativos internos. (*) Esto sera valido siempre y cuando el drone no haya sido activado, posterior a esto, no aplica lo indica.",
    margin, y, { maxWidth: contentW }
  );
  y += 9;

  // Sección 3: Envío
  doc.line(margin, y, margin + contentW, y);
  y += 3;
  doc.setFont("helvetica", "italic");
  doc.text("Los precios no incluyen gastos de envio.", margin, y, { maxWidth: contentW });
  y += 5;

  // Sección 4: Garantía
  doc.line(margin, y, margin + contentW, y);
  y += 3;

  doc.setTextColor(...colorVerde);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TIEMPO DE GARANTIA", margin, y);
  y += 4;

  doc.setTextColor(...colorGris);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Brindamos 12 meses de garantia o 1,500 ciclos de uso de la bateria (lo que ocurra primero). Para mas informacion sobre periodos de garantia visitar: https://agras.dji.pe/politicas-de-servicio-postventa-de-dji-agricultura/",
    margin, y, { maxWidth: contentW }
  );
  y += 9;

  // Sección 5: Soporte técnico
  doc.text(
    "Soporte de servicio tecnico oficial capacitado por DJI AGRICULTURE y cobertura en servicio tecnico en nuestras sucursales con repuestos originales.",
    margin, y, { maxWidth: contentW }
  );
  y += 7;

  // Sección 6: Sucursales
  doc.text(
    "Contamos con 10 sucursales a nivel nacional: Sede Central (Lima), Piura, Chiclayo, Ica, Bellavista, Pucallpa, Nueva Cajamarca, Yurimaguas, Huanuco y Jaen.",
    margin, y, { maxWidth: contentW }
  );

  // ======= FOOTER =======
  const footerY = 287;
  doc.setDrawColor(...colorVerde);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setTextColor(...colorGrisClaro);
  doc.setFontSize(5.5);
  doc.text(`${DATOS_EMPRESA.marca} | ${DATOS_EMPRESA.nombre} | RUC: ${DATOS_EMPRESA.ruc}`, pageW / 2, footerY + 4, { align: "center" });

  return doc;
}

/** Calcula los totales de una cotización */
export function calcularTotales(lineas: LineaCotizacion[]) {
  const total = lineas.reduce((sum, l) => sum + l.total, 0);
  const subtotal = total / (1 + IGV_RATE);
  const totalIGV = total - subtotal;
  return { subtotal, totalIGV, total };
}
