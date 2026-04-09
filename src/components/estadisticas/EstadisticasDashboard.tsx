"use client";

import { useState, useMemo } from "react";
import { Filter } from "lucide-react";
import type { Caso } from "@/types/casos.types";
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
import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";

// ─── Tipos de filtros ────────────────────────────────────────
type EstadoFiltro = "TODOS" | "ABIERTO" | "CERRADO" | "DEVUELTO";

interface Props {
  casos: Caso[];
  sucursalesDisponibles: string[];
  periodosDisponibles: string[];
  tiposTrabajoDisponibles: string[];
}

// ─── Helpers de cómputo ──────────────────────────────────────
function pctSLA(casos: Caso[]): Array<{ name: string; value: number }> {
  const cerrados = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.clasificacionSLA);
  const counts: Record<string, number> = { "A TIEMPO": 0, "APLAZADO": 0, "ATRASADO": 0 };
  for (const c of cerrados) {
    if (c.clasificacionSLA) counts[c.clasificacionSLA]++;
  }
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

function resumenSucursal(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.clasificacionSLA);
  const grupos: Record<string, { total: number; aTiempo: number; aplazado: number; atrasado: number; rtatAplazado: number[]; rtatAtrasado: number[] }> = {};

  for (const c of cerrados) {
    if (!grupos[c.sucursal]) {
      grupos[c.sucursal] = { total: 0, aTiempo: 0, aplazado: 0, atrasado: 0, rtatAplazado: [], rtatAtrasado: [] };
    }
    grupos[c.sucursal].total++;
    if (c.clasificacionSLA === "A TIEMPO") {
      grupos[c.sucursal].aTiempo++;
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
    tatAplazado: avg(g.rtatAplazado),
    tatAtrasado: avg(g.rtatAtrasado),
  }));
}

function semaforoEvolucion(casos: Caso[]) {
  // Fuerza CERRADO internamente
  const cerrados = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.clasificacionSLA && c.periodoMensual);
  const periodos: Record<string, { aTiempo: number; aplazado: number; total: number }> = {};
  for (const c of cerrados) {
    const p = c.periodoMensual!;
    if (!periodos[p]) periodos[p] = { aTiempo: 0, aplazado: 0, total: 0 };
    periodos[p].total++;
    if (c.clasificacionSLA === "A TIEMPO") periodos[p].aTiempo++;
    else if (c.clasificacionSLA === "APLAZADO") periodos[p].aplazado++;
  }
  return Object.entries(periodos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, g]) => ({
      periodo,
      "A TIEMPO": g.total > 0 ? parseFloat(((g.aTiempo / g.total) * 100).toFixed(1)) : 0,
      "APLAZADO": g.total > 0 ? parseFloat(((g.aplazado / g.total) * 100).toFixed(1)) : 0,
      total: g.total,
    }));
}

function semaforoSucursal(casos: Caso[]) {
  // Fuerza CERRADO internamente
  const datos = resumenSucursal(casos);
  return datos.map((d) => ({
    sucursal: d.sucursal,
    "A TIEMPO": d.total > 0 ? parseFloat(((d.aTiempo / d.total) * 100).toFixed(1)) : 0,
    "APLAZADO": d.total > 0 ? parseFloat(((d.aplazado / d.total) * 100).toFixed(1)) : 0,
    pctEtd: d.pctEtd,
  }));
}

