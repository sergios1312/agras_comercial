"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { parse } from "csv-parse/browser/esm/sync";
import { createBrowserClient } from "@/utils/supabase/client";
import { contarDiasHabiles } from "@/lib/rtat";
import {
  PLAZOS_IDEALES,
  SUCURSALES_BANEADAS,
  TRABAJOS_BANEADOS,
  SUCURSALES_OFICIALES,
} from "@/types/casos.types";
import type { Caso, ClasificacionSLA } from "@/types/casos.types";
import { confirmarSubidaCasos, obtenerCasosExistentesDetalle } from "@/app/(dashboard)/administrador/admin-casos-actions";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  UploadCloud,
  Eye,
  Database,
} from "lucide-react";

// ─── Tipos internos del panel ──────────────────────────────────
type PanelState = "idle" | "parsing" | "preview" | "uploading" | "done" | "error";

interface CasoConEstado extends Caso {
  estadoCarga: "nuevo" | "modificado" | "sin_cambios";
}

interface ResumenCarga {
  nuevos: number;
  modificados: number;
  sinCambios: number;
}

// ─── Helpers reutilizados del server (sin fs) ──────────────────
function parseDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  const clean = val.trim().replace(/\//g, "-");
  const d = new Date(clean);
  if (isNaN(d.getTime())) return null;
  return clean;
}

function periodoMensual(fechaSalida: string | null): string | null {
  if (!fechaSalida) return null;
  return fechaSalida.slice(0, 7);
}

function clasificarSLA(
  rtat: number | null,
  tipoTrabajo: string,
  estadoGeneral: string
): ClasificacionSLA {
  if (estadoGeneral !== "CERRADO") return null;
  if (rtat === null) return null;
  const plazo = PLAZOS_IDEALES[tipoTrabajo];
  if (!plazo) return null;
  if (rtat <= plazo) return "A TIEMPO";
  if (rtat <= plazo * 2) return "APLAZADO";
  return "ATRASADO";
}

