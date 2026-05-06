"use client";

import { useState } from "react";
import { 
  Users, 
  Plane, 
  Plus, 
  Star, 
  Activity, 
  Wrench, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Mail,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock de Instructores
const INSTRUCTORES = [
  { id: 1, nombre: "Edwin Portilla", correo: "edwin.portilla@quetalcompra.com", score: 4.9, especialidad: "Agras T50 / T25P", status: "Activo" },
  { id: 2, nombre: "Pedro Benites", correo: "pedro.benites@quetalcompra.com", score: 4.7, especialidad: "Mantenimiento Preventivo", status: "Activo" },
  { id: 3, nombre: "Carlos Ruiz", correo: "carlos.ruiz@academy.com", score: 4.5, especialidad: "Vuelo Autónomo", status: "En Capacitación" },
];

// Mock de Flota Drones Demo
const DRONES_DEMO = [
  { id: 1, modelo: "T50", sn: "6S3DH...901", horas: 124.5, estado: "Operativo", salud: 98 },
  { id: 2, modelo: "T25P", sn: "4A2FG...442", horas: 89.2, estado: "En Mantenimiento", salud: 85 },
  { id: 3, modelo: "T100", sn: "8K1ML...110", horas: 12.0, estado: "Operativo", salud: 100 },
];

export function ResourceManagementTab() {
  const [activeSection, setActiveSection] = useState<"instructores" | "drones">("instructores");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Tabs de Recursos */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/20">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button 
            onClick={() => setActiveSection("instructores")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeSection === "instructores" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Instructores
          </button>
          <button 
            onClick={() => setActiveSection("drones")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeSection === "drones" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Plane className="w-3.5 h-3.5" />
            Flota Demo
          </button>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
          <Plus className="w-4 h-4" />
          {activeSection === "instructores" ? "Nuevo Instructor" : "Nuevo Dron Demo"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeSection === "instructores" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {INSTRUCTORES.map((ins) => (
              <div key={ins.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                    {ins.nombre.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold">{ins.score}</span>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <h4 className="text-white font-bold text-base flex items-center gap-2">
                    {ins.nombre}
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3 h-3" />
                    {ins.correo}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 mb-6">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Especialidad</div>
                  <div className="text-xs text-slate-300 font-medium">{ins.especialidad}</div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter",
                    ins.status === "Activo" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {ins.status}
                  </div>
                  <button className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cabecera Tabla Drones */}
            <div className="grid grid-cols-5 px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <div className="col-span-2">Modelo / S.N</div>
              <div className="text-center">Horas de Vuelo</div>
              <div className="text-center">Estado Salud</div>
              <div className="text-right">Estatus</div>
            </div>

            {/* Listado de Drones */}
            {DRONES_DEMO.map((dron) => (
              <div key={dron.id} className="grid grid-cols-5 items-center px-6 py-5 bg-slate-900/30 border border-slate-800 rounded-3xl hover:bg-slate-900/50 transition-all group">
                <div className="col-span-2 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">DJI Agras {dron.modelo}</div>
                    <div className="text-[10px] font-mono text-slate-500">SN: {dron.sn}</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold text-slate-300">{dron.horas} <span className="text-[10px] font-normal text-slate-500 uppercase">Hrs</span></div>
                  <div className="w-24 h-1 bg-slate-800 rounded-full mx-auto mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(dron.horas / 200) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {dron.salud}%
                  </div>
                  <span className="text-[9px] text-slate-600 uppercase font-black">Optimo</span>
                </div>

                <div className="flex justify-end">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                    dron.estado === "Operativo" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/5" 
                      : "bg-amber-500/5 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5"
                  )}>
                    {dron.estado === "Operativo" ? <CheckCircle2 className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                    {dron.estado}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State / Add Suggestion */}
            <div className="p-8 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
              <Clock className="w-8 h-8 text-slate-800 mb-2" />
              <p className="text-xs text-slate-500 font-medium">¿Llegó un nuevo equipo? Agrégalo para trackear su rendimiento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
