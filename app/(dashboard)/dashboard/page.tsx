import Link from "next/link";
import { TrendingDown, Clock, HandCoins, ArrowRight, Receipt } from "lucide-react";
import type { Categoria } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser, ROLE_LABELS } from "@/lib/auth";
import { getResumenFondo } from "@/lib/fondo";
import { cn, formatPEN } from "@/lib/utils";
import { CATEGORIA_LABELS, CATEGORIA_COLORS } from "@/lib/gastos";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/estado-badge";
import { DonutCategorias, type DonutDato } from "./donut-categorias";
import { FondoCard } from "./fondo-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();

  // Rango del mes actual
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    fondo,
    gastosMesAgg,
    gastadoTotalAgg,
    pendienteReembolsoAgg,
    pendientesPorEstado,
    ultimos,
    gastosMesPorCategoria,
  ] = await Promise.all([
    getResumenFondo(),
    // Gastos del mes APROBADO_FINAL (suma)
    prisma.gasto.aggregate({
      _sum: { monto: true },
      where: {
        estado: "APROBADO_FINAL",
        fecha: { gte: inicioMes, lte: finMes },
      },
    }),
    // Gastado total APROBADO_FINAL (todo el histórico) para el ciclo del fondo
    prisma.gasto.aggregate({
      _sum: { monto: true },
      where: { estado: "APROBADO_FINAL" },
    }),
    // Pendiente de reembolso: APROBADO_FINAL sin reembolso asignado
    prisma.gasto.aggregate({
      _sum: { monto: true },
      _count: { _all: true },
      where: { estado: "APROBADO_FINAL", reembolso: null },
    }),
    // Pendientes agrupados por estado para el breakdown por nivel
    prisma.gasto.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: { estado: { in: ["PENDIENTE", "APROBADO_N1", "APROBADO_N2"] } },
    }),
    // Últimos 5 gastos
    prisma.gasto.findMany({
      include: { area: true },
      orderBy: { fecha: "desc" },
      take: 5,
    }),
    // Agrupado por categoría (mes, aprobados final) para el donut
    prisma.gasto.groupBy({
      by: ["categoria"],
      _sum: { monto: true },
      where: {
        estado: "APROBADO_FINAL",
        fecha: { gte: inicioMes, lte: finMes },
      },
    }),
  ]);

  // Breakdown de pendientes por nivel:
  //   Nivel 1 → PENDIENTE · Nivel 2 → APROBADO_N1 · Nivel 3 → APROBADO_N2
  const countPorEstado = (estado: string) =>
    pendientesPorEstado.find((p) => p.estado === estado)?._count._all ?? 0;
  const nivel1 = countPorEstado("PENDIENTE");
  const nivel2 = countPorEstado("APROBADO_N1");
  const nivel3 = countPorEstado("APROBADO_N2");
  const pendientesCount = nivel1 + nivel2 + nivel3;

  const nombre = user?.nombre ?? "";
  const rol = user ? ROLE_LABELS[user.role] : "";

  const montoTotal = fondo.montoTotal;
  const saldoActual = fondo.saldoActual;

  const gastosMes = gastosMesAgg._sum.monto ?? 0;
  const gastadoTotal = gastadoTotalAgg._sum.monto ?? 0;
  const pendienteReembolso = pendienteReembolsoAgg._sum.monto ?? 0;
  const pendienteReembolsoCount = pendienteReembolsoAgg._count._all ?? 0;

  const donutData: DonutDato[] = gastosMesPorCategoria
    .map((g) => {
      const categoria = g.categoria as Categoria;
      return {
        categoria,
        label: CATEGORIA_LABELS[categoria],
        total: g._sum.monto ?? 0,
        color: CATEGORIA_COLORS[categoria],
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{rol}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Bienvenido{nombre ? `, ${nombre.split(" ")[0]}` : ""}.
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Resumen del ciclo del fondo de caja chica de Mendoza y Tapia S.A.C.
        </p>
      </header>

      {/* Tarjeta del fondo con saldo en vivo, ciclo y alertas */}
      <FondoCard
        saldoInicial={saldoActual}
        montoTotal={montoTotal}
        gastado={gastadoTotal}
        pendienteReembolso={pendienteReembolso}
        areas={fondo.areas}
      />

      {/* Métricas */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Gastos del mes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Gastos del mes
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                  {formatPEN(gastosMes)}
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <TrendingDown className="size-[18px]" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Aprobados este mes
            </p>
          </CardContent>
        </Card>

        {/* Pendiente de reembolso */}
        <Link href="/reembolsos" className="block">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Pendiente de reembolso
                  </p>
                  <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                    {formatPEN(pendienteReembolso)}
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <HandCoins className="size-[18px]" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {pendienteReembolsoCount} gasto(s) listos
                </p>
                <ArrowRight className="size-3.5 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Gastos pendientes (breakdown por nivel) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Gastos pendientes
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                  {pendientesCount}
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <Clock className="size-[18px]" />
              </span>
            </div>
            <dl className="mt-3 space-y-1.5">
              <NivelRow label="Pendiente nivel 1" value={nivel1} dot="bg-slate-400" />
              <NivelRow label="Pendiente nivel 2" value={nivel2} dot="bg-amber-500" />
              <NivelRow label="Pendiente nivel 3" value={nivel3} dot="bg-blue-500" />
            </dl>
          </CardContent>
        </Card>
      </section>

      {/* Gráfico + últimos movimientos */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Donut por categoría */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-foreground">
              Gastos por categoría (mes)
            </h2>
            <DonutCategorias data={donutData} />
          </CardContent>
        </Card>

        {/* Últimos 5 */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">
                Últimos movimientos
              </h2>
              <Link
                href="/gastos"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todos
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {ultimos.length === 0 ? (
              <div className="grid place-items-center rounded-lg border border-dashed border-border bg-muted/30 py-10 text-center">
                <Receipt className="mb-2 size-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Sin movimientos todavía.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {ultimos.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {g.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.area.nombre} ·{" "}
                        {new Date(g.fecha).toLocaleDateString("es-PE", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <EstadoBadge estado={g.estado} />
                    <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                      {formatPEN(g.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function NivelRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
