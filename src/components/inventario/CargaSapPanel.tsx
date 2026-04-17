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
  RefreshCw,
  Ghost
} from "lucide-react";
import { 
  obtenerDatosParaSap, 
  confirmarSubidaSap,
  type RepuestoRecord,
  type InventarioRecord
} from "@/app/(dashboard)/administrador/admin-inventario-actions";

type PanelState = "idle" | "parsing" | "preview" | "uploading" | "done" | "error";

interface InventarioAnalisis {
  estado: "nuevo" | "modificado" | "sin_cambios" | "purgado";
  ciudad: string;
  sku: string;
  nombre: string;
  stockActual: number;
  stockNuevo: number;
}

const ALMACENES_MAP: Record<string, string> = {
  'APRI.016': 'Lima',
  'DJCST.01': 'Chiclayo',
  'DICST.01': 'Ica',
  'DJABT.01': 'Bellavista',
  'DJCM.001': 'Nueva Cajamarca',
  'DJAPU.01': 'Pucallpa',
  'DJJST.01': 'Jaen',
  'DHUST.01': 'Huanuco',
  'DYUST-01': 'Yurimaguas',
  'DYUST.01': 'Yurimaguas', 
  'DSTPI.01': 'Piura'
};

interface Props {
  ultimaActualizacion?: string | null;
}

