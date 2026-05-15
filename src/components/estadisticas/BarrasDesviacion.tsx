"use client";

type Fmt = (v: any, name: any, info: any) => [string, string];
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from "recharts";

interface DataRow {
  tipoTrabajo: string;
  rtatPromedio: number;    // RTAT promedio de ese tipo
  plazoIdeal: number;      // ETD (plazo × 1)
  plazoMaximo: number;     // TAT (plazo × 2)
  cantidad: number;        // Número de casos
}

interface Props {
  data: DataRow[];
}

export function BarrasDesviacion({ data }: Props) {
  const [modo, setModo] = useState<"ETD" | "TAT">("ETD");

  // Derivar la desviación según modo seleccionado
  const dataConDesviacion = data.map((d) => ({
    tipoTrabajo: d.tipoTrabajo,
    desviacion: parseFloat(
      (d.rtatPromedio - (modo === "ETD" ? d.plazoIdeal : d.plazoMaximo)).toFixed(1)
    ),
    cantidad: d.cantidad,
  }));

  const labelModo = modo === "ETD"
    ? "Duración − Plazo ideal (ETD)"
    : "Duración − Plazo máximo (TAT)";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Desviación del Plazo de Trabajo
      </h3>
      <p className="text-xs text-slate-600 mb-3">
        {labelModo} · Negativo = eficiencia · ACTIVACION excluida
      </p>

      {/* Radio buttons ETD / TAT */}
      <div className="flex gap-2 mb-4">
        {(["ETD", "TAT"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all
              ${modo === m
                ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}
          >
            {m === "ETD" ? " Tiempo ideal (ETD)" : " Tiempo máximo (TAT)"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={dataConDesviacion}
          layout="vertical"
          barCategoryGap="25%"
          margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(v) => `${v}d`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="tipoTrabajo"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            width={160}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number, name: string, props: any) => {
              const row = props.payload;
              const n = Number(v);
              return [
                `${n > 0 ? "+" : ""}${n.toFixed(1)} días (${row.cantidad} casos)`,
                modo === "ETD" ? "vs Plazo Ideal" : "vs Plazo Máximo",
              ];
            }) as Fmt}
          />
          <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
          <Bar dataKey="desviacion" name="Desviación" radius={[0, 4, 4, 0]}>
            {dataConDesviacion.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.desviacion <= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
            <LabelList 
              dataKey="cantidad" 
              position="right" 
              fill="#94a3b8" 
              fontSize={10}
              formatter={(v: any) => `(${v})`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
