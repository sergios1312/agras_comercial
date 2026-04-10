"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { dispararNotificacionesCasos } from "@/app/(dashboard)/casos/notify-actions";

export function BotonNotificar() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    megaReporte: string[];
    error?: string;
  } | null>(null);

  const handleNotify = () => {
    startTransition(async () => {
      setResult(null);
      const res = await dispararNotificacionesCasos();
      setResult(res);
    });
  };

  return (
    <div className="flex flex-col items-end gap-3 w-full">
      <button
        onClick={handleNotify}
        disabled={isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isPending ? "Generando y Enviando (Anti-Spam)..." : "Notificar Casos Retrasados"}
      </button>

      {result && (
        <div className={`p-4 rounded-xl text-sm border min-w-80 shadow-lg ${
          result.success 
            ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-200"
            : "bg-red-950/40 border-red-900/50 text-red-200"
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
    </div>
  );
}
