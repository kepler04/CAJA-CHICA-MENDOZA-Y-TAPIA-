"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Paperclip,
  Filter,
  ChevronLeft,
  ChevronRight,
  Receipt,
  X,
  Loader2,
} from "lucide-react";
import type { Area, Categoria, EstadoGasto } from "@prisma/client";

import {
  getGastos,
  type GastoConRelaciones,
  type GastosPage,
} from "@/app/actions/gastos";
import {
  CATEGORIA_LABELS,
  CATEGORIA_OPTIONS,
  ESTADO_OPTIONS,
} from "@/lib/gastos";
import { formatPEN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EstadoBadge } from "@/components/estado-badge";
import { GastoForm } from "./gasto-form";
import { GastoDetalle } from "./gasto-detalle";

const ALL = "__all__";

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Filtros = {
  areaId: string;
  categoria: string;
  estado: string;
  desde: string;
  hasta: string;
};

const FILTROS_VACIOS: Filtros = {
  areaId: ALL,
  categoria: ALL,
  estado: ALL,
  desde: "",
  hasta: "",
};

export function GastosClient({
  initial,
  areas,
  areasActivas,
  canCreate,
}: {
  initial: GastosPage;
  areas: Area[];
  areasActivas: Area[];
  canCreate: boolean;
}) {
  const [data, setData] = useState<GastosPage>(initial);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [isPending, startTransition] = useTransition();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const hayFiltros =
    filtros.areaId !== ALL ||
    filtros.categoria !== ALL ||
    filtros.estado !== ALL ||
    !!filtros.desde ||
    !!filtros.hasta;

  function fetchPage(page: number, f: Filtros = filtros) {
    startTransition(async () => {
      const result = await getGastos({
        page,
        areaId: f.areaId === ALL ? undefined : f.areaId,
        categoria:
          f.categoria === ALL ? undefined : (f.categoria as Categoria),
        estado: f.estado === ALL ? undefined : (f.estado as EstadoGasto),
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
      });
      setData(result);
    });
  }

  function updateFiltro(key: keyof Filtros, value: string) {
    const next = { ...filtros, [key]: value };
    setFiltros(next);
    fetchPage(1, next);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    fetchPage(1, FILTROS_VACIOS);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Gastos
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro y seguimiento de los gastos de caja chica.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawerOpen(true)} className="shadow-sm">
            <Plus className="size-4" />
            Nuevo gasto
          </Button>
        )}
      </header>

      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="size-4" />
          Filtros
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="size-3" />
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            value={filtros.areaId}
            onValueChange={(v) => updateFiltro("areaId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtros.categoria}
            onValueChange={(v) => updateFiltro("categoria", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las categorías</SelectItem>
              {CATEGORIA_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtros.estado}
            onValueChange={(v) => updateFiltro("estado", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {ESTADO_OPTIONS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filtros.desde}
            onChange={(e) => updateFiltro("desde", e.target.value)}
            aria-label="Desde"
          />
          <Input
            type="date"
            value={filtros.hasta}
            onChange={(e) => updateFiltro("hasta", e.target.value)}
            aria-label="Hasta"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Comp.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data.gastos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Receipt className="size-8 opacity-50" />
                      <p className="text-sm font-medium text-foreground">
                        No hay gastos
                      </p>
                      <p className="text-xs">
                        {hayFiltros
                          ? "Prueba ajustando los filtros."
                          : canCreate
                            ? "Registra el primero con “Nuevo gasto”."
                            : "Aún no se han registrado gastos."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.gastos.map((g: GastoConRelaciones) => (
                  <TableRow
                    key={g.id}
                    className="cursor-pointer"
                    onClick={() => setDetalleId(g.id)}
                  >
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtFecha(g.fecha)}
                    </TableCell>
                    <TableCell>{g.area.nombre}</TableCell>
                    <TableCell>{CATEGORIA_LABELS[g.categoria]}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="line-clamp-1 text-muted-foreground">
                        {g.descripcion}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-foreground">
                      {formatPEN(g.monto)}
                    </TableCell>
                    <TableCell className="text-center">
                      {g.comprobanteUrl ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Paperclip className="size-4 text-primary" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Tiene comprobante</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={g.estado} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TooltipProvider>

        {/* Paginación */}
        {data.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} de {data.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1 || isPending}
                onClick={() => fetchPage(data.page - 1)}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="px-2 text-muted-foreground tabular-nums">
                {data.page} / {Math.max(1, data.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages || isPending}
                onClick={() => fetchPage(data.page + 1)}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer nuevo gasto */}
      {canCreate && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Nuevo gasto</SheetTitle>
              <SheetDescription>
                Registra un gasto de caja chica. Quedará pendiente de
                aprobación.
              </SheetDescription>
            </SheetHeader>
            <GastoForm
              areas={areasActivas}
              onSuccess={() => {
                setDrawerOpen(false);
                fetchPage(1);
              }}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Modal detalle */}
      <GastoDetalle
        gastoId={detalleId}
        open={!!detalleId}
        onOpenChange={(open) => !open && setDetalleId(null)}
      />
    </div>
  );
}
