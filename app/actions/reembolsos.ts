"use server";

import { revalidatePath } from "next/cache";
import type { EstadoReembolso, Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: number };

const FORBIDDEN = (msg = "No autorizado.") =>
  ({ ok: false, error: msg, code: 403 }) as const;

/** Gasto listo para reembolsar con su área. */
export type GastoReembolsable = Prisma.GastoGetPayload<{
  include: { area: true };
}>;

/** Reembolso con relaciones que usa el historial. */
export type ReembolsoConRelaciones = Prisma.ReembolsoGetPayload<{
  include: {
    user: { select: { nombre: true; email: true } };
    _count: { select: { gastos: true } };
  };
}>;

/**
 * Roles autorizados a SOLICITAR un reembolso.
 * (CUSTODIO y GERENTE_GENERAL según especificación.)
 */
const PUEDEN_SOLICITAR: Role[] = ["CUSTODIO", "GERENTE_GENERAL"];

/* ─── Lecturas ───────────────────────────────────────────────── */

/** Gastos APROBADO_FINAL que aún no están asignados a ningún reembolso. */
export async function getGastosParaReembolsar(): Promise<GastoReembolsable[]> {
  const user = await getSessionUser();
  if (!user) return [];

  return prisma.gasto.findMany({
    where: { estado: "APROBADO_FINAL", reembolso: null },
    include: { area: true },
    orderBy: { fecha: "asc" },
  });
}

/** Historial completo de reembolsos. */
export async function getReembolsos(): Promise<ReembolsoConRelaciones[]> {
  const user = await getSessionUser();
  if (!user) return [];

  return prisma.reembolso.findMany({
    include: {
      user: { select: { nombre: true, email: true } },
      _count: { select: { gastos: true } },
    },
    orderBy: { fechaSolicitud: "desc" },
  });
}

/** Detalle de un reembolso con los gastos incluidos. */
export async function getReembolsoById(id: string) {
  const user = await getSessionUser();
  if (!user) return null;

  return prisma.reembolso.findUnique({
    where: { id },
    include: {
      user: { select: { nombre: true, email: true } },
      gastos: {
        include: { gasto: { include: { area: true } } },
      },
    },
  });
}

export type ReembolsoDetalle = NonNullable<
  Awaited<ReturnType<typeof getReembolsoById>>
>;

/* ─── Escrituras ─────────────────────────────────────────────── */

/**
 * Agrupa todos los gastos APROBADO_FINAL sin reembolso en un nuevo
 * Reembolso (estado SOLICITADO). Transacción para evitar que dos
 * solicitudes incluyan el mismo gasto. Solo CUSTODIO / GERENTE_GENERAL.
 */
export async function crearReembolso(): Promise<
  ActionResult<{ id: string; montoTotal: number; cantidad: number }>
> {
  const user = await getSessionUser();
  if (!user) return FORBIDDEN("No autenticado.");
  if (!PUEDEN_SOLICITAR.includes(user.role)) {
    return FORBIDDEN("No tienes permisos para solicitar reembolsos.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const gastos = await tx.gasto.findMany({
        where: { estado: "APROBADO_FINAL", reembolso: null },
        select: { id: true, monto: true },
      });

      if (gastos.length === 0) {
        throw new Error("SIN_GASTOS");
      }

      const montoTotal = gastos.reduce((acc, g) => acc + g.monto, 0);

      const reembolso = await tx.reembolso.create({
        data: {
          montoTotal,
          estado: "SOLICITADO",
          solicitadoPor: user.id,
          gastos: {
            create: gastos.map((g) => ({ gastoId: g.id })),
          },
        },
      });

      return { id: reembolso.id, montoTotal, cantidad: gastos.length };
    });

    revalidatePath("/reembolsos");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SIN_GASTOS")
      return { ok: false, error: "No hay gastos pendientes de reembolso." };
    return { ok: false, error: "No se pudo crear el reembolso." };
  }
}

/**
 * Transiciones de estado permitidas por rol:
 *   GERENTE_ADMIN   : SOLICITADO   → EN_REVISION
 *   GERENTE_GENERAL : EN_REVISION  → REEMBOLSADO  (repone el fondo)
 */
function transicionPermitida(
  role: Role,
  actual: EstadoReembolso,
  destino: EstadoReembolso
): boolean {
  if (
    role === "GERENTE_ADMIN" &&
    actual === "SOLICITADO" &&
    destino === "EN_REVISION"
  ) {
    return true;
  }
  if (
    role === "GERENTE_GENERAL" &&
    actual === "EN_REVISION" &&
    destino === "REEMBOLSADO"
  ) {
    return true;
  }
  return false;
}

/**
 * Avanza el estado del reembolso. Si pasa a REEMBOLSADO, repone el saldo
 * del fondo (saldoActual += montoTotal) y registra la fecha, todo en una
 * transacción. Valida el rol y la transición en el servidor.
 */
export async function cambiarEstadoReembolso(
  id: string,
  estado: EstadoReembolso
): Promise<ActionResult<{ estado: EstadoReembolso; nuevoSaldo?: number }>> {
  const user = await getSessionUser();
  if (!user) return FORBIDDEN("No autenticado.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reembolso = await tx.reembolso.findUnique({ where: { id } });
      if (!reembolso) throw new Error("NOT_FOUND");

      if (!transicionPermitida(user.role, reembolso.estado, estado)) {
        throw new Error("FORBIDDEN");
      }

      const actualizado = await tx.reembolso.update({
        where: { id },
        data: {
          estado,
          fechaReembolso: estado === "REEMBOLSADO" ? new Date() : undefined,
        },
      });

      let nuevoSaldo: number | undefined;

      // Al reembolsar, reponer el saldo de cada ÁREA según los gastos que
      // componen el reembolso.
      if (estado === "REEMBOLSADO") {
        const lineas = await tx.reembolsoGasto.findMany({
          where: { reembolsoId: id },
          include: { gasto: { select: { areaId: true, monto: true } } },
        });

        // Sumar por área
        const porArea = new Map<string, number>();
        for (const l of lineas) {
          porArea.set(
            l.gasto.areaId,
            (porArea.get(l.gasto.areaId) ?? 0) + l.gasto.monto
          );
        }
        for (const [areaId, total] of Array.from(porArea.entries())) {
          const area = await tx.area.findUnique({ where: { id: areaId } });
          if (!area) throw new Error("NO_AREA");
          await tx.area.update({
            where: { id: areaId },
            data: { saldoActual: area.saldoActual + total },
          });
        }

        // Saldo total actualizado (suma de áreas activas) para el toast.
        const agg = await tx.area.aggregate({
          _sum: { saldoActual: true },
          where: { activo: true },
        });
        nuevoSaldo = agg._sum.saldoActual ?? 0;
      }

      return { estado: actualizado.estado, nuevoSaldo };
    });

    revalidatePath("/reembolsos");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { ok: false, error: "El reembolso no existe." };
    if (msg === "FORBIDDEN")
      return FORBIDDEN("No puedes realizar este cambio de estado.");
    if (msg === "NO_AREA")
      return { ok: false, error: "No se encontró el área de un gasto." };
    return { ok: false, error: "No se pudo cambiar el estado del reembolso." };
  }
}
