"use client";

import { useState } from "react";
import { FileText, Plus, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { CotizacionForm } from "./CotizacionForm";

type TabType = "nueva" | "historial";

export function CotizacionesTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("nueva");

  const tabs = [
    { id: "nueva" as const, label: "Nueva Cotización", icon: <Plus className="w-4 h-4" /> },
    { id: "historial" as const, label: "Historial", icon: <List className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex flex-col gap-6 p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Cotizaciones</h1>
              <p className="text-sm text-slate-400">Generador de cotizaciones DJI Agras — PDF descargable</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/50 border border-slate-800 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden flex flex-col">
          {activeTab === "nueva" && <CotizacionForm />}
          {activeTab === "historial" && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <List className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">Historial de Cotizaciones</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md">
                El historial de cotizaciones estará disponible próximamente. 
                Se conectará con la base de datos para almacenar y consultar cotizaciones anteriores.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
