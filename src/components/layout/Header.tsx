"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/inventario": "📦 Solicitudes de Repuestos",
  "/estadisticas": "📊 Estadísticas y Dashboards",
  "/casos": "📋 Procesos y Notificaciones",
};

export function Header() {
  const pathname = usePathname();

  const title =
    Object.entries(ROUTE_LABELS).find(([key]) => pathname.startsWith(key))?.[1] ??
    "Sistema de Garantías";

  return (
    <header className="flex items-center h-14 px-6 border-b border-slate-800 bg-slate-950 shrink-0">
      <h1 className="text-sm font-semibold text-slate-100">{title}</h1>
    </header>
  );
}
