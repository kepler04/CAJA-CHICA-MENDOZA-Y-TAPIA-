import "server-only";

import type { EstadoGasto, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Flujo de aprobación de 3 niveles. Cada rol gerencial revisa los gastos
 * en un estado concreto y, al aprobar, los pasa al siguiente estado:
 *
 *   GERENTE_ADMIN    PENDIENTE   → APROBADO_N1     (nivel 1)
 *   GERENTE_CONTABLE APROBADO_N1 → APROBADO_N2     (nivel 2)
 *   GERENTE_GENERAL  APROBADO_N2 → APROBADO_FINAL  (nivel 3, descuenta fondo)
 *
 * El CUSTODIO no aprueba.
 */
export type NivelAprobacion = {
  /** Estado en el que el gasto espera la revisión de este rol. */
  origen: EstadoGasto;
  /** Estado al que pasa el gasto tras aprobar. */
  destino: EstadoGasto;
  /** Número de nivel (1, 2 o 3) que se registra en la tabla Aprobacion. */
  nivel: number;
  /** true si al aprobar se llega al estado final (descuenta el fondo). */
  esFinal: boolean;
};

export const FLUJO_APROBACION: Partial<Record<Role, NivelAprobacion>> = {
  GERENTE_ADMIN: {
    origen: "PENDIENTE",
    destino: "APROBADO_N1",
    nivel: 1,
    esFinal: false,
  },
  GERENTE_CONTABLE: {
    origen: "APROBADO_N1",
    destino: "APROBADO_N2",
    nivel: 2,
    esFinal: false,
  },
  GERENTE_GENERAL: {
    origen: "APROBADO_N2",
    destino: "APROBADO_FINAL",
    nivel: 3,
    esFinal: true,
  },
};

/** Estado que cada rol tiene pendiente de revisar (origen de su nivel). */
export const ESTADO_PENDIENTE_POR_ROL: Partial<Record<Role, EstadoGasto>> = {
  GERENTE_ADMIN: FLUJO_APROBACION.GERENTE_ADMIN!.origen,
  GERENTE_CONTABLE: FLUJO_APROBACION.GERENTE_CONTABLE!.origen,
  GERENTE_GENERAL: FLUJO_APROBACION.GERENTE_GENERAL!.origen,
};

/** Devuelve la definición de nivel para un rol, o null si no aprueba. */
export function nivelDeRol(role: Role): NivelAprobacion | null {
  return FLUJO_APROBACION[role] ?? null;
}

/**
 * Cuenta los gastos pendientes de aprobación para el rol indicado.
 * Devuelve 0 para roles que no aprueban (p. ej. CUSTODIO).
 */
export async function contarPendientesPorRol(role: Role): Promise<number> {
  const estado = ESTADO_PENDIENTE_POR_ROL[role];
  if (!estado) return 0;
  return prisma.gasto.count({ where: { estado } });
}
