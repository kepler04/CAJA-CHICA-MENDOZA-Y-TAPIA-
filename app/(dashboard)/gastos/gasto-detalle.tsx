"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  FileText,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
  User as UserIcon,
  Hash,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { getGastoById, type GastoDetalle } from "@/app/actions/gastos";
import {
  CATEGORIA_LABELS,
  TIPO_COMPROBANTE_LABELS,
} from "@/lib/gastos";
import { ROLE_LABELS } from "@/lib/roles";
import { cn, formatPEN } from "@/lib/utils";
import { EstadoBadge } from "@/components/estado-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function esImagen(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url.split("?")[0]);
}

export function GastoDetalle({
  gastoId,
  open,
  onOpenChange,
}: {
  gastoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [gasto, setGasto] = useState<GastoDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !gastoId) return;
    setLoading(true);
    setGasto(null);
    getGastoById(gastoId)
      .then((g) => setGasto(g))
      .finally(() => setLoading(false));
  }, [open, gastoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle del gasto</DialogTitle>
          <DialogDescription>
            Información completa e historial de aprobaciones.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !gasto ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No se pudo cargar el gasto.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Cabecera: monto + estado (badge grande) */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monto
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                  {formatPEN(gasto.monto)}
                </p>
              </div>
              <EstadoBadge
                estado={gasto.estado}
                className="px-3.5 py-1.5 text-sm"
              />
            </div>

            {/* Datos */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dato icon={Calendar} label="Fecha" value={fmtFecha(gasto.fecha)} />
              <Dato icon={Building2} label="Área" value={gasto.area.nombre} />
              <Dato
                icon={Tag}
                label="Categoría"
                value={CATEGORIA_LABELS[gasto.categoria]}
              />
              <Dato
                icon={FileText}
                label="Tipo de comprobante"
                value={TIPO_COMPROBANTE_LABELS[gasto.tipoComprobante]}
              />
              <Dato
                icon={Hash}
                label="N° de comprobante"
                value={gasto.numeroComprobante || "—"}
              />
              <Dato
                icon={UserIcon}
                label="Registrado por"
                value={gasto.user.nombre}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Descripción
              </p>
              <p className="text-sm text-foreground">{gasto.descripcion}</p>
            </div>

            {/* Comprobante */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Comprobante
              </p>
              {gasto.comprobanteUrl ? (
                esImagen(gasto.comprobanteUrl) ? (
                  <a
                    href={gasto.comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gasto.comprobanteUrl}
                      alt="Comprobante"
                      className="max-h-80 w-full object-contain bg-muted/30"
                    />
                  </a>
                ) : (
                  <a
                    href={gasto.comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="grid size-10 place-items-center rounded-md bg-destructive/10 text-destructive">
                      <FileText className="size-5" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      Ver comprobante (PDF)
                    </span>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </a>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin comprobante adjunto.
                </p>
              )}
            </div>

            {/* Historial de aprobaciones — timeline vertical */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Historial de firmas
              </p>
              <ol className="relative space-y-0">
                {/* Paso inicial: registro del gasto */}
                <TimelineItem
                  tipo="registro"
                  titulo={`Registrado por ${gasto.user.nombre}`}
                  subtitulo={ROLE_LABELS[gasto.user.role]}
                  fecha={fmtFechaHora(gasto.createdAt)}
                  esUltimo={gasto.aprobaciones.length === 0}
                />

                {/* Cada aprobación / rechazo */}
                {gasto.aprobaciones.map((ap, idx) => {
                  const rechazo = ap.accion?.toUpperCase().includes("RECHAZ");
                  const esUltimo = idx === gasto.aprobaciones.length - 1;
                  return (
                    <TimelineItem
                      key={ap.id}
                      tipo={rechazo ? "rechazo" : "aprobacion"}
                      titulo={
                        rechazo
                          ? `Rechazado por ${ap.user.nombre}`
                          : `${ap.nivel === 3 ? "Aprobado final" : "Aprobado"} por ${ap.user.nombre}`
                      }
                      subtitulo={`${ROLE_LABELS[ap.user.role]} · Nivel ${ap.nivel}`}
                      fecha={fmtFechaHora(ap.fecha)}
                      motivo={rechazo ? ap.observacion ?? undefined : undefined}
                      esUltimo={esUltimo}
                    />
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Dato({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

type TimelineTipo = "registro" | "aprobacion" | "rechazo";

function TimelineItem({
  tipo,
  titulo,
  subtitulo,
  fecha,
  motivo,
  esUltimo,
}: {
  tipo: TimelineTipo;
  titulo: string;
  subtitulo: string;
  fecha: string;
  motivo?: string;
  esUltimo: boolean;
}) {
  const styles = {
    registro: { dot: "bg-primary", icon: FileText },
    aprobacion: { dot: "bg-emerald-500", icon: CheckCircle2 },
    rechazo: { dot: "bg-red-500", icon: XCircle },
  }[tipo];
  const Icon = styles.icon;
  const esRechazo = tipo === "rechazo";

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Línea conectora vertical */}
      {!esUltimo && (
        <span
          aria-hidden
          className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-border"
        />
      )}
      {/* Punto */}
      <div
        className={cn(
          "relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white",
          styles.dot
        )}
      >
        <Icon className="size-4" />
      </div>
      {/* Contenido */}
      <div className="flex-1 space-y-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            esRechazo ? "text-red-600" : "text-foreground"
          )}
        >
          {titulo}
        </p>
        <p className="text-xs text-muted-foreground">{subtitulo}</p>
        <p className="text-xs text-muted-foreground/70">{fecha}</p>
        {motivo && (
          <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            <span className="font-medium">Motivo:</span> {motivo}
          </p>
        )}
      </div>
    </li>
  );
}
