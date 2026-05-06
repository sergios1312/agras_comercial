"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { eliminarCaso } from "@/app/(dashboard)/casos/casos-actions";
import { ModalDetalleCaso } from "./ModalDetalleCaso";
import { ModalCrearEditarCaso } from "./ModalCrearEditarCaso";

// ─── Tipo compartido ──────────────────────────────────────────
export interface CasoUI {
  id: number;
  numeracionCaso: string;
  estadoGeneral: string;
  descripcion: string;
  sucursal: string;
  sucursalId: number | null;
  cliente: string;
  equipo: string;
  garantia: string;
  estadoCaso: string;
  tipoTrabajo: string;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  periodoMensual: string | null;
  rtat: number | null;
  clasificacionSLA: "A TIEMPO" | "APLAZADO" | "ATRASADO" | null;
}

interface Sucursal {
  id: number;
  nombre_ciudad: string;
}

interface Props {
  casos: CasoUI[];
  sucursales: Sucursal[];
  isAdmin: boolean;
  userSucursal: string;
  userSucursalId?: number | null;
  userEmail: string;
}

// ─── Constantes ───────────────────────────────────────────────
const PAGE_SIZE = 25;

const SLA_BADGE: Record<string, string> = {
  "A TIEMPO": "bg-green-900/40 text-green-400 border-green-500/30",
  APLAZADO: "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
  ATRASADO: "bg-red-900/40 text-red-400 border-red-500/30",
};

