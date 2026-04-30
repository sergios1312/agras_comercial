import { useState, useTransition } from "react";
import { Loader2, Trash2, Save, FileDown } from "lucide-react";
import type { Repuesto, TipoDocumentoReporte } from "@/types/database.types";
import { BuscadorRepuestosReporte } from "./BuscadorRepuestosReporte";
import { crearDocumentoReporte } from "@/app/(dashboard)/reportes/actions";
import { generarPDFReporte } from "@/lib/pdf/generar-pdf";

interface Cliente {
  id_cliente: string;
  nombre_razon_social: string;
}

interface DocumentoFormProps {
  tipoDocumento: TipoDocumentoReporte;
  isAdmin: boolean;
  userEmail: string;
  catalogo: Repuesto[];
  clientes: Cliente[];
}

interface RepuestoSeleccionado extends Repuesto {
  cantidad: number;
}

export function DocumentoForm({ tipoDocumento, isAdmin, userEmail, catalogo, clientes }: DocumentoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [repuestosSel, setRepuestosSel] = useState<RepuestoSeleccionado[]>([]);
  const [nombreCliente, setNombreCliente] = useState("");
  const [dniCliente, setDniCliente] = useState("");
  const [numeroCaso, setNumeroCaso] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAddRepuesto = (r: Repuesto) => {
    if (repuestosSel.find(x => x.id === r.id)) {
      setRepuestosSel(prev => prev.map(x => x.id === r.id ? { ...x, cantidad: x.cantidad + 1 } : x));
    } else {
      setRepuestosSel(prev => [...prev, { ...r, cantidad: 1 }]);
    }
  };

  const updateCantidad = (id: number, cant: number) => {
    if (cant < 1) return;
    setRepuestosSel(prev => prev.map(x => x.id === id ? { ...x, cantidad: cant } : x));
  };

  const removeRepuesto = (id: number) => {
    setRepuestosSel(prev => prev.filter(x => x.id !== id));
  };

  const total = repuestosSel.reduce((acc, curr) => acc + (curr.precio_venta || 0) * curr.cantidad, 0);
  const base = total / 1.18;
  const igv = total - base;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (repuestosSel.length === 0) {
      setErrorMsg("Debe agregar al menos un repuesto.");
      return;
    }

    startTransition(async () => {
      const res = await crearDocumentoReporte({
        tipo_documento: tipoDocumento,
        nombre_cliente: nombreCliente,
        dni_cliente: dniCliente,
        numero_caso: numeroCaso,
        descripcion_trabajo: descripcion,
        repuestos: repuestosSel.map(r => ({
          id: r.id,
          cantidad: r.cantidad,
          precio_unitario: r.precio_venta || 0
        }))
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.success) {
        setSuccessMsg(`Documento ${res.codigo} creado.`);
        
        // Generar PDF
        generarPDFReporte({
          tipoDocumento,
          codigo: res.codigo!,
          usuario: userEmail,
          fecha: new Date().toLocaleDateString(),
          cliente: nombreCliente,
          dni: dniCliente,
          caso: numeroCaso,
          descripcion: descripcion,
          repuestos: repuestosSel,
          totales: { base, igv, total }
        });

        // Limpiar formulario
        setRepuestosSel([]);
        setNombreCliente("");
        setDniCliente("");
        setNumeroCaso("");
        setDescripcion("");
      }
    });
  };

  const isVenta = tipoDocumento === "cotizacion_venta";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">
          {isVenta ? "Nueva Cotización de Venta" : tipoDocumento === "cotizacion_reparacion" ? "Nueva Cotización de Reparación" : "Nuevo Reporte de Salida"}
        </h2>
        <p className="text-xs text-slate-400">
          Emisor: <span className="font-medium text-slate-300">{userEmail}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campos Dinámicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isVenta ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre del Cliente (Opcional)</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="Ej. Juan Pérez"
                  list="clientes-list"
                />
                <datalist id="clientes-list">
                  {clientes.map(c => <option key={c.id_cliente} value={c.nombre_razon_social} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">DNI / RUC (Opcional)</label>
                <input
                  type="text"
                  value={dniCliente}
                  onChange={e => setDniCliente(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="Ej. 12345678"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Número de Caso <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={numeroCaso}
                  onChange={e => setNumeroCaso(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="Ej. CAS-001"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Descripción del trabajo</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  disabled={!isAdmin}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="Detalles del trabajo realizado..."
                />
              </div>
            </>
          )}
        </div>

        <hr className="border-slate-800" />

        {/* Buscador de Repuestos */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Agregar Repuestos
          </label>
          <BuscadorRepuestosReporte catalogo={catalogo} onAdd={handleAddRepuesto} disabled={!isAdmin} />
        </div>

        {/* Tabla de Seleccionados */}
        {repuestosSel.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Repuesto</th>
                  <th className="px-3 py-2 text-center w-16">Cant.</th>
                  <th className="px-3 py-2 text-right">P. Unit</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {repuestosSel.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-slate-300">
                      <p className="font-mono text-indigo-400">{r.codigo}</p>
                      <p className="line-clamp-1">{r.nombre}</p>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={r.cantidad}
                        onChange={(e) => updateCantidad(r.id, parseInt(e.target.value) || 1)}
                        disabled={!isAdmin}
                        className="w-12 text-center bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-200"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      {(r.precio_venta || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-200">
                      {((r.precio_venta || 0) * r.cantidad).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRepuesto(r.id)}
                        disabled={!isAdmin}
                        className="text-slate-500 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totales */}
            <div className="bg-slate-800/50 p-4 border-t border-slate-800 flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Base:</span>
                  <span>S/ {base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>IGV (18%):</span>
                  <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-100 text-base pt-1 border-t border-slate-700">
                  <span>Total:</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensajes */}
        {errorMsg && <p className="text-sm text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-900/50">{errorMsg}</p>}
        {successMsg && <p className="text-sm text-green-400 bg-green-950/40 p-3 rounded-lg border border-green-900/50 flex items-center gap-2"><FileDown className="w-4 h-4"/> {successMsg}</p>}

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending || repuestosSel.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? "Guardando..." : "Confirmar y Generar PDF"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
