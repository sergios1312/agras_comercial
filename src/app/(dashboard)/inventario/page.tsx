import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { InventarioClientWrapper } from "@/components/inventario/InventarioClientWrapper";
import type { RepuestoConStock, HistorialPedido, InventarioRow, CasoReposicion, Transferencia } from "@/types/database.types";
import { Search, Package, History } from "lucide-react";
import { SUCURSALES_DATA } from "@/lib/constants";

import { fetchAll, fetchAllParallel } from "@/lib/db";
import { getConfigPedidos, getUltimasActualizaciones } from "@/app/(dashboard)/inventario/config-actions";

export const metadata: Metadata = {
  title: "Solicitudes de Repuestos",
  description: "Búsqueda, solicitud y seguimiento de repuestos por sucursal.",
};

export default async function InventarioPage() {
  // Cliente normal: solo para verificar sesión (usa ANON_KEY + cookies)
  const supabase = await createClient();

  // Verificar sesión
  const user = await getSession();
  if (!user) redirect("/login");

  const sucursalOrigen = user.usuario ?? "desconocido";
  const ciudadUsuario = user.ciudad ?? sucursalOrigen;
  const isAdmin = user.role === "admin";

  // Cliente admin: bypasea RLS para que cualquier rol pueda leer todos los datos
  const db = createAdminClient();

  // Primero buscamos la configuración para saber si debemos traer las pruebas
  const configPedidos = await getConfigPedidos();
  const actualizaciones = await getUltimasActualizaciones();

  // ─── Fetch de datos en paralelo (Recursivo para tablas grandes) ─────
  // Nota: fetchAll maneja el bucle de 1000 en 1000 automáticamente
  const [repuestos, sucursalesRes, inventario, historialOriginal, historialPrueba, casosReposicion, transferencias] = await Promise.all([
    fetchAllParallel<import("@/types/database.types").Repuesto>(db, "repuestos", "*", "id"),
    db.from("sucursales").select("id, nombre_ciudad"),
    fetchAllParallel<InventarioRow>(db, "inventario", "id, repuesto_id, sucursal_id, cantidad", "id"),
    fetchAllParallel<HistorialPedido>(db, "historial_pedidos", "*, repuestos(id, codigo, nombre, nombre_traducido, codigo_sap, precio_venta)", "fecha_pedido", false),
    configPedidos.modo_prueba 
      ? fetchAllParallel<HistorialPedido>(db, "historial_pedidos_prueba", "*", "fecha_pedido", false)
      : Promise.resolve([]),
    fetchAllParallel<CasoReposicion>(db, "casos_reposicion", "*", "fecha", false),
    fetchAllParallel<Transferencia>(db, "transferencias", "*", "fecha_hora", false),
  ]);

  // Si hay modo prueba, combinamos. Las pruebas tendrán prioridad visual si las ordenamos después.
  // Pero para mantener el orden cronológico general, las concatenamos y reordenamos.
  const historialPruebaMarcado = historialPrueba.map(p => ({ ...p, is_test: true }));
  let historial = [...historialOriginal, ...historialPruebaMarcado];
  if (configPedidos.modo_prueba && historialPruebaMarcado.length > 0) {
    historial.sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime());
  }


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
        casosReposicion={casosReposicion}
        transferencias={transferencias}
        ciudadUsuario={ciudadUsuario}
        configPedidos={configPedidos}
        ultimaActualizacion={actualizaciones.stock}
      />
    </div>
  );
}