function barrasDesviacion(casos: Caso[]) {
  // Fuerza CERRADO + excluye ACTIVACION
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
  // Fuerza CERRADO
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
  // Fuerza CERRADO. Agrupa por Sucursal×Garantía
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
  // Fuerza CERRADO. Evalúa toda la empresa (ignora F1 internamente)
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

// Heatmap Por Periodo (Sucursal × Mes) — respeta metaSLA
function heatmapPeriodo(casos: Caso[], metaSLA: "ETD" | "TAT") {
  // Fuerza CERRADO + excluye MANTENIMIENTO GENERADOR
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

// Heatmap Por Tipo de Trabajo (Sucursal × Categoría) — respeta metaSLA
function heatmapTipoTrabajo(casos: Caso[], metaSLA: "ETD" | "TAT") {
  // Fuerza CERRADO + excluye MANTENIMIENTO GENERADOR
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
}: Props) {
  // ── Estados de filtros globales ──────────────────────────────
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("TODOS");
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("");
  const [garantiaFiltro, setGarantiaFiltro] = useState<string>("");   // F3
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("");
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState<string>(""); // F5
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [binSize, setBinSize] = useState<number>(5);

  // ── Lista dinámica de sub-estados para F5 ───────────────────
  const estadosCasoDisponibles = useMemo(() => {
    const set = new Set(casos.map((c) => c.estadoCaso).filter(Boolean));
    return [...set].sort();
  }, [casos]);

  // ── Override táctico: F2 = "DEVUELTO" ───────────────────────
  // Cuando el usuario elige DEVUELTO, no filtra estadoGeneral sino estadoCaso
  const esDevuelto = estadoFiltro === "DEVUELTO";

  // ── Helper: aplica filtro de estado con override táctico ─────
  const matchEstado = (c: Caso) => {
    if (esDevuelto) return c.estadoCaso === "DEVUELTO";
    if (estadoFiltro === "TODOS") return true;
    return c.estadoGeneral === estadoFiltro;
  };

  // ── Periodo desactivado cuando estado = ABIERTO ──────────────
  const periodoDesact = estadoFiltro === "ABIERTO";

  // ============================================================
  // DATASETS DERIVADOS — uno por componente según la spec
  // ============================================================

  // ── KPIs + TablaPrincipal: F1, F2*, F3, F4*, F5, F6 ─────────
  const casosKPI = useMemo(() =>
    casos.filter((c) => {
      if (!matchEstado(c)) return false;
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && !periodoDesact && c.periodoMensual !== periodoFiltro) return false;
      if (estadoCasoFiltro && c.estadoCaso !== estadoCasoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [casos, estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro]
  );

  // ── PieDistribucion: ignora F1 (para ver todas las sucursales) ─
  // Aplica: F2*, F3, F4*, F5, F6
  const casosDistribucion = useMemo(() =>
    casos.filter((c) => {
      if (!matchEstado(c)) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && !periodoDesact && c.periodoMensual !== periodoFiltro) return false;
      if (estadoCasoFiltro && c.estadoCaso !== estadoCasoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [casos, estadoFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro]
  );

  // ── TablaResumenSucursal: SOLO F4 (Periodo) ──────────────────
  // Fotografia del mes general, ignora todo lo demás
  const casosResumen = useMemo(() =>
    casos.filter((c) => {
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      return true;
    }),
    [casos, periodoFiltro]
  );

  // ── PieEficiencia: F1, F4, F6. Ignora F2 (fuerza CERRADO), F3, F5 ─
  const casosEficiencia = useMemo(() =>
    casos.filter((c) => {
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casos, sucursalFiltro, periodoFiltro, tipoFiltro]
  );

  // ── SemaforoEvolucion (tab): F1, F3, F6. Ignora F4, F2 (fuerza CERRADO)
  const casosEvolucion = useMemo(() =>
    casos.filter((c) => {
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casos, sucursalFiltro, garantiaFiltro, tipoFiltro]
  );

  // ── SemaforoSucursal (tab): F4, F3, F6. Ignora F1, F2 (fuerza CERRADO)
  const casosSucursalSemaforo = useMemo(() =>
    casos.filter((c) => {
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casos, garantiaFiltro, periodoFiltro, tipoFiltro]
  );

  // ── Tab Demora/Garantía: F4, F5, F6. Ignora F1, F3 ─────────
  const casosDemoraSucursal = useMemo(() =>
    casos.filter((c) => {
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      if (estadoCasoFiltro && c.estadoCaso !== estadoCasoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casos, periodoFiltro, estadoCasoFiltro, tipoFiltro]
  );

  // ── Tab Demora/TipoTrabajo: F4, F5. Ignora F1, F3, F6 ───────
  const casosDemoraTabajo = useMemo(() =>
    casos.filter((c) => {
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      if (estadoCasoFiltro && c.estadoCaso !== estadoCasoFiltro) return false;
      return true;
    }),
    [casos, periodoFiltro, estadoCasoFiltro]
  );

  // ── BarrasDesviacion: F1, F3, F4. Ignora F2 (fuerza CERRADO), F5, F6 ─
  const casosDesviacion = useMemo(() =>
    casos.filter((c) => {
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      return true;
    }),
    [casos, sucursalFiltro, garantiaFiltro, periodoFiltro]
  );

  // ── HistogramaRtat: F1, F3, F4, F6. Ignora F2 (fuerza CERRADO), F5 ─
  const casosHistograma = useMemo(() =>
    casos.filter((c) => {
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casos, sucursalFiltro, garantiaFiltro, periodoFiltro, tipoFiltro]
  );

  // ── HeatmapSLA (ambas tabs): F1, F3, F4, F6 ─────────────────
  // Tab TipoTrabajo ignora F6 (todos los tipos forzados en eje X)
  const casosHeatmap = useMemo(() =>
    casos.filter((c) => {
      if (sucursalFiltro && c.sucursal !== sucursalFiltro) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
      return true;
    }),
    [casos, sucursalFiltro, garantiaFiltro, periodoFiltro]
  );
  // Tab HeatmapPeriodo también aplica F6
  const casosHeatmapPeriodo = useMemo(() =>
    casosHeatmap.filter((c) => {
      if (tipoFiltro && c.tipoTrabajo !== tipoFiltro) return false;
      return true;
    }),
    [casosHeatmap, tipoFiltro]
  );

  // ============================================================
  // DATOS COMPUTADOS PARA COMPONENTES
  // ============================================================
  const total = casosKPI.length;
  const abiertos = casosKPI.filter((c) => c.estadoGeneral === "ABIERTO").length;
  const cerrados = casosKPI.filter((c) => c.estadoGeneral === "CERRADO").length;
  const pctAbiertos = total > 0 ? ((abiertos / total) * 100).toFixed(1) : "0.0";

  const pieDistData = useMemo(() => {
    const grupos: Record<string, number> = {};
    for (const c of casosDistribucion) {
      grupos[c.sucursal] = (grupos[c.sucursal] ?? 0) + 1;
    }
    return Object.entries(grupos).map(([name, value]) => ({ name, value }));
  }, [casosDistribucion]);

  const pieEficData = useMemo(() => {
    const data = pctSLA(casosEficiencia);
    const tot = data.reduce((a, b) => a + b.value, 0);
    return data.map((d) => ({ ...d, total: tot }));
  }, [casosEficiencia]);

  const semEvolucionData = useMemo(() => semaforoEvolucion(casosEvolucion), [casosEvolucion]);
  const semSucursalData = useMemo(() => semaforoSucursal(casosSucursalSemaforo), [casosSucursalSemaforo]);
  const resumenData = useMemo(() => resumenSucursal(casosResumen), [casosResumen]);
  const desviacionData = useMemo(() => barrasDesviacion(casosDesviacion), [casosDesviacion]);
  const histData = useMemo(() => histogramaRtat(casosHistograma, binSize), [casosHistograma, binSize]);
  const demoraSucData = useMemo(() => demoraSucursal(casosDemoraSucursal), [casosDemoraSucursal]);
  const demoraTipoData = useMemo(() => demoraTipoTrabajo(casosDemoraTabajo), [casosDemoraTabajo]);

  // Heatmap — delegamos el metaSLA al componente (tiene radio buttons propios)
  // Pero necesitamos pasar los datos ya filtrados
  const heatmapPeriodoFn = useMemo(
    () => (metaSLA: "ETD" | "TAT") => heatmapPeriodo(casosHeatmapPeriodo, metaSLA),
    [casosHeatmapPeriodo]
  );
  const heatmapTipoFn = useMemo(
    () => (metaSLA: "ETD" | "TAT") => heatmapTipoTrabajo(casosHeatmap, metaSLA),
    [casosHeatmap]
  );

  const hayFiltros = estadoFiltro !== "TODOS" || sucursalFiltro || garantiaFiltro || periodoFiltro || estadoCasoFiltro || tipoFiltro;

  return (
    <div className="space-y-6">
      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="sticky top-2 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Filtros Globales</span>
          </div>
          {hayFiltros && (
            <button
              onClick={() => { setEstadoFiltro("TODOS"); setSucursalFiltro(""); setGarantiaFiltro(""); setPeriodoFiltro(""); setEstadoCasoFiltro(""); setTipoFiltro(""); }}
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

          {/* F4: Periodo */}
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            disabled={periodoDesact}
            className={`px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-opacity
              ${periodoDesact ? "opacity-40 cursor-not-allowed text-slate-600" : "text-slate-300"}`}
          >
            <option value="">{periodoDesact ? "Periodo (inactivo)" : "Todos los periodos"}</option>
            {periodosDisponibles.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
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
