import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { KpiCard } from "@/components/estadisticas/KpiCard";
import { EvolucionChart } from "@/components/estadisticas/EvolucionChart";
import { RtatHistogram } from "@/components/estadisticas/RtatHistogram";
import { rtatPorSucursal } from "@/lib/rtat";
import type { HistorialPedido } from "@/types/database.types";
import {
  BarChart3, Package, TrendingUp, Clock,
} from "lucide-react";


export const metadata: Metadata = {
  title: "Estadísticas",
  description: "KPIs y análisis estadístico del sistema de garantías.",
};

export default async function EstadisticasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin =
    user.email?.startsWith("admin@") ||
    user.user_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
        <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Acceso restringido al administrador.</p>
      </div>
    );
  }

  // Fetch historial completo
  const { data: historialData } = await supabase
    .from("historial_pedidos")
    .select("*")
    .order("created_at", { ascending: true });

  const pedidos = (historialData as unknown as HistorialPedido[]) ?? [];
  const total = pedidos.length;
  const aprobados = pedidos.filter((p) => p.estado === "Aprobado" || p.estado === "Enviado" || p.estado === "Recibido").length;
  const pendientes = pedidos.filter((p) => p.estado === "Pendiente" || p.estado === "Pendiente de abastecimiento").length;
  const ventas = pedidos.filter((p) => p.es_venta).length;

  // Evolución mensual
  const porMes: Record<string, number> = {};
  for (const p of pedidos) {
    const mes = (p.created_at as string)?.slice(0, 7) ?? "N/A";
    porMes[mes] = (porMes[mes] ?? 0) + 1;
  }
  const evolucionData = Object.entries(porMes).map(([periodo, cantidad]) => ({ periodo, cantidad }));

  // RTAT simulado por sucursal
  const historialConFechas = pedidos.map((p) => ({
    sucursal: p.sucursal_origen ?? "desconocido",
    fecha_apertura: p.created_at,
    fecha_cierre: p.estado === "Recibido" ? p.created_at : null,

  }));
  const rtatData = Object.entries(rtatPorSucursal(historialConFechas))
    .filter(([, v]) => v !== null)
    .map(([sucursal, promedio_dias]) => ({
      sucursal,
      promedio_dias: Math.round((promedio_dias ?? 0) * 10) / 10,
    }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Pedidos"
          value={total}
          subtitle="en todo el historial"
          icon={<Package className="w-5 h-5" />}
        />
        <KpiCard
          title="Aprobados / Enviados"
          value={aprobados}
          subtitle={`${total > 0 ? ((aprobados / total) * 100).toFixed(0) : 0}% del total`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
        />
        <KpiCard
          title="Pendientes"
          value={pendientes}
          subtitle="requieren atención"
          icon={<Clock className="w-5 h-5" />}
          trend={pendientes > 10 ? "down" : "neutral"}
        />
        <KpiCard
          title="Ventas"
          value={ventas}
          subtitle="pedidos de venta desde Lima"
          icon={<BarChart3 className="w-5 h-5" />}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EvolucionChart data={evolucionData} titulo="Pedidos por Mes" />
        <RtatHistogram data={rtatData} />
      </div>
    </div>
  );
}
