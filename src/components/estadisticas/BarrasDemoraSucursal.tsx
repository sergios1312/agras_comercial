"use client";

type Fmt = (v: any) => [string, string];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

interface DataRow {
  sucursal: string;
  demoraOpe: number;
}

interface Props {
  data: DataRow[];
}

export function BarrasDemoraSucursal({ data }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Demora Promedio por Sucursal
      </h3>
      <p className="text-xs text-slate-600 mb-6">
        Promedio de RTAT en días hábiles (casos cerrados)
      </p>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#64748b" tick={{ fill: "#64748b" }} />
            <YAxis 
              type="category" 
              dataKey="sucursal" 
              stroke="#64748b" 
              tick={{ fill: "#64748b", fontSize: 12 }} 
              width={100} 
            />
            <Tooltip
              cursor={{ fill: "#334155", opacity: 0.4 }}
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
              formatter={((v: number) => [`${v.toFixed(1)} días`, "Promedio Real"]) as Fmt}
            />
            <Bar dataKey="demoraOpe" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30}>
              <LabelList dataKey="demoraOpe" position="right" fill="#94a3b8" fontSize={11} formatter={(v: any) => v !== undefined && v !== null ? Number(v).toFixed(1) : ""} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
