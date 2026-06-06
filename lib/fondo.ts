import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * El "fondo" de la empresa es la suma de los presupuestos de caja chica de
 * cada área activa. Este helper centraliza esos agregados para el dashboard,
 * el sidebar y los reportes.
 */
export type ResumenFondo = {
  montoTotal: number; // suma de montoTotal de áreas activas
  saldoActual: number; // suma de saldoActual de áreas activas
  umbralAlerta: number; // suma de umbrales (referencia global)
  areas: {
    id: string;
    nombre: string;
    montoTotal: number;
    saldoActual: number;
    umbralAlerta: number;
    montoMaximo: number;
    bajoUmbral: boolean;
  }[];
};

export async function getResumenFondo(): Promise<ResumenFondo> {
  const areas = await prisma.area.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      montoTotal: true,
      saldoActual: true,
      umbralAlerta: true,
      montoMaximo: true,
    },
  });

  const montoTotal = areas.reduce((a, x) => a + x.montoTotal, 0);
  const saldoActual = areas.reduce((a, x) => a + x.saldoActual, 0);
  const umbralAlerta = areas.reduce((a, x) => a + x.umbralAlerta, 0);

  return {
    montoTotal,
    saldoActual,
    umbralAlerta,
    areas: areas.map((x) => ({
      ...x,
      bajoUmbral: x.saldoActual < x.umbralAlerta,
    })),
  };
}
