"use client";

import { Wallet, AlertTriangle, Building2 } from "lucide-react";

import { cn, formatPEN } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type AreaResumen = {
  id: string;
  nombre: string;
  montoTotal: number;
  saldoActual: number;
  umbralAlerta: number;
  bajoUmbral: boolean;
};

export function FondoCard({
  saldoInicial,
  montoTotal,
  gastado,
  pendienteReembolso,
  areas,
}: {
  saldoInicial: number;
  montoTotal: number;
  gastado: number;
  pendienteReembolso: number;
  areas: AreaResumen[];
}) {
  const saldoActual = saldoInicial;

  const porcentaje =
    montoTotal > 0
      ? Math.max(0, Math.min(100, (saldoActual / montoTotal) * 100))
      : 0;
  // Alerta si CUALQUIER área está bajo su propio umbral.
  const algunAreaBajo = areas.some((a) => a.bajoUmbral);
  const disponible = saldoActual;
  const alertaReembolso = algunAreaBajo && pendienteReembolso > 0;

  return (
    <div className="space-y-4">
      {/* Alerta naranja de reembolso urgente */}
      {alertaReembolso && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3.5 text-orange-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-500" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              ⚠️ Saldo bajo en alguna área — hay{" "}
              {formatPEN(pendienteReembolso)} listos para reembolsar
            </p>
            <p className="text-sm text-orange-700">
              Solicita o procesa el reembolso para reponer el fondo.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de saldo bajo sin nada que reembolsar */}
      {algunAreaBajo && pendienteReembolso === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-destructive">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              ⚠️ Una o más áreas tienen el saldo por debajo de su umbral.
            </p>
            <p className="text-sm text-destructive/90">
              Revisa el desglose por área y solicita un reembolso.
            </p>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo total de caja chica
              </p>
              <p
                className={cn(
                  "font-display text-4xl font-semibold tabular-nums",
                  algunAreaBajo ? "text-destructive" : "text-foreground"
                )}
              >
                {formatPEN(saldoActual)}
              </p>
              <p className="text-sm text-muted-foreground">
                de {formatPEN(montoTotal)} · suma de {areas.length} área(s)
              </p>
            </div>
            <span
              className={cn(
                "grid size-12 place-items-center rounded-xl",
                algunAreaBajo
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/12 text-success"
              )}
            >
              <Wallet className="size-6" />
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="mt-5 space-y-1.5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  algunAreaBajo ? "bg-destructive" : "bg-success"
                )}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{porcentaje.toFixed(0)}% disponible</span>
              <span>{formatPEN(montoTotal)}</span>
            </div>
          </div>

          {/* Ciclo del fondo */}
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <CicloItem label="Monto total" value={formatPEN(montoTotal)} />
            <CicloItem
              label="Gastado (final)"
              value={formatPEN(gastado)}
              tone="destructive"
            />
            <CicloItem
              label="Disponible"
              value={formatPEN(disponible)}
              tone={algunAreaBajo ? "destructive" : "success"}
            />
            <CicloItem
              label="Pend. reembolso"
              value={formatPEN(pendienteReembolso)}
              tone="warning"
            />
          </dl>
        </CardContent>
      </Card>

      {/* Desglose por área */}
      {areas.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Building2 className="size-4 text-primary" />
              Caja chica por área
            </h2>
            <ul className="space-y-3">
              {areas.map((a) => {
                const pct =
                  a.montoTotal > 0
                    ? Math.max(0, Math.min(100, (a.saldoActual / a.montoTotal) * 100))
                    : 0;
                return (
                  <li key={a.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {a.nombre}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          a.bajoUmbral
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatPEN(a.saldoActual)} / {formatPEN(a.montoTotal)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          a.bajoUmbral ? "bg-destructive" : "bg-success"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CicloItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600",
    destructive: "text-destructive",
    warning: "text-orange-600",
  }[tone];

  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-display text-base font-semibold tabular-nums",
          toneClass
        )}
      >
        {value}
      </dd>
    </div>
  );
}
