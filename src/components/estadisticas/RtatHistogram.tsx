"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface RtatDataPoint {
  sucursal: string;
  promedio_dias: number;
}

interface RtatHistogramProps {
  data: RtatDataPoint[];
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#818cf8", "#c4b5fd", "#ddd6fe"];

export function RtatHistogram({ data }: RtatHistogramProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-center h-52">
        <p className="text-sm text-slate-500">Sin datos de RTAT disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">📊 RTAT Promedio por Sucursal (días hábiles)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Días hábiles", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 10 }}
          />
          <YAxis
            dataKey="sucursal"
            type="category"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value) => [`${Number(value).toFixed(1)} días`, "RTAT Promedio"]}
          />
          <Bar dataKey="promedio_dias" radius={[0, 6, 6, 0]} label={{ position: "right", fill: "#94a3b8", fontSize: 11 }}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