function parsearCsvTexto(raw: string): Caso[] {
  let delimitador = ",";
  const lineas = raw.split("\n");
  if (lineas.length > 0 && !lineas[0].includes(",") && lineas[0].includes(";")) {
    delimitador = ";";
  }

  const records = parse(raw, {
    delimiter: delimitador,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];

  if (records.length < 2) return [];

  const headers = records[0].map((h: string) => h.trim());
  const idx = (name: string) => headers.findIndex((h: string) => h === name);

  const I = {
    numeracion: idx("Numeración"),
    estadoGen: idx("ESTADO GENERAL"),
    desc: idx("DESCRIPCIÓN"),
    sucursal: idx("Sucursal DJI AGRAS - QTC:"),
    cliente: idx("Cliente"),
    garantia: idx("GARANTÍA"),
    estadoCaso: idx("ESTADO DE CASO"),
    tipoTrabajo: idx("TIPO DE TRABAJO"),
    fechaIngreso: idx("Fecha de ingreso"),
    fechaSalida: idx("Fecha de salida"),
  };

  // Validación de columnas críticas
  const columnasFaltantes: string[] = [];
  if (I.numeracion === -1) columnasFaltantes.push("Numeración");
  if (I.estadoGen === -1) columnasFaltantes.push("ESTADO GENERAL");
  if (I.sucursal === -1) columnasFaltantes.push("Sucursal DJI AGRAS - QTC:");
  if (I.tipoTrabajo === -1) columnasFaltantes.push("TIPO DE TRABAJO");

  if (columnasFaltantes.length > 0) {
    throw new Error(
      `El archivo CSV no tiene las columnas requeridas: ${columnasFaltantes.join(", ")}`
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const casos: Caso[] = [];

  for (let i = 1; i < records.length; i++) {
    const cols = records[i].map((c: string) => c.trim());
    if (cols.length < 5) continue;

    const sucursalRaw = cols[I.sucursal] ?? "";
    const sucursalMatch = SUCURSALES_OFICIALES.find((s) =>
      sucursalRaw.toLowerCase().includes(s.toLowerCase())
    );
    if (!sucursalMatch) continue;
    const sucursal = sucursalMatch;

    const tipoTrabajo = (cols[I.tipoTrabajo] ?? "").toUpperCase();
    const estadoGeneral = (cols[I.estadoGen] ?? "").toUpperCase();

    if (SUCURSALES_BANEADAS.some((s) => sucursal.toLowerCase().includes(s.toLowerCase()))) continue;
    if (TRABAJOS_BANEADOS.some((t) => tipoTrabajo.includes(t))) continue;

    let numRaw = (cols[I.numeracion] ?? "").trim();
    if (numRaw.includes(".")) numRaw = numRaw.split(".")[0];
    const numeracionCaso = numRaw ? numRaw.padStart(4, "0") : "0000";

    let estadoCaso = cols[I.estadoCaso] ?? "";
    if (!estadoCaso) estadoCaso = "SIN ESTADO";

    const fechaIngreso = parseDate(cols[I.fechaIngreso] ?? "");
    const fechaSalida = parseDate(cols[I.fechaSalida] ?? "");

    let estadoFinal = estadoCaso;
    if (!fechaIngreso) estadoFinal = "NO INGRESADO";

    let rtat: number | null = null;
    if (fechaIngreso) {
      const fechaFin = fechaSalida ?? hoy;
      const dias = contarDiasHabiles(fechaIngreso, fechaFin);
      rtat = dias >= 0 ? dias : null;
    }

    const periodo = periodoMensual(fechaSalida);
    const sla = clasificarSLA(rtat, tipoTrabajo, estadoGeneral);

    casos.push({
      id: i,
      numeracionCaso,
      estadoGeneral: estadoGeneral || "ABIERTO",
      descripcion: cols[I.desc] ?? "",
      sucursal,
      cliente: cols[I.cliente] ?? "",
      garantia: cols[I.garantia] ?? "",
      estadoCaso: estadoFinal,
      tipoTrabajo: tipoTrabajo || "SIN TIPO",
      fechaIngreso,
      fechaSalida,
      periodoMensual: periodo,
      rtat,
      clasificacionSLA: sla,
    });
  }

  return casos;
}

// ─── Badges de estado de carga ────────────────────────────────
function BadgeCarga({ estado }: { estado: "nuevo" | "modificado" | "sin_cambios" }) {
  if (estado === "nuevo") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        NUEVO
      </span>
    );
  }
  if (estado === "sin_cambios") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-700/30 text-slate-500 border border-slate-700/50">
        SIN CAMBIOS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30">
      MOD.
    </span>
  );
}

// ─── Badge SLA ────────────────────────────────────────────────
function BadgeSLA({ sla }: { sla: ClasificacionSLA }) {
  if (!sla) return <span className="text-slate-600 text-xs">—</span>;
  const styles: Record<string, string> = {
    "A TIEMPO": "text-emerald-400",
    APLAZADO: "text-amber-400",
    ATRASADO: "text-red-400",
  };
  return (
    <span className={`text-xs font-medium ${styles[sla] ?? "text-slate-400"}`}>{sla}</span>
  );
}

