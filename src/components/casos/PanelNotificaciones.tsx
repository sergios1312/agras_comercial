"use client";

import { useState, useTransition, useMemo } from "react";
import { Send, Eye, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Check } from "lucide-react";
import { dispararNotificacionesCasos, previsualizarCasosAccion } from "@/app/(dashboard)/casos/notify-actions";
import { SUCURSALES_DATA } from "@/lib/constants";
import type { Caso } from "@/types/casos.types";

const SUCURSALES_MAESTRAS = SUCURSALES_DATA.filter((s) => s.maneja_stock).map((s) => s.ciudad);

export function PanelNotificaciones() {
  const [isPending, startTransition] = useTransition();
  const [seleccionadas, setSeleccionadas] = useState<string[]>(SUCURSALES_MAESTRAS);
  
  const [previewData, setPreviewData] = useState<Record<string, { casos: Caso[], recipients: { to: string, cc: string[] } }> | null>(null);
  
  const [result, setResult] = useState<{
    success: boolean;
    megaReporte: string[];
    error?: string;
  } | null>(null);

  const handleToggle = (suc: string) => {
    setSeleccionadas((prev) =>
      prev.includes(suc) ? prev.filter((s) => s !== suc) : [...prev, suc]
    );
  };

  const handleToggleAll = () => {
    if (seleccionadas.length === SUCURSALES_MAESTRAS.length) setSeleccionadas([]);
    else setSeleccionadas(SUCURSALES_MAESTRAS);
  };

  const handlePreview = () => {
    startTransition(async () => {
      setResult(null);
      setPreviewData(null);
      
      const res = await previsualizarCasosAccion(seleccionadas);
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        setResult({ success: false, megaReporte: [], error: res.error });
      }
    });
  };

  const handleNotify = () => {
    startTransition(async () => {
      setResult(null);
      const res = await dispararNotificacionesCasos(seleccionadas);
      setResult(res);
      if (res.success) setPreviewData(null); // Limpiar previsualización tras el envío exitoso
    });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Emisión de Notificaciones</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Revisa la tabla en memoria o dispara el generador de Excel a los correos correspondientes.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handlePreview}
            disabled={isPending || seleccionadas.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors w-full md:w-auto border border-slate-700"
          >
            {isPending && !previewData && !result ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Generar Tabla
          </button>
          
          <button
            onClick={handleNotify}
            disabled={isPending || seleccionadas.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg w-full md:w-auto"
          >
            {isPending && (previewData || result) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Excel
          </button>
        </div>
      </div>

      {/* Selector de Sucursales */}
      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-semibold text-slate-400">Sucursales ({seleccionadas.length}/{SUCURSALES_MAESTRAS.length}):</span>
          <button onClick={handleToggleAll} className="text-xs text-indigo-400 hover:text-indigo-300">
            {seleccionadas.length === SUCURSALES_MAESTRAS.length ? "Desmarcar Todas" : "Marcar Todas"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUCURSALES_MAESTRAS.map((s) => (
            <button
              key={s}
              onClick={() => handleToggle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5
                ${seleccionadas.includes(s) 
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200" 
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
            >
              {seleccionadas.includes(s) && <Check className="w-3 h-3" />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Banner de Status de Red */}
      {result && (
        <div className={`p-4 rounded-xl text-sm border shadow-lg ${
          result.success ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-200" : "bg-red-950/40 border-red-900/50 text-red-200"
        }`}>
          {result.success ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-emerald-100">Reportes Generados Exitosamente</strong>
                <ul className="space-y-1 mt-2 text-xs opacity-80 list-disc list-inside">
                  {result.megaReporte.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-red-100">Fallo en la Operación</strong>
                <p className="text-xs opacity-80">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Renders de Vista Previa (Simulación Excel) */}
      {previewData && (
        <div className="space-y-6 pt-2">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
            Vista Previa (Diseño Excel En Memoria)
          </h3>
          
          {Object.keys(previewData).length === 0 && (
            <div className="text-center py-6 text-slate-500 text-sm">
              No hay casos abiertos registrados para las sucursales seleccionadas.
            </div>
          )}

          {Object.entries(previewData).map(([sucursal, { casos, recipients }]) => (
            <div key={sucursal} className="border border-indigo-900/40 rounded-xl overflow-hidden bg-white">
              {/* Fake Excel UI Wrapper */}
              <div className="bg-[#f3f2f1] px-3 py-1.5 border-b border-[#e1dfdd] flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-[#107c41]">Excel Preview</div>
                  <div className="text-[11px] text-slate-500">[{sucursal}]</div>
                </div>
                
                <div className="flex flex-col text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                  <div className="flex gap-1">
                    <span className="font-bold">Para:</span>
                    <span className="text-indigo-600">{recipients.to}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="font-bold">CC:</span>
                    <span>{recipients.cc.join(", ")}</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-800 whitespace-nowrap min-w-[700px]">
                  <thead>
                    <tr>
                      <th colSpan={8} className="bg-[#1a4fa0] text-white py-2 text-center text-sm tracking-wider">
                        LISTA DE CASOS ABIERTOS - GARANTÍAS
                      </th>
                    </tr>
                    <tr><td colSpan={8} className="h-4 bg-white border-b border-slate-200"></td></tr>
                    <tr className="bg-[#2e75b6] text-white">
                      <th className="py-2 px-3 text-left font-medium">Numeración</th>
                      <th className="py-2 px-3 text-left font-medium">Cliente</th>
                      <th className="py-2 px-3 text-left font-medium">Fecha de ingreso</th>
                      <th className="py-2 px-3 text-left font-medium">RTAT (Duración)</th>
                      <th className="py-2 px-3 text-left font-medium">Estado</th>
                      <th className="py-2 px-3 text-left font-medium">Tipo de Trabajo</th>
                      <th className="py-2 px-3 text-left font-medium">Motivo</th>
                      <th className="py-2 px-3 text-left font-medium">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casos.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? "bg-[#f2f7fb]" : "bg-white"}>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50">{c.numeracionCaso}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50 truncate max-w-[120px]" title={c.cliente}>{c.cliente}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50">{c.fechaIngreso ?? "NO INGRESADO"}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50">{c.rtat !== null ? `${c.rtat} días` : "N/A"}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50 truncate max-w-[100px]">{c.estadoCaso}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50 truncate max-w-[120px]">{c.tipoTrabajo}</td>
                        <td className="py-2 px-3 border-r border-[#e1dfdd]/50"></td>
                        <td className="py-2 px-3"></td>
                      </tr>
                    ))}
                    {casos.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-4 text-slate-400 bg-white">Sin Casos Abiertos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
