"use client";

type Fmt = (v: any, name: any) => [string, string];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface DataRow {
  tipoTrabajo: string;
  demoraReal: number;
  demoraEstimada: number;
}

interface Props {
  data: DataRow[];
}

export function BarrasDemoraTipoTrabajo({ data }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Demora Operativa vs Estimada
      </h3>
      <p className="text-xs text-slate-600 mb-6">
        Días hábiles promedio por Tipo de Trabajo (casos cerrados)
      </p>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#64748b" tick={{ fill: "#64748b" }} />
            <YAxis 
              type="category" 
              dataKey="tipoTrabajo" 
              stroke="#64748b" 
              tick={{ fill: "#64748b", fontSize: 10 }} 
              width={140} 
            />
            <Tooltip
              cursor={{ fill: "#334155", opacity: 0.4 }}
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
              formatter={((v: number, name: string) => [
                `${v.toFixed(1)} días`, 
                name === "demoraReal" ? "Demora Real" : "Demora Estimada"
              ]) as Fmt}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            <Bar dataKey="demoraReal" name="Demora Real" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20} />
            <Bar dataKey="demoraEstimada" name="Demora Estimada" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
