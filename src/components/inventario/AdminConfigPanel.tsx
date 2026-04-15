"use client";

import { useState, useTransition } from "react";
import { Settings2, Loader2, Truck, ArrowLeftRight, PackageX, CheckCircle2, XCircle, Beaker } from "lucide-react";
import { updateConfigPedido } from "@/app/(dashboard)/inventario/config-actions";
import type { ConfigPedidos } from "@/types/database.types";

interface AdminConfigPanelProps {
  configInicial: ConfigPedidos;
}

type ClaveConfig = "pedidos_abastecimiento" | "pedidos_internos" | "pedidos_reposicion" | "modo_prueba";

interface SwitchItem {
  clave: ClaveConfig;
  campo: keyof ConfigPedidos;
  label: string;
  descripcion: string;
  icon: React.ReactNode;
  colorActivo: string;
  colorInactivo: string;
}

const SWITCHES: SwitchItem[] = [
  {
    clave: "pedidos_abastecimiento",
    campo: "abastecimiento",
    label: "Abastecimiento",
    descripcion: "Pedidos con destino Lima (almacén central)",
    icon: <Truck className="w-4 h-4" />,
    colorActivo: "bg-emerald-500",
    colorInactivo: "bg-slate-600",
  },
  {
    clave: "pedidos_internos",
    campo: "internos",
    label: "Pedido Interno",
    descripcion: "Transferencias entre sucursales (Envío Interno)",
    icon: <ArrowLeftRight className="w-4 h-4" />,
    colorActivo: "bg-indigo-500",
    colorInactivo: "bg-slate-600",
  },
  {
    clave: "pedidos_reposicion",
    campo: "reposicion",
    label: "Reposiciones",
    descripcion: "Solicitudes sin stock (requieren compra/importación)",
    icon: <PackageX className="w-4 h-4" />,
    colorActivo: "bg-amber-500",
    colorInactivo: "bg-slate-600",
  },
  {
    clave: "modo_prueba",
    campo: "modo_prueba",
    label: "Modo Prueba (Global)",
    descripcion: "Pruebas sin afectar el historial real. Correos van a sergio.araujo@quetalcompra.com. ¡Se borra todo al apagar!",
    icon: <Beaker className="w-4 h-4" />,
    colorActivo: "bg-pink-500",
    colorInactivo: "bg-slate-600",
  },
];

export function AdminConfigPanel({ configInicial }: AdminConfigPanelProps) {
  const [config, setConfig] = useState<ConfigPedidos>(configInicial);
  const [isPending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<ClaveConfig | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleToggle(item: SwitchItem) {
    const nuevoValor = !config[item.campo];

    // Optimistic update
    setConfig((prev) => ({ ...prev, [item.campo]: nuevoValor }));
    setLoadingKey(item.clave);

    startTransition(async () => {
      const { error } = await updateConfigPedido(item.clave, nuevoValor);

      if (error) {
        // Revertir si hubo error
        setConfig((prev) => ({ ...prev, [item.campo]: !nuevoValor }));
        showToast(`Error al actualizar: ${error}`, false);
      } else {
        showToast(
          nuevoValor
            ? `✅ ${item.label} habilitado`
            : `🚫 ${item.label} inhabilitado`,
          nuevoValor
        );
      }
      setLoadingKey(null);
    });
  }

  function showToast(text: string, ok: boolean) {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3000);
  }

  const allDisabled = !config.abastecimiento && !config.internos && !config.reposicion;

  return (
    <>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60 bg-slate-800/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Settings2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-100">Panel de Control</h3>
            <p className="text-xs text-slate-500">Habilitar / Inhabilitar tipos de pedido</p>
          </div>
          {allDisabled && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold animate-pulse">
              ⛔ Todo bloqueado
            </span>
          )}
        </div>

        {/* Switches */}
        <div className="divide-y divide-slate-800/60">
          {SWITCHES.map((item) => {
            const isActive = config[item.campo];
            const isLoading = loadingKey === item.clave && isPending;

            return (
              <div
                key={item.clave}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                      : "bg-slate-800/60 border-slate-700/50 text-slate-600"
                  }`}
                >
                  {item.icon}
                </div>

                {/* Label + descripcion */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold transition-colors duration-200 ${
                      isActive ? "text-slate-100" : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.descripcion}</p>
                </div>

                {/* Estado badge */}
                <span
                  className={`hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {isActive ? "Habilitado" : "Inhabilitado"}
                </span>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  disabled={isLoading}
                  aria-label={`${isActive ? "Inhabilitar" : "Habilitar"} ${item.label}`}
                  className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isActive ? "#6366f1" : "#334155",
                  }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                      isActive ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {isLoading && (
                      <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-950/40 border-t border-slate-800/60">
          <p className="text-xs text-slate-600">
            Los cambios se aplican de forma inmediata para todos los usuarios del sistema.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-sm font-medium border transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMsg.ok
              ? "bg-slate-800 border-emerald-500/40 text-emerald-300"
              : "bg-slate-800 border-red-500/40 text-red-300"
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </>
  );
}
