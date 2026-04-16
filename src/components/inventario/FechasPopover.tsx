"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { History, Calendar, CheckCircle2, Send, PackageCheck, X, Edit2, Loader2, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { editarFechasPedido } from "@/app/(dashboard)/inventario/historial-actions";
import type { HistorialPedido } from "@/types/database.types";

// ─── Helper: formatea fecha para input datetime-local ────────────────
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

// ─── Modal de edición de fechas (solo admin) ─────────────────────────
function ModalEditarFechas({
  pedido,
  onClose,
  onSave,
}: {
  pedido: HistorialPedido;
  onClose: () => void;
  onSave: (fechas: Partial<Pick<HistorialPedido, "fecha_pedido" | "fecha_aprobacion" | "fecha_envio" | "fecha_recepcion">>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    fecha_pedido:     toDatetimeLocal(pedido.fecha_pedido),
    fecha_aprobacion: toDatetimeLocal(pedido.fecha_aprobacion),
    fecha_envio:      toDatetimeLocal(pedido.fecha_envio),
    fecha_recepcion:  toDatetimeLocal(pedido.fecha_recepcion),
  });
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSave() {
    startTransition(async () => {
      const toISO = (v: string) => v ? new Date(v).toISOString() : null;
      await onSave({
        fecha_pedido:     toISO(form.fecha_pedido) ?? undefined,
        fecha_aprobacion: toISO(form.fecha_aprobacion),
        fecha_envio:      toISO(form.fecha_envio),
        fecha_recepcion:  toISO(form.fecha_recepcion),
      });
      onClose();
    });
  }

  const campos: { key: keyof typeof form; label: string; color: string }[] = [
    { key: "fecha_pedido",     label: "Pedido",     color: "text-slate-300" },
    { key: "fecha_aprobacion", label: "Aprobación", color: "text-green-400" },
    { key: "fecha_envio",      label: "Envío",      color: "text-blue-400"  },
    { key: "fecha_recepcion",  label: "Recepción",  color: "text-violet-400" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-indigo-400" />
            Editar Fechas — Pedido #{pedido.id}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {campos.map(({ key, label, color }) => (
            <div key={key} className="space-y-1">
              <label className={`text-xs font-medium ${color}`}>{label}</label>
              <input
                type="datetime-local"
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal: FechasPopover ─────────────────────────────
interface FechasPopoverProps {
  pedido: HistorialPedido;
  isAdmin: boolean;
  /** Callback optimístico para actualizar el estado local */
  onFechasUpdated?: (id: number, fechas: Partial<HistorialPedido>) => void;
}

export function FechasPopover({ pedido, isAdmin, onFechasUpdated }: FechasPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function handleSaveFechas(
    fechas: Partial<Pick<HistorialPedido, "fecha_pedido" | "fecha_aprobacion" | "fecha_envio" | "fecha_recepcion">>
  ) {
    // Optimistic update
    onFechasUpdated?.(pedido.id, fechas);
    await editarFechasPedido(pedido.id, fechas, pedido.is_test);
  }

  const items: { label: string; value: string | null | undefined; icon: React.ReactNode; color: string }[] = [
    {
      label: "Pedido",
      value: pedido.fecha_pedido,
      icon: <Calendar className="w-3 h-3" />,
      color: "text-slate-400",
    },
    {
      label: "Aprobación",
      value: pedido.fecha_aprobacion,
      icon: <CheckCircle2 className="w-3 h-3" />,
      color: "text-green-400",
    },
    {
      label: "Envío",
      value: pedido.fecha_envio,
      icon: <Send className="w-3 h-3" />,
      color: "text-blue-400",
    },
    {
      label: "Recepción",
      value: pedido.fecha_recepcion,
      icon: <PackageCheck className="w-3 h-3" />,
      color: "text-violet-400",
    },
  ];

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5">
      {/* Fecha pedido visible */}
      <span className="text-[11px] text-slate-400 whitespace-nowrap">
        {formatDate(pedido.fecha_pedido)}
      </span>

      {/* Ícono historial */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ver historial de fechas"
        className={`p-0.5 rounded transition-colors ${
          open
            ? "text-indigo-400 bg-indigo-500/10"
            : "text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10"
        }`}
      >
        <History className="w-3 h-3" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-6 z-50 w-64 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 p-3 space-y-2 animate-in fade-in zoom-in-95">
          <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-widest border-b border-slate-800 pb-1.5 mb-2">
            Historial de fechas
          </p>
          {items.map(({ label, value, icon, color }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1 text-[10px] font-medium ${color}`}>
                {icon}
                {label}
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                {value ? formatDate(value, true) : <span className="text-slate-600">—</span>}
              </span>
            </div>
          ))}

          {/* Botón editar (solo admin) */}
          {isAdmin && (
            <button
              onClick={() => { setOpen(false); setShowModal(true); }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-semibold transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Editar fechas
            </button>
          )}
        </div>
      )}

      {/* Modal edición */}
      {showModal && (
        <ModalEditarFechas
          pedido={pedido}
          onClose={() => setShowModal(false)}
          onSave={handleSaveFechas}
        />
      )}
    </div>
  );
}
