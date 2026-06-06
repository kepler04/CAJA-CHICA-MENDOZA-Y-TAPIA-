"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { nivelDeRol } from "@/lib/pendientes";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: number };

/** Gasto pendiente con relaciones que usa la tabla de aprobaciones. */
export type GastoPendiente = Prisma.GastoGetPayload<{
  include: {
    area: true;
    user: { select: { id: true; nombre: true; email: true } };
  };
}>;

const FORBIDDEN = (msg = "No autorizado.") =>
  ({ ok: false, error: msg, code: 403 }) as const;

/**
 * Lista los gastos que el rol indicado tiene pendientes de aprobar
 * (los que están en el estado de origen de su nivel). El rol se toma de
 * la sesión; el parámetro `rol` se acepta por compatibilidad con la firma
 * pedida pero se valida contra la sesión real.
 */
export async function getGastosPendientes(
  rol?: Role
): Promise<GastoPendiente[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const nivel = nivelDeRol(user.role);
  if (!nivel) return []; // CUSTODIO u otros no aprueban

  // Si se pasó un rol distinto al de la sesión, ignoramos por seguridad.
  void rol;

  return prisma.gasto.findMany({
    where: { estado: nivel.origen },
    include: {
      area: true,
      user: { select: { id: true, nombre: true, email: true } },
    },
    orderBy: { fecha: "asc" },
  });
}

/**
 * Aprueba un gasto: valida el rol, mueve el estado al siguiente nivel,
 * registra la Aprobacion y, si es el nivel final, descuenta el monto del
 * saldo del fondo. Todo dentro de una transacción.
 */
export async function aprobarGasto(
  gastoId: string
): Promise<ActionResult<{ estado: string }>> {
  const user = await getSessionUser();
  if (!user) return FORBIDDEN("No autenticado.");

  const nivel = nivelDeRol(user.role);
  if (!nivel) return FORBIDDEN("Tu rol no puede aprobar gastos.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.findUnique({ where: { id: gastoId } });
      if (!gasto) {
        throw new Error("NOT_FOUND");
      }
      // El gasto debe estar exactamente en el estado de origen de este rol.
      if (gasto.estado !== nivel.origen) {
        throw new Error("WRONG_STATE");
      }

      const actualizado = await tx.gasto.update({
        where: { id: gastoId },
        data: { estado: nivel.destino },
      });

      await tx.aprobacion.create({
        data: {
          gastoId,
          aprobadoPor: user.id,
          nivel: nivel.nivel,
          accion: "APROBADO",
        },
      });

      // Al llegar al nivel final, descontar del saldo del ÁREA del gasto.
      if (nivel.esFinal) {
        const area = await tx.area.findUnique({ where: { id: gasto.areaId } });
        if (!area) throw new Error("NO_AREA");
        await tx.area.update({
          where: { id: area.id },
          data: { saldoActual: area.saldoActual - gasto.monto },
        });
      }

      return actualizado.estado;
    });

    revalidatePath("/aprobaciones");
    revalidatePath("/gastos");
    revalidatePath("/dashboard");
    return { ok: true, data: { estado: result } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { ok: false, error: "El gasto ya no existe." };
    if (msg === "WRONG_STATE")
      return {
        ok: false,
        error: "El gasto ya no está en tu nivel de aprobación.",
      };
    if (msg === "NO_AREA")
      return { ok: false, error: "No se encontró el área del gasto." };
    return { ok: false, error: "No se pudo aprobar el gasto." };
  }
}

/**
 * Rechaza un gasto con motivo obligatorio. Cambia el estado a RECHAZADO y
 * registra la Aprobacion con la acción y la observación. No toca el fondo.
 */
