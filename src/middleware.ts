import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get("sede_session")?.value;

  // Rutas del dashboard que requieren autenticación
  const protectedPaths = ["/inventario", "/casos", "/estadisticas"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Redirigir a login si intenta acceder a ruta protegida sin sesión
  if (!sessionCookie && isProtectedPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirigir al dashboard si ya tiene sesión activa y accede a login o /
  if (sessionCookie && (pathname === "/login" || pathname === "/")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/inventario";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
