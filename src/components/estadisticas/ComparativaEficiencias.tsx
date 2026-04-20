"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from "recharts";

type Fmt = (v: any, name: any, info: any) => [string, string];

interface EvolucionRow {
  periodo: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  "ATRASADO": number;
  cantATiempo: number;
  cantAplazado: number;
  cantAtrasado: number;
  total: number;
}

interface SucursalRow {
  sucursal: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  "ATRASADO": number;
  cantATiempo: number;
  cantAplazado: number;
  cantAtrasado: number;
  pctEtd: number;
  total: number;
}

interface Props {
  evolucionData: EvolucionRow[];
  sucursalData: SucursalRow[];
}

type Tab = "evolucion" | "sucursal";

export function ComparativaEficiencias({ evolucionData, sucursalData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("evolucion");

  const sortedSucursal = [...sucursalData].sort((a, b) => b.pctEtd - a.pctEtd);

  const formatterTooltip: Fmt = (v: number, name: string, props: any) => {
    if (name === "Total Casos") {
      return [`${v} casos en total`, "Volumen (Línea)"];
    }

    const row = props.payload;
    let count = 0;
    if (name === "A TIEMPO") count = row.cantATiempo;
    else if (name === "APLAZADO") count = row.cantAplazado;
    else if (name === "ATRASADO") count = row.cantAtrasado;
    return [`${Number(v).toFixed(1)}% (${count} casos)`, name];
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Comparativa de Eficiencias (Semáforo)
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Solo casos con SLA · apilado porcentual · Muestra todos los estados SLA
      </p>

      {/* Tabs */}
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

      {/* Tab: Evolución Temporal — Eje X = Periodo, ignora F4 */}
      {activeTab === "evolucion" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Sucursal (F1), Garantía (F3), Tipo Trabajo (F6) · F4 Periodo ignorado (el eje X es el periodo)
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={evolucionData} barCategoryGap="25%" margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="periodo" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${v}`}
                domain={[0, (dataMax: number) => Math.max(100, dataMax)]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={formatterTooltip}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
              
              <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e">
                <LabelList 
                  dataKey={(d: EvolucionRow) => d["A TIEMPO"] >= 5 ? `${d["A TIEMPO"].toFixed(0)}%\n(${d.cantATiempo})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b">
                <LabelList 
                  dataKey={(d: EvolucionRow) => d["APLAZADO"] >= 5 ? `${d["APLAZADO"].toFixed(0)}%\n(${d.cantAplazado})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Bar dataKey="ATRASADO" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]}>
                <LabelList 
                  dataKey={(d: EvolucionRow) => d["ATRASADO"] >= 5 ? `${d["ATRASADO"].toFixed(0)}%\n(${d.cantAtrasado})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Line 
                type="monotone" 
                dataKey="total" 
                name="Total Casos" 
                stroke="#60a5fa" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#60a5fa", strokeWidth: 2, stroke: "#1e293b" }} 
                activeDot={{ r: 6 }} 
              >
                <LabelList 
                  dataKey="total" 
                  position="left" 
                  offset={25} 
                  fill="#93c5fd" 
                  fontSize={11} 
                  fontWeight={600}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Tab: Comparativa por Sucursal — Eje X = Sucursal, ignora F1 */}
      {activeTab === "sucursal" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Periodo (F4), Garantía (F3), Tipo Trabajo (F6) · F1 Sucursal ignorado (el eje X es la sucursal)
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={sortedSucursal}
              barCategoryGap="25%"
              margin={{ top: 20, right: 16, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="category"
                dataKey="sucursal"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => `${v}`}
                domain={[0, (dataMax: number) => Math.max(100, dataMax)]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={formatterTooltip}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
              
              <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e">
                <LabelList 
                  dataKey={(d: SucursalRow) => d["A TIEMPO"] >= 5 ? `${d["A TIEMPO"].toFixed(0)}%\n(${d.cantATiempo})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b">
                <LabelList 
                  dataKey={(d: SucursalRow) => d["APLAZADO"] >= 5 ? `${d["APLAZADO"].toFixed(0)}%\n(${d.cantAplazado})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Bar dataKey="ATRASADO" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]}>
                <LabelList 
                  dataKey={(d: SucursalRow) => d["ATRASADO"] >= 5 ? `${d["ATRASADO"].toFixed(0)}%\n(${d.cantAtrasado})` : ""}
                  position="center" 
                  fill="#fff" 
                  fontSize={10} 
                  style={{ whiteSpace: "pre" }}
                />
              </Bar>
              <Line 
                type="monotone" 
                dataKey="total" 
                name="Total Casos" 
                stroke="#60a5fa" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#60a5fa", strokeWidth: 2, stroke: "#1e293b" }} 
                activeDot={{ r: 6 }} 
              >
                <LabelList 
                  dataKey="total" 
                  position="left" 
                  offset={25} 
                  fill="#93c5fd" 
                  fontSize={11} 
                  fontWeight={600}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
