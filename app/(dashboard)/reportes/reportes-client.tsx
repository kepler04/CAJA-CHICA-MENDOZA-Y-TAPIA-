"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Filter,
  BarChart3,
  ArrowUpDown,
  TrendingUp,
  Loader2,
  Paperclip,
  CalendarRange,
} from "lucide-react";
import type { Area } from "@prisma/client";

import {
  getReporteData,
  type ReporteData,
  type ReporteFiltros,
  type ReporteGastoRow,
} from "@/app/actions/reportes";
import {
  CATEGORIA_OPTIONS,
  ESTADO_OPTIONS,
} from "@/lib/gastos";
import { cn, formatPEN } from "@/lib/utils";
import { exportExcel } from "@/lib/exports/exportExcel";
import { exportPDF } from "@/lib/exports/exportPDF";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { EstadoBadge } from "@/components/estado-badge";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarrasPorArea,
  DonutPorCategoria,
  LineaEvolucion,
} from "./reporte-charts";

type Periodo =
  | "semana"
  | "quincena"
  | "mes"
  | "mes_anterior"
  | "personalizado";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "semana", label: "Esta semana" },
  { value: "quincena", label: "Esta quincena" },
  { value: "mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "personalizado", label: "Personalizado" },
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Calcula el rango {desde, hasta} de un período rápido. */
function rangoDePeriodo(p: Periodo): { desde: string; hasta: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (p === "semana") {
    const day = now.getDay() || 7; // lunes = 1
    const lunes = new Date(now);
    lunes.setDate(now.getDate() - day + 1);
    return { desde: iso(lunes), hasta: iso(now) };
  }
  if (p === "quincena") {
    const d = now.getDate();
    const desde = d <= 15 ? new Date(y, m, 1) : new Date(y, m, 16);
    return { desde: iso(desde), hasta: iso(now) };
  }
  if (p === "mes") {
    return { desde: iso(new Date(y, m, 1)), hasta: iso(new Date(y, m + 1, 0)) };
  }
  if (p === "mes_anterior") {
    return {
      desde: iso(new Date(y, m - 1, 1)),
      hasta: iso(new Date(y, m, 0)),
    };
  }
  return { desde: "", hasta: "" };
}

type SortKey = keyof Pick<
  ReporteGastoRow,
  "fecha" | "area" | "categoriaLabel" | "monto" | "estado"
>;

export function ReportesClient({
  areas,
  desdeInicial,
  hastaInicial,
}: {
  areas: Area[];
  desdeInicial?: string;
  hastaInicial?: string;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const tienePeriodoInicial = !!(desdeInicial && hastaInicial);

  const [periodo, setPeriodo] = useState<Periodo>(
    tienePeriodoInicial ? "personalizado" : "mes"
  );
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [desde, setDesde] = useState(desdeInicial ?? "");
  const [hasta, setHasta] = useState(hastaInicial ?? "");

  const [data, setData] = useState<ReporteData | null>(null);

  // Si se llega con un período en la URL (desde el historial), genera solo.
  const autoGenerado = useRef(false);
  useEffect(() => {
    if (tienePeriodoInicial && !autoGenerado.current) {
      autoGenerado.current = true;
      startTransition(async () => {
        const result = await getReporteData({
          desde: desdeInicial,
          hasta: hastaInicial,
        });
        setData(result);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Orden de la tabla
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function generar() {
    const rango =
      periodo === "personalizado"
        ? { desde, hasta }
        : rangoDePeriodo(periodo);

    const filtros: ReporteFiltros = {
      areaIds: areaIds.length ? areaIds : undefined,
      categorias: categorias.length
        ? (categorias as ReporteFiltros["categorias"])
        : undefined,
      estados: estados.length
        ? (estados as ReporteFiltros["estados"])
        : undefined,
      desde: rango.desde || undefined,
      hasta: rango.hasta || undefined,
    };

    startTransition(async () => {
      const result = await getReporteData(filtros);
      setData(result);
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const detalleOrdenado = data
    ? [...data.detalle].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : [];

  const totalDetalle = data
    ? data.detalle.reduce((a, g) => a + g.monto, 0)
    : 0;

  function periodoSlug() {
    if (!data) return "reporte";
    const { desde, hasta } = data.periodo;
    if (desde && hasta) return `${desde}_${hasta}`;
    return "historico";
  }

  function handleExcel() {
    if (!data) return;
    try {
      exportExcel(data, periodoSlug());
      toast({ variant: "success", title: "Excel generado" });
    } catch {
      toast({ variant: "error", title: "No se pudo exportar a Excel" });
    }
  }

  function handlePDF() {
    if (!data) return;
    try {
      exportPDF(data, periodoSlug());
      toast({ variant: "success", title: "PDF generado" });
    } catch {
      toast({ variant: "error", title: "No se pudo exportar a PDF" });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Reportes
          </h1>
          <p className="text-sm text-muted-foreground">
            Genera reportes filtrables y expórtalos a Excel o PDF.
          </p>
        </div>
        <Link href="/reportes/historial">
          <Button variant="outline">
            <CalendarRange className="size-4" />
            Historial 12 meses
          </Button>
        </Link>
      </header>

      {/* Panel de filtros */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Áreas</Label>
              <MultiSelect
                options={areas.map((a) => ({ value: a.id, label: a.nombre }))}
                selected={areaIds}
                onChange={setAreaIds}
                placeholder="Todas las áreas"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categorías</Label>
              <MultiSelect
                options={CATEGORIA_OPTIONS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
                selected={categorias}
                onChange={setCategorias}
                placeholder="Todas las categorías"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estados</Label>
              <MultiSelect
                options={ESTADO_OPTIONS.map((e) => ({
                  value: e.value,
                  label: e.label,
                }))}
                selected={estados}
                onChange={setEstados}
                placeholder="Todos los estados"
              />
            </div>
          </div>

          {/* Períodos rápidos */}
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <div className="flex flex-wrap gap-2">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriodo(p.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    periodo === p.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango personalizado */}
          {periodo === "personalizado" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="desde" className="text-xs">
                  Desde
                </Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hasta" className="text-xs">
                  Hasta
                </Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={generar} disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BarChart3 className="size-4" />
              )}
              Generar reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {!data ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BarChart3}
              title="Genera un reporte"
              description="Elige los filtros y el período, luego pulsa “Generar reporte” para ver el resumen, los gráficos y el detalle."
            />
          </CardContent>
        </Card>
      ) : data.detalle.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={TrendingUp}
              title="Sin resultados"
              description="No hay gastos para los filtros seleccionados. Prueba ampliando el período."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Botones de exportación */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleExcel}>
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={handlePDF}>
              <FileText className="size-4 text-red-600" />
              Exportar PDF
            </Button>
          </div>

          {/* Sección 1: resumen ejecutivo */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ResumenCard label="Total de gastos" value={formatPEN(data.resumen.total)} />
            <ResumenCard label="Nº de operaciones" value={String(data.resumen.operaciones)} />
            <ResumenCard label="Promedio por gasto" value={formatPEN(data.resumen.promedio)} />
            <ResumenCard label="Gasto más alto" value={formatPEN(data.resumen.masAlto)} />
            <ResumenCard label="Área con más gasto" value={data.resumen.areaTop} />
            <ResumenCard label="Categoría más usada" value={data.resumen.categoriaTop} />
          </section>

          {/* Sección 2: gráficos */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                  Gastos por área
                </h2>
                <BarrasPorArea data={data.porArea} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                  Distribución por categoría
                </h2>
                <DonutPorCategoria data={data.porCategoria} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                  Evolución de gastos por día
                </h2>
                <LineaEvolucion data={data.porDia} />
              </CardContent>
            </Card>
          </section>

          {/* Sección 3: tabla detallada ordenable */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <SortableHead label="Fecha" k="fecha" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Área" k="area" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Categoría" k="categoriaLabel" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <TableHead>Descripción</TableHead>
                      <SortableHead label="Monto" k="monto" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                      <TableHead className="text-center">Comp.</TableHead>
                      <SortableHead label="Estado" k="estado" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <TableHead>Aprobado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleOrdenado.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {new Date(g.fecha).toLocaleDateString("es-PE")}
                        </TableCell>
                        <TableCell>{g.area}</TableCell>
                        <TableCell>{g.categoriaLabel}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="line-clamp-1 text-muted-foreground">
                            {g.descripcion}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-foreground">
                          {formatPEN(g.monto)}
                        </TableCell>
                        <TableCell className="text-center">
                          {g.tieneComprobante ? (
                            <a
                              href={g.comprobanteUrl ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex text-primary hover:opacity-70"
                            >
                              <Paperclip className="size-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={g.estado} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {g.aprobadoPor}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total */}
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={4} className="text-right font-semibold text-foreground">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-display text-base font-semibold tabular-nums text-foreground">
                        {formatPEN(totalDetalle)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResumenCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        <ArrowUpDown
          className={cn(
            "size-3",
            active ? "opacity-100" : "opacity-40",
            active && sortDir === "asc" && "rotate-180"
          )}
        />
      </button>
    </TableHead>
  );
}
