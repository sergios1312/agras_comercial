"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";
import type { ConfigPedidos, ConfiguracionSistema } from "@/types/database.types";

// Valor por defecto cuando no hay tabla o fila en DB
const CONFIG_DEFAULT: ConfigPedidos = {
  abastecimiento: true,
  internos: true,
  reposicion: true,
};

/**
 * getConfigPedidos()
 * Lee el estado de los 3 switches desde la tabla configuracion_sistema.
 * Si la tabla no existe o hay error, retorna todo habilitado (fail-safe).
 */
export async function getConfigPedidos(): Promise<ConfigPedidos> {
  try {
    const db = createAdminClient();
    const { data, error } = await (db as unknown as any)
      .from("configuracion_sistema")
      .select("clave, valor")
      .in("clave", ["pedidos_abastecimiento", "pedidos_internos", "pedidos_reposicion"]);

    if (error || !data) return CONFIG_DEFAULT;

    const rows = data as { clave: string; valor: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.clave, r.valor === "true"]));

    return {
      abastecimiento: map["pedidos_abastecimiento"] ?? true,
      internos: map["pedidos_internos"] ?? true,
      reposicion: map["pedidos_reposicion"] ?? true,
    };
  } catch {
    return CONFIG_DEFAULT;
  }
}

/**
 * updateConfigPedido()
 * Actualiza un switch en configuracion_sistema.
 * Solo puede ser llamado por admins.
 */
export async function updateConfigPedido(
  clave: "pedidos_abastecimiento" | "pedidos_internos" | "pedidos_reposicion",
  habilitado: boolean
): Promise<{ error: string | null }> {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { error: "No autorizado." };
  }

  try {
    const db = createAdminClient();
    const { error } = await (db as unknown as any)
      .from("configuracion_sistema")
      .upsert(
        { clave, valor: String(habilitado), updated_at: new Date().toISOString() },
        { onConflict: "clave" }
      );

    if (error) return { error: error.message };

    revalidatePath("/inventario");
    return { error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { error: msg };
  }
}
