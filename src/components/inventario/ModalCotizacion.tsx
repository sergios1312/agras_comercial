"use client";

import { useState, useMemo } from "react";
import {
  X,
  FileText,
  AlertTriangle,
  User,
  Phone,
  Mail,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import type { ItemCarrito, RepuestoConStock } from "@/types/database.types";
import {
  generarCotizacionPDF,
  calcularTotalesCotizacion,
  type ItemCotizacionPDF,
} from "@/lib/pdf/generar-cotizacion-pdf";
import { formatCurrency } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────
interface ModalCotizacionProps {
  carrito: ItemCarrito[];
  catalogo: RepuestoConStock[];
  onClose: () => void;
}

// ─── Estado interno de cada fila ─────────────────────────────
interface FilaCotizacion {
  carritoId: string;
  repuesto_id: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  stock_disponible: number;
  precio_unitario: number;
  descuento_individual: number; // 0-100
}

// ─── Helpers ─────────────────────────────────────────────────
function InputField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-slate-100
          focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors
          placeholder:text-slate-600
          ${error ? "border-red-500/60" : "border-slate-700 hover:border-slate-600"}`}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function ModalCotizacion({
  carrito,
  catalogo,
  onClose,
}: ModalCotizacionProps) {
  // Inicializar filas a partir del carrito + datos del catálogo
  const [filas, setFilas] = useState<FilaCotizacion[]>(() =>
    carrito.map((item) => {
      const ref = catalogo.find((r) => r.id === item.repuesto_id);
      return {
        carritoId: item.id,
        repuesto_id: item.repuesto_id,
        codigo: item.codigo,
        nombre: item.nombre,
        cantidad: item.cantidad,
        stock_disponible: item.stock_disponible,
        precio_unitario: ref?.precio_venta ?? 0,
        descuento_individual: 0,
      };
    })
  );

  const [descuentoTotal, setDescuentoTotal] = useState(0);

  // ── Datos del cliente ─────────────────────────────────────
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [generado, setGenerado] = useState(false);

  // ── Cálculos en tiempo real ───────────────────────────────
  const itemsParaPDF = useMemo<ItemCotizacionPDF[]>(
    () =>
      filas.map((f) => ({
        codigo: f.codigo,
        nombre: f.nombre,
        cantidad: f.cantidad,
        precio_unitario: f.precio_unitario,
        descuento_individual: f.descuento_individual,
      })),
    [filas]
  );

  const totales = useMemo(
    () => calcularTotalesCotizacion(itemsParaPDF, descuentoTotal),
    [itemsParaPDF, descuentoTotal]
  );

  // ── Mutadores de filas ────────────────────────────────────
  function setCantidad(carritoId: string, val: number) {
    setFilas((prev) =>
      prev.map((f) =>
        f.carritoId === carritoId
          ? { ...f, cantidad: Math.max(1, val) }
          : f
      )
    );
  }

  function setDescuentoInd(carritoId: string, val: number) {
    const clamped = Math.min(100, Math.max(0, val));
    setFilas((prev) =>
      prev.map((f) =>
        f.carritoId === carritoId
          ? { ...f, descuento_individual: clamped }
          : f
      )
    );
  }

  // ── Validación y generación ───────────────────────────────
  function validar(): boolean {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = "Campo obligatorio";
    if (!dni.trim()) errs.dni = "Campo obligatorio";
    if (!telefono.trim()) errs.telefono = "Campo obligatorio";
    if (!email.trim()) errs.email = "Campo obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Correo inválido";
    setErrores(errs);
    return Object.keys(errs).length === 0;
  }

  function handleGenerar() {
    if (!validar()) return;
    generarCotizacionPDF({
      items: itemsParaPDF,
      descuento_total: descuentoTotal,
      cliente: { nombre, dni, telefono, email },
    });
    setGenerado(true);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* ── Cabecera ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cotización de Repuestos</h2>
              <p className="text-xs text-slate-500">
                {filas.length} repuesto(s) · Ajusta cantidades y descuentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Tabla de repuestos ── */}
          <div className="rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-28">Código</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Nombre</th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-20">Cant.</th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-16">Stock</th>
                    <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-28">P. Unit.</th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-24">
                      <span className="flex items-center justify-center gap-1">
                        Dto. Ind. <ChevronDown className="w-3 h-3 opacity-60" />
                      </span>
                    </th>
                    <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-300 uppercase tracking-widest w-28">Sub-precio</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, idx) => {
                    const subBruto = fila.precio_unitario * fila.cantidad;
                    const subNeto = subBruto * (1 - fila.descuento_individual / 100);
                    const stockInsuficiente = fila.cantidad > fila.stock_disponible;
                    const sinPrecio = fila.precio_unitario === 0;

                    return (
                      <tr
                        key={fila.carritoId}
                        className={`border-b border-slate-800 transition-colors ${
                          idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"
                        }`}
                      >
                        {/* Código */}
                        <td className="px-3 py-3 font-mono text-indigo-400 text-[11px] whitespace-nowrap">
                          {fila.codigo}
                        </td>

                        {/* Nombre */}
                        <td className="px-3 py-3 text-slate-200">
                          <p className="text-[11px] truncate max-w-[200px]" title={fila.nombre}>
                            {fila.nombre}
                          </p>
                          {stockInsuficiente && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              La cantidad que estás cotizando no es suficiente
                            </span>
                          )}
                          {sinPrecio && (
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Sin precio registrado
                            </span>
                          )}
                        </td>

                        {/* Cantidad */}
                        <td className="px-2 py-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={fila.cantidad}
                            onChange={(e) =>
                              setCantidad(fila.carritoId, Number(e.target.value))
                            }
                            className="w-16 text-center px-1 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Stock */}
                        <td className="px-2 py-3 text-center">
                          <span
                            className={`text-[11px] font-semibold ${
                              fila.stock_disponible > 0
                                ? "text-green-400"
                                : "text-slate-600"
                            }`}
                          >
                            {fila.stock_disponible}
                          </span>
                        </td>

                        {/* Precio unitario */}
                        <td className="px-3 py-3 text-right text-slate-300 text-[11px] font-medium whitespace-nowrap">
                          {fila.precio_unitario > 0
                            ? formatCurrency(fila.precio_unitario)
                            : <span className="text-slate-600">—</span>}
                        </td>

                        {/* Descuento individual */}
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={fila.descuento_individual}
                              onChange={(e) =>
                                setDescuentoInd(
                                  fila.carritoId,
                                  Number(e.target.value)
                                )
                              }
                              className="w-14 text-center px-1 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-xs">%</span>
                          </div>
                        </td>

                        {/* Sub-precio */}
                        <td className="px-3 py-3 text-right">
                          <div>
                            <span className="text-[11px] font-bold text-slate-200 whitespace-nowrap">
                              {fila.precio_unitario > 0
                                ? formatCurrency(subNeto)
                                : <span className="text-slate-600">—</span>}
                            </span>
                            {fila.descuento_individual > 0 && fila.precio_unitario > 0 && (
                              <p className="text-[10px] text-slate-500 line-through">
                                {formatCurrency(subBruto)}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Fila de totales ── */}
            <div className="bg-slate-800/60 border-t border-slate-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Descuento global */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Descuento Total:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoTotal}
                    onChange={(e) =>
                      setDescuentoTotal(
                        Math.min(100, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="w-16 text-center px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-400 text-sm font-bold">%</span>
                </div>
              </div>

              {/* Resumen de totales */}
              <div className="flex flex-col items-end gap-0.5 min-w-[200px]">
                <div className="flex justify-between w-full text-xs text-slate-400">
                  <span>Subtotal bruto:</span>
                  <span>{formatCurrency(totales.subtotalBruto)}</span>
                </div>
                {(descuentoTotal > 0 ||
                  filas.some((f) => f.descuento_individual > 0)) && (
                  <div className="flex justify-between w-full text-xs text-slate-400">
                    <span>Con descuentos ind.:</span>
                    <span>
                      {formatCurrency(
                        totales.subtotalConDescuentosIndividuales
                      )}
                    </span>
                  </div>
                )}
                {descuentoTotal > 0 && (
                  <div className="flex justify-between w-full text-xs text-red-400">
                    <span>Dto. total ({descuentoTotal}%):</span>
                    <span>- {formatCurrency(totales.descuentoGlobal)}</span>
                  </div>
                )}
                <div className="flex justify-between w-full text-sm font-bold text-emerald-400 pt-1 border-t border-slate-700 mt-0.5">
                  <span>PRECIO TOTAL:</span>
                  <span>{formatCurrency(totales.totalFinal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Formulario del cliente ── */}
          <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Datos del Cliente
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Nombre del cliente"
                icon={User}
                value={nombre}
                onChange={setNombre}
                placeholder="Ej. Juan Pérez"
                required
                error={errores.nombre}
              />
              <InputField
                label="DNI"
                icon={CreditCard}
                value={dni}
                onChange={setDni}
                placeholder="Ej. 12345678"
                required
                error={errores.dni}
              />
              <InputField
                label="Teléfono"
                icon={Phone}
                type="tel"
                value={telefono}
                onChange={setTelefono}
                placeholder="Ej. 987654321"
                required
                error={errores.telefono}
              />
              <InputField
                label="Correo electrónico"
                icon={Mail}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Ej. cliente@email.com"
                required
                error={errores.email}
              />
            </div>
          </div>

          {/* ── Feedback de generación ── */}
          {generado && (
            <div className="flex items-center gap-3 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300 font-medium">
                ¡PDF generado y descargado correctamente!
              </p>
            </div>
          )}
        </div>

        {/* ── Footer fijo ── */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 shrink-0 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Los campos marcados con <span className="text-red-400 font-bold">*</span> son obligatorios para generar el PDF.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleGenerar}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20"
            >
              <FileText className="w-4 h-4" />
              Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
