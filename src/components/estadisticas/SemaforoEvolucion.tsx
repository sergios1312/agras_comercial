"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
type Fmt = (v: any) => [string, string];

interface DataRow {
  periodo: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  total: number;
}

interface Props {
  data: DataRow[];
}

export function SemaforoEvolucion({ data }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Evolución de Eficiencia (Barras 100%)
      </h3>
      <p className="text-xs text-slate-600 mb-4">Solo casos cerrados · apilado porcentual</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="periodo" tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number) => [`${Number(v).toFixed(1)}%`, ""]) as Fmt}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
