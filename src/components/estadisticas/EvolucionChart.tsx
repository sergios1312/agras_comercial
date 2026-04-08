"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { useState } from "react";

interface DataPoint {
  periodo: string;
  cantidad: number;
  eficiencia?: number;
}

interface EvolucionChartProps {
  data: DataPoint[];
  titulo?: string;
}

export function EvolucionChart({ data, titulo = "Evolución Temporal" }: EvolucionChartProps) {
  const [modo, setModo] = useState<"barras" | "lineas">("barras");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">{titulo}</h3>
        <div className="flex gap-1">
          {(["barras", "lineas"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                modo === m
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {m === "barras" ? "Barras" : "Líneas"}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {modo === "barras" ? (
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="periodo" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}
              labelStyle={{ color: "#e2e8f0" }}
              itemStyle={{ color: "#818cf8" }}
            />
            <Bar dataKey="cantidad" fill="#6366f1" radius={[6, 6, 0, 0]} name="Pedidos" />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="periodo" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }} />
            <Line type="monotone" dataKey="cantidad" stroke="#6366f1" strokeWidth={2} dot={false} name="Pedidos" />
            {data[0]?.eficiencia !== undefined && (
              <Line type="monotone" dataKey="eficiencia" stroke="#10b981" strokeWidth={2} dot={false} name="Eficiencia %" />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
