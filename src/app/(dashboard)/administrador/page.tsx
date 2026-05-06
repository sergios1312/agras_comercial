import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Panel Administrador",
  description: "Panel de control para administradores del sistema.",
};

export default async function AdministradorPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/reportes");

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

      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <p className="text-slate-400">
          Panel de administración en construcción. Aquí se implementarán las opciones de configuración para la nueva área comercial.
        </p>
      </div>
    </div>
  );
}
