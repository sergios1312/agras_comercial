import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { AdminPageClient } from "@/components/inventario/AdminPageClient";
import { getConfigPedidos, getUltimasActualizaciones } from "@/app/(dashboard)/inventario/config-actions";
import { Shield } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";

export const metadata: Metadata = {
  title: "Panel Administrador",
  description: "Panel de control para administradores del sistema.",
};

export default async function AdministradorPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inventario");

  const configPedidos = await getConfigPedidos();
  const actualizaciones = await getUltimasActualizaciones();

  const db = createAdminClient();
  const sucursalesRes = await db.from("sucursales").select("nombre_ciudad");
  const sucursalesNombres = sucursalesRes.data?.map((s: any) => s.nombre_ciudad) || [];

  return (
    <div className="space-y-6">
      {/* Header de página */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Panel de Administrador</h1>
          <p className="text-sm text-slate-500">Control de operaciones del sistema</p>
        </div>
      </div>

      <AdminPageClient configInicial={configPedidos} actualizaciones={actualizaciones} sucursalesDB={sucursalesNombres} />
    </div>
  );
}
