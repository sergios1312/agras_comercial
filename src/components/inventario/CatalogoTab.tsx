"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { Search, Package2, Download } from "lucide-react";
import { buscarRepuestos } from "@/lib/search";
import { formatCurrency } from "@/lib/utils";
import type { RepuestoConStock } from "@/types/database.types";
import config from "@/data/config.json";

interface CatalogoTabProps {
  catalogo: RepuestoConStock[];
  sucursales: string[];
  onAddCarrito?: (r: RepuestoConStock) => void;
}

export function CatalogoTab({ catalogo, sucursales, onAddCarrito }: CatalogoTabProps) {
  // terminoInput: lo que el usuario escribe en tiempo real
  const [terminoInput, setTerminoInput] = useState("");
  // terminoActivo: lo que se pasa al motor de búsqueda
  const [terminoActivo, setTerminoActivo] = useState("");
  const [_isPending, startTransition] = useTransition();

  /**
   * Regla de búsqueda reactiva:
   * - ≥ 3 caracteres → búsqueda automática mientras se escribe (live search)
   * - < 3 caracteres → se requiere presionar Enter para disparar la búsqueda
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;
      setTerminoInput(valor);

      if (valor.trim().length >= 3) {
        startTransition(() => setTerminoActivo(valor));
      } else if (valor.trim() === "") {
        // Al limpiar el campo completamente, restablecer resultados
        startTransition(() => setTerminoActivo(""));
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        // Enter siempre dispara la búsqueda, sin importar la longitud
        startTransition(() => setTerminoActivo(terminoInput));
      }
    },
    [terminoInput]
  );

  const resultados = useMemo(
    () => buscarRepuestos(catalogo, terminoActivo),
    [catalogo, terminoActivo]
  );

  const descargarCatalogoCSV = useCallback(() => {
    const headers = [
      "Código",
      "Nombre",
      "SAP",
      "Modelos",
      "Precio",
      "Total",
      ...sucursales
    ];

    const filas = resultados.map((r) => {
      const total = Object.values(r.stock_por_sucursal).reduce((acc, curr) => acc + (curr ?? 0), 0);
      return [
        r.codigo,
        `"${(r.nombre_traducido || r.nombre).replace(/"/g, '""')}"`,
        r.codigo_sap || "",
        `"${(r.modelos_compatibles || "").replace(/"/g, '""')}"`,
        r.precio_venta != null ? r.precio_venta.toString() : "",
        total.toString(),
        ...sucursales.map(s => (r.stock_por_sucursal[s] ?? 0).toString())
      ].join(",");
    });

    const csvContent = [headers.join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `importar_stock.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultados, sucursales]);

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por código, nombre, SAP o modelos compatibles..."
          value={terminoInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl
                     text-sm text-slate-100 placeholder:text-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     transition-all duration-200"
        />
        {/* Indicador: se muestra cuando el input tiene texto pero no ha disparado búsqueda automática */}
        {terminoInput.trim().length > 0 && terminoInput.trim().length < 3 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 select-none pointer-events-none">
            Presiona Enter ↵
          </span>
        )}
      </div>

      {/* Conteo de resultados y Fecha de actualización */}
      <div className="flex justify-between items-center text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <p>
            {resultados.length} resultado(s){terminoActivo ? ` para "${terminoActivo}"` : ""}
          </p>
          <button
            onClick={descargarCatalogoCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 
                       border border-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Importar stock
          </button>
        </div>
        {config.lastUpdated && (
          <p className="font-semibold text-indigo-400/80">
            Inventario actualizado el {config.lastUpdated}
          </p>
        )}
      </div>

      {/* Tabla del catálogo */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                {onAddCarrito && (
                  <th className="px-2 py-3 w-[36px] text-center"></th>
                )}
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-28">Código</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest min-w-[190px]">Nombre</th>
                <th className="text-left px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-16">SAP</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-36">Modelos</th>
                <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-20">Precio</th>
                <th className="text-right px-2 py-3 text-[11px] font-bold text-slate-300 uppercase tracking-widest w-12 border-l border-slate-700/50">Total</th>
                {sucursales.map((s) => (
                  <th key={s} title={s} className="text-right px-1.5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[50px] max-w-[50px] truncate">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={6 + sucursales.length} className="text-center py-12 text-slate-500">
                    <Package2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No se encontraron repuestos.</p>
                  </td>
                </tr>
              ) : (
                resultados.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-800 transition-colors hover:bg-slate-800/50 group
                      ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                  >
                    {onAddCarrito && (
                      <td className="px-1 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => onAddCarrito(r)}
                          title="Añadir a carrito"
                          className="w-7 h-7 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-md hover:bg-indigo-500 hover:text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-indigo-400 text-[11px] min-w-[112px] whitespace-nowrap">{r.codigo}</td>
                    <td className="px-3 py-2 text-slate-200 min-w-[190px] max-w-[220px]">
                      <div className="truncate text-[11px]">{r.nombre_traducido || r.nombre}</div>
                      {r.nombre_traducido && (
                        <div className="text-[10px] text-slate-500 truncate">{r.nombre}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-400 text-[10px] font-mono truncate max-w-[64px]" title={r.codigo_sap ?? ""}>{r.codigo_sap ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400 text-[11px] max-w-[144px]">
                      <div className="line-clamp-2 break-words" title={r.modelos_compatibles ?? ""}>
                        {r.modelos_compatibles ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 text-[11px] font-medium whitespace-nowrap">
                      {r.precio_venta != null ? formatCurrency(r.precio_venta) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right border-l border-slate-700/50">
                      <span className="text-[11px] font-bold text-slate-200">
                        {Object.values(r.stock_por_sucursal).reduce((acc, curr) => acc + (curr ?? 0), 0)}
                      </span>
                    </td>
                    {sucursales.map((s) => {
                      const stock = r.stock_por_sucursal[s] ?? 0;
                      return (
                        <td key={s} className="px-1.5 py-2 text-right w-[50px] max-w-[50px]">
                          <span className={`text-[11px] font-semibold ${stock > 0 ? "text-green-400" : "text-slate-600 opacity-40"}`}>
                            {stock}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
