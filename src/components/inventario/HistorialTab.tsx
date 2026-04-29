"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  RefreshCw, Download, Package, Truck, ArrowLeftRight,
  CheckCircle2, Loader2, Edit, X, Check, Trash2, Send, ChevronDown, ChevronRight, Plus, FileUp, ExternalLink, Paperclip
} from "lucide-react";
import { createBrowserClient } from "@/utils/supabase/client";
import { Badge, estadoToVariant } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { FechasPopover } from "@/components/inventario/FechasPopover";
import { 
  actualizarEstadoPedido, 
  actualizarEstadoPedidoTecnico,
  exportarHistorialCSV, 
  editarPedidoAdmin, 
  eliminarPedidoAdmin,
  crearCasoReposicion,
  editarCasoReposicion,
  eliminarCasoReposicion
} from "@/app/(dashboard)/inventario/historial-actions";
import {
  crearTransferencia,
  asignarATransferencia,
  removerDeTransferencia,
  despacharTransferencia,
  eliminarTransferencia,
  editarTransferencia
} from "@/app/(dashboard)/inventario/historial-actions";
import type { HistorialPedido, EstadoPedido, TipoReporte, CasoReposicion, Transferencia } from "@/types/database.types";

interface HistorialTabProps {
  historial: HistorialPedido[];
  casosReposicion?: CasoReposicion[]; // Opcional para vista tecnico
  transferencias?: Transferencia[];
  isAdmin: boolean;
  ciudadUsuario: string;
  sucursales?: string[];
  catalogo?: import("@/types/database.types").RepuestoConStock[];
}

