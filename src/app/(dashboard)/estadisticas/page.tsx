import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { obtenerCasosDesdeDB } from "@/lib/casos";
import { SUCURSALES_BANEADAS, TRABAJOS_BANEADOS } from "@/types/casos.types";
import { EstadisticasDashboard } from "@/components/estadisticas/EstadisticasDashboard";

export const metadata: Metadata = {
  title: "Estadísticas | Sistema de Garantías",
  description: "Dashboards de KPIs, SLA, RTAT y evolución de casos de garantía.",
};

export default async function EstadisticasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
        <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Acceso restringido al administrador.</p>
      </div>
    );
  }

  // ── Pipeline de datos desde BD ──────────────────────────────
  const casos = await obtenerCasosDesdeDB();

  // ── Listas para selectores de filtros ────────────────────────
  const sucursalesSet = new Set(casos.map((c) => c.sucursal).filter(Boolean));
  const periodosSet   = new Set(casos.map((c) => c.periodoMensual).filter(Boolean) as string[]);
  const tiposSet      = new Set(casos.map((c) => c.tipoTrabajo).filter((t) =>
    t && !TRABAJOS_BANEADOS.includes(t)
  ));

  const sucursalesDisponibles = [...sucursalesSet]
    .filter((s) => !SUCURSALES_BANEADAS.some((b) => s.toLowerCase().includes(b.toLowerCase())))
    .sort();
  const periodosDisponibles = [...periodosSet].sort();
  const tiposTrabajoDisponibles = [...tiposSet].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Estadísticas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dashboards de garantías · {casos.length} casos cargados del registro
        </p>
      </div>

      <EstadisticasDashboard
        casos={casos}
        sucursalesDisponibles={sucursalesDisponibles}
        periodosDisponibles={periodosDisponibles}
        tiposTrabajoDisponibles={tiposTrabajoDisponibles}
      />
    </div>
  );
}
