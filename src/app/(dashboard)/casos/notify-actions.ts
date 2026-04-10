"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { cargarCasos } from "@/lib/casos";
import { procesarCorreosCasosAbiertos, obtenerVistaPrevia } from "@/lib/notify-casos";
import type { Caso } from "@/types/casos.types";

export async function previsualizarCasosAccion(targetSucursales: string[]): Promise<{
  success: boolean;
  data?: Record<string, Caso[]>;
  error?: string;
}> {
  const user = await getSession();
  if (!user || user.role !== "admin") return { success: false, error: "Acceso denegado." };

  try {
    const casos = cargarCasos();
    const result = obtenerVistaPrevia(casos, targetSucursales);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dispararNotificacionesCasos(targetSucursales: string[]): Promise<{
  success: boolean;
  notificados: number;
  megaReporte: string[];
  error?: string;
}> {
  // Verificación de seguridad
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return {
      success: false,
      notificados: 0,
      megaReporte: [],
      error: "Acceso denegado. Solo el administrador puede enviar notificaciones masivas."
    };
  }

  try {
    // 1. Cargar casos usando parser
    const casos = cargarCasos();
    
    // 2. Procesar y disparar motor de email (esperar la asincronía y su rate limit padding)
    const result = await procesarCorreosCasosAbiertos(casos, targetSucursales);

    revalidatePath("/casos");
    
    return result;
  } catch (error: any) {
    console.error("Error en Action dispararNotificacionesCasos:", error);
    return {
      success: false,
      notificados: 0,
      megaReporte: [],
      error: error.message || "Error al procesar el pipeline de notificaciones"
    };
  }
}
