"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  PenLine,
  Paperclip,
  Inbox,
  AlertCircle,
} from "lucide-react";
import type { Role } from "@prisma/client";

import {
  aprobarGasto,
  rechazarGasto,
  aprobarMasivo,
  type GastoPendiente,
} from "@/app/actions/aprobaciones";
import { CATEGORIA_LABELS } from "@/lib/gastos";
import { cn, formatPEN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { GastoDetalle } from "@/app/(dashboard)/gastos/gasto-detalle";

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const NIVEL_LABEL: Partial<Record<Role, string>> = {
  GERENTE_ADMIN: "Nivel 1 · Administrativo",
  GERENTE_CONTABLE: "Nivel 2 · Contable",
  GERENTE_GENERAL: "Nivel 3 · Aprobación final",
};

export function AprobacionesClient({
  gastos,
  role,
}: {
  gastos: GastoPendiente[];
  role: Role;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aprobar, setAprobar] = useState<GastoPendiente | null>(null);
  const [rechazar, setRechazar] = useState<GastoPendiente | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [masivoOpen, setMasivoOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const esFinal = role === "GERENTE_GENERAL";

  const allSelected =
    gastos.length > 0 && selected.size === gastos.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(gastos.map((g) => g.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const seleccionados = useMemo(
    () => gastos.filter((g) => selected.has(g.id)),
    [gastos, selected]
  );
  const totalSeleccionado = seleccionados.reduce((a, g) => a + g.monto, 0);

  function doAprobar() {
    if (!aprobar) return;
    const gasto = aprobar;
    startTransition(async () => {
      const res = await aprobarGasto(gasto.id);
      setAprobar(null);
      if (res.ok) {
        toast({
          variant: "success",
          title: "Gasto aprobado",
          description: `${formatPEN(gasto.monto)} · ${gasto.area.nombre}`,
        });
        router.refresh();
      } else {
        toast({ variant: "error", title: "No se pudo aprobar", description: res.error });
      }
    });
  }

  function doRechazar() {
    if (!rechazar) return;
    if (!motivo.trim()) {
      setMotivoError("Escribe el motivo del rechazo.");
      return;
    }
    const gasto = rechazar;
    startTransition(async () => {
      const res = await rechazarGasto(gasto.id, motivo);
      if (res.ok) {
        setRechazar(null);
        setMotivo("");
        toast({
          variant: "info",
          title: "Gasto rechazado",
          description: `${formatPEN(gasto.monto)} · ${gasto.area.nombre}`,
        });
        router.refresh();
      } else {
        setMotivoError(res.error);
      }
    });
  }

  function doMasivo() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await aprobarMasivo(ids);
      setMasivoOpen(false);
      if (res.ok) {
        setSelected(new Set());
        const { aprobados = 0, omitidos = 0 } = res.data ?? {};
        toast({
          variant: "success",
          title: `${aprobados} gasto(s) aprobado(s)`,
          description:
            omitidos > 0
              ? `${omitidos} se omitieron por haber cambiado de estado.`
              : "Firma rápida completada.",
        });
        router.refresh();
      } else {
        toast({ variant: "error", title: "No se pudo aprobar", description: res.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Aprobaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            {NIVEL_LABEL[role]} · firma virtual de gastos pendientes.
          </p>
        </div>
        {selected.size > 0 && (
          <Button
            onClick={() => setMasivoOpen(true)}
            disabled={isPending}
            className="bg-emerald-600 shadow-sm hover:bg-emerald-700"
          >
            <PenLine className="size-4" />
            Aprobar seleccionados ({selected.size})
          </Button>
        )}
      </header>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    disabled={gastos.length === 0 || isPending}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead className="text-center">Comp.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="size-9 opacity-50" />
                      <p className="text-sm font-medium text-foreground">
                        No hay gastos pendientes de aprobación
                      </p>
                      <p className="text-xs">
                        Cuando lleguen gastos a tu nivel aparecerán aquí.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                gastos.map((g) => {
                  const checked = selected.has(g.id);
                  return (
                    <TableRow
                      key={g.id}
                      data-state={checked ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(g.id)}
                          disabled={isPending}
                          aria-label={`Seleccionar gasto ${g.id}`}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer whitespace-nowrap tabular-nums"
                        onClick={() => setDetalleId(g.id)}
                      >
                        {fmtFecha(g.fecha)}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setDetalleId(g.id)}
                      >
                        {g.area.nombre}
                      </TableCell>
                      <TableCell>{CATEGORIA_LABELS[g.categoria]}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-1 text-muted-foreground">
                          {g.descripcion}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-foreground">
                        {formatPEN(g.monto)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {g.user.nombre}
                      </TableCell>
                      <TableCell className="text-center">
                        {g.comprobanteUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={g.comprobanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex text-primary hover:opacity-70"
                              >
                                <Paperclip className="size-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Ver comprobante</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => setAprobar(g)}
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRechazar(g);
                              setMotivo("");
                              setMotivoError(null);
                            }}
                            disabled={isPending}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <XCircle className="size-3.5" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>

      {/* Modal aprobar individual */}
      <Dialog
        open={!!aprobar}
        onOpenChange={(open) => !open && setAprobar(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firmar y aprobar gasto</DialogTitle>
            <DialogDescription>
              Confirma la aprobación de este gasto. Tu firma quedará
              registrada con fecha y hora.
            </DialogDescription>
          </DialogHeader>

          {aprobar && (
            <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-sm">
              <Resumen label="Área" value={aprobar.area.nombre} />
              <Resumen label="Descripción" value={aprobar.descripcion} />
              <Resumen
                label="Monto"
                value={formatPEN(aprobar.monto)}
                strong
              />
              {esFinal && (
                <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  Esta es la aprobación final: el monto se descontará del
                  saldo del fondo.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAprobar(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={doAprobar}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PenLine className="size-4" />
              )}
              Firmar y aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal rechazar */}
      <Dialog
        open={!!rechazar}
        onOpenChange={(open) => {
          if (!open) {
            setRechazar(null);
            setMotivo("");
            setMotivoError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar gasto</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. El custodio podrá verlo en el
              historial del gasto.
            </DialogDescription>
          </DialogHeader>

          {rechazar && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
                <Resumen label="Área" value={rechazar.area.nombre} />
                <Resumen
                  label="Monto"
                  value={formatPEN(rechazar.monto)}
                  strong
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo">
                  Motivo del rechazo{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    setMotivoError(null);
                  }}
                  placeholder="Ej. El comprobante no es legible."
                  disabled={isPending}
                  autoFocus
                />
                {motivoError && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {motivoError}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRechazar(null);
                setMotivo("");
                setMotivoError(null);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={doRechazar}
              disabled={isPending || !motivo.trim()}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal aprobación masiva */}
      <Dialog open={masivoOpen} onOpenChange={setMasivoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar seleccionados</DialogTitle>
            <DialogDescription>
              Firma rápida de {selected.size} gasto(s) en una sola operación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-sm">
            <Resumen
              label="Gastos seleccionados"
              value={String(selected.size)}
            />
            <Resumen
              label="Monto total"
              value={formatPEN(totalSeleccionado)}
              strong
            />
            {esFinal && (
              <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                Aprobación final: el total se descontará del fondo.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMasivoOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={doMasivo}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PenLine className="size-4" />
              )}
              Firmar y aprobar {selected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal detalle (reutilizado de Fase 3) */}
      <GastoDetalle
        gastoId={detalleId}
        open={!!detalleId}
        onOpenChange={(open) => !open && setDetalleId(null)}
      />
    </div>
  );
}

export default AprobacionesClient;

function Resumen({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-foreground",
          strong && "font-display text-base font-semibold tabular-nums"
        )}
      >
        {value}
      </span>
    </div>
  );
}
