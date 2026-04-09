"use client";

import { useState, useTransition } from "react";
import {
  RefreshCw, Download, ChevronDown, Package, Truck, ArrowLeftRight,
  CheckCircle2, Loader2,
} from "lucide-react";
import { Badge, estadoToVariant } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { calcularTipoReporte } from "@/lib/transferencias";
import { actualizarEstadoPedido, exportarHistorialCSV } from "@/app/(dashboard)/inventario/historial-actions";
import type { HistorialPedido, EstadoPedido, TipoReporte } from "@/types/database.types";

// ─── Tipos de estado del pipeline ────────────────────────────
const ESTADOS_PIPELINE: EstadoPedido[] = ["Pendiente", "Aprobado", "Enviado", "Recibido"];
const ESTADOS_ABAST: EstadoPedido[] = ["Pendiente de abastecimiento", "Aprobado", "Enviado", "Recibido"];

interface HistorialTabProps {
  historial: HistorialPedido[];
  isAdmin: boolean;
  ciudadUsuario: string;
}

// ─── Componente de Selector de Estado (solo admin) ───────────
function SelectorEstado({
  pedido,
  onActualizar,
}: {
  pedido: HistorialPedido;
  onActualizar: (id: number, estado: EstadoPedido) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const opciones = pedido.estado === "Pendiente de abastecimiento"
    ? ESTADOS_ABAST
    : ESTADOS_PIPELINE;

  return (
    <div className="relative flex items-center gap-1">
      <Badge label={pedido.estado} variant={estadoToVariant(pedido.estado)} />
      <div className="relative group">
        <button
          type="button"
          disabled={isPending}
          className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          title="Cambiar estado"
        >
          {isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>
        {/* Dropdown */}
        <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block
                        bg-slate-900 border border-slate-700 rounded-xl shadow-2xl min-w-44 py-1">
          {opciones.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => startTransition(() => onActualizar(pedido.id, e))}
              className={`w-full text-left px-3 py-2 text-xs transition-colors
                ${pedido.estado === e
                  ? "text-indigo-300 bg-indigo-600/15 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tabla de pedidos reutilizable ────────────────────────────
function TablaPedidos({
  pedidos,
  isAdmin,
  mostrarOrigen = true,
  mostrarDestino = true,
  onActualizar,
}: {
  pedidos: HistorialPedido[];
  isAdmin: boolean;
  mostrarOrigen?: boolean;
  mostrarDestino?: boolean;
  onActualizar?: (id: number, estado: EstadoPedido) => Promise<void>;
}) {
  const [pag, setPag] = useState(0);
  const POR_PAG = 15;
  const total = pedidos.length;
  const paginas = Math.ceil(total / POR_PAG);
  const slice = pedidos.slice(pag * POR_PAG, (pag + 1) * POR_PAG);

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <Package className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No hay pedidos en esta categoría.</p>
      </div>
    );
  }

  const headers = [
    "Fecha",
    "Código",
    "Repuesto",
    "N° Caso",
    "Cant.",
    ...(mostrarOrigen ? ["Origen"] : []),
    ...(mostrarDestino ? ["Destino"] : []),
    "Tipo",
    "Estado",
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors
                    ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                >
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{p.codigo}</td>
                  <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{p.nombre_repuesto}</td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs">{p.numero_caso}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{p.cantidad}</td>
                  {mostrarOrigen && (
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">{p.sucursal_origen}</td>
                  )}
                  {mostrarDestino && (
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">{p.sucursal_destino ?? "Sin Stock"}</td>
                  )}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {calcularTipoReporte(p.sucursal_destino)}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && onActualizar ? (
                      <SelectorEstado pedido={p} onActualizar={onActualizar} />
                    ) : (
                      <Badge label={p.estado} variant={estadoToVariant(p.estado)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {paginas > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {pag * POR_PAG + 1}–{Math.min((pag + 1) * POR_PAG, total)} de {total}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPag((p) => Math.max(0, p - 1))}
              disabled={pag === 0}
              className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setPag((p) => Math.min(paginas - 1, p + 1))}
              disabled={pag >= paginas - 1}
              className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Botón de Export CSV ──────────────────────────────────────
function ExportBtn({
  filtro,
  ciudadUsuario,
  label,
}: {
  filtro: "todos" | "realizados" | "recibidos" | TipoReporte;
  ciudadUsuario: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function descargar() {
    startTransition(async () => {
      const { csv, error } = await exportarHistorialCSV(filtro, ciudadUsuario);
      if (error || !csv) {
        setFeedback(error ?? "Error desconocido");
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `historial_${filtro}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={descargar}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                   bg-slate-800 border border-slate-700 text-slate-400
                   hover:text-slate-200 hover:border-slate-500 transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />
        }
        {label}
      </button>
      {feedback && (
        <p className="text-[11px] text-red-400">{feedback}</p>
      )}
    </div>
  );
}

// ─── Vista Admin ──────────────────────────────────────────────
function VistaAdmin({
  historial,
  ciudadUsuario,
  onActualizar,
}: {
  historial: HistorialPedido[];
  ciudadUsuario: string;
  onActualizar: (id: number, estado: EstadoPedido) => Promise<void>;
}) {
  const tabs: { id: TipoReporte | "todos"; label: string; icon: React.ReactNode }[] = [
    { id: "todos",         label: "Todos",            icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: "Abastecimiento", label: "Abastecimiento",   icon: <Package className="w-3.5 h-3.5" /> },
    { id: "Reposición",    label: "Reposiciones",      icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: "Envío Interno", label: "Envíos Internos",   icon: <Truck className="w-3.5 h-3.5" /> },
  ];
  const [activeTab, setActiveTab] = useState<TipoReporte | "todos">("todos");

  const pedidosFiltrados =
    activeTab === "todos"
      ? historial
      : historial.filter((p) => calcularTipoReporte(p.sucursal_destino) === activeTab);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-slate-800 w-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
                ${activeTab === t.id
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              {t.icon}
              {t.label}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px]">
                {activeTab === t.id
                  ? pedidosFiltrados.length
                  : t.id === "todos"
                    ? historial.length
                    : historial.filter((p) => calcularTipoReporte(p.sucursal_destino) === t.id).length
                }
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end w-full -mt-2">
          <ExportBtn filtro={activeTab} ciudadUsuario={ciudadUsuario} label="Exportar CSV" />
        </div>
      </div>
      <TablaPedidos
        pedidos={pedidosFiltrados}
        isAdmin
        onActualizar={onActualizar}
      />
    </div>
  );
}

// ─── Vista Técnico ────────────────────────────────────────────
function VistaTecnico({
  historial,
  ciudadUsuario,
}: {
  historial: HistorialPedido[];
  ciudadUsuario: string;
}) {
  const [activeTab, setActiveTab] = useState<"realizados" | "recibidos">("realizados");

  const realizados = historial.filter((p) => p.sucursal_origen === ciudadUsuario);
  const recibidos  = historial.filter(
    (p) => p.tecnico_destino === ciudadUsuario && p.sucursal_origen !== ciudadUsuario
  );

  const pedidos = activeTab === "realizados" ? realizados : recibidos;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-slate-800 w-full">
          {(["realizados", "recibidos"] as const).map((t) => {
            const label = t === "realizados" ? "📤 Mis Pedidos" : "📥 A Despachar";
            const count = t === "realizados" ? realizados.length : recibidos.length;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
                  ${activeTab === t
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                {label}
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end w-full -mt-2">
          <ExportBtn filtro={activeTab} ciudadUsuario={ciudadUsuario} label="Exportar CSV" />
        </div>
      </div>

      <TablaPedidos
        pedidos={pedidos}
        isAdmin={false}
        mostrarOrigen={activeTab === "recibidos"}
        mostrarDestino={activeTab === "realizados"}
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function HistorialTab({ historial, isAdmin, ciudadUsuario }: HistorialTabProps) {
  // Función de actualización de estado (admin) con optimistic flush
  async function handleActualizar(id: number, estado: EstadoPedido) {
    await actualizarEstadoPedido(id, estado);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">
            {isAdmin ? "📋 Panel de Auditoría" : "📦 Mi Historial"}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {isAdmin
              ? `${historial.length} pedidos totales en el sistema`
              : `Vista de ${ciudadUsuario}`
            }
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>

      {/* Vistas por rol */}
      {isAdmin ? (
        <VistaAdmin
          historial={historial}
          ciudadUsuario={ciudadUsuario}
          onActualizar={handleActualizar}
        />
      ) : (
        <VistaTecnico
          historial={historial}
          ciudadUsuario={ciudadUsuario}
        />
      )}
    </div>
  );
}
