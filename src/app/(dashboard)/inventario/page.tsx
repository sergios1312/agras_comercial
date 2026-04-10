import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { InventarioClientWrapper } from "@/components/inventario/InventarioClientWrapper";
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
  const user = await getSession();
  if (!user) redirect("/login");

  const sucursalOrigen = user.usuario ?? "desconocido";
  const ciudadUsuario = user.ciudad ?? sucursalOrigen;
  const isAdmin = user.role === "admin";

  // ─── Fetch de datos en paralelo (Recursivo para tablas grandes) ─────
  // Nota: fetchAll maneja el bucle de 1000 en 1000 automáticamente
  const [repuestos, sucursalesRes, inventario, historial] = await Promise.all([
    fetchAll<import("@/types/database.types").Repuesto>(supabase.from("repuestos").select("*")),
    supabase.from("sucursales").select("id, nombre_ciudad"),
    fetchAll<InventarioRow>(supabase.from("inventario").select("id, repuesto_id, sucursal_id, cantidad")),
    fetchAll<HistorialPedido>(
      supabase.from("historial_pedidos").select("*").order("fecha_pedido", { ascending: false })
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

  return (
    <div className="space-y-2">
      <InventarioClientWrapper
        catalogo={catalogo}
        sucursalesNames={sucursalNames}
        sucursalOrigen={sucursalOrigen}
        isAdmin={isAdmin}
        historial={historial}
        ciudadUsuario={ciudadUsuario}
      />
    </div>
  );
}
