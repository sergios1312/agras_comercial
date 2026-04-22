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
import { EvolucionEquipos } from "@/components/estadisticas/EvolucionEquipos";

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
    total: d.total,
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
        cantidad: rtats.length,
      };
    });
}

function agruparEquipo(equipo: string | null | undefined): "Dron" | "Generador" | "Bateria" | "Otros" {
  if (!equipo) return "Otros";
  const e = equipo.toUpperCase();
  if (e.includes("D12000IE") || e.includes("D14000IEP") || e.includes("D6000IE")) return "Generador";
  if (e.includes("DB1560") || e.includes("DB2160") || e.includes("DB800")) return "Bateria";
  if (e.includes("T100") || e.includes("T25") || e.includes("T40") || e.includes("T50") || e.includes("T70P")) return "Dron";
  return "Otros";
}

function evolucionEquiposLogic(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.clasificacionSLA && c.periodoMensual);
  const periodos: Record<string, { Dron: number; Generador: number; Bateria: number; Otros: number; total: number; aTiempo: number; aplazado: number; rtatSum: number; rtatCount: number }> = {};

  for (const c of cerrados) {
    const p = c.periodoMensual!;
    if (!periodos[p]) periodos[p] = { Dron: 0, Generador: 0, Bateria: 0, Otros: 0, total: 0, aTiempo: 0, aplazado: 0, rtatSum: 0, rtatCount: 0 };
    periodos[p].total++;
    
    if (c.clasificacionSLA === "A TIEMPO") periodos[p].aTiempo++;
    if (c.clasificacionSLA === "APLAZADO") periodos[p].aplazado++;
    if (c.rtat !== null && c.rtat !== undefined) { periodos[p].rtatSum += c.rtat; periodos[p].rtatCount++; }

    const cat = agruparEquipo(c.equipo);
    periodos[p][cat]++;
  }

  return Object.entries(periodos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, g]) => ({
      periodo,
      Dron: g.Dron,
      Generador: g.Generador,
      Bateria: g.Bateria,
      Otros: g.Otros,
      eficienciaETD: g.total > 0 ? parseFloat(((g.aTiempo / g.total) * 100).toFixed(1)) : 0,
      eficienciaTAT: g.total > 0 ? parseFloat((((g.aTiempo + g.aplazado) / g.total) * 100).toFixed(1)) : 0,
      totalCasos: g.total,
      rtatPromedio: g.rtatCount > 0 ? parseFloat((g.rtatSum / g.rtatCount).toFixed(1)) : null,
    }));
}

function sucursalEquiposLogic(casos: Caso[]) {
  const cerrados = casos.filter((c) => c.clasificacionSLA);
  const sucursales: Record<string, { Dron: number; Generador: number; Bateria: number; Otros: number; total: number; aTiempo: number; aplazado: number; rtatSum: number; rtatCount: number }> = {};

  for (const c of cerrados) {
    const s = c.sucursal;
    if (!sucursales[s]) sucursales[s] = { Dron: 0, Generador: 0, Bateria: 0, Otros: 0, total: 0, aTiempo: 0, aplazado: 0, rtatSum: 0, rtatCount: 0 };
    sucursales[s].total++;
    
    if (c.clasificacionSLA === "A TIEMPO") sucursales[s].aTiempo++;
    if (c.clasificacionSLA === "APLAZADO") sucursales[s].aplazado++;
    if (c.rtat !== null && c.rtat !== undefined) { sucursales[s].rtatSum += c.rtat; sucursales[s].rtatCount++; }

    const cat = agruparEquipo(c.equipo);
    sucursales[s][cat]++;
  }

  return Object.entries(sucursales)
    // sort by efficiency desc
    .sort((a, b) => {
        const pctA = a[1].total > 0 ? a[1].aTiempo / a[1].total : 0;
        const pctB = b[1].total > 0 ? b[1].aTiempo / b[1].total : 0;
        return pctB - pctA;
    })
    .map(([sucursal, g]) => ({
      sucursal,
      Dron: g.Dron,
      Generador: g.Generador,
      Bateria: g.Bateria,
      Otros: g.Otros,
      eficienciaETD: g.total > 0 ? parseFloat(((g.aTiempo / g.total) * 100).toFixed(1)) : 0,
      eficienciaTAT: g.total > 0 ? parseFloat((((g.aTiempo + g.aplazado) / g.total) * 100).toFixed(1)) : 0,
      totalCasos: g.total,
      rtatPromedio: g.rtatCount > 0 ? parseFloat((g.rtatSum / g.rtatCount).toFixed(1)) : null,
    }));
}

