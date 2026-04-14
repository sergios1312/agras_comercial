"use client";

import { useState, useCallback } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { CatalogoTab } from "@/components/inventario/CatalogoTab";
import { SolicitudTab } from "@/components/inventario/SolicitudTab";
import { HistorialTab } from "@/components/inventario/HistorialTab";
import { Search, Package, History } from "lucide-react";
import type { RepuestoConStock, HistorialPedido, ItemCarrito, CasoReposicion, ConfigPedidos } from "@/types/database.types";
import { generarIdTemporal } from "@/lib/utils";

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
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const agregarAlCarrito = useCallback((r: RepuestoConStock) => {
    const newItem: ItemCarrito = {
      id: generarIdTemporal(),
      repuesto_id: r.id,
      codigo: r.codigo,
      nombre: r.nombre_traducido || r.nombre,
      nombre_traducido: r.nombre_traducido ?? "",
      cantidad: 1,
      numero_caso: "",
      sucursal_destino: "",
      es_venta: false,
      stock_disponible: 0,
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
    setCarrito([]);
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
