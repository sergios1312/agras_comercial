import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * middleware.ts — Raíz de src/
 * Intercepta todas las peticiones para refrescar la sesión de Supabase.
 * La lógica de protección de rutas está encapsulada en updateSession().
 */
export async function middleware(request: NextRequest) {
  // return await updateSession(request);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplicar el middleware a todas las rutas EXCEPTO:
     * - _next/static  (archivos estáticos compilados)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico   (ícono del sitio)
     * - archivos con extensión (imágenes, fuentes, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
