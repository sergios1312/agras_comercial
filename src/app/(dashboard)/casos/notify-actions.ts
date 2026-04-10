"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { cargarCasos } from "@/lib/casos";
import { procesarCorreosCasosAbiertos } from "@/lib/notify-casos";

export async function dispararNotificacionesCasos(): Promise<{
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
    const result = await procesarCorreosCasosAbiertos(casos);

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
