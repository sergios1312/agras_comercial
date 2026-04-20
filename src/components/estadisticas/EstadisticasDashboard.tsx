"use client";

import { useState, useMemo } from "react";
import { Filter, BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import type { Caso, ClasificacionSLA } from "@/types/casos.types";
import { PLAZOS_IDEALES } from "@/types/casos.types";
import { KpiCard } from "@/components/estadisticas/KpiCard";
import { TablaPrincipal } from "@/components/estadisticas/TablaPrincipal";
import { TablaResumenSucursal } from "@/components/estadisticas/TablaResumenSucursal";
import { PieDistribucion } from "@/components/estadisticas/PieDistribucion";
import { PieEficiencia } from "@/components/estadisticas/PieEficiencia";
import { ComparativaEficiencias } from "@/components/estadisticas/ComparativaEficiencias";
import { BarrasDesviacion } from "@/components/estadisticas/BarrasDesviacion";
import { DemoraPromedio } from "@/components/estadisticas/DemoraPromedio";
import { HistogramaRtat } from "@/components/estadisticas/HistogramaRtat";
import { HeatmapSLA } from "@/components/estadisticas/HeatmapSLA";

// ─── Tipos de filtros ────────────────────────────────────────
type EstadoFiltro = "TODOS" | "ABIERTO" | "CERRADO" | "DEVUELTO";

interface Props {
  casos: Caso[];
  sucursalesDisponibles: string[];
  periodosDisponibles: string[];
  tiposTrabajoDisponibles: string[];
  equiposDisponibles: string[];
  fechaActualizacion?: string | null;
}

// ─── Helpers de cómputo ──────────────────────────────────────
function pctSLA(casos: Caso[]): Array<{ name: string; value: number }> {
  const cerrados = casos.filter((c) => c.clasificacionSLA);
  const counts: Record<string, number> = { "A TIEMPO": 0, "APLAZADO": 0, "ATRASADO": 0 };
  for (const c of cerrados) {
    if (c.clasificacionSLA) counts[c.clasificacionSLA]++;
  }
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

function resumenSucursal(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.clasificacionSLA);
  const grupos: Record<string, { total: number; aTiempo: number; aplazado: number; atrasado: number; rtatATiempo: number[]; rtatAplazado: number[]; rtatAtrasado: number[] }> = {};

  for (const c of cerrados) {
    if (!grupos[c.sucursal]) {
      grupos[c.sucursal] = { total: 0, aTiempo: 0, aplazado: 0, atrasado: 0, rtatATiempo: [], rtatAplazado: [], rtatAtrasado: [] };
    }
    grupos[c.sucursal].total++;
    if (c.clasificacionSLA === "A TIEMPO") {
      grupos[c.sucursal].aTiempo++;
      if (c.rtat !== null) grupos[c.sucursal].rtatATiempo.push(c.rtat);
    } else if (c.clasificacionSLA === "APLAZADO") {
      grupos[c.sucursal].aplazado++;
      if (c.rtat !== null) grupos[c.sucursal].rtatAplazado.push(c.rtat);
    } else if (c.clasificacionSLA === "ATRASADO") {
      grupos[c.sucursal].atrasado++;
      if (c.rtat !== null) grupos[c.sucursal].rtatAtrasado.push(c.rtat);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return Object.entries(grupos).map(([sucursal, g]) => ({
    sucursal,
    total: g.total,
    aTiempo: g.aTiempo,
    aplazado: g.aplazado,
    atrasado: g.atrasado,
    pctEtd: g.total > 0 ? (g.aTiempo / g.total) * 100 : 0,
    pctAplazado: g.total > 0 ? (g.aplazado / g.total) * 100 : 0,
    pctAtrasado: g.total > 0 ? (g.atrasado / g.total) * 100 : 0,
    tatATiempo: avg(g.rtatATiempo),
    tatAplazado: avg(g.rtatAplazado),
    tatAtrasado: avg(g.rtatAtrasado),
  }));
}

function semaforoEvolucion(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.clasificacionSLA && c.periodoMensual);
  const periodos: Record<string, { aTiempo: number; aplazado: number; atrasado: number; total: number }> = {};
  for (const c of cerrados) {
    const p = c.periodoMensual!;
    if (!periodos[p]) periodos[p] = { aTiempo: 0, aplazado: 0, atrasado: 0, total: 0 };
    periodos[p].total++;
    if (c.clasificacionSLA === "A TIEMPO") periodos[p].aTiempo++;
    else if (c.clasificacionSLA === "APLAZADO") periodos[p].aplazado++;
    else if (c.clasificacionSLA === "ATRASADO") periodos[p].atrasado++;
  }
  return Object.entries(periodos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, g]) => ({
      periodo,
      "A TIEMPO": g.total > 0 ? parseFloat(((g.aTiempo / g.total) * 100).toFixed(1)) : 0,
      "APLAZADO": g.total > 0 ? parseFloat(((g.aplazado / g.total) * 100).toFixed(1)) : 0,
      "ATRASADO": g.total > 0 ? parseFloat(((g.atrasado / g.total) * 100).toFixed(1)) : 0,
      cantATiempo: g.aTiempo,
      cantAplazado: g.aplazado,
      cantAtrasado: g.atrasado,
      total: g.total,
    }));
}