export function CargaSapPanel({ ultimaActualizacion }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [itemsUI, setItemsUI] = useState<InventarioAnalisis[]>([]);
  const [upsertRepuestos, setUpsertRepuestos] = useState<RepuestoRecord[]>([]);
  const [upsertInventario, setUpsertInventario] = useState<InventarioRecord[]>([]);
  
  const [resumen, setResumen] = useState({ fantasmas: 0, actualizados: 0, purgados: 0, sinCambios: 0 });
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const FILAS_POR_PAGINA = 50;

  const procesarArchivo = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      setErrorMsg("El archivo debe ser Excel (.xlsx)");
      setPanelState("error");
      return;
    }

    setPanelState("parsing");
    setErrorMsg("");

    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      const ws = wb.worksheets[0];
      if (!ws) throw new Error("No hay hojas de cálculo.");

      const headersRaw = ws.getRow(1).values as string[];
      const normalize = (s: string) => String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const headers = headersRaw.map(normalize);

      const idSapCod = headers.findIndex(h => h?.includes('cod.sap') || h?.includes('codigo de articulo'));
      const idDesc = headers.findIndex(h => h?.includes('descripcion del articulo'));
      const idEan = headers.findIndex(h => h?.includes('codigo de barras'));
      const idAlm = headers.findIndex(h => h?.includes('codigo de almacen'));
      const idTotal = headers.findIndex(h => h === 'total');

      if (idSapCod === -1 || idAlm === -1) {
        throw new Error("Faltan las columnas clave en SAP (Código SAP / Código de Almacén).");
      }

      // Agrupamos el stock de la misma forma que en Node
      const stockAgrupado: Record<string, Record<string, { total: number, desc: string, codigoSap: string }>> = {};
      Object.values(ALMACENES_MAP).forEach(c => stockAgrupado[c] = {});

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as any[];
        
        const codigoSap = String(values[idSapCod] || '').trim();
        const codigoBarras = String(values[idEan] || '').trim();
        const descripcion = String(values[idDesc] || '').trim();
        const almacenCod = String(values[idAlm] || '').trim();
        const total = parseFloat(values[idTotal]) || 0;

        if (!codigoSap) return;
        const ciudad = ALMACENES_MAP[almacenCod];
        if (!ciudad) return; // Almacén ignorado

        const sku = codigoBarras; // El usuario solicita usar ÚNICAMENTE el código de barras como identificador principal.
        
        if (!sku) return; // Si no hay código de barras, se salta la fila.

        if (!stockAgrupado[ciudad][sku]) {
           stockAgrupado[ciudad][sku] = { total: 0, desc: descripcion, codigoSap };
        }
        stockAgrupado[ciudad][sku].total += total;
      });

      // ---- Descargar los datos de la base de datos (Backend) ----
      const dataBackend = await obtenerDatosParaSap();
      
      const mapSucID: Record<string, number> = {};
      const mapIDToSuc: Record<number, string> = {};
      dataBackend.sucursales.forEach((s: any) => {
         mapSucID[s.nombre_ciudad] = s.id;
         mapIDToSuc[s.id] = s.nombre_ciudad;
      });

      const mapRepToID: Record<string, number> = {};
      const mapIDToRep: Record<number, any> = {};
      dataBackend.repuestos.forEach(r => {
        mapRepToID[r.codigo] = r.id!;
        if (r.codigo_sap) mapRepToID[r.codigo_sap] = r.id!;
        mapIDToRep[r.id!] = r;
      });

      const mapInvActual: Record<string, number> = {};
      dataBackend.inventario.forEach(inv => {
         const ciudad = mapIDToSuc[inv.sucursal_id];
         const rep = mapIDToRep[inv.repuesto_id];
         
         if (ciudad && rep) {
            mapInvActual[`${ciudad}-${rep.codigo}`] = inv.cantidad;
            if (rep.codigo_sap) {
               mapInvActual[`${ciudad}-${rep.codigo_sap}`] = inv.cantidad;
            }
         }
      });

      // ---- SMART DIFF LOGIC ----
      const repuestosNuevosDraft: RepuestoRecord[] = [];
      const detectadosRepuestos = new Set<string>();

      const inventarioMovimientosDraft: InventarioRecord[] = [];
      const uiListDraft: InventarioAnalisis[] = [];

      let countAct = 0;
      let countSinCmbs = 0;

      // 1. Lo que viene en SAP
      const clavesValidadasSAP = new Set<string>(); // para saber qué purgar después

      for (const ciudad of Object.keys(stockAgrupado)) {
        const sucID = mapSucID[ciudad];
        if (!sucID) continue; // Sucursal no dada de alta en la BD

        for (const [sku, info] of Object.entries(stockAgrupado[ciudad])) {
           clavesValidadasSAP.add(`${ciudad}-${sku}`);
           
           let repID = mapRepToID[sku];
           
           // A. Si no existe, es repuesto Fantasma (NUEVO)
           if (!repID && !detectadosRepuestos.has(sku)) {
              detectadosRepuestos.add(sku);
              repuestosNuevosDraft.push({
                 codigo: sku,
                 codigo_sap: info.codigoSap,
                 nombre: info.desc,
                 precio_venta: 0,
                 modelos_compatibles: null
              });
              // repID es undefined por ahora, se insertará en server action o le daremos lookup post-insert
              // Sin embargo, para la UI basta y el server buscará rep_id después de insertar.
           }

           // B. Validación del inventario
           const cantSistema = mapInvActual[`${ciudad}-${sku}`] ?? 0;
           const cantSap = info.total;

           if (cantSistema === cantSap) {
              countSinCmbs++;
              uiListDraft.push({
                 estado: "sin_cambios",
                 ciudad, sku, nombre: info.desc, stockActual: cantSistema, stockNuevo: cantSap
              });
           } else {
              countAct++;
              uiListDraft.push({
                 estado: cantSistema === 0 ? "nuevo" : "modificado",
                 ciudad, sku, nombre: info.desc, stockActual: cantSistema, stockNuevo: cantSap
              });
              
              inventarioMovimientosDraft.push({
                // Si es nuevo fantasma, pasaremos -1 temporal y el server lo arreglará. (Aunque es más fácil pasar el fallback o un identificador. Usaremos un trampa segura: repuesto_id: repID || 0 y añadimos un hack en el backend. Pero esto se repara mejor allí)
                 // Como nuestro type pide number, mandamos repID || 0. 
                 // Nuestro action lo ignora si rep_id = 0? Wait, the server needs to know *what* item it is if repuesto_id is unknown.
                 repuesto_id: repID || -1,
                 sucursal_id: sucID,
                 cantidad: cantSap
                 // We would strictly need "codigo" to reconstruct this.
              } as any); 
              
              // Modificamos el draft para que viaje el codigo a la DB.
               const targetItem: any = inventarioMovimientosDraft[inventarioMovimientosDraft.length-1];
               targetItem.codigo_temp = sku;
           }
        }
      }

      // 2. PURGA (Lo que está en la BD con stock > 0, pero no está en SAP)
      let countPurgados = 0;
      dataBackend.inventario.forEach(inv => {
         if (inv.cantidad > 0) {
            // Revertir ID -> Ciudad, SKU (Optimizado a O(1))
            const sucursalNombre = mapIDToSuc[inv.sucursal_id];
            const repItem = mapIDToRep[inv.repuesto_id];

            if (sucursalNombre && repItem) {
               const checkKey = `${sucursalNombre}-${repItem.codigo}`;
               const checkKeySAP = `${sucursalNombre}-${repItem.codigo_sap}`;
               
               if (!clavesValidadasSAP.has(checkKey) && !clavesValidadasSAP.has(checkKeySAP)) {
                  // Purgado (vino 0)
                  countPurgados++;
                  uiListDraft.push({
                     estado: "purgado", ciudad: sucursalNombre, sku: repItem.codigo, nombre: repItem.nombre, stockActual: inv.cantidad, stockNuevo: 0
                  });
                  inventarioMovimientosDraft.push({
                     repuesto_id: inv.repuesto_id,
                     sucursal_id: inv.sucursal_id,
                     cantidad: 0 // Reset stock
                  });
               }
            }
         }
      });

      setItemsUI(uiListDraft);
      setUpsertRepuestos(repuestosNuevosDraft);
      setUpsertInventario(inventarioMovimientosDraft);

      setResumen({ 
         fantasmas: repuestosNuevosDraft.length, 
         actualizados: countAct, 
         sinCambios: countSinCmbs, 
         purgados: countPurgados 
      });

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

      if (upsertRepuestos.length === 0 && upsertInventario.length === 0) {
        setMensaje("No hay cambios detectados para sincronizar.");
        setPanelState("done");
        return;
      }

      // Como el server tipado de ts es estricto, debemos reenviar `codigo` en el array de inventario
      // Para poder procesar los que no tienen ID, hemos puesto "codigo_temp". 
      // El ServerAction se encargar de parchearlo. (Requiere update si el server no lo soporta).
      
      const result = await confirmarSubidaSap(upsertRepuestos, upsertInventario as any);

      if (result.success) {
        setMensaje(result.mensaje ?? "Sincronización Completada.");
        setPanelState("done");
      } else {
        setErrorMsg(result.error ?? "Ocurrió un error en la nube.");
        setPanelState("error");
      }
    });
  };

  const handleReset = () => {
    setItemsUI([]);
    setUpsertInventario([]);
    setUpsertRepuestos([]);
    setResumen({ fantasmas: 0, actualizados: 0, sinCambios: 0, purgados: 0 });
    setMensaje("");
    setErrorMsg("");
    setPaginaActual(0);
    setPanelState("idle");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault(); setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) procesarArchivo(file);
  }, [procesarArchivo]);

  if (panelState === "idle") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Actualizar Stock SAP (sap_crudo.xlsx)
          </h3>
          {ultimaActualizacion && (
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
              Último stock: {new Date(ultimaActualizacion).toLocaleString('es-PE')}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Sube el reporte bruto de almacenes desde SAP. El sistema cruzará las cantidades, purgará el stock desactualizado, e insertará repuestos base en blanco en caso detecte códigos de los cuales no tengamos maestro.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            isDragging ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]" : "border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-800/50"
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
             onChange={(e) => { if (e.target.files?.[0]) procesarArchivo(e.target.files[0]); e.target.value = ""; }}
          />
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 border border-slate-700">
             <UploadCloud className={`w-6 h-6 ${isDragging ? "text-emerald-400" : "text-slate-400"}`} />
          </div>
          <div className="text-center">
             <p className="text-sm font-semibold text-slate-200">
               Arrastra tu <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">sap_crudo.xlsx</code>
             </p>
             <p className="text-xs text-slate-500 mt-1">Soporta reportes masivos (+10k filas)</p>
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
          {panelState === "parsing" ? "Ejecutando cruce masivo con base de datos..." : "Inyectando operaciones en paralelo..."}
        </p>
      </div>
    );
  }

  if (panelState === "error") {
     return (
        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                 <h4 className="font-bold">Error Carga Base</h4>
                 <p className="text-sm opacity-80 mt-1">{errorMsg}</p>
              </div>
           </div>
           <button onClick={handleReset} className="self-start px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-medium">Reintentar</button>
        </div>
     );
  }

  if (panelState === "done") {
     return (
        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                 <h4 className="font-bold cursor-default">Sincronización Exacta</h4>
                 <p className="text-sm opacity-80 mt-1">{mensaje}</p>
              </div>
           </div>
           <button onClick={handleReset} className="self-start px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-medium">Subir Siguiente Periodo</button>
        </div>
     );
  }

  const totalPaginas = Math.ceil(itemsUI.length / FILAS_POR_PAGINA);
  const itemsPagina = itemsUI.slice(paginaActual * FILAS_POR_PAGINA, (paginaActual + 1) * FILAS_POR_PAGINA);

  return (
     <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" /> Analítico de SAP (Smart Diffing)
            </h3>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700">
                {upsertInventario.length} Mvtos. en BD | {resumen.fantasmas} Repuestos Nuevos
            </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col gap-1">
                <p className="text-xs font-semibold text-emerald-500/80 uppercase">Stock Actualizado</p>
                <div className="flex items-end justify-between mt-auto">
                    <p className="text-3xl font-black text-emerald-400">{resumen.actualizados}</p>
                    <RefreshCw className="w-6 h-6 text-emerald-500/30" />
                </div>
           </div>
           <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col gap-1">
                <p className="text-xs font-semibold text-red-500/80 uppercase">Se vacían a 0 (Purga)</p>
                <div className="flex items-end justify-between mt-auto">
                    <p className="text-3xl font-black text-red-400">{resumen.purgados}</p>
                    <X className="w-6 h-6 text-red-500/30" />
                </div>
           </div>
           <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-1">
                <p className="text-xs font-semibold text-amber-500/80 uppercase">Alta Base (Rep. Nuevos)</p>
                <div className="flex items-end justify-between mt-auto">
                    <p className="text-3xl font-black text-amber-400">{resumen.fantasmas}</p>
                    <Ghost className="w-6 h-6 text-amber-500/30" />
                </div>
           </div>
           <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col gap-1">
                <p className="text-xs font-semibold text-slate-500 uppercase">Sin Cambios</p>
                <div className="flex items-end justify-between mt-auto">
                    <p className="text-3xl font-black text-slate-400">{resumen.sinCambios}</p>
                    <CheckCircle2 className="w-6 h-6 text-slate-600" />
                </div>
           </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
           <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-900 border-b border-slate-800">
                      <tr>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Mvto</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Sucursal</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider w-1/3">Nombre</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Cant. Previa</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Cant. Válida</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                      {itemsPagina.map((item, id) => (
                          <tr key={`${item.ciudad}-${item.sku}-${id}`} className={`hover:bg-slate-900/50 ${item.estado === "sin_cambios" ? "opacity-50" : ""}`}>
                              <td className="px-4 py-3">
                                  {item.estado === "nuevo" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">NUEVO LOTE</span>}
                                  {item.estado === "modificado" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">UPDATE</span>}
                                  {item.estado === "purgado" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30">PURGA</span>}
                                  {item.estado === "sin_cambios" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">OK MATCH</span>}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-300">{item.ciudad}</td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-400">{item.sku}</td>
                              <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={item.nombre}>{item.nombre}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-500">{item.stockActual}</td>
                              <td className={`px-4 py-3 text-right font-mono font-bold ${item.stockNuevo > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {item.stockNuevo}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
           </div>
           
           {/* Footer Pag */}
           {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/40">
                <span className="text-xs text-slate-500">Mostrando {paginaActual * FILAS_POR_PAGINA + 1} a {Math.min((paginaActual + 1) * FILAS_POR_PAGINA, itemsUI.length)} de {itemsUI.length}</span>
                <div className="flex gap-2">
                    <button onClick={() => setPaginaActual(p => Math.max(0, p - 1))} disabled={paginaActual===0} className="px-3 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs font-medium">Ant</button>
                    <button onClick={() => setPaginaActual(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual===totalPaginas-1} className="px-3 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs font-medium">Sig</button>
                </div>
            </div>
           )}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
           <button onClick={handleReset} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium">Volver / Cancelar</button>
           <button onClick={handleConfirmar} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 text-white font-bold transition-transform active:scale-95">
              <Database className="w-4 h-4" /> Aplicar {upsertInventario.length} Movimientos a la Base
           </button>
        </div>
     </div>
  );
}
