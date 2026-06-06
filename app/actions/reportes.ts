"use server";

import type { Categoria, EstadoGasto } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { CATEGORIA_LABELS } from "@/lib/gastos";

export type ReporteFiltros = {
  areaIds?: string[];
  categorias?: Categoria[];
  estados?: EstadoGasto[];
  desde?: string; // ISO date
  hasta?: string; // ISO date
};

/** Fila de gasto aplanada y serializable para tabla y exportaciones. */
export type ReporteGastoRow = {
  id: string;
  fecha: string; // ISO
  area: string;
  categoria: Categoria;
  categoriaLabel: string;
  descripcion: string;
  monto: number;
  tieneComprobante: boolean;
  comprobanteUrl: string | null;
  estado: EstadoGasto;
  registradoPor: string;
  aprobadoPor: string; // último aprobador o "—"
};

export type ReporteResumen = {
  total: number;
  operaciones: number;
  promedio: number;
  masAlto: number;
  areaTop: string;
  categoriaTop: string;
};

export type TotalPorClave = { clave: string; total: number };
export type PuntoLinea = { fecha: string; total: number };

export type ReembolsoReporte = {
  id: string;
  fechaSolicitud: string;
  fechaReembolso: string | null;
  estado: string;
  montoTotal: number;
  solicitadoPor: string;
  numGastos: number;
};

export type ReporteData = {
  periodo: { desde: string | null; hasta: string | null };
  resumen: ReporteResumen;
  porArea: TotalPorClave[];
  porCategoria: TotalPorClave[];
  porDia: PuntoLinea[];
  detalle: ReporteGastoRow[];
  reembolsos: ReembolsoReporte[];
};