// ─── Componente Principal ─────────────────────────────────────
export function CargaCasosPanel() {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [casos, setCasos] = useState<CasoConEstado[]>([]);
  const [resumen, setResumen] = useState<ResumenCarga>({ nuevos: 0, modificados: 0, sinCambios: 0 });
  const [mensaje, setMensaje] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const FILAS_POR_PAGINA = 50;

  // ─── Procesamiento del archivo ─────────────────────────────
  const procesarArchivo = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("El archivo debe ser un CSV (.csv)");
      setPanelState("error");
      return;
    }

    setPanelState("parsing");
    setErrorMsg("");

    try {
      const raw = await file.text();
      const casosParseados = parsearCsvTexto(raw);

      if (casosParseados.length === 0) {
        throw new Error("El archivo CSV está vacío o no contiene filas válidas tras el filtrado.");
      }

      // Consultar detalle completo de casos existentes para comparar (Smart Diffing)
      const existentes = await obtenerCasosExistentesDetalle();
      const mapExistentes = new Map<string, any>();
      existentes.forEach((r) => mapExistentes.set(r.numeracion_caso, r));

      const casosConEstado: CasoConEstado[] = casosParseados.map((c) => {
        const dbCase = mapExistentes.get(c.numeracionCaso);
        if (!dbCase) {
          return { ...c, estadoCarga: "nuevo" };
        }

        // Comparar campos para ver si hay cambios reales
        const norm = (val: any) => (val ?? "").toString().trim().toUpperCase();
        const identicos = 
          norm(c.estadoGeneral) === norm(dbCase.estado_general) &&
          norm(c.descripcion) === norm(dbCase.descripcion) &&
          norm(c.cliente) === norm(dbCase.cliente) &&
          norm(c.garantia) === norm(dbCase.garantia) &&
          norm(c.estadoCaso) === norm(dbCase.estado_caso) &&
          norm(c.tipoTrabajo) === norm(dbCase.tipo_trabajo) &&
          norm(c.fechaIngreso) === norm(dbCase.fecha_ingreso) &&
          norm(c.fechaSalida) === norm(dbCase.fecha_salida) &&
          norm(c.sucursal) === norm(dbCase.sucursales?.nombre_ciudad);

        return { 
          ...c, 
          estadoCarga: identicos ? "sin_cambios" : "modificado" 
        };
      });

      const nuevos = casosConEstado.filter((c) => c.estadoCarga === "nuevo").length;
      const modificados = casosConEstado.filter((c) => c.estadoCarga === "modificado").length;
      const sinCambios = casosConEstado.filter((c) => c.estadoCarga === "sin_cambios").length;

      setCasos(casosConEstado);
      setResumen({ nuevos, modificados, sinCambios });
      setPaginaActual(0);
      setPanelState("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido al parsear el CSV.";
      setErrorMsg(msg);
      setPanelState("error");
    }
  }, []);

  // ─── Drag & Drop ──────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) procesarArchivo(file);
    },
    [procesarArchivo]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) procesarArchivo(file);
      // Reset para permitir seleccionar el mismo archivo de nuevo
      e.target.value = "";
    },
    [procesarArchivo]
  );

  // ─── Subida a la BD ───────────────────────────────────────
  const handleConfirmar = () => {
    startTransition(async () => {
      setPanelState("uploading");
      setMensaje("");
      const casosAEnviar = casos.filter(c => c.estadoCarga !== "sin_cambios");
      
      if (casosAEnviar.length === 0) {
        setMensaje("No hay cambios detectados para subir.");
        setPanelState("done");
        return;
      }

      const result = await confirmarSubidaCasos(casosAEnviar);
      if (result.success) {
        setMensaje(result.mensaje ?? "Sincronización completada.");
        setPanelState("done");
      } else {
        setErrorMsg(result.error ?? "Error desconocido al subir los casos.");
        setPanelState("error");
      }
    });
  };

  const handleReset = () => {
    setCasos([]);
    setResumen({ nuevos: 0, modificados: 0, sinCambios: 0 });
    setMensaje("");
    setErrorMsg("");
    setPaginaActual(0);
    setPanelState("idle");
  };

  // ─── Paginación ───────────────────────────────────────────
  const totalPaginas = Math.ceil(casos.length / FILAS_POR_PAGINA);
  const casosPagina = casos.slice(
    paginaActual * FILAS_POR_PAGINA,
    (paginaActual + 1) * FILAS_POR_PAGINA
  );

  // ─── Render: IDLE ─────────────────────────────────────────
  if (panelState === "idle") {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
            : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
        <div
          className={`flex items-center justify-center w-14 h-14 rounded-2xl border transition-colors ${
            isDragging
              ? "bg-emerald-500/20 border-emerald-500/50"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <UploadCloud
            className={`w-7 h-7 transition-colors ${isDragging ? "text-emerald-400" : "text-slate-400"}`}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">
            Arrastra tu <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">casos.csv</code> aquí
          </p>
          <p className="text-xs text-slate-500 mt-1">o haz click para seleccionar el archivo</p>
        </div>
      </div>
    );
  }

  // ─── Render: PARSING ──────────────────────────────────────
  if (panelState === "parsing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl bg-slate-900/40 border border-slate-800">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Analizando archivo CSV...</p>
      </div>
    );
  }

  // ─── Render: ERROR ────────────────────────────────────────
  if (panelState === "error") {
    return (
      <div className="flex flex-col gap-3 p-5 rounded-xl bg-red-950/30 border border-red-800/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Error al procesar el archivo</p>
            <p className="text-xs text-red-400/80 mt-1">{errorMsg}</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="self-start flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Intentar de nuevo
        </button>
      </div>
    );
  }

  // ─── Render: DONE ─────────────────────────────────────────
  if (panelState === "done") {
    return (
      <div className="flex flex-col gap-3 p-5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">¡Subida completada!</p>
            <p className="text-xs text-emerald-400/80 mt-1">{mensaje}</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="self-start flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Subir otro archivo
        </button>
      </div>
    );
  }

  // ─── Render: UPLOADING ────────────────────────────────────
  if (panelState === "uploading" || isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl bg-slate-900/40 border border-slate-800">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">
          Subiendo {casos.filter(c => c.estadoCarga !== "sin_cambios").length.toLocaleString()} casos a la base de datos...
        </p>
        <p className="text-xs text-slate-600">Esto puede tardar unos segundos.</p>
      </div>
    );
  }

  // ─── Render: PREVIEW ─────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Banner de resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
          <UploadCloud className="w-4 h-4 text-emerald-400 mb-0.5" />
          <span className="text-2xl font-bold text-emerald-400">
            {resumen.nuevos.toLocaleString()}
          </span>
          <span className="text-xs text-emerald-600 text-center">Nuevos</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl bg-amber-950/40 border border-amber-800/50">
          <Database className="w-4 h-4 text-amber-400 mb-0.5" />
          <span className="text-2xl font-bold text-amber-400">
            {resumen.modificados.toLocaleString()}
          </span>
          <span className="text-xs text-amber-600 text-center">A modificar</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <Database className="w-4 h-4 text-slate-500 mb-0.5" />
          <span className="text-2xl font-bold text-slate-400">
            {resumen.sinCambios.toLocaleString()}
          </span>
          <span className="text-xs text-slate-600 text-center">Sin cambios</span>
        </div>
      </div>

      {/* Tabla de previsualización */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  Estado
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  N° Caso
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  Estado General
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  Tipo Trabajo
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  Sucursal
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  Cliente
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  F. Ingreso
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  F. Salida
                </th>
                <th className="text-right px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  RTAT
                </th>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {casosPagina.map((caso, idx) => (
                <tr
                  key={`${caso.numeracionCaso}-${idx}`}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-3 py-2">
                    <BadgeCarga estado={caso.estadoCarga} />
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-200 whitespace-nowrap">
                    #{caso.numeracionCaso}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        caso.estadoGeneral === "CERRADO"
                          ? "text-slate-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {caso.estadoGeneral}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300 max-w-[160px] truncate whitespace-nowrap">
                    {caso.tipoTrabajo}
                  </td>
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{caso.sucursal}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-[120px] truncate whitespace-nowrap">
                    {caso.cliente || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-mono">
                    {caso.fechaIngreso ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-mono">
                    {caso.fechaSalida ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {caso.rtat !== null ? (
                      <span className="font-mono font-semibold text-slate-300">
                        {caso.rtat}d
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <BadgeSLA sla={caso.clasificacionSLA} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/40">
            <span className="text-xs text-slate-500">
              Mostrando filas {paginaActual * FILAS_POR_PAGINA + 1}–
              {Math.min((paginaActual + 1) * FILAS_POR_PAGINA, casos.length)} de{" "}
              {casos.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaginaActual((p) => Math.max(0, p - 1))}
                disabled={paginaActual === 0}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
              >
                ‹ Anterior
              </button>
              <span className="px-3 text-xs text-slate-500">
                {paginaActual + 1} / {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaActual === totalPaginas - 1}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <button
          onClick={handleReset}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <X className="w-4 h-4" /> Cancelar y volver
        </button>
        <button
          onClick={handleConfirmar}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Database className="w-4 h-4" />
          Subir {casos.filter(c => c.estadoCarga !== "sin_cambios").length.toLocaleString()} cambios a la Base de Datos
        </button>
      </div>
    </div>
  );
}
