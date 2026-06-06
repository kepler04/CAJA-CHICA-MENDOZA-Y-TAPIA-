import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "./config";

/**
 * Cliente de Supabase para código que corre en el servidor:
 * Server Components, Server Actions y Route Handlers.
 *
 * Lee y escribe la sesión desde las cookies de la petición. El bloque
 * try/catch en `setAll` cubre el caso de los Server Components, donde
 * Next.js no permite mutar cookies; en ese escenario el refresco de la
 * sesión lo realiza el middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_PUBLIC_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component: ignorar.
          // El middleware se encarga de refrescar la sesión.
        }
      },
    },
  });
}
