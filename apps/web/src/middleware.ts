import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de Next.js — protege rutas que requieren autenticación.
 *
 * Corre en el Edge Runtime (antes de que la página se renderice).
 * Lee el token del cookie `ic_token` para proteger rutas server-side.
 *
 * El JWT también se guarda en localStorage para las llamadas fetch() del cliente.
 * Este middleware usa cookies porque localStorage no está disponible en el servidor.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — no requieren autenticación
  const publicPaths = ["/login", "/register"];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar el cookie de sesión
  const token = request.cookies.get("ic_token")?.value;

  // Si no hay token, redirigir al login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar el middleware solo a estas rutas
  matcher: ["/inbox/:path*"],
};
