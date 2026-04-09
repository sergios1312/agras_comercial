"use client";

type Fmt = (v: any) => [string, string];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

interface DataRow {
  sucursal: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  pctEtd: number; // para ordenar
}

interface Props {
  data: DataRow[];
}

export function SemaforoSucursal({ data }: Props) {
  // Ordenar desc por ETD% (mayor eficiencia primero)
  const sorted = [...data].sort((a, b) => b.pctEtd - a.pctEtd);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Eficiencia por Sucursal (Ranking)
      </h3>
      <p className="text-xs text-slate-600 mb-4">Solo casos cerrados · ordenado por % A tiempo desc</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="sucursal"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number) => [`${Number(v).toFixed(1)}%`, ""]) as Fmt}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e" />
          <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
