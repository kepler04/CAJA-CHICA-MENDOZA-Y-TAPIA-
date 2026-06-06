"use server";

import { revalidatePath } from "next/cache";
import type {
  Categoria,
  EstadoGasto,
  Prisma,
  TipoComprobante,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { MONTO_MAXIMO, GASTOS_PAGE_SIZE } from "@/lib/gastos";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type GastoFiltros = {
  areaId?: string;
  categoria?: Categoria;
  estado?: EstadoGasto;
  desde?: string; // ISO date
  hasta?: string; // ISO date
  page?: number;
};

/** Gasto con relaciones que usa la tabla. */
export type GastoConRelaciones = Prisma.GastoGetPayload<{
  include: {
    area: true;
    user: { select: { id: true; nombre: true; email: true } };
  };
}>;

export type GastosPage = {
  gastos: GastoConRelaciones[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Lista gastos con filtros y paginación, aplicando permisos por rol:
 *  - CUSTODIO: solo los gastos que él mismo creó (su área).
 *  - GERENTE_ADMIN / GERENTE_CONTABLE / GERENTE_GENERAL: todos los gastos.
 */
export async function getGastos(
  filtros: GastoFiltros = {}
): Promise<GastosPage> {
  const user = await getSessionUser();
  const empty: GastosPage = {
    gastos: [],
    total: 0,
    page: 1,
    pageSize: GASTOS_PAGE_SIZE,
    totalPages: 0,
  };
  if (!user) return empty;

  const page = Math.max(1, filtros.page ?? 1);
  const pageSize = GASTOS_PAGE_SIZE;

  const where: Prisma.GastoWhereInput = {};

  // Permisos: el custodio solo ve lo suyo.
  if (user.role === "CUSTODIO") {
    where.creadoPor = user.id;
  }

  if (filtros.areaId) where.areaId = filtros.areaId;
  if (filtros.categoria) where.categoria = filtros.categoria;
  if (filtros.estado) where.estado = filtros.estado;

  if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = new Date(filtros.desde);
    if (filtros.hasta) {
      // Incluir todo el día "hasta".
      const hasta = new Date(filtros.hasta);
      hasta.setHours(23, 59, 59, 999);
      where.fecha.lte = hasta;
    }
  }

  const [total, gastos] = await Promise.all([
    prisma.gasto.count({ where }),
    prisma.gasto.findMany({
      where,
      include: {
        area: true,
        user: { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    gastos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Crea un gasto. Solo el CUSTODIO puede registrar gastos.
 * El comprobante ya fue subido a Storage desde el cliente; aquí solo se
 * guarda su URL pública. Valida el monto máximo de S/ 150.
 */
export async function createGasto(input: {
  fecha: string;
  monto: number;
  descripcion: string;
  categoria: Categoria;
  areaId: string;
  tipoComprobante: TipoComprobante;
  numeroComprobante?: string;
  comprobanteUrl?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "No autenticado." };
  if (user.role !== "CUSTODIO") {
    return {
      ok: false,
      error: "Solo el custodio puede registrar gastos.",
    };
  }

  const descripcion = input.descripcion?.trim();
  const monto = Number(input.monto);

  // Validaciones
  if (!input.fecha) return { ok: false, error: "La fecha es obligatoria." };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!descripcion) {
    return { ok: false, error: "La descripción es obligatoria." };
  }
  if (!input.areaId) return { ok: false, error: "Selecciona un área." };

  // El área debe existir y estar activa.
  const area = await prisma.area.findUnique({ where: { id: input.areaId } });
  if (!area || !area.activo) {
    return { ok: false, error: "El área seleccionada no es válida." };
  }

  // El monto máximo por operación lo define cada área.
  const montoMaximo = area.montoMaximo ?? MONTO_MAXIMO;
  if (monto > montoMaximo) {
    return {
      ok: false,
      error: `El monto máximo por operación en ${area.nombre} es S/ ${montoMaximo}.`,
    };
  }

  try {
    const gasto = await prisma.gasto.create({
      data: {
        fecha: new Date(input.fecha),
        monto,
        descripcion,
        categoria: input.categoria,
        areaId: input.areaId,
        tipoComprobante: input.tipoComprobante,
        numeroComprobante: input.numeroComprobante?.trim() || null,
        comprobanteUrl: input.comprobanteUrl || null,
        estado: "PENDIENTE",
        creadoPor: user.id,
      },
    });
    revalidatePath("/gastos");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: gasto.id } };
  } catch {
    return { ok: false, error: "No se pudo registrar el gasto." };
  }
}

/** Detalle completo de un gasto con su historial de aprobaciones. */
export async function getGastoById(id: string) {
  const user = await getSessionUser();
  if (!user) return null;

  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: {
      area: true,
      user: { select: { id: true, nombre: true, email: true, role: true } },
      aprobaciones: {
        include: {
          user: { select: { nombre: true, email: true, role: true } },
        },
        orderBy: { fecha: "asc" },
      },
    },
  });

  if (!gasto) return null;

  // El custodio solo puede ver el detalle de sus propios gastos.
  if (user.role === "CUSTODIO" && gasto.creadoPor !== user.id) {
    return null;
  }

  return gasto;
}

export type GastoDetalle = NonNullable<
  Awaited<ReturnType<typeof getGastoById>>
>;