// ─── Modal Editar Pedido ─────────────────────────────────────
function ModalEditarPedido({
  pedido,
  sucursales,
  onClose,
  onSave,
  onDelete
}: {
  pedido: HistorialPedido;
  sucursales: string[];
  onClose: () => void;
  onSave: (id: number, datos: Partial<HistorialPedido>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fecha_pedido: new Date(pedido.fecha_pedido).toISOString().slice(0, 16),
    numero_caso: pedido.numero_caso,
    cantidad: pedido.cantidad,
    sucursal_origen: pedido.sucursal_origen,
    tecnico_destino: pedido.tecnico_destino,
    tipo_reporte: pedido.tipo_reporte,
    estado: pedido.estado,
  });
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let nuevoTipo: TipoReporte = "Envío Interno";
    const origen = formData.sucursal_origen.toLowerCase();
    const destino = formData.tecnico_destino.toLowerCase();

    if (origen === "sin_stock") {
      nuevoTipo = "Reposición";
    } else if (origen.includes("lima") && destino !== origen) {
      nuevoTipo = "Abastecimiento";
    }

    if (nuevoTipo !== formData.tipo_reporte) {
      setFormData(prev => ({ ...prev, tipo_reporte: nuevoTipo }));
    }
  }, [formData.sucursal_origen, formData.tecnico_destino, formData.tipo_reporte]);

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

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente esta solicitud? Esta acción no se puede deshacer.")) return;
    setIsDeleting(true);
    await onDelete(pedido.id);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm">
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
              <input type="text" readOnly name="repuesto_codigo" value={pedido.repuestos?.codigo ?? "N/A"} className="w-full bg-slate-800/50 border border-slate-700/30 rounded-lg p-2 text-xs text-slate-400 font-mono cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cantidad</label>
              <input type="number" required min={1} name="cantidad" value={formData.cantidad} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Nombre Repuesto</label>
            <input type="text" readOnly name="repuesto_nombre" value={pedido.repuestos?.nombre ?? "N/A"} className="w-full bg-slate-800/50 border border-slate-700/30 rounded-lg p-2 text-xs text-slate-400 cursor-not-allowed" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Origen (Solicita a)</label>
              <select required name="sucursal_origen" value={formData.sucursal_origen} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500">
                <option value="">Seleccione origen...</option>
                <option value="SIN_STOCK">- Repuestos sin stock -</option>
                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Destino (Recibe)</label>
              <select required name="tecnico_destino" value={formData.tecnico_destino} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500">
                <option value="">Seleccione destino...</option>
                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-xs text-slate-400">Tipo de Reporte</label>
               <input type="text" readOnly name="tipo_reporte" value={formData.tipo_reporte} className="w-full bg-slate-800/50 border border-slate-700/30 rounded-lg p-2 text-xs text-slate-400 cursor-not-allowed uppercase font-medium tracking-wide" />
            </div>
            <div className="space-y-1">
               <label className="text-xs text-slate-400">Estado del Pedido</label>
               <select required name="estado" value={formData.estado} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 font-semibold">
                 <option value="Pendiente">Pendiente</option>
                 <option value="Aprobado">Aprobado</option>
                 <option value="Enviado">Enviado</option>
                 <option value="Recibido">Recibido</option>
                 <option value="Finalizado">Finalizado</option>
                 <option value="Rechazado">Rechazado</option>
               </select>
            </div>
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-slate-800 mt-4 pt-4">
            <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-500/20">
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Eliminar Solicitud
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Caso Reposición ──────────────────────────────────
function ModalCasoReposicion({
  casoToEdit,
  sucursales,
  tiposEquipo,
  onClose,
  onSave,
  onDelete
}: {
  casoToEdit?: CasoReposicion | null;
  sucursales: string[];
  tiposEquipo: string[];
  onClose: () => void;
  onSave: (id: number | null, datos: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    serie_equipo: casoToEdit?.serie_equipo || "",
    ubicacion: casoToEdit?.ubicacion || "",
    tipo_equipo: casoToEdit?.tipo_equipo || "",
  });
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(casoToEdit ? casoToEdit.id : null, formData);
    setLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!casoToEdit) return;
    if (!window.confirm("¿Seguro que deseas eliminar este caso? Los repuestos vinculados perderán la relación.")) return;
    setIsDeleting(true);
    await onDelete(casoToEdit.id);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            {casoToEdit ? "Editar Caso de Reposición" : "Crear Caso de Reposición"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {casoToEdit && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Código de Caso</label>
              <input 
                type="text" 
                readOnly
                value={casoToEdit.codigo_caso} 
                className="w-full bg-slate-800/50 border border-slate-700/30 rounded-lg p-2 text-xs text-slate-400 focus:ring-1 focus:ring-blue-500 uppercase cursor-not-allowed" 
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Tipo de Equipo</label>
            <select 
              value={formData.tipo_equipo} 
              onChange={e => setFormData({...formData, tipo_equipo: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccione tipo... (Opcional)</option>
              {tiposEquipo.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Serie del equipo</label>
            <input 
              type="text" 
              required 
              value={formData.serie_equipo} 
              onChange={e => setFormData({...formData, serie_equipo: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 uppercase" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Ubicación</label>
            <select 
              required 
              value={formData.ubicacion} 
              onChange={e => setFormData({...formData, ubicacion: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccione sede...</option>
              {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-slate-800 mt-4 pt-4">
            {casoToEdit ? (
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-500/20">
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Eliminar
              </button>
            ) : <div/>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Agregar Repuesto ──────────────────────────────────
function ModalAgregarRepuesto({
  casoId,
  catalogo,
  sucursales,
  onClose,
  onSave
}: {
  casoId: number;
  catalogo: import("@/types/database.types").RepuestoConStock[];
  sucursales: string[];
  onClose: () => void;
  onSave: (casoId: number, datos: any) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRepuesto, setSelectedRepuesto] = useState<import("@/types/database.types").RepuestoConStock | null>(null);
  
  const [formData, setFormData] = useState({
    numero_caso: "",
    cantidad: 1,
    tecnico_destino: ""
  });
  
  const [loading, setLoading] = useState(false);

  // Search logic
  const [searchResults, setSearchResults] = useState<import("@/types/database.types").RepuestoConScore[]>([]);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      import("@/lib/search").then(({ buscarRepuestos }) => {
        setSearchResults(buscarRepuestos(catalogo, searchTerm).slice(0, 5));
      });
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, catalogo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepuesto) {
      alert("Por favor busque y seleccione un repuesto primero.");
      return;
    }
    setLoading(true);
    await onSave(casoId, {
      repuesto_id: selectedRepuesto.id,
      numero_caso: formData.numero_caso,
      cantidad: Number(formData.cantidad),
      tecnico_destino: formData.tecnico_destino
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Añadir Repuesto al Caso
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-visible">
          {!selectedRepuesto ? (
            <div className="space-y-2 relative">
              <label className="text-xs text-slate-400">Buscar Repuesto</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 pl-8 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" 
                  placeholder="Código, SAP o nombre..."
                />
                <Package className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-500" />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                  {searchResults.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => { setSelectedRepuesto(r); setSearchTerm(""); }}
                      className="p-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-mono font-bold text-indigo-400">{r.codigo}</span>
                        {r.codigo_sap && <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 rounded">SAP: {r.codigo_sap}</span>}
                      </div>
                      <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">{r.nombre_traducido || r.nombre}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-indigo-500/30 rounded-lg p-3 relative group">
              <button 
                type="button" 
                onClick={() => setSelectedRepuesto(null)}
                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1 block">Repuesto Seleccionado</span>
              <p className="text-xs font-mono font-bold text-slate-200">{selectedRepuesto.codigo}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{selectedRepuesto.nombre_traducido || selectedRepuesto.nombre}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">N° de Caso (Equipo)</label>
              <input 
                type="text" 
                required 
                value={formData.numero_caso} 
                onChange={e => setFormData({...formData, numero_caso: e.target.value})} 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 uppercase" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cantidad</label>
              <input 
                type="number" 
                required 
                min={1}
                value={formData.cantidad} 
                onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})} 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Destino (Técnico / Sede)</label>
            <select 
              required 
              value={formData.tecnico_destino} 
              onChange={e => setFormData({...formData, tecnico_destino: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Seleccione destino...</option>
              {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800 mt-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !selectedRepuesto} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Añadir Repuesto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tabla Expandible de Casos de Reposición ────────────────
function TablaCasosReposicion({
  casos,
  repuestosTotales,
  sucursales,
  onCreate,
  onEdit,
  onAddRepuesto
}: {
  casos: CasoReposicion[],
  repuestosTotales: HistorialPedido[],
  sucursales: string[],
  onCreate: () => void,
  onEdit: (caso: CasoReposicion) => void,
  onAddRepuesto: (casoId: number) => void
}) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => setExpandedRows(prev => ({...prev, [id]: !prev[id]}));

  if (casos.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-2">
           <h3 className="text-xs uppercase text-slate-400 font-bold mb-0 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Casos de reposición
           </h3>
           <button onClick={onCreate} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5"/> Crear caso
           </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-slate-600 bg-slate-900 border border-slate-700/50 rounded-xl">
          <Package className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No hay casos de reposición creados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center mb-2">
         <h3 className="text-xs uppercase text-slate-400 font-bold mb-0 tracking-wider flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500"></span> Casos de reposición
         </h3>
         <button onClick={onCreate} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
            <Plus className="w-3.5 h-3.5"/> Crear caso
         </button>
       </div>
       <div className="rounded-xl border border-slate-700/50 overflow-hidden">
         <table className="w-full text-sm">
           <thead>
             <tr className="bg-slate-800/80 border-b border-slate-700">
               <th className="w-10 px-2 py-3 text-center"></th>
               <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Acciones</th>
               <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Fecha Creado</th>
               <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Código de Caso</th>
               <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Serie de Equipo</th>
               <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Ubicación</th>
             </tr>
           </thead>
           <tbody>
             {casos.map((caso, i) => {
               const isExpanded = expandedRows[caso.id];
               // Filtramos usando la nueva relación FK por ID
               const repuestosAsignados = repuestosTotales.filter(r => r.caso_reposicion_id === caso.id);
               
               return (
                 <React.Fragment key={caso.id}>
                   <tr className={`border-b border-slate-800 transition-colors ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                     <td className="px-2 py-3 text-center">
                       <button onClick={() => toggleRow(caso.id)} className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                         {isExpanded ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                       </button>
                     </td>
                     <td className="px-4 py-3">
                       <button onClick={() => onEdit(caso)} className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20" title="Editar Caso">
                         <Edit className="w-3.5 h-3.5" />
                       </button>
                     </td>
                     <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">{formatDate(caso.fecha)}</td>
                     <td className="px-4 py-3 font-mono text-blue-400 font-bold tracking-wider">{caso.codigo_caso}</td>
                     <td className="px-4 py-3 text-slate-200 tracking-wider text-[11px]">{caso.serie_equipo}</td>
                     <td className="px-4 py-3 text-slate-400 text-[11px]">{caso.ubicacion}</td>
                   </tr>
                   {isExpanded && (
                     <tr>
                       <td colSpan={6} className="bg-slate-950/80 p-0 border-b border-slate-800">
                         <div className="p-4 pl-12">
                           <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                             <h4 className="text-[10px] uppercase font-semibold text-slate-500 w-fit">
                               Repuestos vinculados al caso {caso.codigo_caso}
                             </h4>
                             <button onClick={() => onAddRepuesto(caso.id)} className="flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[10px] font-semibold px-2 py-1 rounded transition-colors">
                                <Plus className="w-3 h-3"/> Añadir repuesto
                             </button>
                           </div>
                           {repuestosAsignados.length > 0 ? (
                             <table className="w-full text-left">
                               <thead>
                                 <tr>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium whitespace-nowrap">Fecha P.</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium">Código</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium whitespace-nowrap">Cód. SAP</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium">Nombre de Repuesto</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium">Cant.</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium">N° Caso del Pedido</th>
                                   <th className="px-2 py-1.5 text-[10px] text-slate-500 font-medium">Estado</th>
                                 </tr>
                               </thead>
                               <tbody className="bg-slate-900/50 rounded-lg">
                                 {repuestosAsignados.map(r => (
                                   <tr key={r.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                                     <td className="px-2 py-2 text-[10px] text-slate-400 whitespace-nowrap">{formatDate(r.fecha_pedido)}</td>
                                     <td className="px-2 py-2 font-mono text-[10px] text-indigo-400">{r.repuestos?.codigo ?? "N/A"}</td>
                                     <td className="px-2 py-2 font-mono text-[10px] text-slate-300 max-w-[80px] truncate" title={r.repuestos?.codigo_sap || ""}>{r.repuestos?.codigo_sap || "N/A"}</td>
                                     <td className="px-2 py-2 text-[10px] text-slate-300 truncate max-w-[200px]" title={r.repuestos?.nombre ?? "N/A"}>{r.repuestos?.nombre ?? "N/A"}</td>
                                     <td className="px-2 py-2 text-[10px] text-slate-300 text-center">{r.cantidad}</td>
                                     <td className="px-2 py-2 text-[10px] text-slate-400 font-mono">{r.numero_caso === "0000" ? "VENTA" : r.numero_caso}</td>
                                     <td className="px-2 py-2"><Badge label={r.estado} variant={estadoToVariant(r.estado)} /></td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           ) : (
                             <div className="bg-slate-900 border border-slate-800 rounded px-3 py-2 inline-flex items-center gap-2">
                               <Package className="w-3.5 h-3.5 text-slate-500"/>
                               <span className="text-[11px] text-slate-500">Ningún repuesto ha sido despachado o asignado a este código de caso.</span>
                             </div>
                           )}
                         </div>
                       </td>
                     </tr>
                   )}
                 </React.Fragment>
               )
             })}
           </tbody>
         </table>
       </div>
    </div>
  )
}

// ─── Tabla de pedidos reutilizable ────────────────────────────
function TablaPedidos({
  pedidos,
  isAdmin,
  mostrarOrigen = true,
  mostrarDestino = true,
  ocultarTipo = false,
  isReposicion = false,
  isPedidosActuales = false,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  isAbastecimiento = false,
  onActualizarEstado,
  onEditarPedido,
  onFechasUpdated,
}: {
  pedidos: HistorialPedido[];
  isAdmin: boolean;
  mostrarOrigen?: boolean;
  mostrarDestino?: boolean;
  ocultarTipo?: boolean;
  isReposicion?: boolean;
  isPedidosActuales?: boolean;
  selectable?: boolean;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  isAbastecimiento?: boolean;
  onActualizarEstado?: (id: number, estado: EstadoPedido) => Promise<void>;
  onEditarPedido?: (pedido: HistorialPedido) => void;
  onFechasUpdated?: (id: number, fechas: Partial<HistorialPedido>) => void;
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
    ...(selectable ? ["✓"] : []),
    ...(isAdmin ? ["Acciones"] : []),
    "Fecha",
    "Código",
    "Cód. SAP",
    "Repuesto",
    "N° Caso",
    ...(isReposicion ? ["Caso Rep."] : []),
    "Cant.",
    ...(mostrarOrigen ? ["Origen"] : []),
    ...(mostrarDestino ? ["Destino"] : []),
    ...(ocultarTipo ? [] : ["Tipo"]),
    "Estado",
    ...(isPedidosActuales && isAdmin && !isAbastecimiento ? ["Despachado"] : []),
    ...(isAbastecimiento && !isPedidosActuales ? ["Transf."] : []),
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
                    className={`text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${h === "Despachado" || h === "Acciones" ? 'text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((p, i) => {
                const hasValidCaso = p.caso_reposicion_id !== null && p.caso_reposicion_id !== undefined;
                // Como ahora usamos ID relacional, si tiene ID entonces el caso existe
                const isStrictlyValid = hasValidCaso;

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors
                      ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                  >
                    {selectable && onToggleSelect && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => onToggleSelect(p.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer"
                        />
                      </td>
                    )}
                    {isAdmin && onActualizarEstado && onEditarPedido && (
                      <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {p.estado === "Pendiente" && (
                              <button
                                title="Aprobar"
                                onClick={() => {
                                  // Eliminado startTransition para que el borrado visual (Optimistic Update)
                                  // se aplique instantáneamente sin congelar la UI esperando al servidor.
                                  onActualizarEstado(p.id, "Aprobado");
                                }}
                                className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              title="Editar"
                              onClick={() => onEditarPedido(p)}
                              className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {p.estado === "Pendiente" && (
                              <button
                                title="Rechazar"
                                onClick={() => {
                                  onActualizarEstado(p.id, "Rechazado");
                                }}
                                className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <FechasPopover pedido={p} isAdmin={isAdmin} onFechasUpdated={onFechasUpdated} />
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuestos?.codigo ?? "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-[11px] max-w-[90px] truncate" title={p.repuestos?.codigo_sap || ""}>{p.repuestos?.codigo_sap || "N/A"}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuestos?.nombre ?? "N/A"}>{p.repuestos?.nombre ?? "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso === "0000" ? "VENTA" : p.numero_caso}</td>
                    {isReposicion && (
                      <td className="px-4 py-3 text-center">
                         {p.caso_reposicion_id ? (
                           <div className="flex flex-col items-center">
                             <span className="text-[10px] uppercase font-bold text-slate-500 mb-0.5 leading-none">Vinculado</span>
                             <span className="w-16 bg-blue-900/40 border border-blue-500/30 rounded p-1 text-[11px] text-blue-300 font-mono inline-block">ID: {p.caso_reposicion_id}</span>
                           </div>
                         ) : (
                           <span className="text-[10px] text-slate-600 italic">Sin vincular</span>
                         )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                    {mostrarOrigen && (
                      <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.sucursal_origen}</td>
                    )}
                    {mostrarDestino && (
                      <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.tecnico_destino}</td>
                    )}
                    {!ocultarTipo && (
                      <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {p.tipo_reporte}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge label={p.estado} variant={estadoToVariant(p.estado)} />
                    </td>
                    {isAbastecimiento && !isPedidosActuales && (
                      <td className="px-4 py-3 font-mono text-xs text-amber-500 whitespace-nowrap">
                        {p.transferencia_id ? `TR-${p.transferencia_id}` : "-"}
                      </td>
                    )}
                    {isPedidosActuales && isAdmin && !isAbastecimiento && onActualizarEstado && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          title={isReposicion && !isStrictlyValid ? "Debe asignar un código de caso válido primero." : "Marcar como Despachado"}
                          onClick={() => {
                            onActualizarEstado(p.id, "Enviado");
                          }}
                          disabled={(isReposicion && !isStrictlyValid)}
                          className={`p-1.5 rounded-full inline-flex items-center justify-center transition-colors border
                            ${isReposicion && !isStrictlyValid 
                               ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50' 
                               : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 animate-pulse hover:animate-none'
                            }
                          `}
                        >
                          <Send className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
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

import { getTransferType, resolverReceptorPedido } from "@/lib/transferencias";

// ─── Tabla Transferencias ───────────────────────────────────────
function TablaTransferencias({
  transferencias,
  historial,
  sucursales,
  onEliminarTransferencia,
  onEditarTransferencia,
  onRemoverItem,
}: {
  transferencias: Transferencia[];
  historial: HistorialPedido[];
  sucursales: string[];
  onEliminarTransferencia: (id: number) => void;
  onEditarTransferencia: (id: number, datos: Partial<Transferencia>) => void;
  onRemoverItem: (pedidoId: number, transferenciaId: number) => void;
}) {
  const [despachandoId, setDespachandoId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  
  return (
    <div className="space-y-3">
      {transferencias.map(t => {
        const pedidosDeTransferencia = historial.filter(p => p.transferencia_id === t.id);
        
        return (
          <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap gap-4 items-center justify-between border-b border-slate-800 bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ID</p>
                  <p className="text-sm font-mono text-slate-200">TR-{t.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Destino</p>
                  <select
                    className="bg-slate-800 border border-slate-700 text-sm font-medium rounded px-2 py-0.5 text-slate-300 min-w-[120px] focus:ring-1 focus:ring-indigo-500 capitalize"
                    value={t.sucursal_destino || ""}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      onEditarTransferencia(t.id, { sucursal_destino: newVal });
                      editarTransferencia(t.id, { sucursal_destino: newVal }).then(res => {
                        if (res.error) {
                          alert(res.error);
                          onEditarTransferencia(t.id, { sucursal_destino: t.sucursal_destino });
                        }
                      });
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Tipo</p>
                  <p className="text-sm text-slate-400 font-medium">{getTransferType(t.sucursal_destino)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Repuestos</p>
                  <p className="text-sm text-slate-300 font-medium">{pedidosDeTransferencia.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm("¿Estás seguro de eliminar esta transferencia? Los pedidos volverán a estar por despachar.")) {
                      onEliminarTransferencia(t.id);
                      eliminarTransferencia(t.id).then(res => {
                        if (res.error) alert(`Error al eliminar: ${res.error}`);
                      });
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                  Eliminar
                </button>
                <TransferenciaAcciones transferencia={t} hasError={pedidosDeTransferencia.some(p => t.sucursal_destino && p.tecnico_destino !== t.sucursal_destino)} pedidos={pedidosDeTransferencia} />
              </div>
            </div>
            
            {/* Lista interna de pedidos abreviada */}
            <div className="p-3 bg-slate-900/50">
              {pedidosDeTransferencia.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay repuestos en esta transferencia aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {pedidosDeTransferencia.map(p => {
                    const isError = t.sucursal_destino && p.tecnico_destino !== t.sucursal_destino;
                    return (
                    <div key={p.id} className={`flex items-center justify-between border rounded p-2 transition-colors ${isError ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700/50'}`}>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono text-indigo-400">{p.repuestos?.codigo}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={p.repuestos?.nombre || ""}>
                          {p.repuestos?.nombre}
                        </span>
                        {isError && <span className="text-[10px] text-red-400 font-bold mt-0.5">Destino incorrecto ({p.tecnico_destino})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                          x{p.cantidad}
                        </span>
                        <button
                          title="Remover de la transferencia"
                          disabled={isPending}
                          onClick={() => {
                            onRemoverItem(p.id, t.id);
                            removerDeTransferencia([p.id]).then(res => {
                              if (res?.error) alert(res.error);
                            });
                          }}
                          className="text-red-400 hover:text-red-300 ml-1 p-0.5 rounded hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModalPrevisualizacionCorreo({
  transferencia,
  bultos,
  empresa,
  ordenVenta,
  factura,
  codigoPDF,
  onClose,
  onConfirm
}: {
  transferencia: Transferencia;
  bultos: string;
  empresa: string;
  ordenVenta: string;
  factura: string;
  codigoPDF: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isSending, setIsSending] = useState(false);
  const { to } = resolverReceptorPedido("Lima", transferencia.sucursal_destino, false);
  const destinatario = to;
  const identifier = codigoPDF || `TR-${transferencia.id}`;
  const asunto = `Envío a ${transferencia.sucursal_destino || 'Varias'} - ${identifier}`;
  const tipo = getTransferType(transferencia.sucursal_destino);
  const isNormal = tipo === "Transferencia";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200">Previsualización de Correo</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-slate-500 font-semibold w-16">Para:</span>
              <span className="text-slate-300">{destinatario}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 font-semibold w-16">Asunto:</span>
              <span className="text-slate-300">{asunto}</span>
            </div>
          </div>
          
          <div className="bg-slate-950 rounded-lg p-5 border border-slate-800 text-sm text-slate-300 whitespace-pre-wrap font-sans">
            <p>Estimados,</p>
            <p className="mt-2">Se ha procedido con el despacho de la transferencia con destino a {transferencia.sucursal_destino || 'Varias'}.</p>
            
            <p className="mt-4 font-semibold text-slate-200">Detalles del Envío:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li><strong>Empresa de Transportes:</strong> {empresa || "No especificado"}</li>
              <li><strong>Cantidad de Bultos:</strong> {bultos || "No especificado"}</li>
              {!isNormal && (
                <>
                  <li><strong>Número de Orden de Venta:</strong> {ordenVenta || "No especificado"}</li>
                  <li><strong>Código de Factura:</strong> {factura || "No especificado"}</li>
                </>
              )}
            </ul>
            
            <p className="mt-4 text-emerald-400 text-xs italic flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              Se ha adjuntado el documento PDF con el comprobante de despacho.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">
            Cancelar
          </button>
          <button 
            onClick={async () => {
              setIsSending(true);
              await onConfirm();
              setIsSending(false);
            }} 
            disabled={isSending}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirmar Despacho
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarTransferencia({
  transferencia,
  bultosInit,
  empresaInit,
  fechaEnvioInit,
  onClose,
  onSave
}: {
  transferencia: Transferencia;
  bultosInit: string;
  empresaInit: string;
  fechaEnvioInit: string;
  onClose: () => void;
  onSave: (datos: { bultos: string; empresa: string; fechaEnvio: string; codigo: string; orden: string; factura: string }) => Promise<void>;
}) {
  const [orden, setOrden] = useState(transferencia.orden_venta || "");
  const [factura, setFactura] = useState(transferencia.factura || "");
  const [bultos, setBultos] = useState(bultosInit);
  const [empresa, setEmpresa] = useState(empresaInit);
  const [fechaEnvio, setFechaEnvio] = useState(fechaEnvioInit || transferencia.fecha_hora.slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tipo = getTransferType(transferencia.sucursal_destino);
  const isNormal = tipo === "Transferencia";
  const prefix = isNormal ? "T050-" : "T021-";

  const [manualCodigo, setManualCodigo] = useState(() => {
    if (transferencia.codigo_transferencia?.startsWith(prefix)) {
      return transferencia.codigo_transferencia.slice(prefix.length);
    }
    return transferencia.codigo_transferencia || "";
  });

  const [pdfFile, setPdfFile] = useState<string | null>(transferencia.codigo_transferencia ? `${transferencia.codigo_transferencia}.pdf` : null);
  const fullCodigo = manualCodigo.trim() ? `${prefix}${manualCodigo.trim()}` : "";


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200">Editar Datos de Despacho</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-400">Código de Transferencia</label>
             <div className="flex gap-2">
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono flex items-center">
                  {prefix}
                </div>
                <input 
                  type="text" 
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono" 
                  placeholder="Ej: 12345"
                  value={manualCodigo}
                  onChange={e => setManualCodigo(e.target.value)}
                />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-400">PDF de Transferencia</label>
             <div className="relative">
               <label className={`flex items-center justify-center gap-2 w-full py-2 bg-slate-800 border border-slate-700 border-dashed rounded-lg text-xs text-slate-300 transition-colors ${!manualCodigo.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 cursor-pointer'}`}>
                 <FileUp className="w-4 h-4" />
                 {pdfFile ? "Reemplazar PDF" : "Subir archivo PDF"}
                 <input 
                   type="file" accept="application/pdf" className="hidden"
                   disabled={!manualCodigo.trim()}
                   onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     if (!manualCodigo.trim()) {
                       alert("Primero ingresa el código de transferencia.");
                       return;
                     }
                     setIsSubmitting(true);
                     const supabase = createBrowserClient();
                     const fileName = `${fullCodigo}.pdf`;
                     const { error: uploadError } = await supabase.storage.from('transferencias_pdfs').upload(fileName, file, {
                       upsert: true
                     });
                     if (uploadError) alert("Error al subir PDF: " + uploadError.message);
                     else {
                        setPdfFile(fileName);
                     }
                     setIsSubmitting(false);
                   }} 
                 />
               </label>
               {pdfFile && <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> PDF Adjunto: {pdfFile}</div>}
               {!manualCodigo.trim() && <p className="mt-1 text-[10px] text-slate-500">Ingresa el código antes de subir el PDF</p>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Orden de Venta</label>
              <input 
                type="text" 
                className={`w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 transition-colors ${isNormal ? 'bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-700 text-slate-200'}`}
                value={isNormal ? "No aplica" : orden} 
                onChange={e => setOrden(e.target.value)} 
                disabled={isNormal}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Factura</label>
              <input 
                type="text" 
                className={`w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 transition-colors ${isNormal ? 'bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-700 text-slate-200'}`}
                value={isNormal ? "No aplica" : factura} 
                onChange={e => setFactura(e.target.value)} 
                disabled={isNormal}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Empresa Transportes</label>
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" value={empresa} onChange={e => setEmpresa(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cant. Bultos</label>
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" value={bultos} onChange={e => setBultos(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Fecha de Envío (Despacho)</label>
            <input type="datetime-local" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500" value={fechaEnvio} onChange={e => setFechaEnvio(e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors">
            Cancelar
          </button>
          <button 
            disabled={isSubmitting}
            onClick={async () => {
              if (!manualCodigo.trim()) {
                alert("El código de transferencia es obligatorio.");
                return;
              }
              setIsSubmitting(true);
              await onSave({ bultos, empresa, fechaEnvio, codigo: fullCodigo, orden, factura });
              setIsSubmitting(false);
            }} 
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferenciaAcciones({ transferencia, hasError, pedidos }: { transferencia: Transferencia, hasError?: boolean, pedidos?: HistorialPedido[] }) {
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Variables en memoria para el correo y la fecha custom
  const [bultos, setBultos] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState("");

  const pdfUrl = transferencia.codigo_transferencia 
    ? `https://ffaqsyprvehybfprfmyf.supabase.co/storage/v1/object/public/transferencias_pdfs/${transferencia.codigo_transferencia}${transferencia.codigo_transferencia.endsWith('.pdf') ? '' : '.pdf'}`
    : null;

  return (
    <>
      <div className="flex items-center gap-3">
        {(transferencia.codigo_transferencia || transferencia.orden_venta || transferencia.factura) && (
          <div className="flex flex-col text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
            {transferencia.codigo_transferencia && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-2.5 h-2.5" />
                <a href={pdfUrl!} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate max-w-[80px]">
                  {transferencia.codigo_transferencia}
                </a>
              </div>
            )}
            {transferencia.orden_venta && <span>OV: {transferencia.orden_venta}</span>}
            {transferencia.factura && <span>Fac: {transferencia.factura}</span>}
          </div>
        )}
        <button
          onClick={() => setShowModalEditar(true)}
          className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
          title="Editar datos de transferencia"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (hasError) {
              alert("No puedes despachar esta transferencia porque contiene repuestos con destino incorrecto. Corrige el destino o remueve el repuesto de la transferencia.");
              return;
            }
            if (!transferencia.sucursal_destino) {
              alert("Por favor selecciona una sucursal de destino antes de despachar.");
              return;
            }

            const tipo = getTransferType(transferencia.sucursal_destino);
            const isNormal = tipo === "Transferencia";
            
            const faltantes = [];
            if (!empresa.trim()) faltantes.push("Empresa de Transportes");
            if (!bultos.trim()) faltantes.push("Cant. Bultos");
            if (!fechaEnvio) faltantes.push("Fecha de Envío");
            if (!transferencia.codigo_transferencia) faltantes.push("PDF de Transferencia");
            
            if (!isNormal) {
              if (!transferencia.orden_venta?.trim()) faltantes.push("Orden de Venta");
              if (!transferencia.factura?.trim()) faltantes.push("Factura");
            }

            if (faltantes.length > 0) {
              alert(`Para despachar, por favor completa los siguientes datos en el botón "Editar":\n\n- ${faltantes.join("\n- ")}`);
              return;
            }

            setShowEmailPreview(true);
          }}
          disabled={isSubmitting}
          className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Despachar
        </button>
      </div>

      {showModalEditar && (
        <ModalEditarTransferencia
          transferencia={transferencia}
          bultosInit={bultos}
          empresaInit={empresa}
          fechaEnvioInit={fechaEnvio}
          onClose={() => setShowModalEditar(false)}
          onSave={async (datos) => {
            // Guardamos Bultos, Empresa y FechaEnvio en memoria
            setBultos(datos.bultos);
            setEmpresa(datos.empresa);
            setFechaEnvio(datos.fechaEnvio);
            // Guardamos Código (PDF), Orden y Factura en BD
            const res = await editarTransferencia(transferencia.id, {
              codigo_transferencia: datos.codigo,
              orden_venta: datos.orden,
              factura: datos.factura
            });
            if (res.error) alert(res.error);
            else setShowModalEditar(false);
          }}
        />
      )}

      {showEmailPreview && (
        <ModalPrevisualizacionCorreo
          transferencia={transferencia}
          bultos={bultos}
          empresa={empresa}
          ordenVenta={transferencia.orden_venta || ""}
          factura={transferencia.factura || ""}
          codigoPDF={transferencia.codigo_transferencia || ""}
          onClose={() => setShowEmailPreview(false)}
          onConfirm={async () => {
             setIsSubmitting(true);
             const fechaISO = fechaEnvio ? new Date(fechaEnvio).toISOString() : new Date().toISOString();
             const res = await despacharTransferencia(transferencia.id, {
                codigo_transferencia: transferencia.codigo_transferencia || "",
                orden_venta: transferencia.orden_venta || "",
                factura: transferencia.factura || ""
             }, fechaISO, {
                bultos,
                empresa,
                sucursal_destino: transferencia.sucursal_destino || ""
             });
             if (res.error) alert(res.error);
             setIsSubmitting(false);
             setShowEmailPreview(false);
          }}
        />
      )}
    </>
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
  casosReposicion,
  transferencias,
  ciudadUsuario,
  sucursales,
  onActualizarEstado,
  onEditarPedido,
  onCrearCasoReposicion,
  onEditarCasoReposicion,
  onEliminarCasoReposicion,
  onFechasUpdated,
  onCrearTransferencia,
  onEliminarTransferencia,
  onEditarTransferencia,
  onAsignarItems,
  onRemoverItem,
  onAgregarRepuestoACaso,
  tiposEquipo,
  catalogo,
}: {
  historial: HistorialPedido[];
  casosReposicion: CasoReposicion[];
  transferencias: Transferencia[];
  ciudadUsuario: string;
  sucursales: string[];
  onActualizarEstado: (id: number, estado: EstadoPedido) => Promise<void>;
  onEditarPedido: (pedido: HistorialPedido) => void;
  onCrearCasoReposicion: (datos: any) => Promise<void>;
  onEditarCasoReposicion: (id: number, datos: any) => Promise<void>;
  onEliminarCasoReposicion: (id: number) => Promise<void>;
  onFechasUpdated: (id: number, fechas: Partial<HistorialPedido>) => void;
  onCrearTransferencia: () => void;
  onEliminarTransferencia: (id: number) => void;
  onEditarTransferencia: (id: number, datos: Partial<Transferencia>) => void;
  onAsignarItems: (pedidoIds: number[], transferenciaId: number) => Promise<{ error: string | null }>;
  onRemoverItem: (pedidoId: number, transferenciaId: number) => void;
  onAgregarRepuestoACaso: (casoId: number, datos: any) => Promise<void>;
  tiposEquipo: string[];
  catalogo?: import("@/types/database.types").RepuestoConStock[];
}) {
  const tabs: { id: TipoReporte | "aprobaciones"; label: string; icon: React.ReactNode }[] = [
    { id: "aprobaciones",  label: "Aprobaciones",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: "Abastecimiento", label: "Abastecimiento",   icon: <Package className="w-3.5 h-3.5" /> },
    { id: "Reposición",    label: "Reposiciones",      icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: "Envío Interno", label: "Envíos Internos",   icon: <Truck className="w-3.5 h-3.5" /> },
  ];
  const [activeTab, setActiveTab] = useState<TipoReporte | "aprobaciones">("aprobaciones");

  // Handlers para el Modal de Caso Reposición
  const [showModalCaso, setShowModalCaso] = useState(false);
  const [casoToEdit, setCasoToEdit] = useState<CasoReposicion | null>(null);

  // Handlers para Modal Agregar Repuesto
  const [showModalAddRepuesto, setShowModalAddRepuesto] = useState(false);
  const [casoIdForRepuesto, setCasoIdForRepuesto] = useState<number | null>(null);

  const handleSaveCaso = async (id: number | null, datos: any) => {
    if (id) {
       await onEditarCasoReposicion(id, datos);
    } else {
       await onCrearCasoReposicion(datos);
    }
  };

  // Estado para Transferencias (Abastecimiento)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedTransferenciaId, setSelectedTransferenciaId] = useState<string>("");
  const [isAbasteciendo, setIsAbasteciendo] = useState(false);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [filtroSucursal, setFiltroSucursal] = useState<string>("Todas");

  const historialFiltrado = filtroSucursal === "Todas" 
    ? historial 
    : historial.filter(p => 
        p.sucursal_origen.toLowerCase().trim() === filtroSucursal.toLowerCase().trim() || 
        p.tecnico_destino.toLowerCase().trim() === filtroSucursal.toLowerCase().trim()
      );

  // A petición del usuario, el filtro de sucursal NO debe aplicar a las transferencias
  const transferenciasFiltradas = transferencias;

  const transferenciasPendientes = transferenciasFiltradas.filter(t => t.estado === "Pendiente");

  return (
    <div className="space-y-4">
      {/* Filtro por Sucursal */}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs font-semibold text-slate-400">Filtrar por Sucursal:</label>
        <select
          value={filtroSucursal}
          onChange={(e) => setFiltroSucursal(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 text-indigo-300 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="Todas">Todas las sucursales</option>
          {sucursales.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-slate-800 w-full mb-1">
          {tabs.map((t) => {
            const count = t.id === "aprobaciones" 
               ? historialFiltrado.filter(p => p.estado === "Pendiente").length 
               : historialFiltrado.filter(p => p.tipo_reporte.toLowerCase() === t.id.toLowerCase() && p.estado !== "Pendiente" && p.estado !== "Rechazado").length;
            
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
        <div className="flex justify-end w-full -mt-2 mb-2">
          <ExportBtn filtro={activeTab} ciudadUsuario={ciudadUsuario} label="Exportar CSV" />
        </div>
      </div>

      {/* Renderizado de tablas */}
      {activeTab === "aprobaciones" ? (
        <TablaPedidos
          pedidos={historialFiltrado.filter(p => p.estado === "Pendiente")}
          isAdmin
          onActualizarEstado={onActualizarEstado}
          onEditarPedido={onEditarPedido}
          onFechasUpdated={onFechasUpdated}
        />
      ) : (
        <div className="space-y-8">
          {/* TABLA 1: PEDIDOS ACTUALES (Repuestos por despachar) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Repuestos por despachar
              </h3>
            </div>

            {activeTab === "Abastecimiento" && (
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <select
                    className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-300 min-w-[200px]"
                    value={selectedTransferenciaId}
                    onChange={(e) => setSelectedTransferenciaId(e.target.value)}
                  >
                    <option value="">Seleccionar transferencia...</option>
                    {transferenciasPendientes.map(t => (
                      <option key={t.id} value={t.id}>
                        TR-{t.id} - Destino: {t.sucursal_destino || "No asig."}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!selectedTransferenciaId) return alert("Selecciona una transferencia.");
                      if (selectedIds.length === 0) return alert("Selecciona repuestos.");
                      setIsAbasteciendo(true);
                      const res = await onAsignarItems(selectedIds, Number(selectedTransferenciaId));
                      if (res.error) alert(res.error);
                      else setSelectedIds([]);
                      setIsAbasteciendo(false);
                    }}
                    disabled={isAbasteciendo || selectedIds.length === 0 || !selectedTransferenciaId}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {isAbasteciendo ? "Asignando..." : "Asignar seleccionados"}
                  </button>
                </div>
                <div className="ml-auto">
                                    <button
                    onClick={() => onCrearTransferencia()}
                    className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    + Nueva Transferencia Vacía
                  </button>
                </div>
              </div>
            )}

            <TablaPedidos 
              pedidos={historialFiltrado.filter(p => p.tipo_reporte.toLowerCase() === activeTab.toLowerCase() && p.estado === "Aprobado" && (activeTab === "Abastecimiento" ? p.transferencia_id == null : true))}
              isAdmin
              ocultarTipo={true}
              isReposicion={activeTab === "Reposición"}
              isPedidosActuales={true}
              selectable={activeTab === "Abastecimiento"}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              isAbastecimiento={activeTab === "Abastecimiento"}
              onActualizarEstado={onActualizarEstado}
              onEditarPedido={onEditarPedido}
              onFechasUpdated={onFechasUpdated}
            />
          </div>

          {/* TABLA TRANSFERENCIAS (Abastecimiento) */}
          {activeTab === "Abastecimiento" && (
            <div>
              <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-amber-500"></span> Transferencias en Curso
              </h3>
              {transferenciasPendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600 bg-slate-800/20 rounded-xl border border-slate-700/50">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No hay transferencias pendientes.</p>
                </div>
              ) : (
                <TablaTransferencias
                  transferencias={transferenciasPendientes}
                  historial={historialFiltrado}
                  sucursales={sucursales}
                  onEliminarTransferencia={onEliminarTransferencia}
                  onEditarTransferencia={onEditarTransferencia}
                  onRemoverItem={onRemoverItem}
                />
              )}
            </div>
          )}

          {/* TABLA 2: CASOS DE REPOSICION (Solo si la pestaña es Reposición) */}
          {activeTab === "Reposición" && (
            <div>
              <TablaCasosReposicion
                 casos={casosReposicion}
                 repuestosTotales={historialFiltrado}
                 sucursales={sucursales}
                 onCreate={() => { setCasoToEdit(null); setShowModalCaso(true); }}
                 onEdit={(caso) => { setCasoToEdit(caso); setShowModalCaso(true); }}
                 onAddRepuesto={(casoId) => {
                   setCasoIdForRepuesto(casoId);
                   setShowModalAddRepuesto(true);
                 }}
              />
            </div>
          )}

          {/* TABLA 3: HISTORIAL DE PEDIDOS (Solo "Enviado", "Recibido") */}
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Historial de pedidos
            </h3>
            <TablaPedidos 
              pedidos={historialFiltrado.filter(p => p.tipo_reporte.toLowerCase() === activeTab.toLowerCase() && (p.estado === "Enviado" || p.estado === "Recibido"))}
              isAdmin
              ocultarTipo={true}
              isReposicion={activeTab === "Reposición"}
              isPedidosActuales={false}
              isAbastecimiento={activeTab === "Abastecimiento"}
              onActualizarEstado={onActualizarEstado}
              onEditarPedido={onEditarPedido}
              onFechasUpdated={onFechasUpdated}
            />
          </div>
        </div>
      )}

      {/* Modal Casos Reposicion */}
      {showModalCaso && (
         <ModalCasoReposicion
            casoToEdit={casoToEdit}
            sucursales={sucursales}
            tiposEquipo={tiposEquipo}
            onClose={() => setShowModalCaso(false)}
            onSave={handleSaveCaso}
            onDelete={onEliminarCasoReposicion}
         />
      )}

      {/* Modal Añadir Repuesto */}
      {showModalAddRepuesto && casoIdForRepuesto !== null && catalogo && (
         <ModalAgregarRepuesto
            casoId={casoIdForRepuesto}
            catalogo={catalogo}
            sucursales={sucursales}
            onClose={() => {
              setShowModalAddRepuesto(false);
              setCasoIdForRepuesto(null);
            }}
            onSave={onAgregarRepuestoACaso}
         />
      )}
    </div>
  );
}

// ─── Vista Técnico ────────────────────────────────────────────
function VistaTecnico({
  historial,
  ciudadUsuario,
  onActualizarEstadoTecnico,
}: {
  historial: HistorialPedido[];
  ciudadUsuario: string;
  onActualizarEstadoTecnico: (id: number, estado: "Enviado" | "Finalizado") => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"misPedidos" | "aDespachar">("misPedidos");

  // Normalizar ciudad para comparación case-insensitive
  const ciudadNorm = ciudadUsuario.toLowerCase().trim();

  // ── MIS PEDIDOS: pedidos donde esta sucursal es el destino (ella recibe)
  // Comparación case-insensitive para cubrir datos históricos con capitalización distinta
  const misPedidosTodos = historial.filter(
    (p) => p.tecnico_destino.toLowerCase().trim() === ciudadNorm
  );
  // Activos: estados que no son terminales
  const misPedidosActivos = misPedidosTodos.filter(
    (p) => p.estado === "Pendiente" || p.estado === "Aprobado" || p.estado === "Enviado"
  );
  // Historial: Finalizado o Rechazado
  const misPedidosHistorial = misPedidosTodos.filter(
    (p) => p.estado === "Finalizado" || p.estado === "Rechazado"
  );

  // ── A DESPACHAR: pedidos donde esta sucursal es el origen (ella despacha) y el destino es distinto
  const aDespacharTodos = historial.filter(
    (p) =>
      p.sucursal_origen.toLowerCase().trim() === ciudadNorm &&
      p.tecnico_destino.toLowerCase().trim() !== ciudadNorm
  );
  // Pedidos a realizar: estados activos (Aprobado, Pendiente)
  const aDespacharActivos = aDespacharTodos.filter(
    (p) => p.estado === "Pendiente" || p.estado === "Aprobado"
  );
  // Historial de pedidos despachados: Enviado, Recibido, Finalizado, Rechazado
  const aDespacharHistorial = aDespacharTodos.filter(
    (p) =>
      p.estado === "Enviado" ||
      p.estado === "Recibido" ||
      p.estado === "Finalizado" ||
      p.estado === "Rechazado"
  );

  const counts = {
    misPedidos: misPedidosTodos.length,
    aDespachar: aDespacharTodos.length,
  };


  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-slate-800 w-full mb-1">
          {([
            { id: "misPedidos" as const, label: "📤 Mis Pedidos", count: counts.misPedidos },
            { id: "aDespachar" as const, label: "📥 A Despachar", count: counts.aDespachar },
          ]).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px
                ${activeTab === id
                  ? "border-indigo-500 text-indigo-300 bg-indigo-500/10"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
            >
              {label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === id ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end w-full -mt-2 mb-2">
          <ExportBtn filtro={activeTab === "misPedidos" ? "realizados" : "recibidos"} ciudadUsuario={ciudadUsuario} label="Exportar CSV" />
        </div>
      </div>

      {/* ─── MIS PEDIDOS ─── */}
      {activeTab === "misPedidos" && (
        <div className="space-y-8">
          {/* Tabla activa */}
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Pedidos en curso
            </h3>
            <TablaMisPedidos
              pedidos={misPedidosActivos}
              onConfirmarRecepcion={(id) => onActualizarEstadoTecnico(id, "Finalizado")}
            />
          </div>

          {/* Historial */}
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Historial de pedidos
            </h3>
            <TablaMisPedidosHistorial pedidos={misPedidosHistorial} />
          </div>
        </div>
      )}

      {/* ─── A DESPACHAR ─── */}
      {activeTab === "aDespachar" && (
        <div className="space-y-8">
          {/* Pedidos a realizar */}
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pedidos a realizar
            </h3>
            <TablaADespachar
              pedidos={aDespacharActivos}
              onDespachar={(id) => onActualizarEstadoTecnico(id, "Enviado")}
            />
          </div>

          {/* Historial */}
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Historial de pedidos
            </h3>
            <TablaDespachadosHistorial pedidos={aDespacharHistorial} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tabla Mis Pedidos (en curso) ─────────────────────────────────
// Muestra pedidos con estado Pendiente/Aprobado/Enviado
// Columna final: "Confirmar Recepción" solo si estado === "Enviado"
function TablaMisPedidos({
  pedidos,
  onConfirmarRecepcion,
}: {
  pedidos: HistorialPedido[];
  onConfirmarRecepcion: (id: number) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-slate-900 border border-slate-700/50 rounded-xl">
        <Package className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">No tienes pedidos activos en este momento.</p>
      </div>
    );
  }

  const handleConfirmar = async (id: number) => {
    setLoadingId(id);
    await onConfirmarRecepcion(id);
    setLoadingId(null);
  };

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700">
              {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Origen", "Tipo", "Estado", "Confirmar Recepción"].map(h => (
                <th key={h} className={`text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${h === "Confirmar Recepción" ? "text-center" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                <td className="px-4 py-3">
                  <FechasPopover pedido={p} isAdmin={false} onFechasUpdated={undefined} />
                </td>
                <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuestos?.codigo ?? "N/A"}</td>
                <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuestos?.nombre ?? "N/A"}>{p.repuestos?.nombre ?? "N/A"}</td>
                <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso === "0000" ? "VENTA" : p.numero_caso}</td>
                <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.sucursal_origen}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{p.tipo_reporte}</td>
                <td className="px-4 py-3"><Badge label={p.estado} variant={estadoToVariant(p.estado)} /></td>
                <td className="px-4 py-3 text-center">
                  {p.estado === "Enviado" ? (
                    <button
                      title="Confirmar recepción del pedido"
                      onClick={() => handleConfirmar(p.id)}
                      disabled={loadingId === p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50 animate-pulse hover:animate-none"
                    >
                      {loadingId === p.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />
                      }
                      Recibido
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">
                      {p.estado === "Pendiente" ? "Esperando aprobación" : p.estado === "Aprobado" ? "Pendiente de envío" : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tabla Mis Pedidos — Historial (Finalizado / Rechazado) ──────────
function TablaMisPedidosHistorial({ pedidos }: { pedidos: HistorialPedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-slate-900 border border-slate-700/50 rounded-xl">
        <Package className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">Sin historial de pedidos finalizados o rechazados.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700">
              {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Origen", "Tipo", "Estado"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                <td className="px-4 py-3">
                  <FechasPopover pedido={p} isAdmin={false} onFechasUpdated={undefined} />
                </td>
                <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuestos?.codigo ?? "N/A"}</td>
                <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuestos?.nombre ?? "N/A"}>{p.repuestos?.nombre ?? "N/A"}</td>
                <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso === "0000" ? "VENTA" : p.numero_caso}</td>
                <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.sucursal_origen}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{p.tipo_reporte}</td>
                <td className="px-4 py-3"><Badge label={p.estado} variant={estadoToVariant(p.estado)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tabla A Despachar — Activos ─────────────────────────────────────
// Muestra pedidos donde la sucursal es origen, estados: Pendiente o Aprobado
// Botón "Despachar" solo aparece para estado === "Aprobado"
function TablaADespachar({
  pedidos,
  onDespachar,
}: {
  pedidos: HistorialPedido[];
  onDespachar: (id: number) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-slate-900 border border-slate-700/50 rounded-xl">
        <Package className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">No hay pedidos pendientes de despacho.</p>
      </div>
    );
  }

  const handleDespachar = async (id: number) => {
    setLoadingId(id);
    await onDespachar(id);
    setLoadingId(null);
  };

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700">
              {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Destino", "Tipo", "Estado", "Despachar"].map(h => (
                <th key={h} className={`text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${h === "Despachar" ? "text-center" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                <td className="px-4 py-3">
                  <FechasPopover pedido={p} isAdmin={false} onFechasUpdated={undefined} />
                </td>
                <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuestos?.codigo ?? "N/A"}</td>
                <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuestos?.nombre ?? "N/A"}>{p.repuestos?.nombre ?? "N/A"}</td>
                <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso === "0000" ? "VENTA" : p.numero_caso}</td>
                <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.tecnico_destino}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{p.tipo_reporte}</td>
                <td className="px-4 py-3"><Badge label={p.estado} variant={estadoToVariant(p.estado)} /></td>
                <td className="px-4 py-3 text-center">
                  {p.estado === "Aprobado" ? (
                    <button
                      title="Marcar como despachado"
                      onClick={() => handleDespachar(p.id)}
                      disabled={loadingId === p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50 animate-pulse hover:animate-none"
                    >
                      {loadingId === p.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                      Despachar
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">
                      {p.estado === "Pendiente" ? "Sin aprobar" : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tabla A Despachar — Historial ───────────────────────────────────
function TablaDespachadosHistorial({ pedidos }: { pedidos: HistorialPedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-slate-900 border border-slate-700/50 rounded-xl">
        <Package className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">Sin pedidos despachados en el historial.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700">
              {["Fecha", "Código", "Repuesto", "N° Caso", "Cant.", "Destino", "Tipo", "Estado"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                <td className="px-4 py-3">
                  <FechasPopover pedido={p} isAdmin={false} onFechasUpdated={undefined} />
                </td>
                <td className="px-4 py-3 font-mono text-indigo-400 text-[11px]">{p.repuestos?.codigo ?? "N/A"}</td>
                <td className="px-4 py-3 text-[11px] text-slate-200 max-w-xs truncate" title={p.repuestos?.nombre ?? "N/A"}>{p.repuestos?.nombre ?? "N/A"}</td>
                <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{p.numero_caso === "0000" ? "VENTA" : p.numero_caso}</td>
                <td className="px-4 py-3 text-center text-slate-300 text-[11px]">{p.cantidad}</td>
                <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">{p.tecnico_destino}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{p.tipo_reporte}</td>
                <td className="px-4 py-3"><Badge label={p.estado} variant={estadoToVariant(p.estado)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function HistorialTab({
  historial,
  casosReposicion = [],
  transferencias = [],
  isAdmin,
  ciudadUsuario,
  sucursales = [],
  catalogo,
}: HistorialTabProps) {
  const [pedidoToEdit, setPedidoToEdit] = useState<HistorialPedido | null>(null);
  
  // Optimistic UI states
  const [localHistorial, setLocalHistorial] = useState<HistorialPedido[]>(historial);
  const [localCasos, setLocalCasos] = useState<CasoReposicion[]>(casosReposicion);
  const [localTransferencias, setLocalTransferencias] = useState<Transferencia[]>(transferencias);

  useEffect(() => {
    setLocalHistorial(historial);
    setLocalCasos(casosReposicion);
    setLocalTransferencias(transferencias);
  }, [historial, casosReposicion, transferencias]);

  const tiposEquipo = React.useMemo(() => {
    const models = new Set<string>();
    if (catalogo) {
      catalogo.forEach(r => {
        if (r.modelos_compatibles) {
          const parts = r.modelos_compatibles.split(/[,\s]+/);
          parts.forEach(p => {
            if (p.trim().length > 0) models.add(p.trim().toUpperCase());
          });
        }
      });
    }
    return Array.from(models).sort();
  }, [catalogo]);

  // Función de actualización de estado de repuesto (admin) 
  async function handleActualizarEstado(id: number, estado: EstadoPedido) {
    const pedido = localHistorial.find(p => p.id === id);
    setLocalHistorial(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    await actualizarEstadoPedido(id, estado, pedido?.is_test);
  }

  // Edit in-line repuesto completo
  async function handleSaveEdicion(id: number, datos: Partial<HistorialPedido>) {
    const pedido = localHistorial.find(p => p.id === id);
    setLocalHistorial(prev => prev.map(p => p.id === id ? { ...p, ...datos } : p));
    await editarPedidoAdmin(id, datos, pedido?.is_test);
  }

  // Eliminar repuesto
  async function handleDelete(id: number) {
    const pedido = localHistorial.find(p => p.id === id);
    setLocalHistorial(prev => prev.filter(p => p.id !== id));
    await eliminarPedidoAdmin(id, pedido?.is_test);
  }

  // Acción de técnico: despachar (Enviado) o confirmar recepción (Finalizado)
  async function handleActualizarEstadoTecnico(id: number, estado: "Enviado" | "Finalizado") {
    const pedido = localHistorial.find(p => p.id === id);
    setLocalHistorial(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    await actualizarEstadoPedidoTecnico(id, estado, pedido?.is_test);
  }

  // Actualización optimista de fechas (admin)
  function handleFechasUpdated(id: number, fechas: Partial<HistorialPedido>) {
    setLocalHistorial(prev => prev.map(p => p.id === id ? { ...p, ...fechas } : p));
  }

  // ────────────────────────── SERVER ACTIONS CASOS REPOSICIÓN
  async function handleCrearCaso(datos: Omit<CasoReposicion, "id" | "fecha">) {
    // Optimistic create (fake ID and date)
    const fakeId = Date.now();
    const fakeDate = new Date().toISOString();
    setLocalCasos(prev => [{ ...datos, id: fakeId, fecha: fakeDate }, ...prev]);
    const { error } = await crearCasoReposicion(datos);
    if (error) {
       alert(error);
       setLocalCasos(casosReposicion); // Revert
    }
  }

  async function handleEditarCaso(id: number, datos: Partial<Omit<CasoReposicion, "id" | "fecha">>) {
    setLocalCasos(prev => prev.map(c => c.id === id ? { ...c, ...datos } : c));
    const { error } = await editarCasoReposicion(id, datos);
    if (error) {
       alert(error);
       setLocalCasos(casosReposicion); // Revert
    }
  }

  async function handleEliminarCaso(id: number) {
    setLocalCasos(prev => prev.filter(c => c.id !== id));
    await eliminarCasoReposicion(id);
  }

  async function handleCrearTransferencia() {
    const fakeId = Date.now();
    const nueva = { id: fakeId, codigo_transferencia: "", orden_venta: "", factura: "", sucursal_destino: null, estado: "Pendiente" } as any;
    setLocalTransferencias(prev => [nueva, ...prev]);
    const { transferencia, error } = await crearTransferencia({ codigo_transferencia: "", orden_venta: "", factura: "" });
    if (error) {
      alert(error);
      setLocalTransferencias(prev => prev.filter(t => t.id !== fakeId));
    } else if (transferencia) {
      setLocalTransferencias(prev => prev.map(t => t.id === fakeId ? (transferencia as any) : t));
    }
  }

  function handleEliminarTransferencia(id: number) {
    setLocalHistorial(prev => prev.map(p => p.transferencia_id === id ? { ...p, transferencia_id: null } : p));
    setLocalTransferencias(prev => prev.filter(t => t.id !== id));
  }

  function handleEditarTransferencia(id: number, datos: Partial<Transferencia>) {
    setLocalTransferencias(prev => prev.map(t => t.id === id ? { ...t, ...datos } : t));
  }

  async function handleAsignarItems(pedidoIds: number[], transferenciaId: number): Promise<{ error: string | null }> {
    const snapshot = localHistorial;
    setLocalHistorial(prev => prev.map(p => pedidoIds.includes(p.id) ? { ...p, transferencia_id: transferenciaId } : p));
    const res = await asignarATransferencia(pedidoIds, transferenciaId);
    if (res.error) setLocalHistorial(snapshot);
    return res;
  }

  function handleRemoverItem(pedidoId: number) {
    setLocalHistorial(prev => prev.map(p => p.id === pedidoId ? { ...p, transferencia_id: null } : p));
  }

  async function handleAgregarRepuestoACaso(casoId: number, datos: any) {
    const { agregarRepuestoACaso } = await import("@/app/(dashboard)/inventario/historial-actions");
    const { pedido, error } = await agregarRepuestoACaso(casoId, datos);
    if (error) {
      alert(error);
    } else if (pedido) {
      setLocalHistorial(prev => [pedido, ...prev]);
    }
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
          historial={localHistorial}
          casosReposicion={localCasos}
          transferencias={localTransferencias}
          ciudadUsuario={ciudadUsuario}
          sucursales={sucursales}
          onActualizarEstado={handleActualizarEstado}
          onEditarPedido={(p) => setPedidoToEdit(p)}
          onCrearCasoReposicion={handleCrearCaso}
          onEditarCasoReposicion={handleEditarCaso}
          onEliminarCasoReposicion={handleEliminarCaso}
          onFechasUpdated={handleFechasUpdated}
          onCrearTransferencia={handleCrearTransferencia}
          onEliminarTransferencia={handleEliminarTransferencia}
          onEditarTransferencia={handleEditarTransferencia}
          onAsignarItems={handleAsignarItems}
          onRemoverItem={handleRemoverItem}
          onAgregarRepuestoACaso={handleAgregarRepuestoACaso}
          tiposEquipo={tiposEquipo}
          catalogo={catalogo}
        />
      ) : (
        <VistaTecnico
          historial={localHistorial}
          ciudadUsuario={ciudadUsuario}
          onActualizarEstadoTecnico={handleActualizarEstadoTecnico}
        />
      )}

      {pedidoToEdit && (
         <ModalEditarPedido
            pedido={pedidoToEdit}
            sucursales={sucursales}
            onClose={() => setPedidoToEdit(null)}
            onSave={handleSaveEdicion}
            onDelete={handleDelete}
         />
      )}
    </div>
  );
}
