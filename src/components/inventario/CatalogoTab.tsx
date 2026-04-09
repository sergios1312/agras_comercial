"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { Search, Package2 } from "lucide-react";
import { buscarRepuestos } from "@/lib/search";
import { formatCurrency } from "@/lib/utils";
import type { RepuestoConStock } from "@/types/database.types";

interface CatalogoTabProps {
  catalogo: RepuestoConStock[];
  sucursales: string[];
}

export function CatalogoTab({ catalogo, sucursales }: CatalogoTabProps) {
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

      {/* Conteo de resultados */}
      <p className="text-xs text-slate-500">
        {resultados.length} resultado(s){terminoActivo ? ` para "${terminoActivo}"` : ""}
      </p>

      {/* Tabla del catálogo */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">SAP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">Modelos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">Precio</th>
                {sucursales.map((s) => (
                  <th key={s} className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={5 + sucursales.length} className="text-center py-12 text-slate-500">
                    <Package2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No se encontraron repuestos.</p>
                  </td>
                </tr>
              ) : (
                resultados.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-800 transition-colors hover:bg-slate-800/50
                      ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}
                  >
                    <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{r.codigo}</td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs">
                      <div className="truncate">{r.nombre_traducido || r.nombre}</div>
                      {r.nombre_traducido && (
                        <div className="text-xs text-slate-500 truncate">{r.nombre}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{r.codigo_sap ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{r.modelos_compatibles ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs font-medium">
                      {r.precio_venta != null ? formatCurrency(r.precio_venta) : "—"}
                    </td>
                    {sucursales.map((s) => {
                      const stock = r.stock_por_sucursal[s] ?? 0;
                      return (
                        <td key={s} className="px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${stock > 0 ? "text-green-400" : "text-slate-600"}`}>
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
