"use client";

type Fmt = (v: any) => [string, string];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface DataRow {
  dias: number;
  frecuencia: number;
}

interface Props {
  data: DataRow[];
  binSize?: number;
}

export function HistogramaRtat({ data, binSize = 1 }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Histograma RTAT (Frecuencia de Días)
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Escala lineal · eje X en días (Agrupado por {binSize} días)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="dias"
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Días", position: "insideBottomRight", offset: -4, fill: "#475569", fontSize: 11 }}
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
            labelFormatter={(label) => `${label} a ${Number(label) + binSize - 1} días`}
          />
          <Bar dataKey="frecuencia" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