const ESTADO_BADGE: Record<string, string> = {
  CERRADO: "bg-indigo-900/40 text-indigo-300 border-indigo-500/30",
  ABIERTO: "bg-amber-900/40 text-amber-300 border-amber-500/30",
};

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Componente Principal ─────────────────────────────────────
export function CasosClientWrapper({
  casos: casosIniciales,
  sucursales,
  isAdmin,
  userSucursal,
  userSucursalId,
  userEmail,
}: Props) {
  const router = useRouter();
  const [isPendingDelete, startDelete] = useTransition();

  // ── Estado de datos ──────────────────────────────────────────
  const [casos, setCasos] = useState<CasoUI[]>(casosIniciales);

  // ── Estado de filtros ────────────────────────────────────────
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ABIERTO" | "CERRADO">("TODOS");
  const [page, setPage] = useState(1);

  // ── Estado de modales ────────────────────────────────────────
  const [casoDetalle, setCasoDetalle] = useState<CasoUI | null>(null);
  const [casoEditar, setCasoEditar] = useState<CasoUI | null>(null);
  const [casoEliminar, setCasoEliminar] = useState<CasoUI | null>(null);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [elimError, setElimError] = useState("");

  // ── Filtrado ─────────────────────────────────────────────────
  const casosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return casos.filter((c) => {
      if (filtroEstado !== "TODOS" && c.estadoGeneral !== filtroEstado) return false;
      if (!q) return true;
      return (
        c.numeracionCaso.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        c.equipo.toLowerCase().includes(q) ||
        c.sucursal.toLowerCase().includes(q) ||
        c.estadoCaso.toLowerCase().includes(q)
      );
    });
  }, [casos, busqueda, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(casosFiltrados.length / PAGE_SIZE));
  const casosPagina = casosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Resetear página al cambiar filtros
  const handleBusqueda = (v: string) => {
    setBusqueda(v);
    setPage(1);
  };
  const handleFiltroEstado = (v: "TODOS" | "ABIERTO" | "CERRADO") => {
    setFiltroEstado(v);
    setPage(1);
  };

  // ── Handlers CRUD ────────────────────────────────────────────

  const handleCrearSuccess = (nuevoCaso: CasoUI) => {
    setCasos((prev) => [nuevoCaso, ...prev]);
    setMostrarCrear(false);
  };

  const handleEditarSuccess = (casoActualizado: CasoUI) => {
    setCasos((prev) =>
      prev.map((c) => (c.id === casoActualizado.id ? casoActualizado : c))
    );
    // Actualizar también si está abierto en detalle
    if (casoDetalle?.id === casoActualizado.id) setCasoDetalle(casoActualizado);
    setCasoEditar(null);
  };

  const handleEliminar = () => {
    if (!casoEliminar) return;
    setElimError("");
    startDelete(async () => {
      const res = await eliminarCaso(casoEliminar.id);
      if (res.error) {
        setElimError(res.error);
        return;
      }
      setCasos((prev) => prev.filter((c) => c.id !== casoEliminar.id));
      if (casoDetalle?.id === casoEliminar.id) setCasoDetalle(null);
      setCasoEliminar(null);
      router.refresh();
    });
  };

  const handleIngresado = (casoId: number, fechaIngreso: string) => {
    setCasos((prev) =>
      prev.map((c) => (c.id === casoId ? { ...c, fechaIngreso } : c))
    );
    if (casoDetalle?.id === casoId) {
      setCasoDetalle((prev) => prev ? { ...prev, fechaIngreso } : prev);
    }
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por caso, cliente, equipo..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {busqueda && (
            <button
              onClick={() => handleBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de estado */}
        <div className="flex gap-1">
          {(["TODOS", "ABIERTO", "CERRADO"] as const).map((e) => (
            <button
              key={e}
              onClick={() => handleFiltroEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filtroEstado === e
                  ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Contador */}
        <span className="text-xs text-slate-500">
          {casosFiltrados.length} caso(s)
        </span>

        {/* Botón nuevo caso */}
        <button
          onClick={() => setMostrarCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Caso
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">N°</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Estado</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Sucursal</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Equipo</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Tipo Trabajo</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Ingreso</th>
                <th className="text-left px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Salida</th>
                <th className="text-center px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">SLA</th>
                <th className="text-center px-3 py-3 text-slate-400 font-semibold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {casosPagina.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-600 text-sm">
                    {busqueda || filtroEstado !== "TODOS"
                      ? "Sin resultados para los filtros seleccionados."
                      : "No hay casos registrados."}
                  </td>
                </tr>
              ) : (
                casosPagina.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => setCasoDetalle(c)}
                  >
                    <td className="px-3 py-2.5 text-slate-400 font-mono">{c.numeracionCaso}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          ESTADO_BADGE[c.estadoGeneral] ?? "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {c.estadoGeneral}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-[120px] truncate">{c.sucursal}</td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[160px] truncate">{c.cliente || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[140px] truncate">{c.equipo || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[160px] truncate">{c.tipoTrabajo === "SIN TIPO" ? "—" : c.tipoTrabajo}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">{formatFecha(c.fechaIngreso)}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">{formatFecha(c.fechaSalida)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {c.clasificacionSLA ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SLA_BADGE[c.clasificacionSLA]}`}>
                          {c.clasificacionSLA}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Ver detalle"
                          onClick={() => setCasoDetalle(c)}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Editar"
                          onClick={() => setCasoEditar(c)}
                          className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            title="Eliminar"
                            onClick={() => { setCasoEliminar(c); setElimError(""); }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages} · {casosFiltrados.length} casos
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Vista Detallada */}
      {casoDetalle && (
        <ModalDetalleCaso
          caso={casoDetalle}
          userEmail={userEmail}
          onClose={() => setCasoDetalle(null)}
          onIngresado={handleIngresado}
        />
      )}

      {/* Modal: Crear */}
      {mostrarCrear && (
        <ModalCrearEditarCaso
          modo="crear"
          sucursales={sucursales}
          isAdmin={isAdmin}
          userSucursalId={userSucursalId}
          onClose={() => setMostrarCrear(false)}
          onSuccess={handleCrearSuccess}
        />
      )}

      {/* Modal: Editar */}
      {casoEditar && (
        <ModalCrearEditarCaso
          modo="editar"
          caso={casoEditar}
          sucursales={sucursales}
          isAdmin={isAdmin}
          userSucursalId={userSucursalId}
          onClose={() => setCasoEditar(null)}
          onSuccess={handleEditarSuccess}
        />
      )}

      {/* Confirmación: Eliminar */}
      {casoEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-900/30 border border-red-700/50">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Eliminar Caso</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              ¿Confirmas que deseas eliminar el caso{" "}
              <span className="font-mono text-red-400 font-bold">{casoEliminar.numeracionCaso}</span>?
            </p>
            {elimError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-2 rounded-lg">
                {elimError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setCasoEliminar(null); setElimError(""); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={isPendingDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isPendingDelete ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isPendingDelete ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