function semaforoSucursal(casos: Caso[]) {
  const datos = resumenSucursal(casos);
  return datos.map((d) => ({
    sucursal: d.sucursal,
    "A TIEMPO": d.total > 0 ? parseFloat(((d.aTiempo / d.total) * 100).toFixed(1)) : 0,
    "APLAZADO": d.total > 0 ? parseFloat(((d.aplazado / d.total) * 100).toFixed(1)) : 0,
    "ATRASADO": d.total > 0 ? parseFloat(((d.atrasado / d.total) * 100).toFixed(1)) : 0,
    cantATiempo: d.aTiempo,
    cantAplazado: d.aplazado,
    cantAtrasado: d.atrasado,
    pctEtd: d.pctEtd,
  }));
}

function barrasDesviacion(casos: Caso[]) {
  const cerrados = casos.filter(
    (c) => c.estadoGeneral === "CERRADO" && c.rtat !== null && c.tipoTrabajo !== "ACTIVACION"
  );
  const grupos: Record<string, number[]> = {};
  for (const c of cerrados) {
    if (!grupos[c.tipoTrabajo]) grupos[c.tipoTrabajo] = [];
    grupos[c.tipoTrabajo].push(c.rtat!);
  }
  return Object.entries(grupos)
    .filter(([tipo]) => PLAZOS_IDEALES[tipo] !== undefined)
    .map(([tipoTrabajo, rtats]) => {
      const avg = rtats.reduce((a, b) => a + b, 0) / rtats.length;
      const plazo = PLAZOS_IDEALES[tipoTrabajo];
      return {
        tipoTrabajo,
        rtatPromedio: parseFloat(avg.toFixed(1)),
        plazoIdeal: plazo,
        plazoMaximo: plazo * 2,
      };
    });
}

function histogramaRtat(casos: Caso[], binSize: number) {
  const rtats = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.rtat !== null).map((c) => c.rtat!);
  const buckets: Record<number, number> = {};
  for (const r of rtats) {
    if (r > 100) continue;
    const bucket = Math.floor(r / binSize) * binSize;
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([dias, frecuencia]) => ({ dias: Number(dias), frecuencia }))
    .sort((a, b) => a.dias - b.dias);
}

