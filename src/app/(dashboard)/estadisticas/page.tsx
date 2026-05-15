import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Estadísticas Comerciales",
  description: "Dashboards y KPIs para DJI Agras Comercial.",
};

export default async function EstadisticasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Estadísticas Comerciales
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Módulo en construcción para visualizar ventas y rendimiento.
          </p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <p className="text-slate-400">
          Aquí se desarrollarán los gráficos para el rendimiento de instructores, simulaciones y ventas de DJI Agras.
        </p>
      </div>
    </div>
  );
}
