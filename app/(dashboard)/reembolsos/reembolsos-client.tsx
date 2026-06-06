"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Loader2,
  HandCoins,
  ClipboardCheck,
  CheckCircle2,
  Inbox,
  History,
} from "lucide-react";
import type { EstadoReembolso, Role } from "@prisma/client";

import {
  crearReembolso,
  cambiarEstadoReembolso,
  type GastoReembolsable,
  type ReembolsoConRelaciones,
} from "@/app/actions/reembolsos";
import { CATEGORIA_LABELS } from "@/lib/gastos";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ReembolsoBadge } from "@/components/reembolso-badge";
import { ReembolsoDetalleModal } from "./reembolso-detalle";

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ReembolsosClient({
  gastosListos,
  reembolsos,
  role,
}: {
  gastosListos: GastoReembolsable[];
  reembolsos: ReembolsoConRelaciones[];
  role: Role;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const totalListo = gastosListos.reduce((acc, g) => acc + g.monto, 0);

  const puedeSolicitar =
    (role === "CUSTODIO" || role === "GERENTE_GENERAL") &&
    gastosListos.length > 0;

  function doSolicitar() {
    startTransition(async () => {
      const res = await crearReembolso();
      setSolicitarOpen(false);
      if (res.ok) {
        toast({
          variant: "success",
          title: "Reembolso solicitado",
          description: `${res.data?.cantidad} gasto(s) · ${formatPEN(res.data?.montoTotal ?? 0)}`,
        });
        router.refresh();
      } else {
        toast({ variant: "error", title: "No se pudo solicitar", description: res.error });
      }
    });
  }

  function avanzarEstado(
    id: string,
    destino: EstadoReembolso
  ) {
    startTransition(async () => {
      const res = await cambiarEstadoReembolso(id, destino);
      if (res.ok) {
        if (destino === "REEMBOLSADO" && res.data?.nuevoSaldo != null) {
          toast({
            variant: "success",
            title: "✅ Fondo repuesto",
            description: `Nuevo saldo: ${formatPEN(res.data.nuevoSaldo)}`,
          });
        } else {
          toast({
            variant: "info",
            title: "Estado actualizado",
            description: "El reembolso avanzó de estado.",
          });
        }
        router.refresh();
      } else {
        toast({ variant: "error", title: "No se pudo actualizar", description: res.error });
      }
    });
  }

  /** Botón de cambio de estado visible según rol y estado actual. */
  function AccionEstado({ r }: { r: ReembolsoConRelaciones }) {
    if (role === "GERENTE_ADMIN" && r.estado === "SOLICITADO") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            avanzarEstado(r.id, "EN_REVISION");
          }}
        >
          <ClipboardCheck className="size-3.5" />
          Pasar a revisión
        </Button>
      );
    }
    if (role === "GERENTE_GENERAL" && r.estado === "EN_REVISION") {
      return (
        <Button
          size="sm"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={(e) => {
            e.stopPropagation();
            avanzarEstado(r.id, "REEMBOLSADO");
          }}
        >
          <CheckCircle2 className="size-3.5" />
          Marcar reembolsado
        </Button>
      );
    }
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Reembolsos
        </h1>
        <p className="text-sm text-muted-foreground">
          Agrupa los gastos aprobados y repón el fondo de caja chica.
        </p>
      </header>

      {/* ── Sección 1: gastos listos para reembolsar ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <HandCoins className="size-5 text-primary" />
            Gastos listos para reembolsar
          </h2>
          {(role === "CUSTODIO" || role === "GERENTE_GENERAL") && (
            <Button
              onClick={() => setSolicitarOpen(true)}
              disabled={!puedeSolicitar || isPending}
              className="shadow-sm"
            >
              <Wallet className="size-4" />
              Solicitar reembolso
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastosListos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="size-8 opacity-50" />
                      <p className="text-sm font-medium text-foreground">
                        No hay gastos pendientes de reembolso
                      </p>
                      <p className="text-xs">
                        Aparecerán aquí los gastos con aprobación final.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {gastosListos.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {fmtFecha(g.fecha)}
                      </TableCell>
                      <TableCell>{g.area.nombre}</TableCell>
                      <TableCell>{CATEGORIA_LABELS[g.categoria]}</TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="line-clamp-1 text-muted-foreground">
                          {g.descripcion}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatPEN(g.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Fila de total */}
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={4}
                      className="text-right font-semibold text-foreground"
                    >
                      Total a reembolsar:
                    </TableCell>
                    <TableCell className="text-right font-display text-base font-semibold tabular-nums text-foreground">
                      {formatPEN(totalListo)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Sección 2: historial de reembolsos ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <History className="size-5 text-primary" />
          Historial de reembolsos
        </h2>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha solicitud</TableHead>
                <TableHead className="text-center">N° gastos</TableHead>
                <TableHead className="text-right">Monto total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Solicitado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reembolsos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <History className="size-8 opacity-50" />
                      <p className="text-sm font-medium text-foreground">
                        Aún no hay reembolsos
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reembolsos.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setDetalleId(r.id)}
                  >
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtFecha(r.fechaSolicitud)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {r._count.gastos}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatPEN(r.montoTotal)}
                    </TableCell>
                    <TableCell>
                      <ReembolsoBadge estado={r.estado} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.user.nombre}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end">
                        <AccionEstado r={r} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Modal solicitar reembolso */}
      <Dialog open={solicitarOpen} onOpenChange={setSolicitarOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar reembolso</DialogTitle>
            <DialogDescription>
              Se agruparán los siguientes {gastosListos.length} gasto(s)
              aprobado(s) en una solicitud de reembolso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastosListos.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {fmtFecha(g.fecha)}
                      </TableCell>
                      <TableCell>{g.area.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPEN(g.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">
                Monto total
              </span>
              <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                {formatPEN(totalListo)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSolicitarOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={doSolicitar} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal detalle */}
      <ReembolsoDetalleModal
        reembolsoId={detalleId}
        open={!!detalleId}
        onOpenChange={(open) => !open && setDetalleId(null)}
      />
    </div>
  );
}
