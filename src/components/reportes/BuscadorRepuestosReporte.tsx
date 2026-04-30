import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import type { Repuesto } from "@/types/database.types";
import { buscarRepuestos } from "@/lib/search";

interface BuscadorRepuestosReporteProps {
  catalogo: Repuesto[];
  onAdd: (repuesto: Repuesto) => void;
  disabled?: boolean;
}

export function BuscadorRepuestosReporte({ catalogo, onAdd, disabled }: BuscadorRepuestosReporteProps) {
  const [query, setQuery] = useState("");

  const resultados = useMemo(() => {
    if (!query.trim()) return catalogo.slice(0, 5); // Mostrar 5 por defecto si está vacío
    const results = buscarRepuestos(catalogo as any, query);
    return results.slice(0, 10);
  }, [query, catalogo]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar repuesto por código, nombre, SAP..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={disabled}
        />
      </div>

      <div className="max-h-[240px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/50">
        {resultados.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No se encontraron repuestos.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-slate-400 sticky top-0">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2 text-right">P. Venta</th>
                <th className="px-3 py-2 text-center w-12">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {resultados.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-3 py-2 font-mono text-indigo-400">{r.codigo}</td>
                  <td className="px-3 py-2 text-slate-300 line-clamp-1" title={r.nombre}>{r.nombre}</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-medium">
                    {r.precio_venta != null ? `S/ ${r.precio_venta.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onAdd(r)}
                      disabled={disabled || r.precio_venta == null}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors inline-flex items-center justify-center"
                      title={r.precio_venta == null ? "No tiene precio" : "Añadir"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
