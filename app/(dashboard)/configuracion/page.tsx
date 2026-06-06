import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Settings, ArrowRight } from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { getResumenFondo } from "@/lib/fondo";
import { formatPEN } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "GERENTE_GENERAL") redirect("/dashboard");

  const fondo = await getResumenFondo();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground">
          El presupuesto de caja chica se administra por área. Aquí ves el
          resumen general.
        </p>
      </header>

      {/* Resumen del fondo total */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Caja chica total
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {formatPEN(fondo.montoTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Suma de {fondo.areas.length} área(s) activa(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo disponible
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {formatPEN(fondo.saldoActual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Umbral total
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {formatPEN(fondo.umbralAlerta)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Presupuesto por área */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Settings className="size-4 text-primary" />
              Presupuesto por área
            </h2>
            <Link href="/areas">
              <Button variant="outline" size="sm">
                <Building2 className="size-4" />
                Gestionar áreas
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {fondo.areas.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No hay áreas con presupuesto"
              description="Crea un área en la sección Áreas y asígnale su caja chica."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Caja chica</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Umbral</TableHead>
                    <TableHead className="text-right">Máx. gasto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fondo.areas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">
                        {a.nombre}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPEN(a.montoTotal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPEN(a.saldoActual)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPEN(a.umbralAlerta)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPEN(a.montoMaximo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
