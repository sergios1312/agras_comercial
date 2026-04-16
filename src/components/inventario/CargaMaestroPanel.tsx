"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import ExcelJS from "exceljs";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  UploadCloud,
  Eye,
  Database,
  RefreshCw
} from "lucide-react";
import { 
  obtenerMaestroExistente, 
  confirmarSubidaMaestro,
  type RepuestoRecord 
} from "@/app/(dashboard)/administrador/admin-inventario-actions";

type PanelState = "idle" | "parsing" | "preview" | "uploading" | "done" | "error";

interface RepuestoConEstado extends RepuestoRecord {
  estadoCarga: "nuevo" | "modificado" | "sin_cambios";
}

export function CargaMaestroPanel() {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [items, setItems] = useState<RepuestoConEstado[]>([]);
  const [resumen, setResumen] = useState({ nuevos: 0, modificados: 0, sinCambios: 0 });
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const FILAS_POR_PAGINA = 50;

  const procesarArchivo = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      setErrorMsg("El archivo debe ser Excel (.xlsx) o de texto (.csv)");
      setPanelState("error");
      return;
    }

    setPanelState("parsing");
    setErrorMsg("");

    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      
      if (file.name.endsWith(".csv")) {
        // exceljs tiene carga asincrona para CSV
        const uint8 = new Uint8Array(buffer);
        // Creamos un string "crudo". Para mejor soporte usar read() o parse de csv, 
        // pero exceljs puede cargar CSV con .csv.read(stream) aunque en browser es más verboso.
        // Asumiremos xlsx como primordial (según specs de sync_stock.ts)
        throw new Error("Por favor utiliza el archivo .xlsx (Excel) para asegurar compatibilidad de formato.");
      } else {
        await wb.xlsx.load(buffer);
      }

      const ws = wb.worksheets[0];
      if (!ws) throw new Error("No se encontraron hojas de cálculo en el archivo.");

      const headers = ws.getRow(1).values as string[];
      const asIndex = (keys: string[]) => {
        return headers.findIndex(h => keys.some(k => String(h || "").trim().toLowerCase().includes(k)));
      };

      const idxCod = asIndex(["codigo", "código"]);
      const idxNom = asIndex(["nombre"]);
      const idxSap = asIndex(["codigo_sap", "cod_sap", "cod.sap"]);
      const idxPrecio = asIndex(["precio_venta"]);
      const idxMod = asIndex(["modelos_compatibles"]);

      if (idxCod === -1 && idxSap === -1) {
        throw new Error("El archivo no contiene una columna válida para 'código' o 'codigo_sap'.");
      }

      const mapNuevos = new Map<string, RepuestoRecord>();

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as any[];
        
        let codigo = String(values[idxCod] || "").trim();
        let codigoSap = idxSap !== -1 ? String(values[idxSap] || "").trim() : null;
        
        if (!codigo && !codigoSap) return; // Vacío

        const key = codigo || codigoSap!;

        mapNuevos.set(key, {
          codigo: key,
          nombre: idxNom !== -1 ? String(values[idxNom] || "").trim() : "",
          codigo_sap: codigoSap || null,
          precio_venta: idxPrecio !== -1 ? (parseFloat(values[idxPrecio]) || 0) : 0,
          modelos_compatibles: idxMod !== -1 ? String(values[idxMod] || "").trim() : null,
        });
      });

      if (mapNuevos.size === 0) throw new Error("El archivo no contiene filas con datos válidos.");

      // Smart Diffing
      const existentes = await obtenerMaestroExistente();
      const mapExistentes = new Map<string, RepuestoRecord>();
      existentes.forEach(e => {
        mapExistentes.set(e.codigo, e);
        if (e.codigo_sap && e.codigo !== e.codigo_sap) {
           // Mapeo dual para cruces fuertes
           mapExistentes.set(e.codigo_sap, e);
        }
      });

      const normStr = (val: any) => (val ?? "").toString().trim().toUpperCase();
      const normNum = (val: any) => parseFloat(val) || 0;

      const itemsConEstado: RepuestoConEstado[] = [];

      for (const [key, itemN] of mapNuevos.entries()) {
        const itemE = mapExistentes.get(itemN.codigo) ?? (itemN.codigo_sap ? mapExistentes.get(itemN.codigo_sap) : undefined);

        if (!itemE) {
          itemsConEstado.push({ ...itemN, estadoCarga: "nuevo" });
          continue;
        }

        const identicos = 
          normStr(itemN.nombre) === normStr(itemE.nombre) &&
          normStr(itemN.codigo_sap) === normStr(itemE.codigo_sap) &&
          normNum(itemN.precio_venta) === normNum(itemE.precio_venta) &&
          normStr(itemN.modelos_compatibles) === normStr(itemE.modelos_compatibles);

        // Si es modificado, traemos el "id" para no pisar otras cosas o forzar Update
        itemsConEstado.push({ 
          ...itemN, 
          id: itemE.id,
          estadoCarga: identicos ? "sin_cambios" : "modificado" 
        });
      }

      const nuevos = itemsConEstado.filter(i => i.estadoCarga === "nuevo").length;
      const modificados = itemsConEstado.filter(i => i.estadoCarga === "modificado").length;
      const sinCambios = itemsConEstado.filter(i => i.estadoCarga === "sin_cambios").length;

      setItems(itemsConEstado);
      setResumen({ nuevos, modificados, sinCambios });
      setPaginaActual(0);
      setPanelState("preview");

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido al parsear.";
      setErrorMsg(msg);
      setPanelState("error");
    }
  }, []);

  const handleConfirmar = () => {
    startTransition(async () => {
      setPanelState("uploading");
      setMensaje("");
      
      const cambios = items.filter(i => i.estadoCarga !== "sin_cambios");

      if (cambios.length === 0) {
        setMensaje("No hay cambios detectados. Base de datos ya sincronizada.");
        setPanelState("done");
        return;
      }

      const result = await confirmarSubidaMaestro(cambios);
      if (result.success) {
        setMensaje(result.mensaje ?? "¡Maestro sincronizado con éxito!");
        setPanelState("done");
      } else {
        setErrorMsg(result.error ?? "Error al sincronizar maestro.");
        setPanelState("error");
      }
    });
  };

  const handleReset = () => {
    setItems([]);
    setResumen({ nuevos: 0, modificados: 0, sinCambios: 0 });
    setMensaje("");
    setErrorMsg("");
    setPaginaActual(0);
    setPanelState("idle");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) procesarArchivo(file);
    },
    [procesarArchivo]
  );

  // Renderizados intermedios
  if (panelState === "idle") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-emerald-400" />
          Actualizar Maestro (inventario_unificado.xlsx)
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Sube el archivo maestro central para actualizar precios, nombres y modelos compatibles. No afecta las cantidades de stock, solo las características del repuesto.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
              : "border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-800/50"
          }`}
        >
          <input
             ref={fileInputRef}
             type="file"
             accept=".xlsx,.csv"
             className="hidden"
             onChange={(e) => {
               if (e.target.files?.[0]) procesarArchivo(e.target.files[0]);
               e.target.value = "";
             }}
          />
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 border border-slate-700">
             <UploadCloud className={`w-6 h-6 ${isDragging ? "text-emerald-400" : "text-slate-400"}`} />
          </div>
          <div className="text-center">
             <p className="text-sm font-semibold text-slate-200">
               Arrastra tu <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">inventario_unificado.xlsx</code>
             </p>
             <p className="text-xs text-slate-500 mt-1">o haz click para buscar en tus archivos</p>
          </div>
        </div>
      </div>
    );
  }

  if (panelState === "parsing" || panelState === "uploading" || isPending) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-slate-300 font-medium">
          {panelState === "parsing" ? "Analizando Excel Inteligente..." : `Procesando ${items.filter(i => i.estadoCarga !== "sin_cambios").length} actualizaciones en base de datos...`}
        </p>
      </div>
    );
  }

  if (panelState === "error") {
     return (
        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                 <h4 className="font-bold">Error en la carga maestra</h4>
                 <p className="text-sm opacity-80 mt-1">{errorMsg}</p>
              </div>
           </div>
           <button onClick={handleReset} className="self-start px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">Volver a intentar</button>
        </div>
     );
  }

  if (panelState === "done") {
     return (
        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                 <h4 className="font-bold cursor-default">Sincronización Exitosa</h4>
                 <p className="text-sm opacity-80 mt-1">{mensaje}</p>
              </div>
           </div>
           <button onClick={handleReset} className="self-start px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">Subir Nuevo Archivo</button>
        </div>
     );
  }

  // Previsualización (Smart Diff Viewer)
  const totalPaginas = Math.ceil(items.length / FILAS_POR_PAGINA);
  const itemsPagina = items.slice(paginaActual * FILAS_POR_PAGINA, (paginaActual + 1) * FILAS_POR_PAGINA);

  return (
     <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" /> Previsualización Maestro
            </h3>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700">
                {items.length.toLocaleString()} Filas Detectadas
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
           <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-emerald-500/80">Nuevos Códigos</p>
                  <p className="text-2xl font-black text-emerald-400">{resumen.nuevos}</p>
               </div>
               <UploadCloud className="w-8 h-8 text-emerald-500/30" />
           </div>
           <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-amber-500/80">A Modificar</p>
                  <p className="text-2xl font-black text-amber-400">{resumen.modificados}</p>
               </div>
               <RefreshCw className="w-8 h-8 text-amber-500/30" />
           </div>
           <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500">Sin Cambios (Ignorados)</p>
                  <p className="text-2xl font-black text-slate-400">{resumen.sinCambios}</p>
               </div>
               <CheckCircle2 className="w-8 h-8 text-slate-600" />
           </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
           <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900 border-b border-slate-800">
                      <tr>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Nombre</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">SAP Ref.</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Precio</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                      {itemsPagina.map((item, id) => (
                          <tr key={`${item.codigo}-${id}`} className={`hover:bg-slate-900/50 transition-colors ${item.estadoCarga === "sin_cambios" ? "opacity-50" : ""}`}>
                              <td className="px-4 py-3">
                                  {item.estadoCarga === "nuevo" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">NUEVO</span>}
                                  {item.estadoCarga === "modificado" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">MOD.</span>}
                                  {item.estadoCarga === "sin_cambios" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">OK</span>}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-300">{item.codigo}</td>
                              <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={item.nombre}>{item.nombre || "—"}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{item.codigo_sap || "—"}</td>
                              <td className="px-4 py-3 text-slate-300">
                                  {item.precio_venta ? `$${item.precio_venta.toFixed(2)}` : "—"}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
           </div>
           
           {/* Footer Pag */}
           {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/40">
                <span className="text-xs text-slate-500">Filas {paginaActual * FILAS_POR_PAGINA + 1}–{Math.min((paginaActual + 1) * FILAS_POR_PAGINA, items.length)} de {items.length}</span>
                <div className="flex gap-2">
                    <button onClick={() => setPaginaActual(p => Math.max(0, p - 1))} disabled={paginaActual===0} className="px-3 py-1 bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg text-xs font-medium">Anterior</button>
                    <button onClick={() => setPaginaActual(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual===totalPaginas-1} className="px-3 py-1 bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg text-xs font-medium">Siguiente</button>
                </div>
            </div>
           )}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
           <button onClick={handleReset} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium">Volver</button>
           <button onClick={handleConfirmar} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 text-white font-bold transition-transform active:scale-95">
              <Database className="w-4 h-4" /> Ejecutar {resumen.nuevos + resumen.modificados} Modificaciones
           </button>
        </div>
     </div>
  );
}
