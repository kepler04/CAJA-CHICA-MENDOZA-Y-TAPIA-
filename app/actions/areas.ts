"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Area } from "@prisma/client";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Verifica que el usuario actual sea GERENTE_GENERAL. */
async function requireGerenteGeneral() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "No autenticado." };
  }
  if (user.role !== "GERENTE_GENERAL") {
    return {
      ok: false as const,
      error: "No tienes permisos para esta acción.",
    };
  }
  return { ok: true as const, user };
}

/** Lista todas las áreas, ordenadas por fecha de creación (más nuevas primero). */
export async function getAreas(): Promise<Area[]> {
  return prisma.area.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/** Valida los campos de presupuesto. Devuelve un mensaje de error o null. */
function validarPresupuesto(p: {
  montoTotal: number;
  umbralAlerta: number;
  montoMaximo: number;
}): string | null {
  if (!Number.isFinite(p.montoTotal) || p.montoTotal <= 0)
    return "El monto de caja chica debe ser mayor a 0.";
  if (!Number.isFinite(p.umbralAlerta) || p.umbralAlerta < 0)
    return "El umbral de alerta no es válido.";
  if (p.umbralAlerta >= p.montoTotal)
    return "El umbral debe ser menor que el monto de caja chica.";
  if (!Number.isFinite(p.montoMaximo) || p.montoMaximo <= 0)
    return "El monto máximo por gasto debe ser mayor a 0.";
  if (p.montoMaximo > p.montoTotal)
    return "El monto máximo por gasto no puede superar la caja chica.";
  return null;
}

/**
 * Crea una nueva área con su presupuesto de caja chica. El saldo inicial
 * arranca lleno (= montoTotal). Solo GERENTE_GENERAL.
 */
export async function createArea(input: {
  nombre: string;
  descripcion?: string;
  montoTotal: number;
  umbralAlerta: number;
  montoMaximo: number;
}): Promise<ActionResult<Area>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  const nombre = input.nombre?.trim();
  if (!nombre) {
    return { ok: false, error: "El nombre del área es obligatorio." };
  }

  const montoTotal = Number(input.montoTotal);
  const umbralAlerta = Number(input.umbralAlerta);
  const montoMaximo = Number(input.montoMaximo);
  const errPres = validarPresupuesto({ montoTotal, umbralAlerta, montoMaximo });
  if (errPres) return { ok: false, error: errPres };

  const descripcion = input.descripcion?.trim() || null;

  try {
    const area = await prisma.area.create({
      data: {
        nombre,
        descripcion,
        montoTotal,
        saldoActual: montoTotal, // la caja arranca llena
        umbralAlerta,
        montoMaximo,
      },
    });
    revalidatePath("/areas");
    revalidatePath("/dashboard");
    return { ok: true, data: area };
  } catch {
    return { ok: false, error: "No se pudo crear el área." };
  }
}

/**
 * Edita un área: nombre, descripción y parámetros de presupuesto. NO toca
 * el saldoActual (refleja el dinero real ya gastado; se gestiona vía gastos
 * y reembolsos). Solo GERENTE_GENERAL.
 */
export async function updateArea(input: {
  id: string;
  nombre: string;
  descripcion?: string;
  montoTotal: number;
  umbralAlerta: number;
  montoMaximo: number;
}): Promise<ActionResult<Area>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  const nombre = input.nombre?.trim();
  if (!nombre) {
    return { ok: false, error: "El nombre del área es obligatorio." };
  }

  const montoTotal = Number(input.montoTotal);
  const umbralAlerta = Number(input.umbralAlerta);
  const montoMaximo = Number(input.montoMaximo);
  const errPres = validarPresupuesto({ montoTotal, umbralAlerta, montoMaximo });
  if (errPres) return { ok: false, error: errPres };

  const descripcion = input.descripcion?.trim() || null;

  try {
    const area = await prisma.area.update({
      where: { id: input.id },
      data: { nombre, descripcion, montoTotal, umbralAlerta, montoMaximo },
    });
    revalidatePath("/areas");
    revalidatePath("/dashboard");
    return { ok: true, data: area };
  } catch {
    return { ok: false, error: "No se pudo actualizar el área." };
  }
}

/**
 * Activa o desactiva un área (no se eliminan). Solo GERENTE_GENERAL.
 * El nuevo estado se pasa explícitamente para evitar condiciones de carrera.
 */
export async function toggleArea(input: {
  id: string;
  activo: boolean;
}): Promise<ActionResult<Area>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  try {
    const area = await prisma.area.update({
      where: { id: input.id },
      data: { activo: input.activo },
    });
    revalidatePath("/areas");
    revalidatePath("/dashboard");
    return { ok: true, data: area };
  } catch {
    return { ok: false, error: "No se pudo cambiar el estado del área." };
  }
}
