"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, estadoToVariant } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { HistorialPedido } from "@/types/database.types";

interface SucursalExpanderProps {
  sucursal: string;
  pedidos: HistorialPedido[];
}

export function SucursalExpander({ sucursal, pedidos }: SucursalExpanderProps) {
  const [open, setOpen] = useState(false);
  const pendientes = pedidos.filter((p) => p.estado === "Pendiente").length;

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800/60
                   transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-200 capitalize">{sucursal}</span>
          <span className="text-xs text-slate-500">{pedidos.length} pedidos</span>
        </div>
        {pendientes > 0 && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
            {pendientes} pendiente(s)
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-700/50 bg-slate-900/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700/50">
                {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Estado"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors
                    ${i % 2 === 0 ? "" : "bg-slate-900/50"}`}
                >
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{formatDate(p.fecha_pedido)}</td>
                  <td className="px-4 py-2.5 font-mono text-indigo-400 text-xs">{p.repuesto_codigo}</td>
                  <td className="px-4 py-2.5 text-slate-200 max-w-xs truncate">{p.repuesto_nombre}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300 text-xs">{p.numero_caso}</td>
                  <td className="px-4 py-2.5 text-center text-slate-300">{p.cantidad}</td>
                  <td className="px-4 py-2.5">
                    <Badge label={p.estado} variant={estadoToVariant(p.estado)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
