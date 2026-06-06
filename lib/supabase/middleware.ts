import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY,
  isSupabaseConfigured,
} from "./config";

/**
 * Rutas que requieren una sesión activa. Si un usuario no autenticado
 * intenta entrar a cualquiera de ellas, se le redirige a /login.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/areas",
  "/gastos",
  "/aprobaciones",
  "/reembolsos",
  "/reportes",
  "/usuarios",
  "/configuracion",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Refresca la sesión de Supabase en cada petición (necesario porque los
 * tokens caducan) y aplica las reglas de redirección de acceso.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Si aún no se han configurado las credenciales de Supabase (.env vacío),
  // dejamos pasar la petición sin autenticar en lugar de lanzar un 500.
  // En producción las variables estarán definidas y este guard no aplica.
  if (!isSupabaseConfigured) {
    // En modo demo, la raíz lleva directo al dashboard para ver la UI.
    if (
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      request.nextUrl.pathname === "/"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_PUBLIC_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  // getUser() valida el token contra el servidor de Auth y refresca cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sin sesión e intentando entrar a una ruta protegida -> a /login.
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Autorización por rol para /usuarios (solo GERENTE_GENERAL).
  // El rol viaja en el JWT (user_metadata/app_metadata), disponible aquí en
  // el Edge sin tocar la base de datos. Si el rol no está en el token
  // (p. ej. cuentas creadas a mano sin metadata), dejamos pasar y la página
  // server hace el redirect definitivo. Así nunca se filtra el acceso.
  if (user && (pathname === "/usuarios" || pathname.startsWith("/usuarios/"))) {
    const role =
      (user.user_metadata?.role as string | undefined) ??
      (user.app_metadata?.role as string | undefined);
    if (role && role !== "GERENTE_GENERAL") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Con sesión activa y entrando a /login -> al dashboard.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Raíz: redirigir según haya o no sesión.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
