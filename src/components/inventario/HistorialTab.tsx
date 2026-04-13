"use client";

import { useState, useTransition } from "react";
import {
  RefreshCw, Download, Package, Truck, ArrowLeftRight,
  CheckCircle2, Loader2, Edit, X, Check
} from "lucide-react";
import { Badge, estadoToVariant } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { actualizarEstadoPedido, exportarHistorialCSV, editarPedidoAdmin } from "@/app/(dashboard)/inventario/historial-actions";
import type { HistorialPedido, EstadoPedido, TipoReporte } from "@/types/database.types";

interface HistorialTabProps {
  historial: HistorialPedido[];
  isAdmin: boolean;
  ciudadUsuario: string;
}

// ─── Modal Editar Pedido ─────────────────────────────────────
function ModalEditarPedido({
  pedido,
  onClose,
  onSave
}: {
  pedido: HistorialPedido;
  onClose: () => void;
  onSave: (id: number, datos: Partial<HistorialPedido>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fecha_pedido: new Date(pedido.fecha_pedido).toISOString().slice(0, 16),
    repuesto_codigo: pedido.repuesto_codigo,
    repuesto_nombre: pedido.repuesto_nombre,
    numero_caso: pedido.numero_caso,
    cantidad: pedido.cantidad,
    sucursal_origen: pedido.sucursal_origen,
    tecnico_destino: pedido.tecnico_destino,
    tipo_reporte: pedido.tipo_reporte,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(pedido.id, {
      ...formData,
      fecha_pedido: new Date(formData.fecha_pedido).toISOString(),
      cantidad: Number(formData.cantidad)
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Edit className="w-4 h-4 text-indigo-400" />
            Editar Solicitud #{pedido.id}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Fecha Pedido</label>
              <input type="datetime-local" required name="fecha_pedido" value={formData.fecha_pedido} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">N° Caso</label>
              <input type="text" required name="numero_caso" value={formData.numero_caso} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Código</label>
              <input type="text" required name="repuesto_codigo" value={formData.repuesto_codigo} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cantidad</label>
              <input type="number" required min={1} name="cantidad" value={formData.cantidad} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Nombre Repuesto</label>
            <input type="text" required name="repuesto_nombre" value={formData.repuesto_nombre} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Origen (Solicita a)</label>
              <input type="text" required name="sucursal_origen" value={formData.sucursal_origen} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Destino (Recibe)</label>
              <input type="text" required name="tecnico_destino" value={formData.tecnico_destino} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="space-y-1">
             <label className="text-xs text-slate-400">Tipo de Reporte</label>
              <select name="tipo_reporte" value={formData.tipo_reporte} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500">
                <option value="Abastecimiento">Abastecimiento</option>
                <option value="Reposición">Reposición</option>
                <option value="Envío Interno">Envío Interno</option>
              </select>
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800 mt-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
            </button>
          </div>
        </form>
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
  onActualizarEstado,
  onEditarPedido
}: {
  pedidos: HistorialPedido[];
  isAdmin: boolean;
  mostrarOrigen?: boolean;
  mostrarDestino?: boolean;
  onActualizarEstado?: (id: number, estado: EstadoPedido) => Promise<void>;
  onEditarPedido?: (pedido: HistorialPedido) => void;
}) {
  const [pag, setPag] = useState(0);
  const [isPending, startTransition] = useTransition();
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
    ...(isAdmin ? ["Acciones"] : []),
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
                    className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
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
                  {isAdmin && onActualizarEstado && onEditarPedido && (
                     <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            title="Aprobar"
                            onClick={() => startTransition(() => onActualizarEstado(p.id, "Aprobado"))}
                            disabled={isPending || p.estado !== "Pendiente"}
                            className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-30 border border-green-500/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Editar"
                            onClick={() => onEditarPedido(p)}
                            className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Rechazar"
                            onClick={() => startTransition(() => onActualizarEstado(p.id, "Rechazado"))}
                            disabled={isPending || p.estado === "Rechazado" || p.estado === "Aprobado"}
                            className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-30 border border-red-500/20"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                     </td>
                  )}
                  <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">{formatDate(p.fecha_pedido)}</td>
                  <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuesto_codigo}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuesto_nombre}>{p.repuesto_nombre}</td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso}</td>
                  <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                  {mostrarOrigen && (
                    <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.sucursal_origen}</td>
                  )}
                  {mostrarDestino && (
                    <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.tecnico_destino}</td>
                  )}
                  <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                    {p.tipo_reporte}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={p.estado} variant={estadoToVariant(p.estado)} />
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
  filtro: "todos" | "realizados" | "recibidos" | TipoReporte | "aprobaciones";
  ciudadUsuario: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function descargar() {
    startTransition(async () => {
      // @ts-ignore
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
  onActualizarEstado,
  onEditarPedido
}: {
  historial: HistorialPedido[];
  ciudadUsuario: string;
  onActualizarEstado: (id: number, estado: EstadoPedido) => Promise<void>;
  onEditarPedido: (pedido: HistorialPedido) => void;
}) {
  const tabs: { id: TipoReporte | "aprobaciones"; label: string; icon: React.ReactNode }[] = [
    { id: "aprobaciones",  label: "Aprobaciones",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: "Abastecimiento", label: "Abastecimiento",   icon: <Package className="w-3.5 h-3.5" /> },
    { id: "Reposición",    label: "Reposiciones",      icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: "Envío Interno", label: "Envíos Internos",   icon: <Truck className="w-3.5 h-3.5" /> },
  ];
  const [activeTab, setActiveTab] = useState<TipoReporte | "aprobaciones">("aprobaciones");

  // Aprobaciones = Muestra Todo lo "Pendiente". Las otras pestañas muestran lo que NO sea Pendiente de su tipo.
  const pedidosFiltrados =
    activeTab === "aprobaciones"
      ? historial.filter(p => p.estado === "Pendiente")
      : historial.filter((p) => p.tipo_reporte.toLowerCase() === activeTab.toLowerCase() && p.estado !== "Pendiente" && p.estado !== "Rechazado");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-slate-800 w-full">
          {tabs.map((t) => {
            const count = t.id === "aprobaciones" 
               ? historial.filter(p => p.estado === "Pendiente").length 
               : historial.filter(p => p.tipo_reporte.toLowerCase() === t.id.toLowerCase() && p.estado !== "Pendiente" && p.estado !== "Rechazado").length;
            
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
                  ${activeTab === t.id
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/10"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
              >
                {t.icon}
                {t.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === t.id ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex justify-end w-full -mt-2">
          <ExportBtn filtro={activeTab} ciudadUsuario={ciudadUsuario} label="Exportar CSV" />
        </div>
      </div>
      <TablaPedidos
        pedidos={pedidosFiltrados}
        isAdmin
        onActualizarEstado={onActualizarEstado}
        onEditarPedido={onEditarPedido}
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

  const realizados = historial.filter((p) => p.tecnico_destino === ciudadUsuario);
  const recibidos  = historial.filter(
    (p) => p.sucursal_origen === ciudadUsuario && p.tecnico_destino !== ciudadUsuario
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
  const [pedidoToEdit, setPedidoToEdit] = useState<HistorialPedido | null>(null);

  // Función de actualización de estado (admin) 
  async function handleActualizarEstado(id: number, estado: EstadoPedido) {
    await actualizarEstadoPedido(id, estado);
  }

  // Función de edición completa (admin)
  async function handleSaveEdicion(id: number, datos: Partial<HistorialPedido>) {
    await editarPedidoAdmin(id, datos);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">
            {isAdmin ? "📋 Aprobaciones e Historial" : "📦 Mi Historial"}
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
          onActualizarEstado={handleActualizarEstado}
          onEditarPedido={(p) => setPedidoToEdit(p)}
        />
      ) : (
        <VistaTecnico
          historial={historial}
          ciudadUsuario={ciudadUsuario}
        />
      )}

      {pedidoToEdit && (
         <ModalEditarPedido
            pedido={pedidoToEdit}
            onClose={() => setPedidoToEdit(null)}
            onSave={handleSaveEdicion}
         />
      )}
    </div>
  );
}
