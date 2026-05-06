"use client";

import { useState } from "react";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Clock, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  User,
  Plane
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NuevaCapacitacionForm } from "./NuevaCapacitacionForm";

// Mock de estados basado en la especificación
const ESTADOS = {
  Tentativo: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "Tentativo" },
  Confirmado: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Confirmado" },
  Agendado: { color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", label: "Agendado" },
  Finalizado: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Finalizado" },
};

export function CalendarTab() {
  const [view, setView] = useState<"month" | "week">("month");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Mock data para visualización inicial
  const events = [
    { 
      id: 1, 
      cliente: "Agrícola Santa Fe", 
      modelo: "T50", 
      fecha: "2024-05-10", 
      estado: "Tentativo",
      comercial: "Edwin"
    },
    { 
      id: 2, 
      cliente: "Hacienda El Sol", 
      modelo: "T25P", 
      fecha: "2024-05-12", 
      estado: "Confirmado",
      comercial: "Anita"
    },
    { 
      id: 3, 
      cliente: "Corporación Pampa", 
      modelo: "T100", 
      fecha: "2024-05-15", 
      estado: "Agendado",
      instructor: "Carlos Ruiz",
      dron: "Demo-001"
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar del Calendario */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white px-2">Mayo 2024</span>
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-6 w-px bg-slate-800" />
          
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button 
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                view === "month" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Mes
            </button>
            <button 
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                view === "week" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Semana
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-800 transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Capacitación
          </button>
        </div>
      </div>

      {/* Formulario Slide-over */}
      <NuevaCapacitacionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />

      {/* Grid del Calendario (Simulado) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          {/* Cabecera Días */}
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
            <div key={day} className="bg-slate-900 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
              {day}
            </div>
          ))}

          {/* Días (Mocking 35 celdas para mayo) */}
          {Array.from({ length: 35 }).map((_, i) => {
            const dayNum = i - 2; // Ajuste simple para que el 1 caiga en Miércoles (ejemplo)
            const isToday = dayNum === 5;
            const hasEvent = events.find(e => parseInt(e.fecha.split("-")[2]) === dayNum);

            return (
              <div 
                key={i} 
                className={cn(
                  "bg-slate-950/40 min-h-[120px] p-2 transition-colors hover:bg-slate-900/60 relative group",
                  dayNum < 1 || dayNum > 31 ? "opacity-20" : ""
                )}
              >
                <span className={cn(
                  "text-xs font-medium mb-2 inline-flex items-center justify-center w-6 h-6 rounded-lg",
                  isToday ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500"
                )}>
                  {dayNum > 0 && dayNum <= 31 ? dayNum : ""}
                </span>

                {hasEvent && dayNum > 0 && (
                  <div className={cn(
                    "mt-1 p-2 rounded-xl border text-[10px] space-y-1 shadow-sm transition-transform group-hover:scale-[1.02] cursor-pointer",
                    ESTADOS[hasEvent.estado as keyof typeof ESTADOS].color
                  )}>
                    <div className="font-bold truncate">{hasEvent.cliente}</div>
                    <div className="flex items-center gap-1 opacity-80">
                      <Plane className="w-3 h-3" /> {hasEvent.modelo}
                    </div>
                    {hasEvent.instructor && (
                      <div className="flex items-center gap-1 opacity-80">
                        <User className="w-3 h-3" /> {hasEvent.instructor}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen de estados (Footer) */}
      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-center gap-6">
        {Object.entries(ESTADOS).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", value.color.split(" ")[0].replace("bg-", "bg-").replace("/10", ""))} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
