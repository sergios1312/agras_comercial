"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, ShoppingCart, Loader2, AlertCircle, CheckCircle2, Ban, Eraser } from "lucide-react";
import { esNumeroCasoValido } from "@/lib/utils";
import { submitPedido, type PedidoState } from "@/app/(dashboard)/inventario/actions";
import type { RepuestoConStock, ItemCarrito, ConfigPedidos } from "@/types/database.types";
import { calcularTipoReporte } from "@/lib/transferencias";

const LIMA_KEY = "lima"; // fragmento que debe estar en la sede Lima
const SUBMIT_KEY = "pedido_enviando"; // flag anti-duplicación en sessionStorage

interface SolicitudTabProps {
  catalogo: RepuestoConStock[];
  sucursales: string[];
  sucursalOrigen: string;
  isAdmin: boolean;
  carritoProps: {
    carrito: ItemCarrito[];
    setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>>;
    clearCarrito: () => void;
  };
  configPedidos: ConfigPedidos;
}

function SubmitBtn({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const blocked = pending || isSubmitting;
  return (
    <button
      type="submit"
      disabled={blocked}
      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500
                 text-white text-sm font-semibold rounded-xl transition-all duration-200
                 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
    >
      {blocked ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
      {blocked ? "Enviando..." : "🚀 Solicitar pedido"}
    </button>
  );
}

const initialState: PedidoState = { error: null, success: null };

export function SolicitudTab({
  catalogo, sucursales, sucursalOrigen, isAdmin, carritoProps, configPedidos
}: SolicitudTabProps) {
  const [state, formAction] = useActionState(submitPedido, initialState);
  const [sedeDestino, setSedeDestino] = useState(isAdmin ? "" : sucursalOrigen);
  const { carrito, setCarrito, clearCarrito } = carritoProps;

  // ── Anti-duplicación: persiste el estado "enviando" en sessionStorage ──
  // Así el botón queda bloqueado aunque el usuario cambie de pestaña y el
  // componente se desmonte/remonte antes de que el servidor responda.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SUBMIT_KEY) === "1"; } catch { return false; }
  });

  function handleSubmit() {
    setIsSubmitting(true);
    try { sessionStorage.setItem(SUBMIT_KEY, "1"); } catch { /* noop */ }
  }

  // Derivamos si la solicitud entera es "Sin stock" basado en las sedes elegidas
  const isAnySinStock = carrito.some(i => i.sucursal_destino === "SIN_STOCK");
  const tipoSolicitud = isAnySinStock ? "Solicitud/Reserva sin stock" : "Consumo normal";

  // ── Detección de tipo de pedido bloqueado (solo usuarios no-admin) ──
  function getMensajeBloqueo(): string | null {
    if (isAdmin) return null; // Los admins no están sujetos a estas restricciones
    for (const item of carrito) {
      const tipo = calcularTipoReporte(item.sucursal_destino);
      if (tipo === "Abastecimiento" && !configPedidos.abastecimiento) {
        return "No está permitido realizar pedidos de Abastecimiento por el momento.";
      }
      if (tipo === "Envío Interno" && !configPedidos.internos) {
        return "No está permitido realizar Pedidos Internos (entre sucursales) por el momento.";
      }
      if (tipo === "Reposición" && !configPedidos.reposicion) {
        return "No está permitido realizar Reposiciones (sin stock) por el momento.";
      }
    }
    return null;
  }

  const mensajeBloqueo = getMensajeBloqueo();

  useEffect(() => {
    if (state.success || state.error) {
      // La acción del servidor terminó (éxito o error) → liberar bloqueo
      setIsSubmitting(false);
      try { sessionStorage.removeItem(SUBMIT_KEY); } catch { /* noop */ }
      if (state.success) clearCarrito();
    }
  }, [state.success, state.error, clearCarrito]);

  function eliminarDelCarrito(id: string) {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  }

  function actualizarItem(id: string, campo: keyof ItemCarrito, valor: unknown) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };

        if (campo === "es_venta" && valor === true) {
          // Al marcar como venta, seleccionar automáticamente la primera sede que contenga "lima"
          const sedeOrigen = sucursales.find(s => s.toLowerCase().includes(LIMA_KEY));
          if (sedeOrigen) {
            updated.sucursal_destino = sedeOrigen;
            const repuesto = catalogo.find((r) => r.id === item.repuesto_id);
            updated.stock_disponible = repuesto?.stock_por_sucursal[sedeOrigen] ?? 0;
          }
        }

        if (campo === "sucursal_destino") {
          if (valor === "SIN_STOCK") {
             updated.stock_disponible = 0;
          } else {
             const repuesto = catalogo.find((r) => r.id === item.repuesto_id);
             updated.stock_disponible = repuesto?.stock_por_sucursal[valor as string] ?? 0;
          }
        }
        return updated;
      })
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Carrito */}
      {carrito.length > 0 && (
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />
          <input type="hidden" name="tipo_solicitud" value={tipoSolicitud} />
          <input type="hidden" name="sede_destino" value={sedeDestino || sucursalOrigen} />

          {/* Selector de Sede de Destino */}
          <div className="bg-slate-900/50 border border-slate-700/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Sede de destino del pedido:
              </label>
              {isAdmin ? (
                <select
                  value={sedeDestino}
                  onChange={(e) => setSedeDestino(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccione una sede...</option>
                  {sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full sm:w-64 px-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-300 cursor-not-allowed">
                  {sucursalOrigen}
                </div>
              )}
            </div>
            {isAdmin && !sedeDestino && (
              <p className="text-xs text-amber-500 font-medium">Por favor, selecciona una sede para continuar.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
                    <th className="text-center px-1.5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-12 border-r border-slate-700/50" title="Venta">V</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest min-w-[100px]">Código</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest min-w-[150px]">Nombre</th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-16">N° Caso</th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-16">Cant.</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest min-w-[140px]">Solicitar a Sede</th>
                    <th className="text-right px-2 py-3 text-[11px] font-bold text-slate-300 uppercase tracking-widest w-10 border-l border-slate-700/50">Total</th>
                    {sucursales.map((s) => (
                      <th key={s} title={s} className="text-right px-1.5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[48px] max-w-[48px] truncate">
                        {s}
                      </th>
                    ))}
                    <th className="text-center px-2 py-3 text-slate-400 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((item, index) => {
                    // Calculo de total de stocks del item actual referenciando catalogo
                    const refRepuesto = catalogo.find(r => r.id === item.repuesto_id);
                    const stocks = refRepuesto?.stock_por_sucursal ?? {};
                    const totalStocks = Object.values(stocks).reduce((a, b) => a + (b ?? 0), 0);
                    
                    const isValidDestination = item.sucursal_destino === "SIN_STOCK" || (item.sucursal_destino && item.sucursal_destino !== "");
                    const isSinStock = item.sucursal_destino === "SIN_STOCK";
                    const casoValido = item.es_venta || isSinStock || esNumeroCasoValido(item.numero_caso);
                    const stockSuficiente = isSinStock || item.es_venta || item.stock_disponible >= item.cantidad;

                    return (
                      <tr key={item.id} className={`border-b border-slate-800 transition-colors ${index % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                        <td className="px-2 py-2 text-center border-r border-slate-700/50">
                            <input
                              type="checkbox"
                              checked={item.es_venta}
                              onChange={(e) => actualizarItem(item.id, "es_venta", e.target.checked)}
                              className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                          </td>
                        <td className="px-3 py-3 font-mono text-indigo-400 text-[11px] min-w-[100px] whitespace-nowrap">{item.codigo}</td>
                        <td className="px-3 py-3 text-slate-200">
                          <p className="text-[11px] truncate max-w-[160px]" title={item.nombre}>{item.nombre}</p>
                          {!isValidDestination && <span className="text-[9px] text-red-500 mt-1 block">Selecciona origen</span>}
                          {item.es_venta && item.sucursal_destino && !item.sucursal_destino.toLowerCase().includes(LIMA_KEY) && (
                            <span className="text-[9px] text-amber-400 mt-1 block">⚠ Origen debe ser Lima</span>
                          )}
                          {item.sucursal_destino && item.sucursal_destino !== "SIN_STOCK" && !item.es_venta && !stockSuficiente && (
                            <span className="text-[9px] text-red-400 mt-1 block">Stock Insuficiente (Hay: {item.stock_disponible})</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {!item.es_venta ? (
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="0000"
                              value={item.numero_caso}
                              onChange={(e) => actualizarItem(item.id, "numero_caso", e.target.value)}
                              className={`w-16 px-2 py-1.5 bg-slate-800 border rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center ${casoValido ? "border-slate-700" : "border-red-500/50"}`}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">VENTA</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => actualizarItem(item.id, "cantidad", Number(e.target.value))}
                            className="w-14 text-center px-1 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={item.sucursal_destino}
                            onChange={(e) => actualizarItem(item.id, "sucursal_destino", e.target.value)}
                            className={`w-full max-w-[130px] px-2 py-1.5 bg-slate-800 border ${isValidDestination ? "border-slate-700" : "border-amber-500/50"} rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          >
                            <option value="">Seleccionar Sede...</option>
                            <option value="SIN_STOCK">- Solicitar repuestos sin stock -</option>
                            <optgroup label="Sedes Disponibles">
                              {sucursales.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right border-l border-slate-700/50 font-bold text-[11px] text-slate-200">
                          {totalStocks}
                        </td>
                        {sucursales.map((s) => {
                          const stock = stocks[s] ?? 0;
                          return (
                            <td key={s} className="px-1.5 py-2 text-right w-[48px] max-w-[48px]">
                              <span className={`text-[11px] font-semibold ${stock > 0 ? "text-green-400" : "text-slate-600 opacity-40"}`}>{stock}</span>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => eliminarDelCarrito(item.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
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
          </div>

          {/* Banner de bloqueo por Admin */}
          {mensajeBloqueo && (
            <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-500/40 rounded-xl">
              <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-300 mb-0.5">Tipo de pedido inhabilitado</p>
                <p className="text-sm text-red-400">{mensajeBloqueo}</p>
              </div>
            </div>
          )}

          {/* Feedback del Server Action */}
          {state.error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 font-medium">{state.error}</p>
            </div>
          )}
          {state.success && (
            <div className="flex items-start gap-2 p-3 bg-green-900/30 border border-green-500/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-300 font-medium">{state.success}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-slate-400">{carrito.length} repuesto(s) listos para solicitar</p>
              <button
                type="button"
                onClick={clearCarrito}
                title="Vaciar todo el carrito"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                Vaciar carrito
              </button>
            </div>
            {mensajeBloqueo ? (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl cursor-not-allowed opacity-70">
                <Ban className="w-4 h-4" />
                Pedido bloqueado
              </div>
            ) : (
              <SubmitBtn isSubmitting={isSubmitting} />
            )}
          </div>
        </form>
      )}

      {carrito.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-slate-800/60 rounded-2xl bg-slate-900/30 shadow-inner">
          <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">Carrito de Solicitudes Vacío</h3>
          <p className="text-sm">Ve a la pestaña <b>Catálogo</b> y presiona el botón [+] para añadir repuestos a tu orden.</p>
        </div>
      )}
    </div>
  );
}
