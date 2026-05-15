"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

type Fmt = (v: any, name: any) => [string, string];

interface DemoraSucRow {
  sucursal: string;
  "CON GARANTIA": number | null;
  "SIN GARANTIA": number | null;
}

interface DemoraTipoRow {
  tipoTrabajo: string;
  demoraReal: number;
  demoraEstimada: number;
}

interface Props {
  isAdmin?: boolean;
  demoraSucData: DemoraSucRow[];
  demoraTipoData: DemoraTipoRow[];
}

type Tab = "garantia" | "tipoTrabajo";

export function DemoraPromedio({ isAdmin = true, demoraSucData, demoraTipoData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(isAdmin ? "garantia" : "tipoTrabajo");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Demora Promedio
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Solo casos cerrados · días hábiles promedio (RTAT)
      </p>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 mb-5 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("garantia")}
            className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
              ${activeTab === "garantia"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
             Garantía
          </button>
          <button
            onClick={() => setActiveTab("tipoTrabajo")}
            className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
              ${activeTab === "tipoTrabajo"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
             Tipo de Trabajo
          </button>
        </div>
      )}

      {/* Tab: Garantía — Sucursales × CON/SIN Garantía — ignora F1, F3 */}
      {isAdmin && activeTab === "garantia" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Periodo (F4), Estado Caso (F5), Tipo Trabajo (F6) · F1 y F3 ignorados (son los ejes comparativos)
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoraSucData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
                <YAxis
                  type="category"
                  dataKey="sucursal"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: "#334155", opacity: 0.4 }}
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={((v: number | null, name: string) => [
                    v !== null ? `${Number(v).toFixed(1)} días` : "Sin datos",
                    name,
                  ]) as Fmt}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="CON GARANTIA" name="Con Garantía" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="SIN GARANTIA" name="Sin Garantía" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Tab: Tipo de Trabajo — Real vs Estimado — ignora F1, F3, F6 */}
      {(activeTab === "tipoTrabajo" || !isAdmin) && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Periodo (F4), Estado Caso (F5) · F1, F3 y F6 ignorados (evalúa toda la empresa y todos los tipos)
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoraTipoData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
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
                    `${Number(v).toFixed(1)} días`,
                    name === "demoraReal" ? "Demora Real" : "Demora Estimada",
                  ]) as Fmt}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="demoraReal" name="Demora Real" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="demoraEstimada" name="Demora Estimada" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