function fmtFechaCorta(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Devuelve todos los datos del reporte (resumen + gráficos + detalle +
 * reembolsos del período) aplicando los filtros indicados.
 */
export async function getReporteData(
  filtros: ReporteFiltros = {}
): Promise<ReporteData> {
  const user = await getSessionUser();

  const vacio: ReporteData = {
    periodo: { desde: filtros.desde ?? null, hasta: filtros.hasta ?? null },
    resumen: {
      total: 0,
      operaciones: 0,
      promedio: 0,
      masAlto: 0,
      areaTop: "—",
      categoriaTop: "—",
    },
    porArea: [],
    porCategoria: [],
    porDia: [],
    detalle: [],
    reembolsos: [],
  };
  if (!user) return vacio;

  // Rango de fechas
  let desde: Date | undefined;
  let hasta: Date | undefined;
  if (filtros.desde) desde = new Date(filtros.desde);
  if (filtros.hasta) {
    hasta = new Date(filtros.hasta);
    hasta.setHours(23, 59, 59, 999);
  }

  const where: {
    areaId?: { in: string[] };
    categoria?: { in: Categoria[] };
    estado?: { in: EstadoGasto[] };
    fecha?: { gte?: Date; lte?: Date };
    creadoPor?: string;
  } = {};

  if (filtros.areaIds?.length) where.areaId = { in: filtros.areaIds };
  if (filtros.categorias?.length) where.categoria = { in: filtros.categorias };
  if (filtros.estados?.length) where.estado = { in: filtros.estados };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = desde;
    if (hasta) where.fecha.lte = hasta;
  }

  // El custodio solo ve sus propios gastos también en reportes.
  if (user.role === "CUSTODIO") where.creadoPor = user.id;

  const gastos = await prisma.gasto.findMany({
    where,
    include: {
      area: true,
      user: { select: { nombre: true } },
      aprobaciones: {
        where: { accion: "APROBADO" },
        orderBy: { fecha: "desc" },
        take: 1,
        include: { user: { select: { nombre: true } } },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const detalle: ReporteGastoRow[] = gastos.map((g) => ({
    id: g.id,
    fecha: g.fecha.toISOString(),
    area: g.area.nombre,
    categoria: g.categoria,
    categoriaLabel: CATEGORIA_LABELS[g.categoria],
    descripcion: g.descripcion,
    monto: g.monto,
    tieneComprobante: !!g.comprobanteUrl,
    comprobanteUrl: g.comprobanteUrl,
    estado: g.estado,
    registradoPor: g.user.nombre,
    aprobadoPor: g.aprobaciones[0]?.user.nombre ?? "—",
  }));

  // Resumen
  const total = detalle.reduce((a, g) => a + g.monto, 0);
  const operaciones = detalle.length;
  const promedio = operaciones > 0 ? total / operaciones : 0;
  const masAlto = detalle.reduce((m, g) => Math.max(m, g.monto), 0);

  // Agrupaciones
  const areaMap = new Map<string, number>();
  const catMap = new Map<string, number>();
  const diaMap = new Map<string, number>();

  for (const g of detalle) {
    areaMap.set(g.area, (areaMap.get(g.area) ?? 0) + g.monto);
    catMap.set(
      g.categoriaLabel,
      (catMap.get(g.categoriaLabel) ?? 0) + g.monto
    );
    const dia = fmtFechaCorta(new Date(g.fecha));
    diaMap.set(dia, (diaMap.get(dia) ?? 0) + g.monto);
  }

  const porArea: TotalPorClave[] = Array.from(areaMap.entries())
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total);

  const porCategoria: TotalPorClave[] = Array.from(catMap.entries())
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total);

  const porDia: PuntoLinea[] = Array.from(diaMap.entries())
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const resumen: ReporteResumen = {
    total,
    operaciones,
    promedio,
    masAlto,
    areaTop: porArea[0]?.clave ?? "—",
    categoriaTop: porCategoria[0]?.clave ?? "—",
  };

  // Reembolsos del período (por fecha de solicitud)
  const reembolsosRaw = await prisma.reembolso.findMany({
    where:
      desde || hasta
        ? { fechaSolicitud: { gte: desde, lte: hasta } }
        : undefined,
    include: {
      user: { select: { nombre: true } },
      _count: { select: { gastos: true } },
    },
    orderBy: { fechaSolicitud: "desc" },
  });

  const reembolsos: ReembolsoReporte[] = reembolsosRaw.map((r) => ({
    id: r.id,
    fechaSolicitud: r.fechaSolicitud.toISOString(),
    fechaReembolso: r.fechaReembolso?.toISOString() ?? null,
    estado: r.estado,
    montoTotal: r.montoTotal,
    solicitadoPor: r.user.nombre,
    numGastos: r._count.gastos,
  }));

  return {
    periodo: { desde: filtros.desde ?? null, hasta: filtros.hasta ?? null },
    resumen,
    porArea,
    porCategoria,
    porDia,
    detalle,
    reembolsos,
  };
}

export type MesResumen = {
  anio: number;
  mes: number; // 1-12
  etiqueta: string; // "Junio 2025"
  totalGastado: number;
  operaciones: number;
  numReembolsos: number;
  montoReembolsado: number;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/**
 * Resumen mensual de los últimos 12 meses: total gastado (APROBADO_FINAL),
 * número de operaciones, número de reembolsos y monto reembolsado.
 */
export async function getHistorial12Meses(): Promise<MesResumen[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [gastos, reembolsos] = await Promise.all([
    prisma.gasto.findMany({
      where: { estado: "APROBADO_FINAL", fecha: { gte: inicio } },
      select: { fecha: true, monto: true },
    }),
    prisma.reembolso.findMany({
      where: { fechaSolicitud: { gte: inicio } },
      select: { fechaSolicitud: true, montoTotal: true, estado: true },
    }),
  ]);

  // Construir los 12 meses
  const meses: MesResumen[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    meses.push({
      anio: d.getFullYear(),
      mes: d.getMonth() + 1,
      etiqueta: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
      totalGastado: 0,
      operaciones: 0,
      numReembolsos: 0,
      montoReembolsado: 0,
    });
  }

  const idx = (fecha: Date) => {
    const diff =
      (fecha.getFullYear() - inicio.getFullYear()) * 12 +
      (fecha.getMonth() - inicio.getMonth());
    return diff >= 0 && diff < 12 ? diff : -1;
  };

  for (const g of gastos) {
    const i = idx(new Date(g.fecha));
    if (i >= 0) {
      meses[i].totalGastado += g.monto;
      meses[i].operaciones += 1;
    }
  }

  for (const r of reembolsos) {
    const i = idx(new Date(r.fechaSolicitud));
    if (i >= 0) {
      meses[i].numReembolsos += 1;
      if (r.estado === "REEMBOLSADO") meses[i].montoReembolsado += r.montoTotal;
    }
  }

  // Más reciente primero
  return meses.reverse();
}
