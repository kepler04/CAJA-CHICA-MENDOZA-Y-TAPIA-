"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, User as UserIcon } from "lucide-react";

import {
  getReembolsoById,
  type ReembolsoDetalle,
} from "@/app/actions/reembolsos";
import { CATEGORIA_LABELS } from "@/lib/gastos";
import { formatPEN } from "@/lib/utils";
import { ReembolsoBadge } from "@/components/reembolso-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtFechaHora(d: Date | string) {
  return new Date(d).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReembolsoDetalleModal({
  reembolsoId,
  open,
  onOpenChange,
}: {
  reembolsoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<ReembolsoDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reembolsoId) return;
    setLoading(true);
    setData(null);
    getReembolsoById(reembolsoId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, reembolsoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle del reembolso</DialogTitle>
          <DialogDescription>
            Gastos agrupados en esta solicitud de reembolso.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !data ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No se pudo cargar el reembolso.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monto total
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                  {formatPEN(data.montoTotal)}
                </p>
              </div>
              <ReembolsoBadge
                estado={data.estado}
                className="px-3.5 py-1.5 text-sm"
              />
            </div>

            {/* Datos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <UserIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Solicitado por
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {data.user.nombre}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Fecha de solicitud
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {fmtFechaHora(data.fechaSolicitud)}
                  </p>
                </div>
              </div>
              {data.fechaReembolso && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fecha de reembolso
                    </p>
                    <p className="text-sm font-medium text-emerald-700">
                      {fmtFechaHora(data.fechaReembolso)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Gastos incluidos */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Gastos incluidos ({data.gastos.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.gastos.map((rg) => (
                      <TableRow key={rg.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {fmtFecha(rg.gasto.fecha)}
                        </TableCell>
                        <TableCell>{rg.gasto.area.nombre}</TableCell>
                        <TableCell>
                          {CATEGORIA_LABELS[rg.gasto.categoria]}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatPEN(rg.gasto.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
