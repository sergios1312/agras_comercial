"use client";

interface RowSucursal {
  sucursal: string;
  total: number;
  aTiempo: number;
  aplazado: number;
  atrasado: number;
  pctEtd: number;
  pctAplazado: number;
  pctAtrasado: number;
  tatAplazado: number;
  tatAtrasado: number;
}

interface Props {
  data: RowSucursal[];
}

export function TablaResumenSucursal({ data }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Resumen por Sucursal
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-3 py-2.5 text-xs text-slate-400 font-semibold uppercase tracking-widest">Sucursal</th>
              <th className="text-right px-3 py-2.5 text-xs text-slate-400 font-semibold uppercase tracking-widest">Total</th>
              <th className="text-right px-3 py-2.5 text-xs text-green-500 font-semibold uppercase tracking-widest">A Tiempo</th>
              <th className="text-right px-3 py-2.5 text-xs text-yellow-500 font-semibold uppercase tracking-widest">Aplazado<br/><span className="text-[10px] text-slate-500 font-normal">% / TAT</span></th>
              <th className="text-right px-3 py-2.5 text-xs text-red-500 font-semibold uppercase tracking-widest">Atrasado<br/><span className="text-[10px] text-slate-500 font-normal">% / TAT</span></th>
              <th className="text-right px-3 py-2.5 text-xs text-slate-400 font-semibold uppercase tracking-widest">% ETD</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.sucursal} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2.5 text-slate-200 font-medium">{row.sucursal}</td>
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{row.total}</td>
                <td className="px-3 py-2.5 text-right text-green-400 font-mono font-semibold">{row.aTiempo}</td>
                <td className="px-3 py-2.5 text-right text-yellow-400 font-mono font-semibold">
                  <div>{row.aplazado}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{row.pctAplazado.toFixed(1)}% / {row.tatAplazado.toFixed(1)}d</div>
                </td>
                <td className="px-3 py-2.5 text-right text-red-400 font-mono font-semibold">
                  <div>{row.atrasado}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{row.pctAtrasado.toFixed(1)}% / {row.tatAtrasado.toFixed(1)}d</div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className="font-bold font-mono text-sm"
                    style={{ color: `hsl(${Math.round((row.pctEtd / 100) * 120)}, 70%, 60%)` }}
                  >
                    {row.pctEtd.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-600 text-sm">Sin datos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
