"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FileText, User, Building2, Phone, Mail, Hash, Calendar,
  Package, Plus, Trash2, Download, Percent, ChevronDown,
  AlertTriangle, CheckCircle2, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATALOGO_PRODUCTOS, TIPOS_KIT, ACCESORIOS_REQUERIDOS_KIT,
  obtenerProductosKit, obtenerAccesorios, buscarProductoPorSAP,
  DATOS_EMPRESA, IGV_RATE, type TipoKit, type Producto,
} from "./productos-data";
import {
  generarCotizacionPDF, calcularTotales,
  type LineaCotizacion, type DatosCotizacion,
} from "./cotizacion-pdf";

interface ItemCotizacion {
  id: string;
  codSAP: string;
  descripcion: string;
  cantidad: number;
  pvp: number;
  tipo: string;
}

function InputGroup({ label, icon: Icon, children, className }: {
  label: string; icon?: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all";
const selectCls = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer";

export function CotizacionForm() {
  // Ejecutivo
  const [ejecutivo, setEjecutivo] = useState("");
  const [telEjecutivo, setTelEjecutivo] = useState("");
  const [correoEjecutivo, setCorreoEjecutivo] = useState("");

  // Cliente
  const [rucDni, setRucDni] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telCliente, setTelCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");

  // Cotización
  const [numCotizacion, setNumCotizacion] = useState(660);
  const [tipoCotizacion, setTipoCotizacion] = useState<string>("");
  const [descuento, setDescuento] = useState(0);
  const [validezDias, setValidezDias] = useState(7);

  // Items
  const [items, setItems] = useState<ItemCotizacion[]>([]);

  // Accesorio buscador
  const [showAccesorioSearch, setShowAccesorioSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hoy = new Date().toISOString().split("T")[0];
  const validoHasta = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + validezDias);
    return d.toISOString().split("T")[0];
  }, [validezDias]);

  // Cargar kit al seleccionar tipo
  const handleTipoChange = useCallback((tipo: string) => {
    setTipoCotizacion(tipo);
    if (!tipo) { setItems([]); return; }

    if (tipo === "ACCESORIOS") {
      setItems([]);
      return;
    }

    const productosKit = obtenerProductosKit(tipo);
    const newItems: ItemCotizacion[] = productosKit.map((p, i) => ({
      id: `kit-${i}-${Date.now()}`,
      codSAP: p.codSAP,
      descripcion: p.nombre,
      cantidad: p.cantidad,
      pvp: p.pvp,
      tipo: p.tipo,
    }));

    // Agregar accesorios requeridos (del VBA: CN13100001NA8 y CN9406006NA2)
    ACCESORIOS_REQUERIDOS_KIT.forEach((codSAP, i) => {
      const acc = buscarProductoPorSAP(codSAP);
      if (acc) {
        newItems.push({
          id: `acc-req-${i}-${Date.now()}`,
          codSAP: acc.codSAP,
          descripcion: acc.nombre,
          cantidad: 1,
          pvp: acc.pvp,
          tipo: "ACCESORIOS",
        });
      }
    });

    setItems(newItems);
  }, []);

  // Agregar accesorio individual
  const agregarAccesorio = useCallback((producto: Producto) => {
    setItems(prev => [...prev, {
      id: `acc-${Date.now()}-${Math.random()}`,
      codSAP: producto.codSAP,
      descripcion: producto.nombre,
      cantidad: 1,
      pvp: producto.pvp,
      tipo: "ACCESORIOS",
    }]);
    setShowAccesorioSearch(false);
    setSearchQuery("");
  }, []);

  // Eliminar item
  const eliminarItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  // Actualizar cantidad
  const actualizarCantidad = useCallback((id: string, cant: number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, cantidad: Math.max(1, cant) } : it));
  }, []);

  // Cálculos
  const lineas: LineaCotizacion[] = useMemo(() => {
    // Para KITs: el primer item tiene el precio total del kit
    // El resto son componentes incluidos (precio 0 visible)
    const esKit = tipoCotizacion && tipoCotizacion !== "ACCESORIOS";

    if (esKit) {
      // Precio total del KIT está en el primer producto
      const kitItems = items.filter(it => it.tipo !== "ACCESORIOS");
      const accItems = items.filter(it => it.tipo === "ACCESORIOS");
      const precioKit = kitItems.length > 0 ? kitItems[0].pvp : 0;

      const result: LineaCotizacion[] = [];

      // El kit como una sola línea con precio completo
      kitItems.forEach((it, idx) => {
        const precioBase = idx === 0 ? precioKit : 0;
        const precioConDescuento = descuento > 0 ? precioBase * (1 - descuento) : precioBase;
        const precioSinIGV = precioConDescuento / (1 + IGV_RATE);
        const igv = precioConDescuento - precioSinIGV;
        result.push({
          item: result.length + 1,
          descripcion: it.descripcion,
          codSAP: it.codSAP,
          cantidad: it.cantidad,
          precioUnitario: precioSinIGV,
          igv: igv * it.cantidad,
          total: precioConDescuento * it.cantidad,
        });
      });

      // Accesorios con su propio precio
      accItems.forEach(it => {
        const precioConDescuento = descuento > 0 ? it.pvp * (1 - descuento) : it.pvp;
        const precioSinIGV = precioConDescuento / (1 + IGV_RATE);
        const igv = precioConDescuento - precioSinIGV;
        result.push({
          item: result.length + 1,
          descripcion: it.descripcion,
          codSAP: it.codSAP,
          cantidad: it.cantidad,
          precioUnitario: precioSinIGV,
          igv: igv * it.cantidad,
          total: precioConDescuento * it.cantidad,
        });
      });

      return result;
    }

    // Accesorios individuales
    return items.map((it, idx) => {
      const precioConDescuento = descuento > 0 ? it.pvp * (1 - descuento) : it.pvp;
      const precioSinIGV = precioConDescuento / (1 + IGV_RATE);
      const igv = precioConDescuento - precioSinIGV;
      return {
        item: idx + 1,
        descripcion: it.descripcion,
        codSAP: it.codSAP,
        cantidad: it.cantidad,
        precioUnitario: precioSinIGV,
        igv: igv * it.cantidad,
        total: precioConDescuento * it.cantidad,
      };
    });
  }, [items, descuento, tipoCotizacion]);

  const totales = useMemo(() => calcularTotales(lineas), [lineas]);

  // Accesorios filtrados
  const accesoriosFiltrados = useMemo(() => {
    const accs = obtenerAccesorios();
    if (!searchQuery) return accs;
    const q = searchQuery.toLowerCase();
    return accs.filter(a =>
      a.nombre.toLowerCase().includes(q) || a.codSAP.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Validación
  const formValid = ejecutivo && nombreCliente && rucDni && items.length > 0;

  // Generar PDF
  const handleGenerarPDF = () => {
    if (!formValid) return;

    const datosPDF: DatosCotizacion = {
      ejecutivo, telefonoEjecutivo: telEjecutivo, correoEjecutivo,
      rucDni, nombreCliente, telefonoCliente: telCliente, correoCliente,
      numeroCotizacion: numCotizacion,
      fecha: new Date().toLocaleDateString("es-PE"),
      validoHasta: new Date(validoHasta).toLocaleDateString("es-PE"),
      tipoCotizacion: tipoCotizacion || "ACCESORIOS",
      descuento,
      lineas,
      ...totales,
    };

    const doc = generarCotizacionPDF(datosPDF);
    const filename = `Cotizacion_${numCotizacion}_${nombreCliente.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* ============= PANEL IZQUIERDO - FORMULARIO ============= */}
      <div className="lg:w-[420px] xl:w-[460px] border-r border-slate-800 bg-slate-900/40 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">
              Nueva Cotización
            </h3>
          </div>

          {/* Número y Fecha */}
          <div className="grid grid-cols-3 gap-3">
            <InputGroup label="N° Cotización" icon={Hash}>
              <input type="number" value={numCotizacion} onChange={e => setNumCotizacion(parseInt(e.target.value) || 0)} className={inputCls} />
            </InputGroup>
            <InputGroup label="Fecha">
              <input type="date" value={hoy} readOnly className={cn(inputCls, "text-slate-400")} />
            </InputGroup>
            <InputGroup label="Validez (días)">
              <input type="number" value={validezDias} min={1} onChange={e => setValidezDias(parseInt(e.target.value) || 7)} className={inputCls} />
            </InputGroup>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Ejecutivo */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Ejecutivo Comercial
            </div>
            <InputGroup label="Nombre" icon={User}>
              <input type="text" value={ejecutivo} onChange={e => setEjecutivo(e.target.value)} placeholder="Nombre del ejecutivo" className={inputCls} />
            </InputGroup>
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="Teléfono" icon={Phone}>
                <input type="text" value={telEjecutivo} onChange={e => setTelEjecutivo(e.target.value)} placeholder="+51 ..." className={inputCls} />
              </InputGroup>
              <InputGroup label="Correo" icon={Mail}>
                <input type="email" value={correoEjecutivo} onChange={e => setCorreoEjecutivo(e.target.value)} placeholder="correo@qtc.com" className={inputCls} />
              </InputGroup>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Cliente */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-3 h-3" /> Datos del Cliente
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="RUC / DNI" icon={Hash}>
                <input type="text" value={rucDni} onChange={e => setRucDni(e.target.value)} placeholder="20XXXXXXXXX" className={inputCls} />
              </InputGroup>
              <InputGroup label="Nombre / Razón Social" icon={User}>
                <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Nombre del cliente" className={inputCls} />
              </InputGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="Teléfono" icon={Phone}>
                <input type="text" value={telCliente} onChange={e => setTelCliente(e.target.value)} placeholder="+51 ..." className={inputCls} />
              </InputGroup>
              <InputGroup label="Correo" icon={Mail}>
                <input type="email" value={correoCliente} onChange={e => setCorreoCliente(e.target.value)} placeholder="cliente@email.com" className={inputCls} />
              </InputGroup>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Tipo de cotización */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Producto / Kit
            </div>
            <InputGroup label="Tipo de Cotización">
              <div className="relative">
                <select value={tipoCotizacion} onChange={e => handleTipoChange(e.target.value)} className={selectCls}>
                  <option value="">— Seleccionar Kit o Accesorios —</option>
                  {TIPOS_KIT.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              </div>
            </InputGroup>

            {/* Descuento */}
            <InputGroup label="Descuento (%)" icon={Percent}>
              <input type="number" value={descuento * 100} min={0} max={100} step={1}
                onChange={e => setDescuento(Math.min(1, Math.max(0, (parseFloat(e.target.value) || 0) / 100)))}
                className={inputCls} placeholder="0" />
            </InputGroup>
          </div>

          {/* Agregar accesorio */}
          {(tipoCotizacion === "ACCESORIOS" || tipoCotizacion) && (
            <div className="space-y-2">
              <button onClick={() => setShowAccesorioSearch(!showAccesorioSearch)}
                className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar Accesorio Individual
              </button>

              {showAccesorioSearch && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-[200px] overflow-y-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className={cn(inputCls, "pl-9 py-2 text-xs")} placeholder="Buscar accesorio..." autoFocus />
                  </div>
                  {accesoriosFiltrados.map(acc => (
                    <button key={acc.codSAP + acc.nombre} onClick={() => agregarAccesorio(acc)}
                      className="w-full flex justify-between items-center px-3 py-2 text-xs rounded-lg hover:bg-slate-800 transition-colors text-left">
                      <span className="text-slate-300 truncate flex-1">{acc.nombre}</span>
                      <span className="text-indigo-400 font-bold shrink-0 ml-2">S/ {acc.pvp.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botón generar */}
          <button onClick={handleGenerarPDF} disabled={!formValid}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300",
              formValid
                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            )}>
            <Download className="w-4 h-4" /> Descargar PDF
          </button>

          {!formValid && (
            <div className="flex items-center gap-2 text-[10px] text-amber-400/70">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Complete el ejecutivo, cliente y seleccione productos
            </div>
          )}
        </div>
      </div>

      {/* ============= PANEL DERECHO - PREVIEW ============= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Preview Header */}
          <div className="bg-gradient-to-r from-[#6AA84F] to-[#508C37] rounded-2xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-bold">{DATOS_EMPRESA.marca}</div>
                <div className="text-xs text-green-100 mt-1">{DATOS_EMPRESA.titulo}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">#{numCotizacion}</div>
                <div className="text-xs text-green-100">{DATOS_EMPRESA.tipoVenta}</div>
                <div className="text-[10px] text-green-200 mt-1">{hoy}</div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Ejecutivo</div>
              <div className="text-sm font-bold text-white">{ejecutivo || "—"}</div>
              <div className="text-xs text-slate-500">{telEjecutivo || "Sin teléfono"}</div>
              <div className="text-xs text-slate-500">{correoEjecutivo || "Sin correo"}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Cliente</div>
              <div className="text-sm font-bold text-white">{nombreCliente || "—"}</div>
              <div className="text-xs text-slate-500">{rucDni ? `RUC/DNI: ${rucDni}` : "Sin documento"}</div>
              <div className="text-xs text-slate-500">{correoCliente || "Sin correo"}</div>
            </div>
          </div>

          {/* Tipo cotización badge */}
          {tipoCotizacion && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase">{tipoCotizacion}</span>
              {descuento > 0 && (
                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  -{(descuento * 100).toFixed(0)}% descuento
                </span>
              )}
            </div>
          )}

          {/* Tabla de productos */}
          {items.length > 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase w-8">#</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Descripción</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase w-28">Cód. SAP</th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase w-16">Cant.</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase w-24">P. Unit.</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase w-24">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {lineas.map((linea, idx) => (
                      <tr key={items[idx]?.id || idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{linea.item}</td>
                        <td className="px-4 py-2.5 text-white font-medium text-xs">{linea.descripcion}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px] font-mono">{linea.codSAP}</td>
                        <td className="px-2 py-1">
                          <input type="number" min={1} value={items[idx]?.cantidad || linea.cantidad}
                            onChange={e => items[idx] && actualizarCantidad(items[idx].id, parseInt(e.target.value) || 1)}
                            className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-slate-300">
                          S/ {linea.precioUnitario.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-white">
                          S/ {linea.total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5">
                          {items[idx]?.tipo === "ACCESORIOS" && (
                            <button onClick={() => items[idx] && eliminarItem(items[idx].id)}
                              className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="border-t border-slate-800 px-4 py-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal (sin IGV)</span>
                  <span>S/ {totales.subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>IGV (18%)</span>
                  <span>S/ {totales.totalIGV.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white">TOTAL</span>
                  <span className="text-indigo-400 text-lg">
                    S/ {totales.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-sm text-slate-500 font-medium">Seleccione un tipo de kit o agregue accesorios</p>
              <p className="text-xs text-slate-600 mt-1">Los productos aparecerán aquí automáticamente</p>
            </div>
          )}

          {/* Notas */}
          {items.length > 0 && (
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notas y Condiciones</div>
              <p className="text-[10px] text-slate-600 leading-relaxed">{DATOS_EMPRESA.nota1}</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{DATOS_EMPRESA.nota2}</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{DATOS_EMPRESA.notaDesistimiento}</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{DATOS_EMPRESA.notaEnvio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
