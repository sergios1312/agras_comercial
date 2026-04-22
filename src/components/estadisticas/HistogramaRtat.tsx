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

// Custom logarithmic tick positions to give more visual space to 0-25 range
const LOG_TICKS = [0, 1, 2, 3, 5, 7, 10, 15, 20, 25, 35, 50, 75, 100];

// Map a real day value to its visual X position (logarithmic-like scale)
function daysToLogX(days: number): number {
  if (days <= 0) return 0;
  // Custom piecewise: 0-25 gets ~55% of space, 25-50 ~28%, 50-100 ~17%
  if (days <= 25) return (days / 25) * 55;
  if (days <= 50) return 55 + ((days - 25) / 25) * 28;
  return 83 + ((days - 50) / 50) * 17;
}

export function HistogramaRtat({ data }: Props) {
  // Transform data to use log-scaled x position
  const transformedData = data.map(d => ({
    ...d,
    xPos: daysToLogX(d.dias),
    label: `${d.dias} días`,
  }));

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
        Escala logarítmica · eje X en días · 0–100 días · mayor detalle en el rango 0–25
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={transformedData}
          margin={{ top: 20, right: 16, left: 0, bottom: 4 }}
          barCategoryGap="2%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="dias"
            type="number"
            domain={[0, 100]}
            scale="log"
            allowDataOverflow
            ticks={[1, 2, 3, 5, 10, 20, 50, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Días (escala logarítmica)", position: "insideBottomRight", offset: -4, fill: "#475569", fontSize: 11 }}
            tickFormatter={(v) => `${v}`}
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
          <Bar dataKey="frecuencia" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {transformedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.dias)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
