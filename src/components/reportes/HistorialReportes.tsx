import { FileDown, FileText } from "lucide-react";
import type { TipoDocumentoReporte, DocumentoReporte, DetalleDocumentoReporte, Repuesto } from "@/types/database.types";
import { generarPDFReporte } from "@/lib/pdf/generar-pdf";

interface HistorialReportesProps {
  tipoDocumento: TipoDocumentoReporte;
  historial: (DocumentoReporte & { detalles: (DetalleDocumentoReporte & { repuestos?: Repuesto })[] })[];
  catalogo: Repuesto[];
}

export function HistorialReportes({ tipoDocumento, historial, catalogo }: HistorialReportesProps) {
  
  const handleDownload = (doc: any) => {
    // Reconstruir repuestos seleccionados para el PDF
    const repuestosSel = doc.detalles.map((d: any) => ({
      ...d.repuestos,
      cantidad: d.cantidad,
      precio_venta: d.precio_unitario,
    }));

    // Extraer DNI, Teléfono y Correo si están en datos_contacto
    let dni = "";
    let telefono = "";
    let correo = "";

    if (doc.clientes?.datos_contacto) {
      const parts = doc.clientes.datos_contacto.split("|");
      if (parts.length > 1) {
        parts.forEach((p: string) => {
          if (p.includes("DNI:")) dni = p.replace("DNI:", "").trim();
          if (p.includes("Telf:")) telefono = p.replace("Telf:", "").trim();
          if (p.includes("Email:")) correo = p.replace("Email:", "").trim();
        });
      } else {
        // Formato antiguo (solo DNI)
        dni = doc.clientes.datos_contacto.replace("DNI:", "").trim();
      }
    }

    generarPDFReporte({
      tipoDocumento: doc.tipo_documento,
      codigo: doc.codigo_generado,
      usuario: doc.usuario_emisor,
      fecha: new Date(doc.fecha_creacion).toLocaleDateString(),
      cliente: doc.clientes?.nombre_razon_social || "",
      dni: dni,
      telefono: telefono,
      correo: correo,
      caso: doc.casos?.numeracion_caso || (doc.caso_id ? doc.caso_id.toString() : ""),
      descripcion: doc.descripcion_trabajo || "",
      repuestos: repuestosSel,
      totales: { base: doc.subtotal, igv: doc.igv, total: doc.total }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-500" />
        Historial Reciente
      </h3>

      {historial.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-700/50 rounded-xl bg-slate-900/50">
          <p className="text-sm text-slate-500">No hay documentos generados.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {historial.map(doc => (
            <div key={doc.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                    {doc.codigo_generado}
                  </span>
                  <p className="text-xs text-slate-400">Emisor: <span className="text-slate-300">{doc.usuario_emisor}</span></p>
                  <p className="text-xs text-slate-400">Fecha: <span className="text-slate-300">{new Date(doc.fecha_creacion).toLocaleString()}</span></p>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  title="Descargar PDF"
                >
                  <FileDown className="w-5 h-5" />
                </button>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-500">{doc.detalles.length} repuestos</span>
                <span className="text-sm font-bold text-slate-200">Total: S/ {doc.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
