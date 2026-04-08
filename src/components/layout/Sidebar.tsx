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
} from "lucide-react";

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
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: "/estadisticas",
    label: "Estadísticas",
    icon: <BarChart3 className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    href: "/casos",
    label: "Procesos",
    icon: <FileText className="w-5 h-5" />,
    adminOnly: true,
  },
];

interface SidebarProps {
  userEmail: string | undefined;
  isAdmin: boolean;
}

export function Sidebar({ userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  const sucursal = userEmail?.split("@")[0] ?? "Usuario";

  return (
    <aside className="flex flex-col h-full w-60 bg-slate-950 border-r border-slate-800 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Garantías</p>
          <p className="text-xs text-slate-500">v2.0</p>
        </div>
      </div>

      {/* Usuario actual */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-900 border border-slate-800">
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

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Cerrar sesión */}
      <div className="p-3 border-t border-slate-800">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                       text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
