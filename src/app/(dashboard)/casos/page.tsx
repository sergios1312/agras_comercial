import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SucursalExpander } from "@/components/casos/SucursalExpander";
import { KpiCard } from "@/components/estadisticas/KpiCard";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import type { HistorialPedido } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Procesos y Notificaciones",
  description: "Gestión y seguimiento de procesos por sucursal.",
};

export default async function CasosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin =
    user.email?.startsWith("admin@") ||
    user.user_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Acceso restringido al administrador.</p>
      </div>
    );
  }

  // Cargar todos los pedidos agrupados
  const { data } = await supabase
    .from("historial_pedidos")
    .select("*")
    .order("fecha_pedido", { ascending: false });

  const pedidos = (data ?? []) as HistorialPedido[];

  // KPIs globales
  const total = pedidos.length;
  const pendientes = pedidos.filter((p) =>
    p.estado === "Pendiente" || p.estado === "Pendiente de abastecimiento"
  ).length;
  const completados = pedidos.filter((p) =>
    p.estado === "Recibido" || p.estado === "Aprobado"
  ).length;
  const sinStock = pedidos.filter((p) => p.estado === "Pendiente de abastecimiento").length;

  // Agrupar por sucursal de origen
  const porSucursal: Record<string, HistorialPedido[]> = {};
  for (const p of pedidos) {
    const key = p.sucursal_origen ?? "sin definir";
    if (!porSucursal[key]) porSucursal[key] = [];
    porSucursal[key].push(p);
  }

  return (
    <div className="space-y-6">
      {/* Banner modo desarrollo */}
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">
          <strong>Módulo en desarrollo:</strong> Las notificaciones por correo SMTP se implementarán en la siguiente fase.
        </p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Casos" value={total} icon={<FileText className="w-5 h-5" />} />
        <KpiCard title="Pendientes" value={pendientes} icon={<Clock className="w-5 h-5" />} trend={pendientes > 0 ? "down" : "neutral"} />
        <KpiCard title="Completados" value={completados} icon={<CheckCircle className="w-5 h-5" />} trend="up" />
        <KpiCard title="Sin Stock" value={sinStock} icon={<AlertTriangle className="w-5 h-5" />} trend={sinStock > 0 ? "down" : "neutral"} />
      </div>

      {/* Expanders por sucursal */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
          Detalle por Sucursal
        </h2>
        {Object.entries(porSucursal).length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay datos disponibles.</p>
          </div>
        ) : (
          Object.entries(porSucursal).map(([sucursal, items]) => (
            <SucursalExpander key={sucursal} sucursal={sucursal} pedidos={items} />
          ))
        )}
      </div>
    </div>
  );
}
