import { createClient } from "@/lib/supabase/client";

/** Nombre del bucket público donde se guardan los comprobantes. */
export const COMPROBANTES_BUCKET = "comprobantes";

export type UploadResult =
  | { ok: true; path: string; url: string }
  | { ok: false; error: string };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/**
 * Sube el archivo del comprobante al bucket "comprobantes" de Supabase
 * Storage, dentro de una carpeta por gasto. Devuelve el path interno y la
 * URL pública. Se ejecuta en el navegador (Client Component).
 */
export async function uploadComprobante(
  file: File,
  gastoId: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: "Formato no permitido. Usa JPG, PNG o PDF.",
    };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "El archivo supera el máximo de 5MB." };
  }

  const supabase = createClient();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${gastoId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(COMPROBANTES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, path, url: getComprobanteUrl(path) };
}

/**
 * Devuelve la URL pública de un comprobante a partir de su path en Storage.
 * Como el bucket es público, la URL es accesible directamente.
 */
export function getComprobanteUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(COMPROBANTES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
