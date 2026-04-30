import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Metadata } from "next";
import { ReportesClientWrapper } from "@/components/reportes/ReportesClientWrapper";
import { fetchAllParallel } from "@/lib/db";
import type { Repuesto, DocumentoReporte, DetalleDocumentoReporte } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Reportes y Cotizaciones",
  description: "Módulo para crear cotizaciones de venta, reparación y reportes de salida.",
};

// Interfaz para la vista en crudo de la tabla clientes
interface Cliente {
  id_cliente: string;
  nombre_razon_social: string;
}

export default async function ReportesPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const userEmail = user.usuario ?? "desconocido";
  const isAdmin = user.role === "admin";

  const db = createAdminClient();

  // Traer los repuestos para el buscador (solo campos necesarios)
  const [repuestos, clientesRes, documentos, detalles] = await Promise.all([
    fetchAllParallel<Repuesto>(db, "repuestos", "id, codigo, nombre, precio_venta, modelos_compatibles, codigo_sap", "id"),
    db.from("clientes").select("id_cliente, nombre_razon_social"),
    fetchAllParallel<DocumentoReporte>(db, "documentos_reporte", "*", "fecha_creacion", false),
    fetchAllParallel<DetalleDocumentoReporte>(db, "detalle_documento_reporte", "*, repuestos(id, codigo, nombre)", "id")
  ]);

  const clientes = (clientesRes.data as unknown as Cliente[]) ?? [];

  // Combinar documentos con sus detalles
  const historialConDetalles = documentos.map(doc => {
    return {
      ...doc,
      detalles: detalles.filter(d => d.documento_id === doc.id)
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📄 Reportes y Cotizaciones
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Genera documentos de forma rápida con cálculo automático de IGV.
          </p>
        </div>
      </div>
      
      <ReportesClientWrapper
        isAdmin={isAdmin}
        userEmail={userEmail}
        catalogo={repuestos}
        clientes={clientes}
        historial={historialConDetalles}
      />
    </div>
  );
}
