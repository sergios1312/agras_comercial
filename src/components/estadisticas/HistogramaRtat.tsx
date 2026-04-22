"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

type Fmt = (v: any) => [string, string];

interface DataRow {
  dias: number;
  frecuencia: number;
}

interface Props {
  data: DataRow[];
}

export function HistogramaRtat({ data }: Props) {
  const getColor = (dias: number) => {
    if (dias <= 10) return "#22c55e";
    if (dias <= 25) return "#84cc16";
    if (dias <= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Histograma RTAT (Frecuencia de Días)
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Escala raíz cuadrada (compresión no lineal) · eje X en días · 0–100 días · mayor detalle en 0–25
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 16, left: 0, bottom: 4 }}
          barCategoryGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="dias"
            type="number"
            domain={[0, 100]}
            scale="sqrt"
            allowDataOverflow
            ticks={[0, 5, 10, 15, 25, 50, 75, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Días (escala expandida 0-25)", position: "insideBottomRight", offset: -4, fill: "#475569", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Casos", angle: -90, position: "insideLeft", fill: "#475569", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "#334155", opacity: 0.4 }}
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number) => [
              `${v} casos`,
              "Frecuencia",
            ]) as Fmt}
            labelFormatter={(label) => `${label} días`}
          />
          <Bar dataKey="frecuencia" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.dias)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
