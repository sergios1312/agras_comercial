"use client";

import { useState, useMemo, useActionState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import {
  Search, Plus, Trash2, ShoppingCart, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { buscarRepuestos } from "@/lib/search";
import { generarIdTemporal, esNumeroCasoValido } from "@/lib/utils";
import { submitPedido, type PedidoState } from "@/app/(dashboard)/inventario/actions";
import type { RepuestoConStock, ItemCarrito } from "@/types/database.types";

interface SolicitudTabProps {
  catalogo: RepuestoConStock[];
  sucursales: string[];
  sucursalOrigen: string;
  isAdmin: boolean;
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500
                 text-white text-sm font-semibold rounded-xl transition-all duration-200
                 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
      {pending ? "Enviando..." : "🚀 Solicitar pedido"}
    </button>
  );
}

const initialState: PedidoState = { error: null, success: null };

export function SolicitudTab({
  catalogo, sucursales, sucursalOrigen, isAdmin,
}: SolicitudTabProps) {
  const [state, formAction] = useActionState(submitPedido, initialState);
  // terminoInput: lo que el usuario escribe en tiempo real
  const [terminoInput, setTerminoInput] = useState("");
  // terminoActivo: lo que se pasa al motor de búsqueda
  const [terminoActivo, setTerminoActivo] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [tipoSolicitud, setTipoSolicitud] = useState<"Consumo normal" | "Solicitud/Reserva sin stock">("Consumo normal");
  const esSinStock = tipoSolicitud === "Solicitud/Reserva sin stock";

  const resultados = useMemo(() => buscarRepuestos(catalogo, terminoActivo), [catalogo, terminoActivo]);

  /**
   * Regla de búsqueda reactiva:
   * - ≥ 3 caracteres → búsqueda automática mientras se escribe (live search)
   * - < 3 caracteres → se requiere presionar Enter para disparar la búsqueda
   */
  const handleTerminoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;
      setTerminoInput(valor);
      if (valor.trim().length >= 3) {
        setTerminoActivo(valor);
      } else if (valor.trim() === "") {
        setTerminoActivo("");
      }
    },
    []
  );

  const handleTerminoKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setTerminoActivo(terminoInput);
      }
    },
    [terminoInput]
  );

  function toggleSeleccion(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function agregarAlCarrito() {
    const aAgregar = catalogo.filter((r) => seleccionados.has(r.id));
    const nuevos: ItemCarrito[] = aAgregar.map((r) => ({
      id: generarIdTemporal(),
      repuesto_id: r.id,
      codigo: r.codigo,
      nombre: r.nombre_traducido || r.nombre,
      nombre_traducido: r.nombre_traducido ?? "",
      cantidad: 1,
      numero_caso: "",
      sucursal_destino: "",
      es_venta: false,
      stock_disponible: 0,
      inv_ids: r.inv_ids,
    }));
    setCarrito((prev) => [...prev, ...nuevos]);
    setSeleccionados(new Set());
    setTerminoInput("");
    setTerminoActivo("");
  }

  function eliminarDelCarrito(id: string) {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  }

  function actualizarItem(id: string, campo: keyof ItemCarrito, valor: unknown) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };
        // Al cambiar sucursal_destino, actualizar el stock_disponible del ítem
        if (campo === "sucursal_destino") {
          const repuesto = catalogo.find((r) => r.id === item.repuesto_id);
          updated.stock_disponible = repuesto?.stock_por_sucursal[valor as string] ?? 0;
        }
        return updated;
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Tipo de solicitud */}
      <div className="flex gap-3">
        {(["Consumo normal", "Solicitud/Reserva sin stock"] as const).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setTipoSolicitud(tipo)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200
              ${tipoSolicitud === tipo
                ? tipo === "Consumo normal"
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-orange-500/15 border-orange-500/30 text-orange-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
          >
            {tipo === "Consumo normal" ? "✅ Consumo normal" : "⚠️ Sin stock"}
          </button>
        ))}
      </div>

      {esSinStock && (
        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300">Modo sin stock activado. No se descontará inventario. El pedido se registrará como <strong>Pendiente de abastecimiento</strong>.</p>
        </div>
      )}

      {/* Buscador de repuestos */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar repuesto para agregar..."
            value={terminoInput}
            onChange={handleTerminoChange}
            onKeyDown={handleTerminoKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl
                       text-sm text-slate-100 placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {/* Indicador: se muestra cuando el input tiene texto pero no dispara búsqueda automática */}
          {terminoInput.trim().length > 0 && terminoInput.trim().length < 3 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 select-none pointer-events-none">
              Presiona Enter ↵
            </span>
          )}
        </div>

        {/* Resultados seleccionables */}
        {terminoActivo && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 divide-y divide-slate-700">
            {resultados.slice(0, 20).map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/60 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.has(r.id)}
                  onChange={() => toggleSeleccion(r.id)}
                  className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{r.nombre_traducido || r.nombre}</p>
                  <p className="text-xs text-slate-500 font-mono">{r.codigo}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {seleccionados.size > 0 && (
          <button
            type="button"
            onClick={agregarAlCarrito}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30
                       border border-indigo-500/40 text-indigo-300 text-sm rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar {seleccionados.size} repuesto(s) al carrito
          </button>
        )}
      </div>

      {/* Carrito */}
      {carrito.length > 0 && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />
          <input type="hidden" name="tipo_solicitud" value={tipoSolicitud} />

          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-widest">Repuesto</th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest w-20">Cant.</th>
                  <th className="text-left px-3 py-3 text-xs text-slate-400 uppercase tracking-widest w-28">N° Caso</th>
                  <th className="text-left px-3 py-3 text-xs text-slate-400 uppercase tracking-widest">Sede destino</th>
                  {isAdmin && (
                    <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest w-20">Venta</th>
                  )}
                  <th className="text-center px-3 py-3 text-xs text-slate-400 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => {
                  const casoValido = item.es_venta || esSinStock || esNumeroCasoValido(item.numero_caso);
                  const stockSuficiente = esSinStock || item.es_venta || item.stock_disponible >= item.cantidad;
                  return (
                    <tr key={item.id} className="border-b border-slate-800 bg-slate-900">
                      <td className="px-4 py-3">
                        <p className="text-slate-200 text-sm truncate max-w-xs">{item.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.codigo}</p>
                        {!esSinStock && item.sucursal_destino && (
                          <p className={`text-xs mt-0.5 ${stockSuficiente ? "text-green-400" : "text-red-400"}`}>
                            Stock: {item.stock_disponible}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(item.id, "cantidad", Number(e.target.value))}
                          className="w-16 text-center px-2 py-1 bg-slate-800 border border-slate-700
                                     rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        {!item.es_venta ? (
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="0000"
                            value={item.numero_caso}
                            onChange={(e) => actualizarItem(item.id, "numero_caso", e.target.value)}
                            className={`w-24 px-2 py-1 bg-slate-800 border rounded-lg text-sm text-slate-100
                                        font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500
                                        ${casoValido ? "border-slate-700" : "border-red-500/50"}`}
                          />
                        ) : (
                          <span className="text-xs text-slate-500">VENTA</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={item.sucursal_destino}
                          onChange={(e) => actualizarItem(item.id, "sucursal_destino", e.target.value)}
                          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg
                                     text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Seleccionar...</option>
                          {sucursales.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.es_venta}
                            onChange={(e) => actualizarItem(item.id, "es_venta", e.target.checked)}
                            className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Feedback del Server Action */}
          {state.error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{state.error}</p>
            </div>
          )}
          {state.success && (
            <div className="flex items-start gap-2 p-3 bg-green-900/30 border border-green-500/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-300">{state.success}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{carrito.length} ítem(s) en el carrito</p>
            <SubmitBtn />
          </div>
        </form>
      )}

      {carrito.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">El carrito está vacío. Busca y selecciona repuestos arriba.</p>
        </div>
      )}
    </div>
  );
}
