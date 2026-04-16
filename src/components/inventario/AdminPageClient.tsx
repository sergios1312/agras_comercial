"use client";

import { useTransition, useState } from "react";
import { AdminConfigPanel } from "@/components/inventario/AdminConfigPanel";
import type { ConfigPedidos } from "@/types/database.types";
import { Package, ArrowLeftRight, PackageX, Settings, Database, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { sincronizarCasosHaciaDB } from "@/app/(dashboard)/administrador/admin-casos-actions";

interface AdminPageClientProps {
  configInicial: ConfigPedidos;
}

export function AdminPageClient({ configInicial }: AdminPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [syncStatus, setSyncStatus] = useState<{success?: boolean, message?: string} | null>(null);

  const handleSync = () => {
    setSyncStatus(null);
    startTransition(async () => {
       const result = await sincronizarCasosHaciaDB();
       setSyncStatus({ success: result.success, message: result.mensaje || result.error });
    });
  };

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
            Base de Datos (Sincronización)
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Sincroniza el archivo CSV local de casos con la base de datos segura en Supabase. Requiere que la tabla &apos;casos&apos; exista.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/40 p-5 rounded-xl border border-slate-800">
          <button
            onClick={handleSync}
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {isPending ? "Sincronizando DB..." : "Sincronizar Casos a CSV"}
          </button>
          
          {syncStatus && (
            <div className={`flex items-center gap-2 text-sm ${syncStatus.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {syncStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{syncStatus.message}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
