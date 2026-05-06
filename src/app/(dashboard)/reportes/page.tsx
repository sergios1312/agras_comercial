import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reportes y Cotizaciones",
  description: "Módulo para crear cotizaciones de venta y reportes comerciales.",
};

export default async function ReportesPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📄 Reportes y Cotizaciones
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Módulo en construcción para DJI Agras Comercial.
          </p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <p className="text-slate-400">
          Aquí se desarrollará el nuevo generador de cotizaciones y órdenes de venta adaptado a los drones Agras.
        </p>
      </div>
    </div>
  );
}
