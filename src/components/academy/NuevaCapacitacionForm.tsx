"use client";

import { useState } from "react";
import { 
  X, 
  User, 
  Plane, 
  Calendar as CalendarIcon, 
  Info,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NuevaCapacitacionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NuevaCapacitacionForm({ isOpen, onClose }: NuevaCapacitacionFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulación de guardado
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl transition-transform duration-500 ease-out animate-in slide-in-from-right",
        success ? "border-emerald-500/30" : ""
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
            <div>
              <h2 className="text-xl font-bold text-white">Nueva Capacitación</h2>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Registro de Evento Tentativo</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
            {success ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">¡Reserva Creada!</h3>
                <p className="text-slate-400 mt-2">La fecha ha sido bloqueada en estado Tentativo.</p>
              </div>
            ) : (
              <>
                {/* Info Box */}
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    Al crear esta reserva, la fecha quedará bloqueada. Recuerda que tienes 48h para confirmarla antes de que el sistema la libere automáticamente.
                  </p>
                </div>

                {/* Cliente */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Cliente / Razón Social
                  </label>
                  <select 
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                  >
                    <option value="" disabled selected>Selecciona un cliente...</option>
                    <option value="1">Agrícola Santa Fe</option>
                    <option value="2">Hacienda El Sol</option>
                    <option value="3">Corporación Pampa</option>
                  </select>
                </div>

                {/* Modelo Dron */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Plane className="w-3.5 h-3.5" />
                    Modelo de Dron Interesado
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["T25P", "T50", "T10", "T100"].map((mod) => (
                      <label 
                        key={mod}
                        className="relative flex items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-indigo-500/50 transition-all group"
                      >
                        <input type="radio" name="modelo" value={mod} className="sr-only peer" required />
                        <span className="text-sm font-bold text-slate-400 peer-checked:text-white transition-colors">{mod}</span>
                        <div className="absolute inset-0 rounded-2xl border-2 border-transparent peer-checked:border-indigo-500 transition-all" />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fecha */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Fecha Estimada
                  </label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notas Comerciales (Opcional)</label>
                  <textarea 
                    rows={3}
                    placeholder="Ej: Cliente interesado en demostración con boquillas centrífugas..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  />
                </div>
              </>
            )}
          </form>

          {/* Footer */}
          {!success && (
            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
              <button 
                type="submit"
                form="capacitacion-form"
                disabled={loading}
                onClick={(e) => {
                  const form = (e.target as HTMLButtonElement).form;
                  if (form?.checkValidity()) {
                    handleSubmit(e as any);
                  } else {
                    form?.reportValidity();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando Reserva...
                  </>
                ) : (
                  "Crear Reserva Tentativa"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