function demoraSucursal(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.rtat !== null);
  const grupos: Record<string, { conGar: number[]; sinGar: number[] }> = {};
  for (const c of cerrados) {
    if (!grupos[c.sucursal]) grupos[c.sucursal] = { conGar: [], sinGar: [] };
    if (c.garantia === "CON GARANTIA") {
      grupos[c.sucursal].conGar.push(c.rtat!);
    } else {
      grupos[c.sucursal].sinGar.push(c.rtat!);
    }
  }
  const avg = (arr: number[]) => arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;
  return Object.entries(grupos).map(([sucursal, g]) => ({
    sucursal,
    "CON GARANTIA": avg(g.conGar),
    "SIN GARANTIA": avg(g.sinGar),
  })).sort((a, b) => a.sucursal.localeCompare(b.sucursal));
}

function demoraTipoTrabajo(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.rtat !== null);
  const grupos: Record<string, number[]> = {};
  for (const c of cerrados) {
    if (!grupos[c.tipoTrabajo]) grupos[c.tipoTrabajo] = [];
    grupos[c.tipoTrabajo].push(c.rtat!);
  }
  return Object.entries(grupos)
    .filter(([tipo]) => PLAZOS_IDEALES[tipo] !== undefined)
    .map(([tipoTrabajo, rtats]) => ({
      tipoTrabajo,
      demoraReal: parseFloat((rtats.reduce((a, b) => a + b, 0) / rtats.length).toFixed(1)),
      demoraEstimada: PLAZOS_IDEALES[tipoTrabajo],
    })).sort((a, b) => a.tipoTrabajo.localeCompare(b.tipoTrabajo));
}

function heatmapPeriodo(casos: Caso[], metaSLA: "ETD" | "TAT") {
  const cerrados = casos.filter(
    (c) =>
      c.estadoGeneral === "CERRADO" &&
      c.clasificacionSLA &&
      c.periodoMensual &&
      !c.tipoTrabajo.includes("MANTENIMIENTO GENERADOR")
  );
  const mapa: Record<string, Record<string, { cumple: number; total: number }>> = {};
  const periodos = new Set<string>();
  const sucursalesSet = new Set<string>();

  for (const c of cerrados) {
    const p = c.periodoMensual!;
    periodos.add(p);
    sucursalesSet.add(c.sucursal);
    if (!mapa[c.sucursal]) mapa[c.sucursal] = {};
    if (!mapa[c.sucursal][p]) mapa[c.sucursal][p] = { cumple: 0, total: 0 };
    mapa[c.sucursal][p].total++;
    const cumple =
      metaSLA === "ETD"
        ? c.clasificacionSLA === "A TIEMPO"
        : c.clasificacionSLA === "A TIEMPO" || c.clasificacionSLA === "APLAZADO";
    if (cumple) mapa[c.sucursal][p].cumple++;
  }

  const colsSorted = [...periodos].sort();
  const filasSorted = [...sucursalesSet].sort();
  const celdas = filasSorted.flatMap((suc) =>
    colsSorted.map((periodo) => {
      const g = mapa[suc]?.[periodo];
      return {
        sucursal: suc,
        etiqueta: periodo,
        pct: g ? parseFloat(((g.cumple / g.total) * 100).toFixed(1)) : null,
      };
    })
  );
  return { celdas, filas: filasSorted, columnas: colsSorted };
}

