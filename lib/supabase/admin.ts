import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./config";

/**
 * Cliente "admin" de Supabase con la clave service_role. Permite operaciones
 * privilegiadas como crear usuarios en Auth desde el servidor.
 *
 * NUNCA debe importarse en código de cliente: la service_role key salta la
 * seguridad a nivel de fila (RLS). Solo se usa en Server Actions.
 *
 * Devuelve null si la service_role key no está configurada, para poder dar
 * un mensaje de error claro en lugar de romper.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !serviceKey) {
    return null;
  }

  return createClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const isAdminConfigured = Boolean(
  SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
