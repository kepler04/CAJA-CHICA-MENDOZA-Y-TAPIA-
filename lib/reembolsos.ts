import type { EstadoReembolso } from "@prisma/client";

export const ESTADO_REEMBOLSO_LABELS: Record<EstadoReembolso, string> = {
  SOLICITADO: "Solicitado",
  EN_REVISION: "En revisión",
  REEMBOLSADO: "Reembolsado",
};

/**
 * Clases del badge por estado de reembolso:
 *   SOLICITADO  → amarillo
 *   EN_REVISION → azul
 *   REEMBOLSADO → verde
 */
export const ESTADO_REEMBOLSO_BADGE_CLASSES: Record<EstadoReembolso, string> = {
  SOLICITADO:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-300",
  EN_REVISION: "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-300",
  REEMBOLSADO:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300",
};

export const ESTADO_REEMBOLSO_DOT_CLASSES: Record<EstadoReembolso, string> = {
  SOLICITADO: "bg-amber-500",
  EN_REVISION: "bg-blue-500",
  REEMBOLSADO: "bg-emerald-500",
};
