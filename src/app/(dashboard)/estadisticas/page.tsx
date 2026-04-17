import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { obtenerCasosDesdeDB } from "@/lib/casos";
import { TRABAJOS_BANEADOS } from "@/types/casos.types";
import { EstadisticasDashboard } from "@/components/estadisticas/EstadisticasDashboard";
import { getUltimasActualizaciones } from "@/app/(dashboard)/inventario/config-actions";
import { createAdminClient } from "@/utils/supabase/admin";

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

  const db = createAdminClient();

  // ── Pipeline de datos desde BD ──────────────────────────────
  const [casos, actualizaciones, sucursalesRes] = await Promise.all([
    obtenerCasosDesdeDB(),
    getUltimasActualizaciones(),
    db.from("sucursales").select("nombre_ciudad").order("nombre_ciudad")
  ]);

  // ── Listas para selectores de filtros ────────────────────────
  const periodosSet   = new Set(casos.map((c) => c.periodoMensual).filter(Boolean) as string[]);
  const tiposSet      = new Set(casos.map((c) => c.tipoTrabajo).filter((t) =>
    t && !TRABAJOS_BANEADOS.includes(t)
  ));

  const sucursalesDisponibles = sucursalesRes.data?.map((s: any) => s.nombre_ciudad) || [];
  const periodosDisponibles = [...periodosSet].sort();
  const tiposTrabajoDisponibles = [...tiposSet].sort();

  return (
    <div className="-mt-6">
      <EstadisticasDashboard
        casos={casos}
        sucursalesDisponibles={sucursalesDisponibles}
        periodosDisponibles={periodosDisponibles}
        tiposTrabajoDisponibles={tiposTrabajoDisponibles}
        fechaActualizacion={actualizaciones.casos}
      />
    </div>
  );
}
