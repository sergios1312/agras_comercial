"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/login/actions";
import { cn } from "@/lib/utils";
import {
  Package,
  BarChart3,
  FileText,
  LogOut,
  ShieldCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/inventario",
    label: "Solicitudes",
    icon: <Package className="w-5 h-5 shrink-0" />,
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: <ClipboardList className="w-5 h-5 shrink-0" />,
  },
  {
    href: "/estadisticas",
    label: "Estadísticas",
    icon: <BarChart3 className="w-5 h-5 shrink-0" />,
    adminOnly: true,
  },
  {
    href: "/casos",
    label: "Procesos",
    icon: <FileText className="w-5 h-5 shrink-0" />,
    adminOnly: true,
  },
  {
    href: "/administrador",
    label: "Administrador",
    icon: <Shield className="w-5 h-5 shrink-0" />,
    adminOnly: true,
  },
];

interface SidebarProps {
  userEmail: string | undefined;
  isAdmin: boolean;
}

export function Sidebar({ userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const sucursal = userEmail?.split("@")[0] ?? "Usuario";

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-slate-950 border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Botón de colapsar / expandir */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className={cn(
          "absolute -right-3 top-5 z-10",
          "flex items-center justify-center w-6 h-6 rounded-full",
          "bg-slate-800 border border-slate-700 text-slate-400",
          "hover:text-slate-100 hover:bg-slate-700 hover:border-slate-600",
          "transition-all duration-200 shadow-md"
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-slate-800 overflow-hidden",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 shrink-0">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight whitespace-nowrap">Garantías</p>
            <p className="text-xs text-slate-500">v2.0</p>
          </div>
        )}
      </div>

      {/* Usuario actual */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Conectado como</p>
          <p className="text-sm font-semibold text-slate-200 mt-0.5 capitalize truncate">
            {sucursal}
          </p>
          {isAdmin && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              Administrador
            </span>
          )}
        </div>
      )}

      {/* Avatar colapsado */}
      {collapsed && (
        <div className="flex justify-center mt-3 mb-1">
          <div
            title={sucursal}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 uppercase"
          >
            {sucursal.slice(0, 2)}
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className={cn("flex-1 px-2 py-4 space-y-1", collapsed && "px-2")}>
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent"
                )}
              >
                {item.icon}
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Cerrar sesión */}
      <div className={cn("p-2 border-t border-slate-800", collapsed && "p-2")}>
        <form action={signOut}>
          <button
            type="submit"
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
              "text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </form>
      </div>
    </aside>
  );
}
