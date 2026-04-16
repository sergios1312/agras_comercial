"use client";

import { AdminConfigPanel } from "@/components/inventario/AdminConfigPanel";
import { CargaCasosPanel } from "@/components/inventario/CargaCasosPanel";
import type { ConfigPedidos } from "@/types/database.types";
import { Package, ArrowLeftRight, PackageX, Settings, Database } from "lucide-react";

interface AdminPageClientProps {
  configInicial: ConfigPedidos;
}

export function AdminPageClient({ configInicial }: AdminPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Sección de control de pedidos */}
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

      {/* Sección de Base de Datos */}
      <section className="space-y-3 pt-6 border-t border-slate-800/60">
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

        <CargaCasosPanel />
      </section>
    </div>
  );
}
