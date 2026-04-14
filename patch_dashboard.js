const fs = require('fs');
const file = 'src/components/estadisticas/EstadisticasDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update states
content = content.replace(
  'const [periodoFiltro, setPeriodoFiltro] = useState<string>("");',
  'const [periodoFiltro, setPeriodoFiltro] = useState<string[]>([]);\n  const [ingresoFiltro, setIngresoFiltro] = useState<string>("");\n  const [openPeriodo, setOpenPeriodo] = useState<boolean>(false);'
);

// 2. Update toggle button (limpiar filtros)
content = content.replace(
  'setPeriodoFiltro(""); setEstadoCasoFiltro(""); setTipoFiltro(""); }',
  'setPeriodoFiltro([]); setEstadoCasoFiltro(""); setTipoFiltro(""); setIngresoFiltro(""); }'
);
content = content.replace(
  '|| periodoFiltro || estadoCasoFiltro',
  '|| periodoFiltro.length > 0 || estadoCasoFiltro || ingresoFiltro'
);

// 3. Update dependencies arrays and filter conditions
content = content.replace(
  'if (periodoFiltro && !periodoDesact && c.periodoMensual !== periodoFiltro) return false;',
  'if (periodoFiltro.length > 0 && !periodoDesact && (!c.periodoMensual || !periodoFiltro.includes(c.periodoMensual))) return false;\n      if (ingresoFiltro === "INGRESADOS" && !c.fechaIngreso) return false;\n      if (ingresoFiltro === "NO INGRESADOS" && c.fechaIngreso) return false;'
);

content = content.replace(
  'if (periodoFiltro && !periodoDesact && c.periodoMensual !== periodoFiltro) return false;',
  'if (periodoFiltro.length > 0 && !periodoDesact && (!c.periodoMensual || !periodoFiltro.includes(c.periodoMensual))) return false;\n      if (ingresoFiltro === "INGRESADOS" && !c.fechaIngreso) return false;\n      if (ingresoFiltro === "NO INGRESADOS" && c.fechaIngreso) return false;'
);

// For all other places where it was: if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;
content = content.replaceAll(
  'if (periodoFiltro && c.periodoMensual !== periodoFiltro) return false;',
  'if (periodoFiltro.length > 0 && (!c.periodoMensual || !periodoFiltro.includes(c.periodoMensual))) return false;'
);

// Update dependency queues:
content = content.replaceAll(
  '[casos, estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro]',
  '[casos, estadoFiltro, sucursalFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro, ingresoFiltro]'
);

content = content.replaceAll(
  '[casos, estadoFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro]',
  '[casos, estadoFiltro, garantiaFiltro, periodoFiltro, periodoDesact, estadoCasoFiltro, tipoFiltro, ingresoFiltro]'
);

// 4. Update the JSX for selects

let selectPeriodo = `          {/* F4: Periodo */}
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            disabled={periodoDesact}
            className={\`px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-opacity
              \${periodoDesact ? "opacity-40 cursor-not-allowed text-slate-600" : "text-slate-300"}\`}
          >
            <option value="">{periodoDesact ? "Periodo (inactivo)" : "Todos los periodos"}</option>
            {periodosDisponibles.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>`;

let customPeriodo = `          {/* F4: Periodo (Multi-select custom) */}
          <div className="relative">
            <button
              type="button"
              disabled={periodoDesact}
              onClick={() => setOpenPeriodo(!openPeriodo)}
              className={\`px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-between min-w-[140px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-opacity
                \${periodoDesact ? "opacity-40 cursor-not-allowed text-slate-600" : "text-slate-300"}\`}
            >
              <span className="truncate pr-2">
                {periodoDesact ? "Periodo (inactivo)" : periodoFiltro.length > 0 ? \`\${periodoFiltro.length} seleccionado(s)\` : "Todos los periodos"}
              </span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            {openPeriodo && !periodoDesact && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenPeriodo(false)} />
                <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 max-h-60 overflow-y-auto">
                  {periodosDisponibles.map((p) => (
                    <label key={p} className="flex items-center px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-slate-600 bg-slate-900 accent-indigo-500"
                        checked={periodoFiltro.includes(p)}
                        onChange={(e) => {
                          if (e.target.checked) setPeriodoFiltro((prev) => [...prev, p]);
                          else setPeriodoFiltro((prev) => prev.filter((item) => item !== p));
                        }}
                      />
                      <span className="text-xs text-slate-300">{p}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* F7: Ingreso */}
          <select
            value={ingresoFiltro}
            onChange={(e) => setIngresoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Ingreso (Todos)</option>
            <option value="INGRESADOS">Ingresados</option>
            <option value="NO INGRESADOS">No ingresados</option>
          </select>`;

content = content.replace(selectPeriodo, customPeriodo);

fs.writeFileSync(file, content);
console.log("Patched!");