function heatmapTipoTrabajo(casos: Caso[], metaSLA: "ETD" | "TAT") {
  const cerrados = casos.filter(
    (c) =>
      c.estadoGeneral === "CERRADO" &&
      c.clasificacionSLA &&
      !c.tipoTrabajo.includes("MANTENIMIENTO GENERADOR")
  );
  const mapa: Record<string, Record<string, { cumple: number; total: number }>> = {};
  const tipos = new Set<string>();
  const sucursalesSet = new Set<string>();

  for (const c of cerrados) {
    tipos.add(c.tipoTrabajo);
    sucursalesSet.add(c.sucursal);
    if (!mapa[c.sucursal]) mapa[c.sucursal] = {};
    if (!mapa[c.sucursal][c.tipoTrabajo]) mapa[c.sucursal][c.tipoTrabajo] = { cumple: 0, total: 0 };
    mapa[c.sucursal][c.tipoTrabajo].total++;
    const cumple =
      metaSLA === "ETD"
        ? c.clasificacionSLA === "A TIEMPO"
        : c.clasificacionSLA === "A TIEMPO" || c.clasificacionSLA === "APLAZADO";
    if (cumple) mapa[c.sucursal][c.tipoTrabajo].cumple++;
  }

  const colsSorted = [...tipos].sort();
  const filasSorted = [...sucursalesSet].sort();
  const celdas = filasSorted.flatMap((suc) =>
    colsSorted.map((tipo) => {
      const g = mapa[suc]?.[tipo];
      return {
        sucursal: suc,
        etiqueta: tipo,
        pct: g ? parseFloat(((g.cumple / g.total) * 100).toFixed(1)) : null,
      };
    })
  );
  return { celdas, filas: filasSorted, columnas: colsSorted };
}

