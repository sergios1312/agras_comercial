"use client";

import { useState, useCallback, useEffect } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { CatalogoTab } from "@/components/inventario/CatalogoTab";
import { SolicitudTab } from "@/components/inventario/SolicitudTab";
import { HistorialTab } from "@/components/inventario/HistorialTab";
import { Search, Package, History } from "lucide-react";
import type { RepuestoConStock, HistorialPedido, ItemCarrito, CasoReposicion, ConfigPedidos } from "@/types/database.types";
import { generarIdTemporal } from "@/lib/utils";

const CARRITO_STORAGE_KEY = "carrito_solicitudes";

interface InventarioClientWrapperProps {
  catalogo: RepuestoConStock[];
  sucursalesNames: string[];
  sucursalOrigen: string;
  isAdmin: boolean;
  historial: HistorialPedido[];
  casosReposicion: CasoReposicion[];
  ciudadUsuario: string;
  configPedidos: ConfigPedidos;
}

export function InventarioClientWrapper({
  catalogo,
  sucursalesNames,
  sucursalOrigen,
  isAdmin,
  historial,
  casosReposicion,
  ciudadUsuario,
  configPedidos
}: InventarioClientWrapperProps) {
  // ── Carrito persistido en localStorage ──────────────────────
  const [carrito, setCarritoState] = useState<ItemCarrito[]>([]);
  const [carritoHidratado, setCarritoHidratado] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidratar desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CARRITO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ItemCarrito[];
        if (Array.isArray(parsed)) setCarritoState(parsed);
      }
    } catch {
      /* storage no disponible o JSON inválido — ignora */
    } finally {
      setCarritoHidratado(true);
    }
  }, []);

  // Persistir cada vez que cambia el carrito (solo después de hidratar)
  useEffect(() => {
    if (!carritoHidratado) return;
    try {
      localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(carrito));
    } catch {
      /* quota exceeded o modo privado — ignora */
    }
  }, [carrito, carritoHidratado]);

  // Wrapper para que los escritores externos también persistan
  const setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>> = useCallback(
    (action) => setCarritoState(action),
    []
  );

  const agregarAlCarrito = useCallback((r: RepuestoConStock) => {
    // Selección automática de sede con mayor stock
    const stockObj = r.stock_por_sucursal || {};
    let maxStock = 0;
    let sedesMax: string[] = [];
    
    for (const sede of Object.keys(stockObj)) {
      const stockVal = stockObj[sede] ?? 0;
      if (stockVal > maxStock) {
        maxStock = stockVal;
        sedesMax = [sede];
      } else if (stockVal === maxStock && stockVal > 0) {
        sedesMax.push(sede);
      }
    }

    let defaultSede = "";
    if (maxStock === 0) {
      defaultSede = "SIN_STOCK";
    } else {
      const limaBranch = sedesMax.find(s => s.toLowerCase().includes("lima"));
      if (limaBranch) {
        defaultSede = limaBranch;
      } else {
        sedesMax.sort((a, b) => a.localeCompare(b));
        defaultSede = sedesMax[0];
      }
    }

    const newItem: ItemCarrito = {
      id: generarIdTemporal(),
      repuesto_id: r.id,
      codigo: r.codigo,
      nombre: r.nombre_traducido || r.nombre,
      nombre_traducido: r.nombre_traducido ?? "",
      cantidad: 1,
      numero_caso: "",
      sucursal_destino: defaultSede,
      es_venta: false,
      stock_disponible: maxStock,
      inv_ids: r.inv_ids,
    };
    
    setCarrito((prev) => [...prev, newItem]);
    
    // Toast notification
    setToastMessage(`✅ Añadido: ${r.codigo}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const clearCarrito = useCallback(() => {
    setCarritoState([]);
    try { localStorage.removeItem(CARRITO_STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const tabs = [
    { id: "catalogo", label: "Catálogo", icon: <Search className="w-4 h-4" /> },
    { 
      id: "solicitud", 
      label: carrito.length > 0 ? `Carrito (${carrito.length})` : "Carrito", 
      icon: <Package className="w-4 h-4" /> 
    },
    { id: "historial", label: "Historial", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <>
      <Tabs tabs={tabs} defaultTab="catalogo">
        <CatalogoTab 
          catalogo={catalogo} 
          sucursales={sucursalesNames} 
          onAddCarrito={agregarAlCarrito}
        />
        <SolicitudTab
          catalogo={catalogo}
          sucursales={sucursalesNames}
          sucursalOrigen={sucursalOrigen}
          isAdmin={isAdmin}
          carritoProps={{
            carrito,
            setCarrito,
            clearCarrito
          }}
          configPedidos={configPedidos}
        />
        <HistorialTab
          historial={historial}
          casosReposicion={casosReposicion}
          isAdmin={!!isAdmin}
          ciudadUsuario={ciudadUsuario}
          sucursales={sucursalesNames}
        />
      </Tabs>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-slate-100 border border-slate-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </>
  );
}
