import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Si el middleware falla (p. ej. error transitorio de red/auth), dejamos
    // pasar la petición en lugar de romper la navegación. Las páginas server
    // (force-dynamic) vuelven a validar la sesión y redirigen si hace falta.
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Ejecuta el middleware en todas las rutas EXCEPTO:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico y archivos de imagen comunes
     * Esto cubre "/", "/login" y todas las rutas protegidas.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
