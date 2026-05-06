"use client";

import { useState, useTransition } from "react";
import {
  X,
  ClipboardCheck,
  FileOutput,
  Loader2,
  Calendar,
  User,
  Cpu,
  MapPin,
  Wrench,
  Clock,
  Lock,
} from "lucide-react";
import { registrarIngreso, registrarSalida, obtenerRepuestosPorCaso } from "@/app/(dashboard)/casos/casos-actions";
import {
  generarPDFRegistroIngreso,
  generarPDFReporteSalida,
} from "@/lib/pdf/generar-pdf-casos";
import { createBrowserClient } from "@/utils/supabase/client";
import type { CasoUI } from "./CasosClientWrapper";

interface Props {
  caso: CasoUI;
  userEmail: string;
  onClose: () => void;
  onIngresado: (casoId: number, fechaIngreso: string) => void;
  onSalida: (casoId: number, fechaSalida: string) => void;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const SLA_STYLE: Record<string, string> = {
  "A TIEMPO": "bg-green-900/40 text-green-400 border-green-500/30",
  APLAZADO: "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
  ATRASADO: "bg-red-900/40 text-red-400 border-red-500/30",
};

const ESTADO_STYLE: Record<string, string> = {
  CERRADO: "bg-indigo-900/40 text-indigo-300 border-indigo-500/30",
  ABIERTO: "bg-amber-900/40 text-amber-300 border-amber-500/30",
};

function Campo({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="mt-0.5 text-slate-500 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-slate-200 mt-0.5 break-words">{valor || "—"}</p>
      </div>
    </div>
  );
}

export function ModalDetalleCaso({
  caso,
  userEmail,
  onClose,
  onIngresado,
  onSalida,
}: Props) {
  const [isPendingIngreso, startIngreso] = useTransition();
  const [isPendingSalida, startSalida] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const supabase = createBrowserClient();

  const puedeRegistrarIngreso = !caso.fechaIngreso;
  const puedeRegistrarSalida = caso.estadoGeneral === "CERRADO" && !caso.fechaSalida;
  const tieneSalida = !!caso.fechaSalida;

  const urlPdfIngreso = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/casos_pdfs/ingreso_${caso.id}.pdf`;
  const urlPdfSalida = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/casos_pdfs/salida_${caso.id}.pdf`;

  const handleDescargarPdfIngreso = () => {
    const pdfBlob = generarPDFRegistroIngreso({
      numeroCaso: caso.numeracionCaso,
      cliente: caso.cliente,
      equipo: caso.equipo,
      sucursal: caso.sucursal,
      descripcion: caso.descripcion,
      descripcionTecnica: caso.descripcionTecnica,
      fechaIngreso: caso.fechaIngreso || new Date().toISOString().slice(0, 10),
      emisor: userEmail,
    });
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ingreso_${caso.numeracionCaso}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRegistrarIngreso = () => {
    setErrorMsg("");
    startIngreso(async () => {
      // 1. Generar y descargar PDF localmente
      handleDescargarPdfIngreso();

      // 2. Registrar en base de datos
      const res = await registrarIngreso(caso.id);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(`Ingreso registrado el ${formatFecha(res.fechaIngreso!)}. PDF descargado.`);
      onIngresado(caso.id, res.fechaIngreso!);
    });
  };

  const handleDescargarPdfSalida = async () => {
    if (caso.estadoGeneral !== "CERRADO") {
      setErrorMsg("El reporte de salida solo puede generarse cuando el caso está CERRADO.");
      return;
    }
    const repuestos = await obtenerRepuestosPorCaso(caso.numeracionCaso);
    const pdfBlob = generarPDFReporteSalida({
      numeroCaso: caso.numeracionCaso,
      cliente: caso.cliente,
      equipo: caso.equipo,
      sucursal: caso.sucursal,
      tipoTrabajo: caso.tipoTrabajo,
      descripcion: caso.descripcion,
      descripcionTecnica: caso.descripcionTecnica,
      descripcionSalida: caso.descripcionSalida,
      garantia: caso.garantia,
      fechaIngreso: caso.fechaIngreso,
      fechaSalida: caso.fechaSalida || new Date().toISOString().slice(0, 10),
      rtat: caso.rtat,
      clasificacionSLA: caso.clasificacionSLA,
      estadoGeneral: caso.estadoGeneral,
      emisor: userEmail,
      repuestos,
    });
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salida_${caso.numeracionCaso}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleReporteSalida = () => {
    setErrorMsg("");
    startSalida(async () => {
      // 1. Generar y descargar PDF localmente (solo si CERRADO)
      await handleDescargarPdfSalida();

      // 2. Registrar fecha de salida en base de datos
      const res = await registrarSalida(caso.id);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(`Salida registrada el ${formatFecha(res.fechaSalida!)}. PDF descargado.`);
      onSalida(caso.id, res.fechaSalida!);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="w-full max-w-md bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Caso
              </p>
              <span className="font-mono text-indigo-400 font-bold text-sm">
                {caso.numeracionCaso}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  ESTADO_STYLE[caso.estadoGeneral] ??
                  "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {caso.estadoGeneral}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">{caso.cliente || "Sin cliente"}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 text-slate-400 hover:text-slate-100 transition-colors p-1.5 hover:bg-slate-800 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botones de Acción */}
        <div className="px-5 py-3 border-b border-slate-800 space-y-2">
          {/* Registrar Ingreso */}
          {puedeRegistrarIngreso && (
            <button
              onClick={handleRegistrarIngreso}
              disabled={isPendingIngreso}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              {isPendingIngreso ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
              {isPendingIngreso ? "Registrando..." : "Registrar Ingreso"}
            </button>
          )}

          {/* Fecha ingreso bloqueada y Descarga PDF Ingreso */}
          {!puedeRegistrarIngreso && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Ingreso: </span>
                  {formatFecha(caso.fechaIngreso)}
                </div>
              </div>
              <button
                onClick={handleDescargarPdfIngreso}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Descargar PDF
              </button>
            </div>
          )}

          {/* Registrar Reporte de Salida */}
          {puedeRegistrarSalida && (
            <button
              onClick={handleReporteSalida}
              disabled={isPendingSalida}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {isPendingSalida ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileOutput className="w-4 h-4" />
              )}
              {isPendingSalida ? "Registrando Salida..." : "Registrar Reporte de Salida"}
            </button>
          )}

          {/* Fecha salida bloqueada y Descarga PDF Salida — solo si CERRADO */}
          {tieneSalida && caso.estadoGeneral === "CERRADO" && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Salida: </span>
                  {formatFecha(caso.fechaSalida)}
                </div>
              </div>
              <button
                onClick={handleDescargarPdfSalida}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
              >
                <FileOutput className="w-3.5 h-3.5" />
                Descargar PDF
              </button>
            </div>
          )}

          {/* Mensajes */}
          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg">
              ✓ {successMsg}
            </p>
          )}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Equipo */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Equipo
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              <Campo icon={<Cpu className="w-4 h-4" />} label="Nombre / Modelo" valor={caso.equipo} />
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Cliente
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              <Campo icon={<User className="w-4 h-4" />} label="Nombre" valor={caso.cliente} />
            </div>
          </div>

          {/* Asignación */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Asignación
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              <Campo icon={<MapPin className="w-4 h-4" />} label="Sucursal" valor={caso.sucursal} />
              <Campo icon={<User className="w-4 h-4" />} label="Garantía" valor={caso.garantia} />
            </div>
          </div>

          {/* Detalles Técnicos */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Detalles Técnicos
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              <Campo icon={<Wrench className="w-4 h-4" />} label="Tipo de Trabajo" valor={caso.tipoTrabajo} />
              <Campo icon={<Wrench className="w-4 h-4" />} label="Estado de Caso" valor={caso.estadoCaso} />
              {caso.descripcion && (
                <div className="py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Descripción
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{caso.descripcion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Registro Temporal */}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Registro Temporal
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              <Campo
                icon={<Calendar className="w-4 h-4" />}
                label="Fecha de Ingreso"
                valor={formatFecha(caso.fechaIngreso)}
              />
              <Campo
                icon={<Calendar className="w-4 h-4" />}
                label="Fecha de Salida"
                valor={formatFecha(caso.fechaSalida)}
              />
              <div className="flex items-start gap-3 py-3">
                <Clock className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    RTAT (Días hábiles)
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-2xl font-bold text-white">
                      {caso.rtat !== null ? caso.rtat : "—"}
                    </span>
                    {caso.clasificacionSLA && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          SLA_STYLE[caso.clasificacionSLA]
                        }`}
                      >
                        {caso.clasificacionSLA}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
