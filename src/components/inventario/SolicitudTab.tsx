"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, ShoppingCart, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { esNumeroCasoValido } from "@/lib/utils";
import { submitPedido, type PedidoState } from "@/app/(dashboard)/inventario/actions";
import type { RepuestoConStock, ItemCarrito } from "@/types/database.types";

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
  catalogo, sucursales, sucursalOrigen, isAdmin, carritoProps
}: SolicitudTabProps) {
  const [state, formAction] = useActionState(submitPedido, initialState);
  const { carrito, setCarrito, clearCarrito } = carritoProps;

  // Derivamos si la solicitud entera es "Sin stock" basado en las sedes elegidas
  const isAnySinStock = carrito.some(i => i.sucursal_destino === "SIN_STOCK");
  const tipoSolicitud = isAnySinStock ? "Solicitud/Reserva sin stock" : "Consumo normal";

  useEffect(() => {
    if (state.success) clearCarrito();
  }, [state.success, clearCarrito]);

  function eliminarDelCarrito(id: string) {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  }

  function actualizarItem(id: string, campo: keyof ItemCarrito, valor: unknown) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };
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
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />
          <input type="hidden" name="tipo_solicitud" value={tipoSolicitud} />

          <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
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
                    {isAdmin && (
                      <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-12 border-l border-slate-700/50">Venta</th>
                    )}
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
                        <td className="px-3 py-3 font-mono text-indigo-400 text-[11px] min-w-[100px] whitespace-nowrap">{item.codigo}</td>
                        <td className="px-3 py-3 text-slate-200">
                          <p className="text-[11px] truncate max-w-[160px]" title={item.nombre}>{item.nombre}</p>
                          {!isValidDestination && <span className="text-[9px] text-red-500 mt-1 block">Selecciona origen</span>}
                          {item.sucursal_destino && item.sucursal_destino !== "SIN_STOCK" && !stockSuficiente && (
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
                        {isAdmin && (
                          <td className="px-2 py-2 text-center border-l border-slate-700/50">
                            <input
                              type="checkbox"
                              checked={item.es_venta}
                              onChange={(e) => actualizarItem(item.id, "es_venta", e.target.checked)}
                              className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                            />
                          </td>
                        )}
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
            <p className="text-sm font-medium text-slate-400">{carrito.length} repuesto(s) listos para solicitar</p>
            <SubmitBtn />
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
