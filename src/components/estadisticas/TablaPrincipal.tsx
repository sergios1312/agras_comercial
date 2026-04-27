"use client";

import type { Caso } from "@/types/casos.types";

interface Props {
  casos: Caso[];
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const SLA_BADGE: Record<string, string> = {
  "A TIEMPO": "bg-green-900/40 text-green-400 border-green-500/30",
  "APLAZADO":  "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
  "ATRASADO":  "bg-red-900/40 text-red-400 border-red-500/30",
};

export function TablaPrincipal({ casos }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Tabla Principal de Casos
      </h3>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">N°</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Estado</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Sucursal</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Cliente</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Equipo</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Estado de caso</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Tipo Trabajo</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Ingreso</th>
              <th className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">Salida</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">RTAT (Días)</th>
              <th className="text-center px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-widest">SLA</th>
            </tr>
          </thead>
          <tbody>
            {casos.map((c) => (
              <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2 text-slate-400 font-mono">{c.numeracionCaso}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                    ${c.estadoGeneral === "CERRADO"
                      ? "bg-indigo-900/40 text-indigo-300 border-indigo-500/30"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/30"}`}>
                    {c.estadoGeneral}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-300">{c.sucursal}</td>
                <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{c.cliente || "—"}</td>
                <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate">{c.equipo || "—"}</td>
                <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{c.tipoTrabajo || "—"}</td>
                <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{c.estadoCaso || "—"}</td>
                <td className="px-3 py-2 text-slate-400 font-mono">{formatFecha(c.fechaIngreso)}</td>
                <td className="px-3 py-2 text-slate-400 font-mono">{formatFecha(c.fechaSalida)}</td>
                <td className="px-3 py-2 text-right text-slate-300 font-mono font-semibold">
                  {c.rtat !== null ? c.rtat : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.clasificacionSLA ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SLA_BADGE[c.clasificacionSLA]}`}>
                      {c.clasificacionSLA}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {casos.length === 0 && (
          <p className="text-center py-8 text-slate-600 text-sm">Sin datos para los filtros seleccionados.</p>
        )}
      </div>
      <p className="text-xs text-slate-600 mt-3">{casos.length} caso(s) mostrado(s)</p>
    </div>
  );
}