export async function rechazarGasto(
  gastoId: string,
  motivo: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return FORBIDDEN("No autenticado.");

  const nivel = nivelDeRol(user.role);
  if (!nivel) return FORBIDDEN("Tu rol no puede rechazar gastos.");

  const obs = motivo?.trim();
  if (!obs) {
    return { ok: false, error: "El motivo del rechazo es obligatorio." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.findUnique({ where: { id: gastoId } });
      if (!gasto) throw new Error("NOT_FOUND");
      if (gasto.estado !== nivel.origen) throw new Error("WRONG_STATE");

      await tx.gasto.update({
        where: { id: gastoId },
        data: { estado: "RECHAZADO" },
      });

      await tx.aprobacion.create({
        data: {
          gastoId,
          aprobadoPor: user.id,
          nivel: nivel.nivel,
          accion: "RECHAZADO",
          observacion: obs,
        },
      });
    });

    revalidatePath("/aprobaciones");
    revalidatePath("/gastos");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { ok: false, error: "El gasto ya no existe." };
    if (msg === "WRONG_STATE")
      return {
        ok: false,
        error: "El gasto ya no está en tu nivel de aprobación.",
      };
    return { ok: false, error: "No se pudo rechazar el gasto." };
  }
}

/**
 * Aprueba múltiples gastos en una sola transacción. Valida el rol y que
 * todos los gastos estén en el estado correcto. Si alguno no lo está, se
 * omite (no rompe la operación completa). Descuenta del fondo los que
 * lleguen al estado final.
 */
export async function aprobarMasivo(
  gastoIds: string[]
): Promise<ActionResult<{ aprobados: number; omitidos: number }>> {
  const user = await getSessionUser();
  if (!user) return FORBIDDEN("No autenticado.");

  const nivel = nivelDeRol(user.role);
  if (!nivel) return FORBIDDEN("Tu rol no puede aprobar gastos.");

  const ids = Array.from(new Set(gastoIds)).filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, error: "No hay gastos seleccionados." };
  }

  try {
    const { aprobados, omitidos } = await prisma.$transaction(async (tx) => {
      // Solo los que realmente están en el estado de origen.
      const gastos = await tx.gasto.findMany({
        where: { id: { in: ids }, estado: nivel.origen },
      });

      const validos = gastos.map((g) => g.id);
      const omitidos = ids.length - validos.length;

      if (validos.length === 0) {
        return { aprobados: 0, omitidos };
      }

      // Mover todos al estado destino.
      await tx.gasto.updateMany({
        where: { id: { in: validos } },
        data: { estado: nivel.destino },
      });

      // Registrar una Aprobacion por cada gasto.
      await tx.aprobacion.createMany({
        data: validos.map((gastoId) => ({
          gastoId,
          aprobadoPor: user.id,
          nivel: nivel.nivel,
          accion: "APROBADO",
        })),
      });

      // Si es el nivel final, descontar de cada área la suma de sus gastos.
      if (nivel.esFinal) {
        const porArea = new Map<string, number>();
        for (const g of gastos) {
          porArea.set(g.areaId, (porArea.get(g.areaId) ?? 0) + g.monto);
        }
        for (const [areaId, total] of Array.from(porArea.entries())) {
          const area = await tx.area.findUnique({ where: { id: areaId } });
          if (!area) throw new Error("NO_AREA");
          await tx.area.update({
            where: { id: areaId },
            data: { saldoActual: area.saldoActual - total },
          });
        }
      }

      return { aprobados: validos.length, omitidos };
    });

    revalidatePath("/aprobaciones");
    revalidatePath("/gastos");
    revalidatePath("/dashboard");
    return { ok: true, data: { aprobados, omitidos } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NO_AREA")
      return { ok: false, error: "No se encontró el área de un gasto." };
    return { ok: false, error: "No se pudieron aprobar los gastos." };
  }
}

/**
 * Devuelve el timeline completo de un gasto: quién lo registró y cada
 * paso de aprobación/rechazo en orden cronológico.
 */
export async function getHistorialAprobaciones(gastoId: string) {
  const user = await getSessionUser();
  if (!user) return null;

  const gasto = await prisma.gasto.findUnique({
    where: { id: gastoId },
    include: {
      user: { select: { nombre: true, email: true, role: true } },
      aprobaciones: {
        include: {
          user: { select: { nombre: true, email: true, role: true } },
        },
        orderBy: { fecha: "asc" },
      },
    },
  });

  return gasto;
}
