"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/reportes": "📋 Reportes y Cotizaciones",
  "/estadisticas": "📊 Estadísticas Comerciales",
  "/academy": "🎓 Academy (Capacitaciones)",
  "/administrador": "⚙️ Panel de Administrador",
};

export function Header() {
  const pathname = usePathname();

  const title =
    Object.entries(ROUTE_LABELS).find(([key]) => pathname.startsWith(key))?.[1] ??
    "DJI Agras Comercial";

  return (
    <header className="flex items-center h-14 px-6 border-b border-slate-800 bg-slate-950 shrink-0">
      <h1 className="text-sm font-semibold text-slate-100">{title}</h1>
    </header>
  );
}
