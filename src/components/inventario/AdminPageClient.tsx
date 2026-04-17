"use client";

import { AdminConfigPanel } from "@/components/inventario/AdminConfigPanel";
import { CargaCasosPanel } from "@/components/inventario/CargaCasosPanel";
import { CargaMaestroPanel } from "@/components/inventario/CargaMaestroPanel";
import { CargaSapPanel } from "@/components/inventario/CargaSapPanel";
import type { ConfigPedidos } from "@/types/database.types";
import type { UltimasActualizaciones } from "@/app/(dashboard)/inventario/config-actions";
import { Package, ArrowLeftRight, PackageX, Settings, Database, Activity, Box } from "lucide-react";
import { useState } from "react";

interface AdminPageClientProps {
  configInicial: ConfigPedidos;
  actualizaciones: UltimasActualizaciones;
}

export function AdminPageClient({ configInicial, actualizaciones }: AdminPageClientProps) {
  const [activeTab, setActiveTab] = useState<"pedidos" | "casos" | "maestro" | "sap">("pedidos");

  return (
    <div className="space-y-6">
      {/* Navegación de pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("pedidos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors font-medium text-sm ${
            activeTab === "pedidos"
              ? "bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-400"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </button>
        <button
          onClick={() => setActiveTab("casos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors font-medium text-sm ${
            activeTab === "casos"
              ? "bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
          }`}
        >
          <Activity className="w-4 h-4" />
          Casos (Garantías)
        </button>
        <button
          onClick={() => setActiveTab("maestro")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors font-medium text-sm ${
            activeTab === "maestro"
              ? "bg-amber-500/10 text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
          }`}
        >
          <Database className="w-4 h-4" />
          Maestro
        </button>
        <button
          onClick={() => setActiveTab("sap")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors font-medium text-sm ${
            activeTab === "sap"
              ? "bg-sky-500/10 text-sky-400 border-b-2 border-sky-400"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
          }`}
        >
          <Box className="w-4 h-4" />
          Stock SAP
        </button>
      </div>

      {/* Renderizado Condicional */}
      {activeTab === "pedidos" && (
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Control de Pedidos
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Habilita o inhabilita los tipos de pedido disponibles para todos los usuarios del sistema.
          Los cambios se aplican de forma inmediata.
        </p>

        {/* Leyenda de tipos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Abastecimiento</p>
              <p className="text-xs text-slate-500 mt-0.5">Pedidos con destino Lima (almacén central)</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Pedido Interno</p>
              <p className="text-xs text-slate-500 mt-0.5">Transferencias entre sucursales del sistema</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
              <PackageX className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Reposiciones</p>
              <p className="text-xs text-slate-500 mt-0.5">Solicitudes sin stock (requieren importación)</p>
            </div>
          </div>
        </div>

        <AdminConfigPanel configInicial={configInicial} />
      </section>
      )}

      {/* Sección de Base de Datos - Casos */}
      {activeTab === "casos" && (
        <section className="space-y-3 pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Sincronización de Casos
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Sube un archivo <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded text-xs">casos.csv</code> exportado
          desde Gestioo para previsualizar los cambios antes de confirmar la carga a la base de datos.
        </p>

        <CargaCasosPanel ultimaActualizacion={actualizaciones?.casos} />
        </section>
      )}

      {activeTab === "maestro" && (
        <CargaMaestroPanel ultimaActualizacion={actualizaciones?.maestro} />
      )}

      {activeTab === "sap" && (
        <CargaSapPanel ultimaActualizacion={actualizaciones?.stock} />
      )}
    </div>
  );
}
