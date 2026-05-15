"use client";

import { useState, useMemo } from "react";

interface CeldaHeatmap {
  sucursal: string;
  etiqueta: string; // periodo o tipoTrabajo
  pct: number | null; // 0-100
}

interface HeatmapResult {
  celdas: CeldaHeatmap[];
  filas: string[];
  columnas: string[];
}

interface Props {
  // Funciones que reciben la metaSLA y devuelven los datos computados
  getDataPeriodo: (metaSLA: "ETD" | "TAT") => HeatmapResult;
  getDataTipo: (metaSLA: "ETD" | "TAT") => HeatmapResult;
}

type MetaSLA = "ETD" | "TAT";
type HeatTab = "periodo" | "tipo";

/** Interpolación rojo → amarillo → verde según porcentaje 0-100 */
function slaColor(pct: number | null): { bg: string; text: string } {
  if (pct === null) return { bg: "#1e293b", text: "#475569" };
  const hue = Math.round((pct / 100) * 120);
  return {
    bg: `hsl(${hue}, 70%, 22%)`,
    text: `hsl(${hue}, 80%, 72%)`,
  };
}

function HeatmapGrid({
  celdas,
  filas,
  columnas,
}: HeatmapResult) {
  const mapa: Record<string, Record<string, number | null>> = {};
  for (const c of celdas) {
    if (!mapa[c.sucursal]) mapa[c.sucursal] = {};
    mapa[c.sucursal][c.etiqueta] = c.pct;
  }

  if (filas.length === 0) {
    return <p className="text-sm text-slate-600 py-8 text-center">Sin datos para los filtros seleccionados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-widest whitespace-nowrap">
              Sucursal
            </th>
            {columnas.map((col) => (
              <th
                key={col}
                className="px-2 py-2 text-slate-500 font-semibold text-center"
                style={{ minWidth: 72 }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila} className="border-t border-slate-800">
              <td className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap">
                {fila}
              </td>
              {columnas.map((col) => {
                const pct = mapa[fila]?.[col] ?? null;
                const { bg, text } = slaColor(pct);
                return (
                  <td
                    key={col}
                    className="px-2 py-2 text-center font-bold rounded"
                    style={{ background: bg, color: text, minWidth: 72 }}
                  >
                    {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeatmapSLA({ getDataPeriodo, getDataTipo }: Props) {
  const [metaSLA, setMetaSLA] = useState<MetaSLA>("ETD");
  const [activeTab, setActiveTab] = useState<HeatTab>("periodo");

  const dataPeriodo = useMemo(() => getDataPeriodo(metaSLA), [getDataPeriodo, metaSLA]);
  const dataTipo = useMemo(() => getDataTipo(metaSLA), [getDataTipo, metaSLA]);

  const metaLabel = metaSLA === "ETD"
    ? "ETD — 100% = solo A TIEMPO"
    : "TAT — 100% = A TIEMPO + APLAZADOS";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Heatmap / Matriz de SLA
      </h3>
      <p className="text-xs text-slate-600 mb-3">
        Casos CERRADOS · excluye MANTENIMIENTO GENERADOR · Rojo → Amarillo → Verde
      </p>

      {/* Radio ETD / TAT — aplica a ambas tabs */}
      <div className="flex gap-2 mb-4">
        {(["ETD", "TAT"] as MetaSLA[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetaSLA(m)}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all
              ${metaSLA === m
                ? "bg-emerald-600/25 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}
          >
            {m === "ETD" ? " ETD (A tiempo)" : " TAT (Tiempo máximo)"}
          </button>
        ))}
        <span className="text-[11px] text-slate-600 self-center ml-2">{metaLabel}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("periodo")}
          className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
            ${activeTab === "periodo"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-slate-500 hover:text-slate-300"}`}
        >
           Por Periodo
        </button>
        <button
          onClick={() => setActiveTab("tipo")}
          className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
            ${activeTab === "tipo"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-slate-500 hover:text-slate-300"}`}
        >
           Por Tipo de Trabajo
        </button>
      </div>

      {/* Tab: Por Periodo (Sucursal × Mes) — F1, F3, F4, F6 activos */}
      {activeTab === "periodo" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Sucursal (F1), Garantía (F3), Periodo (F4), Tipo Trabajo (F6)
          </p>
          <HeatmapGrid {...dataPeriodo} />
        </>
      )}

      {/* Tab: Por Tipo de Trabajo (Sucursal × Categoria) — F6 ignorado (es eje X) */}
      {activeTab === "tipo" && (
        <>
          <p className="text-[11px] text-slate-600 mb-3">
            Filtros activos: Sucursal (F1), Garantía (F3), Periodo (F4) · F6 Tipo Trabajo ignorado (es el eje X)
          </p>
          <HeatmapGrid {...dataTipo} />
        </>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-slate-600">0%</span>
        <div
          className="flex-1 h-2 rounded"
          style={{ background: "linear-gradient(to right, hsl(0,70%,22%), hsl(60,70%,22%), hsl(120,70%,22%))" }}
        />
        <span className="text-xs text-slate-600">100%</span>
      </div>
    </div>
  );
}
