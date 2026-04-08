"use client";

import { RefreshCw } from "lucide-react";
import { Badge, estadoToVariant } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { HistorialPedido } from "@/types/database.types";

interface HistorialTabProps {
  historial: HistorialPedido[];
  isAdmin: boolean;
  sucursalOrigen: string;
}

export function HistorialTab({ historial, isAdmin, sucursalOrigen }: HistorialTabProps) {
  const pedidosRealizados = historial.filter((p) => p.sucursal_origen === sucursalOrigen);
  const pedidosRecibidos = historial.filter(
    (p) => p.tecnico_destino === sucursalOrigen && p.sucursal_origen !== sucursalOrigen
  );

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <HistorialSection title="📦 Todos los pedidos (Abastecimiento)" pedidos={historial} />
      ) : (
        <>
          <HistorialSection title="📤 Pedidos Realizados" pedidos={pedidosRealizados} />
          <HistorialSection title="📥 Pedidos Recibidos" pedidos={pedidosRecibidos} />
        </>
      )}
    </div>
  );
}

function HistorialSection({ title, pedidos }: { title: string; pedidos: HistorialPedido[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Recargar
        </button>
      </div>

      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Origen", "Destino", "Estado"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    No hay registros.
                  </td>
                </tr>
              ) : (
                pedidos.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors
                      ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{p.codigo}</td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{p.nombre_repuesto}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-xs">{p.numero_caso}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{p.cantidad}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">{p.sucursal_origen}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">{p.sucursal_destino ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge label={p.estado} variant={estadoToVariant(p.estado)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
