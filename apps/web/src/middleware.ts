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
  const token = request.cookies.get("ic_token")?.value;

  // Páginas pública solo — si ya autenticado, ir al destino original o al inbox
  const publicOnly = ["/login", "/register", "/signup"];
  if (publicOnly.some((p) => pathname.startsWith(p)) && token) {
    const from = request.nextUrl.searchParams.get("from");
    const dest = from && from.startsWith("/") ? from : "/inbox";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Rutas pública — no requieren auth
  if (publicOnly.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Requiere auth
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/inbox/:path*", "/settings/:path*", "/analytics/:path*", "/analytics", "/login", "/register", "/signup"],
};
