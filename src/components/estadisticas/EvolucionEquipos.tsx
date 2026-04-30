"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from "recharts";

type Fmt = (v: any, name: any, info: any) => [string, string];

export interface EvolucionEquipoRow {
  periodo?: string;
  sucursal?: string;
  Dron: number;
  Generador: number;
  Bateria: number;
  Otros: number;
  eficienciaETD: number; // Porcentaje de "A Tiempo"
  eficienciaTAT: number; // Porcentaje de "A Tiempo" + "APLAZADO"
  totalCasos: number;
  rtatPromedio: number | null;
}

interface Props {
  isAdmin?: boolean;
  evolucionData: EvolucionEquipoRow[];
  sucursalData: EvolucionEquipoRow[];
}

type Tab = "evolucion" | "sucursal";

export function EvolucionEquipos({ isAdmin = true, evolucionData, sucursalData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("evolucion");

  const formatterTooltip: Fmt = (v: number, name: string, props: any) => {
    if (name === "Eficiencia ETD" || name === "Eficiencia TAT") {
      return [`${Number(v).toFixed(1)}%`, name];
    }
    const n = Number(v);
    return [`${n} casos`, name];
  };

  const formatTopLabel = (d: EvolucionEquipoRow) => {
    const total = d.totalCasos;
    if (total === 0) return "";
    if (d.rtatPromedio !== null && d.rtatPromedio !== undefined) {
      return `${total} (${d.rtatPromedio}d)`;
    }
    return `${total}`;
  };

  // Custom Tooltip with rtatPromedio
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d: EvolucionEquipoRow = payload[0]?.payload;
    return (
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <p style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color ?? "#e2e8f0", margin: "2px 0" }}>
            <span style={{ fontWeight: 600 }}>{entry.name}:</span> {
              (entry.name === "Eficiencia ETD" || entry.name === "Eficiencia TAT")
                ? `${Number(entry.value).toFixed(1)}%`
                : `${entry.value} casos`
            }
          </p>
        ))}
        {d.rtatPromedio !== null && d.rtatPromedio !== undefined && (
          <p style={{ color: "#f59e0b", marginTop: 6, paddingTop: 6, borderTop: "1px solid #334155" }}>
            <span style={{ fontWeight: 600 }}>Promedio de demora:</span> {d.rtatPromedio} días
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Eficiencia y Volumen por Equipo
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Solo casos cerrados (con SLA) · Comparativa histórica de volumen vs eficiencia (ETD y TAT)
      </p>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 mb-5 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("evolucion")}
            className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
              ${activeTab === "evolucion"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            📈 Evolución Temporal
          </button>
          <button
            onClick={() => setActiveTab("sucursal")}
            className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
              ${activeTab === "sucursal"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            🏢 Comparativa por Sucursal
          </button>
        </div>
      )}

      {(activeTab === "evolucion" || !isAdmin) && (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={evolucionData} barCategoryGap="25%" margin={{ top: 20, right: 16, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="periodo" tick={{ fill: "#64748b", fontSize: 11 }} />
            
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => `${v}`}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
            
            <Bar yAxisId="left" dataKey="Dron" stackId="a" fill="#3b82f6">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Dron >= 3 ? d.Dron : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Generador" stackId="a" fill="#06b6d4">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Generador >= 3 ? d.Generador : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Bateria" stackId="a" fill="#d946ef">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Bateria >= 3 ? d.Bateria : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Otros" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]}>
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Otros >= 3 ? d.Otros : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>

            {/* Invisible line to anchor total labels on top of stack */}
            <Line
              yAxisId="left"
              dataKey="totalCasos"
              stroke="none"
              legendType="none"
              isAnimationActive={false}
            >
              <LabelList dataKey={formatTopLabel} position="top" fill="#94a3b8" fontSize={11} fontWeight={700} offset={10} />
            </Line>

            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="eficienciaETD" 
              name="Eficiencia ETD" 
              stroke="#22c55e" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#1e293b" }} 
              activeDot={{ r: 6 }} 
            >
              <LabelList 
                dataKey="eficienciaETD" 
                position="left" 
                dx={-20}
                fill="#86efac" 
                fontSize={11} 
                fontWeight={600}
                formatter={(v: any) => `${v}%`}
              />
            </Line>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="eficienciaTAT" 
              name="Eficiencia TAT" 
              stroke="#eab308" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#eab308", strokeWidth: 2, stroke: "#1e293b" }} 
              activeDot={{ r: 6 }} 
            >
              <LabelList 
                dataKey="eficienciaTAT" 
                position="left" 
                dx={-20}
                fill="#fde047" 
                fontSize={11} 
                fontWeight={600}
                formatter={(v: any) => `${v}%`}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {isAdmin && activeTab === "sucursal" && (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={sucursalData} barCategoryGap="25%" margin={{ top: 20, right: 16, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="sucursal" 
              tick={{ fill: "#94a3b8", fontSize: 11 }} 
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => `${v}`}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
            
            <Bar yAxisId="left" dataKey="Dron" stackId="a" fill="#3b82f6">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Dron >= 3 ? d.Dron : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Generador" stackId="a" fill="#06b6d4">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Generador >= 3 ? d.Generador : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Bateria" stackId="a" fill="#d946ef">
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Bateria >= 3 ? d.Bateria : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="Otros" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]}>
               <LabelList dataKey={(d: EvolucionEquipoRow) => d.Otros >= 3 ? d.Otros : ""} position="center" fill="#fff" fontSize={10} />
            </Bar>

            {/* Invisible line to anchor total labels on top of stack */}
            <Line
              yAxisId="left"
              dataKey="totalCasos"
              stroke="none"
              legendType="none"
              isAnimationActive={false}
            >
              <LabelList dataKey={formatTopLabel} position="top" fill="#94a3b8" fontSize={11} fontWeight={700} offset={10} />
            </Line>

            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="eficienciaETD" 
              name="Eficiencia ETD" 
              stroke="#22c55e" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#1e293b" }} 
              activeDot={{ r: 6 }} 
            >
              <LabelList 
                dataKey="eficienciaETD" 
                position="left" 
                dx={-20}
                fill="#86efac" 
                fontSize={11} 
                fontWeight={600}
                formatter={(v: any) => `${v}%`}
              />
            </Line>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="eficienciaTAT" 
              name="Eficiencia TAT" 
              stroke="#eab308" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#eab308", strokeWidth: 2, stroke: "#1e293b" }} 
              activeDot={{ r: 6 }} 
            >
              <LabelList 
                dataKey="eficienciaTAT" 
                position="left" 
                dx={-20}
                fill="#fde047" 
                fontSize={11} 
                fontWeight={600}
                formatter={(v: any) => `${v}%`}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
