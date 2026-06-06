import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "./config";

/**
 * Cliente de Supabase para componentes que corren en el navegador
 * (Client Components). Úsalo dentro de archivos marcados con "use client".
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_PUBLIC_KEY!);
}
