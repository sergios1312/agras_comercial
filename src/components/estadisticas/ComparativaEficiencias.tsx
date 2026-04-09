"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

type Fmt = (v: any) => [string, string];

interface EvolucionRow {
  periodo: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  total: number;
}

interface SucursalRow {
  sucursal: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  pctEtd: number;
}

interface Props {
  evolucionData: EvolucionRow[];
  sucursalData: SucursalRow[];
}

type Tab = "evolucion" | "sucursal";

export function ComparativaEficiencias({ evolucionData, sucursalData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("evolucion");

  const sortedSucursal = [...sucursalData].sort((a, b) => b.pctEtd - a.pctEtd);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Comparativa de Eficiencias (Semáforo)
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Solo casos cerrados · apilado porcentual · A Tiempo + Aplazado
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolucionData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="periodo" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={((v: number) => [`${Number(v).toFixed(1)}%`, ""]) as Fmt}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Tab: Comparativa por Sucursal — Eje X = Sucursal, ignora F1 */}
      {activeTab === "sucursal" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Periodo (F4), Garantía (F3), Tipo Trabajo (F6) · F1 Sucursal ignorado (el eje X es la sucursal)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sortedSucursal}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="sucursal"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={((v: number) => [`${Number(v).toFixed(1)}%`, ""]) as Fmt}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e" />
              <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
