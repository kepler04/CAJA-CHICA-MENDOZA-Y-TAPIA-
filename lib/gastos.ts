import type { Categoria, EstadoGasto, TipoComprobante } from "@prisma/client";

/* ─── Categorías ─────────────────────────────────────────────── */

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  PAPELERIA: "Papelería",
  VIATICOS: "Viáticos",
  MOVILIDAD: "Movilidad",
  ENVIOS: "Envíos",
  PAGO_CARTAS: "Pago de cartas",
  ARTICULOS_MENORES: "Artículos menores",
  SERVICIOS: "Servicios",
  OTROS: "Otros",
};

export const CATEGORIA_OPTIONS: { value: Categoria; label: string }[] = (
  Object.keys(CATEGORIA_LABELS) as Categoria[]
).map((value) => ({ value, label: CATEGORIA_LABELS[value] }));

/** Color por categoría para el gráfico de dona. */
export const CATEGORIA_COLORS: Record<Categoria, string> = {
  PAPELERIA: "#3b82f6",
  VIATICOS: "#f59e0b",
  MOVILIDAD: "#8b5cf6",
  ENVIOS: "#06b6d4",
  PAGO_CARTAS: "#ec4899",
  ARTICULOS_MENORES: "#10b981",
  SERVICIOS: "#6366f1",
  OTROS: "#94a3b8",
};

/* ─── Tipos de comprobante ───────────────────────────────────── */

export const TIPO_COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  FACTURA: "Factura",
  BOLETA_ELECTRONICA: "Boleta electrónica",
  TICKET: "Ticket",
  NOTA_VENTA: "Nota de venta",
  PLANILLA_MOVILIDAD: "Planilla de movilidad",
};

export const TIPO_COMPROBANTE_OPTIONS: {
  value: TipoComprobante;
  label: string;
}[] = (Object.keys(TIPO_COMPROBANTE_LABELS) as TipoComprobante[]).map(
  (value) => ({ value, label: TIPO_COMPROBANTE_LABELS[value] })
);

/* ─── Estados de gasto ───────────────────────────────────────── */

export const ESTADO_LABELS: Record<EstadoGasto, string> = {
  PENDIENTE: "Pendiente",
  APROBADO_N1: "Aprobado N1",
  APROBADO_N2: "Aprobado N2",
  APROBADO_FINAL: "Aprobado final",
  RECHAZADO: "Rechazado",
};

export const ESTADO_OPTIONS: { value: EstadoGasto; label: string }[] = (
  Object.keys(ESTADO_LABELS) as EstadoGasto[]
).map((value) => ({ value, label: ESTADO_LABELS[value] }));

/**
 * Clases de estilo del badge por estado:
 *   PENDIENTE       → gris
 *   APROBADO_N1     → amarillo
 *   APROBADO_N2     → azul
 *   APROBADO_FINAL  → verde
 *   RECHAZADO       → rojo
 */
export const ESTADO_BADGE_CLASSES: Record<EstadoGasto, string> = {
  PENDIENTE:
    "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300",
  APROBADO_N1:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-300",
  APROBADO_N2:
    "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-300",
  APROBADO_FINAL:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300",
  RECHAZADO: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300",
};

export const ESTADO_DOT_CLASSES: Record<EstadoGasto, string> = {
  PENDIENTE: "bg-slate-400",
  APROBADO_N1: "bg-amber-500",
  APROBADO_N2: "bg-blue-500",
  APROBADO_FINAL: "bg-emerald-500",
  RECHAZADO: "bg-red-500",
};

/* ─── Reglas de negocio ──────────────────────────────────────── */

/** Monto máximo permitido por operación de caja chica. */
export const MONTO_MAXIMO = 150;

/** Página por defecto de la tabla de gastos. */
export const GASTOS_PAGE_SIZE = 10;
