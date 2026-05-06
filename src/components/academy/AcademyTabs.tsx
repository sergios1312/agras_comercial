"use client";

import { useState } from "react";
import { 
  GraduationCap, 
  Calculator, 
  Settings2, 
  Calendar as CalendarIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTab } from "./CalendarTab";
import { RoiCalculatorTab } from "./RoiCalculatorTab";
import { ResourceManagementTab } from "./ResourceManagementTab";

type TabType = "capacitaciones" | "roi" | "recursos";

export function AcademyTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("capacitaciones");

  const tabs = [
    { 
      id: "capacitaciones", 
      label: "Capacitaciones", 
      icon: <CalendarIcon className="w-4 h-4" />,
      description: "Calendario y ciclo de vida"
    },
    { 
      id: "roi", 
      label: "Calculadora ROI", 
      icon: <Calculator className="w-4 h-4" />,
      description: "Simulador comercial"
    },
    { 
      id: "recursos", 
      label: "Gestión de Recursos", 
      icon: <Settings2 className="w-4 h-4" />,
      description: "Instructores y drones demo"
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header con Tabs */}
      <div className="flex flex-col gap-6 p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Módulo Academy</h1>
              <p className="text-sm text-slate-400">Gestión de capacitaciones y herramientas comerciales</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/50 border border-slate-800 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden flex flex-col">
          {activeTab === "capacitaciones" && <CalendarTab />}
          {activeTab === "roi" && <RoiCalculatorTab />}
          {activeTab === "recursos" && <ResourceManagementTab />}
        </div>
      </div>
    </div>
  );
}