// ─── Componente Principal ─────────────────────────────────────
export function EstadisticasDashboard({
  casos,
  sucursalesDisponibles,
  periodosDisponibles,
  tiposTrabajoDisponibles,
  equiposDisponibles,
  fechaActualizacion,
}: Props) {
  // ── Estados de filtros globales ──────────────────────────────
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("TODOS");
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("");
  const [garantiaFiltro, setGarantiaFiltro] = useState<string>("");   
  const [periodoFiltro, setPeriodoFiltro] = useState<string[]>([]);
  const [ingresoFiltro, setIngresoFiltro] = useState<string>("");
  const [openPeriodo, setOpenPeriodo] = useState<boolean>(false);
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [equipoFiltro, setEquipoFiltro] = useState<string>("");
  const [binSize, setBinSize] = useState<number>(5);

  const estadosCasoDisponibles = useMemo(() => {
    const s = new Set(casos.map(c => c.estadoCaso).filter(Boolean));
    return Array.from(s).sort();
  }, [casos]);

  const esDevuelto = estadoFiltro === "DEVUELTO";
  const matchEstado = (c: Caso) => {
    if (esDevuelto) return c.estadoCaso === "DEVUELTO";
    if (estadoFiltro === "TODOS") return true;
    return c.estadoGeneral === estadoFiltro;
  };

  const periodoDesact = estadoFiltro === "ABIERTO";

  const hayFiltros = useMemo(() => {
    return estadoFiltro !== "TODOS" || sucursalFiltro !== "" || garantiaFiltro !== "" || periodoFiltro.length > 0 || ingresoFiltro !== "" || estadoCasoFiltro !== "" || tipoFiltro !== "" || equipoFiltro !== "";
  }, [estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, ingresoFiltro, estadoCasoFiltro, tipoFiltro, equipoFiltro]);

  const handleLimpiarFiltros = () => {
    setEstadoFiltro("TODOS");
    setSucursalFiltro("");
    setGarantiaFiltro("");
    setPeriodoFiltro([]);
    setIngresoFiltro("");
    setEstadoCasoFiltro("");
    setTipoFiltro("");
    setEquipoFiltro("");
  };

  const casosKPI = useMemo(() => {
    return casos.filter(c => {
      if (!matchEstado(c)) return false;
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro.length > 0 && !periodoDesact && (!c.periodoMensual || !periodoFiltro.includes(c.periodoMensual))) return false;
      if (ingresoFiltro === "INGRESADOS" && !c.fechaIngreso) return false;
      if (ingresoFiltro === "NO INGRESADOS" && c.fechaIngreso) return false;
      if (estadoCasoFiltro && c.estadoCaso !== estadoCasoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      if (equipoFiltro) {
        if (equipoFiltro === "SIN_EQUIPO") {
          if (c.equipo && c.equipo.trim() !== "") return false;
        } else if (c.equipo !== equipoFiltro) {
          return false;
        }
      }
      return true;
    });
    }, [casos, estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, ingresoFiltro, estadoCasoFiltro, tipoFiltro, equipoFiltro, periodoDesact]);

  const total = casosKPI.length;
  const abiertos = casosKPI.filter(c => c.estadoGeneral === "ABIERTO").length;
  const cerrados = casosKPI.filter(c => c.estadoGeneral === "CERRADO").length;
  const pctAbiertos = total > 0 ? ((abiertos / total) * 100).toFixed(1) : "0.0";

  const pieDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    casosKPI.forEach(c => {
      counts[c.sucursal] = (counts[c.sucursal] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [casosKPI]);

  const pieEficData = useMemo(() => pctSLA(casosKPI), [casosKPI]);
  const semEvolucionData = useMemo(() => semaforoEvolucion(casosKPI), [casosKPI]);
  const semSucursalData = useMemo(() => semaforoSucursal(casosKPI), [casosKPI]);
  const resumenData = useMemo(() => resumenSucursal(casosKPI), [casosKPI]);
  const desviacionData = useMemo(() => barrasDesviacion(casosKPI), [casosKPI]);
  const histData = useMemo(() => histogramaRtat(casosKPI, binSize), [casosKPI, binSize]);
  const demoraSucData = useMemo(() => demoraSucursal(casosKPI), [casosKPI]);
  const demoraTipoData = useMemo(() => demoraTipoTrabajo(casosKPI), [casosKPI]);

  const heatmapPeriodoFn = (meta: "ETD" | "TAT") => heatmapPeriodo(casosKPI, meta);
  const heatmapTipoFn = (meta: "ETD" | "TAT") => heatmapTipoTrabajo(casosKPI, meta);

  return (
    <div className="space-y-6">
      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-b-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Filtros Globales</span>
            <div className="ml-2 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-medium">
              {casos.length} CASOS
            </div>
            {fechaActualizacion && (
              <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="font-bold text-emerald-400 text-[10px]">
                  CASOS ACTUALIZADOS EL {new Date(fechaActualizacion).toLocaleString('es-PE').toUpperCase()}
                </p>
              </div>
            )}
          </div>
          {hayFiltros && (
            <button
              onClick={handleLimpiarFiltros}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-600 text-slate-500 hover:text-slate-200 hover:border-slate-400 transition-all"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">

          {/* F2: Estado General (con DEVUELTO) */}
          <div className="flex gap-1">
            {(["TODOS", "ABIERTO", "CERRADO", "DEVUELTO"] as EstadoFiltro[]).map((e) => (
              <button
                key={e}
                onClick={() => setEstadoFiltro(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${estadoFiltro === e
                    ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* F1: Sucursal */}
          <select
            value={sucursalFiltro}
            onChange={(e) => setSucursalFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todas las sucursales</option>
            {sucursalesDisponibles.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* F3: Garantía */}
          <select
            value={garantiaFiltro}
            onChange={(e) => setGarantiaFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Toda garantía</option>
            <option value="CON GARANTIA">CON GARANTIA</option>
            <option value="SIN GARANTIA">SIN GARANTIA</option>
          </select>

          {/* F4: Periodo (Multi-select) */}
          <div className="relative">
            <button
              type="button"
              disabled={periodoDesact}
              onClick={() => setOpenPeriodo(!openPeriodo)}
              className={`px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[140px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-opacity
                ${periodoDesact ? "opacity-40 cursor-not-allowed text-slate-600" : "text-slate-300"}`}
            >
              <span className="truncate pr-2">
                {periodoDesact ? "Periodo (inactivo)" : periodoFiltro.length > 0 ? `${periodoFiltro.length} seleccionado(s)` : "Todos los periodos"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openPeriodo && !periodoDesact && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenPeriodo(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 max-h-60 overflow-y-auto">
                  {periodosDisponibles.map((p) => (
                    <label key={p} className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                        checked={periodoFiltro.includes(p)}
                        onChange={(e) => {
                          if (e.target.checked) setPeriodoFiltro((prev) => [...prev, p]);
                          else setPeriodoFiltro((prev) => prev.filter((item) => item !== p));
                        }}
                      />
                      <span className="text-xs text-slate-300">{p}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* F7: Ingreso */}
          <select
            value={ingresoFiltro}
            onChange={(e) => setIngresoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Ingreso (Todos)</option>
            <option value="INGRESADOS">Ingresados</option>
            <option value="NO INGRESADOS">No ingresados</option>
          </select>

          {/* F5: Estado de Caso */}
          <select
            value={estadoCasoFiltro}
            onChange={(e) => setEstadoCasoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            {estadosCasoDisponibles.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* F6: Tipo de Trabajo */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los tipos</option>
            {tiposTrabajoDisponibles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* F8: Equipo */}
          <select
            value={equipoFiltro}
            onChange={(e) => setEquipoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los equipos</option>
            <option value="SIN_EQUIPO">(Vacío)</option>
            {equiposDisponibles.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>

          {/* Agrupación Histograma (Bin Size) */}
          <select
            value={binSize}
            onChange={(e) => setBinSize(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 ml-auto"
          >
            <option value={1}>Agrupar 1 día</option>
            <option value={2}>Agrupar 2 días</option>
            <option value={5}>Agrupar 5 días</option>
          </select>

        </div>

        {/* Badge informativo: override DEVUELTO */}
        {esDevuelto && (
          <p className="mt-2 text-[11px] text-amber-400/80 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/80" />
            Override activo: filtrando por <strong>ESTADO DE CASO = DEVUELTO</strong> (ignora Estado General)
          </p>
        )}
      </div>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Casos" value={total} subtitle="según filtros" icon={<BarChart3 className="w-5 h-5" />} />
        <KpiCard title="Abiertos" value={abiertos} subtitle={`${total > 0 ? ((abiertos/total)*100).toFixed(0) : 0}% del total`} icon={<Clock className="w-5 h-5" />} trend={abiertos > 0 ? "down" : "neutral"} />
        <KpiCard title="Cerrados" value={cerrados} subtitle={`${total > 0 ? ((cerrados/total)*100).toFixed(0) : 0}% del total`} icon={<CheckCircle2 className="w-5 h-5" />} trend="up" />
        <KpiCard title="% Abiertos" value={`${pctAbiertos}%`} subtitle="Abiertos / Total × 100" icon={<TrendingUp className="w-5 h-5" />} trend={Number(pctAbiertos) > 30 ? "down" : "neutral"} />
      </div>

      {/* ── Donas ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieDistribucion data={pieDistData} />
        <PieEficiencia
          data={pieEficData}
          titulo={sucursalFiltro ? `Eficiencia SLA — ${sucursalFiltro}` : "Eficiencia SLA (todas las sucursales)"}
        />
      </div>

      {/* ── Comparativa de Eficiencias (Tabbed) ──────────────── */}
      <ComparativaEficiencias
        evolucionData={semEvolucionData}
        sucursalData={semSucursalData}
      />

      {/* ── Tabla Resumen + Desviación ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TablaResumenSucursal data={resumenData} />
        <BarrasDesviacion data={desviacionData} />
      </div>

      {/* ── Demora Promedio (Tabbed) ──────────────────────────── */}
      <DemoraPromedio
        demoraSucData={demoraSucData}
        demoraTipoData={demoraTipoData}
      />

      {/* ── Histograma ───────────────────────────────────────── */}
      <HistogramaRtat data={histData} binSize={binSize} />

      {/* ── Heatmap SLA (Tabbed + Radio ETD/TAT) ─────────────── */}
      <HeatmapSLA
        getDataPeriodo={heatmapPeriodoFn}
        getDataTipo={heatmapTipoFn}
      />

      {/* ── Tabla Principal ──────────────────────────────────── */}
      <TablaPrincipal casos={casosKPI} />
    </div>
  );
}
