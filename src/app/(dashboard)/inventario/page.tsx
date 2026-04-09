import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Tabs } from "@/components/ui/Tabs";
import { CatalogoTab } from "@/components/inventario/CatalogoTab";
import { SolicitudTab } from "@/components/inventario/SolicitudTab";
import { HistorialTab } from "@/components/inventario/HistorialTab";
import type { RepuestoConStock, HistorialPedido, InventarioRow } from "@/types/database.types";
import { Search, Package, History } from "lucide-react";
import { SUCURSALES_DATA } from "@/lib/constants";

import { fetchAll } from "@/lib/db";

export const metadata: Metadata = {
  title: "Solicitudes de Repuestos",
  description: "Búsqueda, solicitud y seguimiento de repuestos por sucursal.",
};

export default async function InventarioPage() {
  const supabase = await createClient();

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sucursalOrigen = user.email?.split("@")[0] ?? "desconocido";
  // Normalizar el prefijo de email al nombre de ciudad real
  const sucursalData = SUCURSALES_DATA.find((s) => s.usuario === sucursalOrigen);
  const ciudadUsuario = sucursalData?.ciudad ?? sucursalOrigen;
  const isAdmin =
    user.email?.startsWith("admin@") ||
    user.user_metadata?.role === "admin" ||
    false;

  // ─── Fetch de datos en paralelo (Recursivo para tablas grandes) ─────
  // Nota: fetchAll maneja el bucle de 1000 en 1000 automáticamente
  const [repuestos, sucursalesRes, inventario, historial] = await Promise.all([
    fetchAll<import("@/types/database.types").Repuesto>(supabase.from("repuestos").select("*")),
    supabase.from("sucursales").select("id, nombre_ciudad"),
    fetchAll<InventarioRow>(supabase.from("inventario").select("id, repuesto_id, sucursal_id, cantidad")),
    fetchAll<HistorialPedido>(
      supabase.from("historial_pedidos").select("*").order("created_at", { ascending: false })
    ),
  ]);

  const sucursales = (sucursalesRes.data as unknown as import("@/types/database.types").Sucursal[]) ?? [];

  // ─── Filtrar Sucursales que manejan stock ───────────────────
  const sedesConStock = SUCURSALES_DATA.filter((s) => s.maneja_stock).map((s) => s.ciudad);
  const sucursalesFiltradas = sucursales.filter((s) => sedesConStock.includes(s.nombre_ciudad));
  const sucursalNames = sucursalesFiltradas.map((s) => s.nombre_ciudad);

  // ─── Construir el catálogo pivotado con stock por sucursal ──
  const idToSucursal = Object.fromEntries(sucursales.map((s) => [s.id, s.nombre_ciudad]));

  const catalogo: RepuestoConStock[] = repuestos.map((r) => {
    const filas = inventario.filter((inv) => inv.repuesto_id === r.id);
    const stock_por_sucursal: Record<string, number> = {};
    const inv_ids: Record<string, number> = {};
    for (const fila of filas) {
      const nombre = idToSucursal[fila.sucursal_id];
      if (nombre) {
        stock_por_sucursal[nombre] = fila.cantidad;
        inv_ids[nombre] = fila.id;
      }
    }
    return { ...r, stock_por_sucursal, inv_ids };
  });

  const tabs = [
    { id: "catalogo", label: "Buscador", icon: <Search className="w-4 h-4" /> },
    { id: "solicitud", label: "Envío de Repuestos", icon: <Package className="w-4 h-4" /> },
    { id: "historial", label: "Historial", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-2">
      <Tabs tabs={tabs} defaultTab="catalogo">
        <CatalogoTab catalogo={catalogo} sucursales={sucursalNames} />
        <SolicitudTab
          catalogo={catalogo}
          sucursales={sucursalNames}
          sucursalOrigen={sucursalOrigen}
          isAdmin={isAdmin}
        />
        <HistorialTab
          historial={historial}
          isAdmin={!!isAdmin}
          ciudadUsuario={ciudadUsuario}
        />
      </Tabs>
    </div>
  );
}
