"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { FileText, Wrench, PackageOpen } from "lucide-react";
import { DocumentoForm } from "./DocumentoForm";
import { HistorialReportes } from "./HistorialReportes";
import type { Repuesto, TipoDocumentoReporte } from "@/types/database.types";

interface Cliente {
  id_cliente: string;
  nombre_razon_social: string;
}

interface ReportesClientWrapperProps {
  isAdmin: boolean;
  userEmail: string;
  catalogo: Repuesto[];
  clientes: Cliente[];
  historial: any[]; // Se tipará mejor luego
}

export function ReportesClientWrapper({
  isAdmin,
  userEmail,
  catalogo,
  clientes,
  historial
}: ReportesClientWrapperProps) {
  const tabs = [
    { id: "cotizacion_venta", label: "Cotización de Venta", icon: <FileText className="w-4 h-4" /> },
    { id: "cotizacion_reparacion", label: "Cotización de Reparación", icon: <Wrench className="w-4 h-4" /> },
    { id: "reporte_salida", label: "Reporte de Salida", icon: <PackageOpen className="w-4 h-4" /> },
  ];

  const renderTabContent = (tipo: TipoDocumentoReporte) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado izquierdo: Formulario de Creación */}
        <div className="space-y-4">
          <DocumentoForm
            tipoDocumento={tipo}
            isAdmin={isAdmin}
            userEmail={userEmail}
            catalogo={catalogo}
            clientes={clientes}
          />
        </div>

        {/* Lado derecho: Historial */}
        <div className="space-y-4">
          <HistorialReportes 
            tipoDocumento={tipo}
            historial={historial.filter(h => h.tipo_documento === tipo)}
            catalogo={catalogo}
          />
        </div>
      </div>
    );
  };

  return (
    <Tabs tabs={tabs} defaultTab="cotizacion_venta">
      <div className="pt-2">{renderTabContent("cotizacion_venta")}</div>
      <div className="pt-2">{renderTabContent("cotizacion_reparacion")}</div>
      <div className="pt-2">{renderTabContent("reporte_salida")}</div>
    </Tabs>
  );
}
