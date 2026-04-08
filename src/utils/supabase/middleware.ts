import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * updateSession()
 * Función exclusiva para el middleware de Next.js.
 * Refresca el Auth Token de Supabase en cada petición y actualiza las cookies
 * de respuesta para garantizar que la sesión nunca caduque inesperadamente.
 * También protege las rutas del dashboard redirigiendo a /login si no hay sesión.
 */
export async function updateSession(request: NextRequest) {
  // Comenzamos con la respuesta "pass-through" que modificaremos con las cookies actualizadas.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Primero actualizamos las cookies en el request entrante...
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          // ...luego creamos una nueva respuesta con el request ya actualizado.
          supabaseResponse = NextResponse.next({ request });
          // Finalmente escribimos las cookies en la respuesta para que el browser las guarde.
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No ejecutar lógica entre createServerClient y getUser().
  // getUser() envía el token a Supabase para verificarlo (no depende solo del JWT local).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas del dashboard que requieren autenticación
  const protectedPaths = ["/inventario", "/casos", "/estadisticas"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Si el usuario no está autenticado e intenta acceder a una ruta protegida, redirigir a /login
  if (!user && isProtectedPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Si el usuario está autenticado y accede a /login, redirigir al dashboard
  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/inventario";
    return NextResponse.redirect(dashboardUrl);
  }

  // Devolver la respuesta con las cookies de sesión actualizadas
  return supabaseResponse;
}