function histogramaRtat(casos: Caso[]) {
  const rtats = casos.filter((c) => c.estadoGeneral === "CERRADO" && c.rtat !== null).map((c) => c.rtat!);
  const buckets: Record<number, number> = {};
  for (const r of rtats) {
    if (r > 100) continue;
    const bucket = Math.floor(r); // 1-day bin
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
  const [sucursalFiltro, setSucursalFiltro] = useState<string[]>([]); // ← array multi-select
  const [garantiaFiltro, setGarantiaFiltro] = useState<string>("");   
  const [periodoFiltro, setPeriodoFiltro] = useState<string[]>([]);
  const [ingresoFiltro, setIngresoFiltro] = useState<string>("");
  const [openPeriodo, setOpenPeriodo] = useState<boolean>(false);
  const [openSucursal, setOpenSucursal] = useState<boolean>(false);
  const [openEquipo, setOpenEquipo] = useState<boolean>(false);
  const [openEstadoCaso, setOpenEstadoCaso] = useState<boolean>(false);
  const [openTipo, setOpenTipo] = useState<boolean>(false);
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState<string[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);  
  const [equipoFiltro, setEquipoFiltro] = useState<string[]>([]); // ← array: valores raw OR categoria especial

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
    return estadoFiltro !== "TODOS" || sucursalFiltro.length > 0 || garantiaFiltro !== "" || periodoFiltro.length > 0 || ingresoFiltro !== "" || estadoCasoFiltro.length > 0 || tipoFiltro.length > 0 || equipoFiltro.length > 0;
  }, [estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, ingresoFiltro, estadoCasoFiltro, tipoFiltro, equipoFiltro]);

  const handleLimpiarFiltros = () => {
    setEstadoFiltro("TODOS");
    setSucursalFiltro([]);
    setGarantiaFiltro("");
    setPeriodoFiltro([]);
    setIngresoFiltro("");
    setEstadoCasoFiltro([]);
    setTipoFiltro([]);
    setEquipoFiltro([]);
  };


  const casosKPI = useMemo(() => {
    return casos.filter(c => {
      if (!matchEstado(c)) return false;
      if (sucursalFiltro.length > 0 && !sucursalFiltro.includes(c.sucursal)) return false;
      if (garantiaFiltro && c.garantia !== garantiaFiltro) return false;
      if (periodoFiltro.length > 0 && !periodoDesact && (!c.periodoMensual || !periodoFiltro.includes(c.periodoMensual))) return false;
      if (ingresoFiltro === "INGRESADOS" && !c.fechaIngreso) return false;
      if (ingresoFiltro === "NO INGRESADOS" && c.fechaIngreso) return false;
      if (estadoCasoFiltro.length > 0 && !estadoCasoFiltro.includes(c.estadoCaso as string)) return false;
      if (tipoFiltro.length > 0 && !tipoFiltro.includes(c.tipoTrabajo)) return false;
      if (equipoFiltro.length > 0) {
        const matchesAny = equipoFiltro.some(f => {
          if (f === "SIN_EQUIPO") return !c.equipo || c.equipo.trim() === "";
          
          // Categorías principales (Dron, Generador, Bateria, Otros)
          if (f === "Dron" || f === "Generador" || f === "Bateria" || f === "Otros") {
            return agruparEquipo(c.equipo) === f;
          }
          
          // Modelos específicos (T100, D12000IE, etc.)
          return c.equipo?.toUpperCase().includes(f.toUpperCase());
        });
        if (!matchesAny) return false;
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
  const evoEquiposData = useMemo(() => evolucionEquiposLogic(casosKPI), [casosKPI]);
  const sucEquiposData = useMemo(() => sucursalEquiposLogic(casosKPI), [casosKPI]);
  const resumenData = useMemo(() => resumenSucursal(casosKPI), [casosKPI]);
  const desviacionData = useMemo(() => barrasDesviacion(casosKPI), [casosKPI]);
  const histData = useMemo(() => histogramaRtat(casosKPI), [casosKPI]);
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

          {/* F1: Sucursal — Grupos con multi-select */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenSucursal(!openSucursal); setOpenEquipo(false); setOpenPeriodo(false); }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[150px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <span className="truncate pr-2">
                {sucursalFiltro.length > 0 ? `${sucursalFiltro.length} sede(s)` : "Todas las sedes"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openSucursal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenSucursal(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-64">
                  {/* Select all / clear */}
                  <div className="flex gap-2 px-3 py-1.5 border-b border-slate-700">
                    <button onClick={() => setSucursalFiltro([])} className="text-[10px] text-slate-400 hover:text-slate-200">Limpiar</button>
                  </div>
                  {/* Grupo QTC */}
                  {(() => {
                    const GRUPO_QTC = ["LIMA", "PIURA", "ICA", "CHICLAYO", "Lima", "Piura", "Ica", "Chiclayo"];
                    const GRUPO_AMZ = ["BELLAVISTA", "PUCALLPA", "NUEVA CAJAMARCA", "HUÁNUCO", "JAÉN", "YURIMAGUAS", "Bellavista", "Pucallpa", "Nueva Cajamarca", "Huánuco", "Jaen", "Jaén", "Yurimaguas"];
                    const qtcSedes = sucursalesDisponibles.filter(s => GRUPO_QTC.some(g => s.toLowerCase().includes(g.toLowerCase())));
                    const amzSedes = sucursalesDisponibles.filter(s => GRUPO_AMZ.some(g => s.toLowerCase().includes(g.toLowerCase())));
                    const toggleSede = (s: string) => setSucursalFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                    const toggleGroup = (sedes: string[]) => {
                      const allSelected = sedes.every(s => sucursalFiltro.includes(s));
                      if (allSelected) setSucursalFiltro(prev => prev.filter(s => !sedes.includes(s)));
                      else setSucursalFiltro(prev => [...new Set([...prev, ...sedes])]);
                    };
                    return (
                      <>
                        {/* Grupo QTC */}
                        <div>
                          <label className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50">
                            <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                              checked={qtcSedes.length > 0 && qtcSedes.every(s => sucursalFiltro.includes(s))}
                              onChange={() => toggleGroup(qtcSedes)} />
                            <span className="text-xs text-indigo-300 font-semibold">🏙 Grupo QTC</span>
                          </label>
                          {qtcSedes.map(s => (
                            <label key={s} className="flex items-center px-5 py-1 hover:bg-slate-700/30 cursor-pointer">
                              <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                                checked={sucursalFiltro.includes(s)}
                                onChange={() => toggleSede(s)} />
                              <span className="text-xs text-slate-300">{s}</span>
                            </label>
                          ))}
                        </div>
                        {/* Grupo QTC Amazonas */}
                        <div>
                          <label className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50">
                            <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                              checked={amzSedes.length > 0 && amzSedes.every(s => sucursalFiltro.includes(s))}
                              onChange={() => toggleGroup(amzSedes)} />
                            <span className="text-xs text-emerald-300 font-semibold">🌿 Grupo QTC Amazonas</span>
                          </label>
                          {amzSedes.map(s => (
                            <label key={s} className="flex items-center px-5 py-1 hover:bg-slate-700/30 cursor-pointer">
                              <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                                checked={sucursalFiltro.includes(s)}
                                onChange={() => toggleSede(s)} />
                              <span className="text-xs text-slate-300">{s}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

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
              onClick={() => { setOpenPeriodo(!openPeriodo); setOpenSucursal(false); setOpenEquipo(false); }}
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

          {/* F5: Estado de Caso — multi-select */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenEstadoCaso(!openEstadoCaso); setOpenSucursal(false); setOpenPeriodo(false); setOpenEquipo(false); setOpenTipo(false); }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[140px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <span className="truncate pr-2">
                {estadoCasoFiltro.length > 0 ? `${estadoCasoFiltro.length} estado(s)` : "Todos los estados"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openEstadoCaso && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenEstadoCaso(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-52 max-h-60 overflow-y-auto">
                  <div className="flex gap-2 px-3 py-1.5 border-b border-slate-700">
                    <button onClick={() => setEstadoCasoFiltro([])} className="text-[10px] text-slate-400 hover:text-slate-200">Limpiar</button>
                  </div>
                  {estadosCasoDisponibles.map(s => (
                    <label key={s} className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                        checked={estadoCasoFiltro.includes(s)}
                        onChange={() => setEstadoCasoFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
                      <span className="text-xs text-slate-300">{s}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* F6: Tipo de Trabajo — multi-select */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenTipo(!openTipo); setOpenSucursal(false); setOpenPeriodo(false); setOpenEquipo(false); setOpenEstadoCaso(false); }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[140px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <span className="truncate pr-2">
                {tipoFiltro.length > 0 ? `${tipoFiltro.length} tipo(s)` : "Todos los tipos"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openTipo && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenTipo(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-56 max-h-60 overflow-y-auto">
                  <div className="flex gap-2 px-3 py-1.5 border-b border-slate-700">
                    <button onClick={() => setTipoFiltro([])} className="text-[10px] text-slate-400 hover:text-slate-200">Limpiar</button>
                  </div>
                  {tiposTrabajoDisponibles.map(t => (
                    <label key={t} className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                        checked={tipoFiltro.includes(t)}
                        onChange={() => setTipoFiltro(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
                      <span className="text-xs text-slate-300">{t}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* F8: Equipo — Categorías con submodelos */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenEquipo(!openEquipo); setOpenSucursal(false); setOpenPeriodo(false); }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[150px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <span className="truncate pr-2">
                {equipoFiltro.length > 0 ? `${equipoFiltro.length} filtro(s)` : "Todos los equipos"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openEquipo && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenEquipo(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-64">
                  <div className="flex gap-2 px-3 py-1.5 border-b border-slate-700">
                    <button onClick={() => setEquipoFiltro([])} className="text-[10px] text-slate-400 hover:text-slate-200">Limpiar</button>
                  </div>
                  {/* Vacío */}
                  <label className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                      checked={equipoFiltro.includes("SIN_EQUIPO")}
                      onChange={() => setEquipoFiltro(prev => prev.includes("SIN_EQUIPO") ? prev.filter(x => x !== "SIN_EQUIPO") : [...prev, "SIN_EQUIPO"])} />
                    <span className="text-xs text-slate-400 italic">(Vacío / Sin equipo)</span>
                  </label>
                  {/* Categorías principales con submodelos */}
                  {([
                    { cat: "Dron", icon: "🚁", color: "text-blue-300", modelos: ["T100", "T25", "T25P", "T40", "T50", "T70P"] },
                    { cat: "Generador", icon: "⚡", color: "text-cyan-300", modelos: ["D12000IE", "D12000IEP", "D14000IEP", "D6000IE"] },
                    { cat: "Bateria", icon: "🔋", color: "text-fuchsia-300", modelos: ["DB1560", "DB2160", "DB800"] },
                    { cat: "Otros", icon: "📦", color: "text-slate-400", modelos: [] },
                  ] as { cat: string; icon: string; color: string; modelos: string[] }[]).map(({ cat, icon, color, modelos }) => (
                    <div key={cat}>
                      <label className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer border-t border-slate-700/50">
                        <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                          checked={equipoFiltro.includes(cat)}
                          onChange={() => setEquipoFiltro(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])} />
                        <span className={`text-xs font-semibold ${color}`}>{icon} {cat}</span>
                      </label>
                      {modelos.map(m => (
                        <label key={m} className="flex items-center px-6 py-1 hover:bg-slate-700/30 cursor-pointer">
                          <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                            checked={equipoFiltro.includes(m)}
                            onChange={() => setEquipoFiltro(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} />
                          <span className="text-xs text-slate-400">{m}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>


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
          titulo={sucursalFiltro.length === 1 ? `Eficiencia SLA — ${sucursalFiltro[0]}` : sucursalFiltro.length > 1 ? `Eficiencia SLA — ${sucursalFiltro.length} sedes` : "Eficiencia SLA (todas las sucursales)"}
        />
      </div>

      {/* ── Comparativa de Eficiencias (Tabbed) ──────────────── */}
      <ComparativaEficiencias
        evolucionData={semEvolucionData}
        sucursalData={semSucursalData}
      />

      {/* ── Evolución de Eficiencia y Volumen por Equipo ─────── */}
      <EvolucionEquipos evolucionData={evoEquiposData} sucursalData={sucEquiposData} />

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
      <HistogramaRtat data={histData} />

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
