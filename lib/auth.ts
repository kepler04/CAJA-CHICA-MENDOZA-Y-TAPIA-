import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/roles";

// Reexportamos los helpers compartibles para mantener una sola fuente de
// importación desde el servidor.
export { ROLE_LABELS } from "@/lib/roles";
export type { SessionUser } from "@/lib/roles";

/**
 * Devuelve el usuario autenticado combinando la sesión de Supabase Auth
 * con su perfil (nombre y rol) almacenado en la base de datos.
 *
 * - Si no hay sesión de Supabase, devuelve null.
 * - Si hay sesión pero no existe un perfil en la tabla User (o no tiene
 *   email), usa el email de la sesión y el rol CUSTODIO como respaldo
 *   para no romper el render del layout.
 *
 * Solo puede usarse en código de servidor (Server Components / Actions).
 */
/**
 * Usuario ficticio para el modo demo (NEXT_PUBLIC_DEMO_MODE=true), que
 * permite recorrer la UI sin configurar Supabase. Rol GERENTE_GENERAL
 * para que se vean todos los enlaces del sidebar, incluido "Usuarios".
 */
const DEMO_USER: SessionUser = {
  id: "demo-user",
  email: "demo@mendozaytapia.com",
  nombre: "Usuario Demo",
  role: "GERENTE_GENERAL",
};

/**
 * Cacheado con React.cache(): durante un mismo render del servidor, varias
 * llamadas (layout + página) comparten el resultado y NO repiten las dos
 * consultas de red (Supabase Auth + Prisma). Reduce la latencia al navegar.
 */
export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    // Sin credenciales de Supabase configuradas, no hay sesión posible.
    if (!isSupabaseConfigured) {
      // Modo demo: devolvemos un usuario ficticio para poder ver la UI.
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        return DEMO_USER;
      }
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return null;
    }

    const profile = await prisma.user.findUnique({
      where: { email: user.email },
    });

    return {
      // Usamos el id del perfil de Prisma para que coincida con las filas de
      // la tabla User (lo que se muestra en /usuarios). Si aún no hay perfil,
      // caemos al id de la cuenta de Auth.
      id: profile?.id ?? user.id,
      email: user.email,
      nombre: profile?.nombre ?? user.email.split("@")[0],
      role: profile?.role ?? "CUSTODIO",
    };
  }
);
