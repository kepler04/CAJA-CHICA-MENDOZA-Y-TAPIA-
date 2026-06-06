/**
 * Lectura centralizada de las credenciales públicas de Supabase.
 *
 * Supabase tiene dos formatos de clave pública según la antigüedad del
 * proyecto:
 *   - Formato clásico: NEXT_PUBLIC_SUPABASE_ANON_KEY  (JWT largo)
 *   - Formato nuevo:    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)
 *
 * Ambas sirven como clave pública para el cliente. Aceptamos cualquiera
 * para evitar fricción según cómo te las entregue el panel.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** true cuando hay URL y clave configuradas. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
