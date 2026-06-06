"use client";

import { useRouter } from "next/navigation";
import { FileSpreadsheet, CalendarRange, ChevronRight } from "lucide-react";

import type { MesResumen } from "@/app/actions/reportes";
import { formatPEN } from "@/lib/utils";
import { exportHistorialExcel } from "@/lib/exports/exportExcel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function HistorialClient({ meses }: { meses: MesResumen[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const hayDatos = meses.some(
    (m) => m.operaciones > 0 || m.numReembolsos > 0
  );

  function verMes(m: MesResumen) {
    const desde = iso(new Date(m.anio, m.mes - 1, 1));
    const hasta = iso(new Date(m.anio, m.mes, 0));
    router.push(`/reportes?desde=${desde}&hasta=${hasta}`);
  }

  function handleExport() {
    try {
      exportHistorialExcel(meses);
      toast({ variant: "success", title: "Historial exportado" });
    } catch {
      toast({ variant: "error", title: "No se pudo exportar" });
    }
  }

  const totalGastado = meses.reduce((a, m) => a + m.totalGastado, 0);
  const totalReembolsado = meses.reduce((a, m) => a + m.montoReembolsado, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Historial · 12 meses
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen mensual del último año. Haz clic en un mes para ver su
            reporte completo.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="size-4 text-emerald-600" />
          Exportar historial anual
        </Button>
      </header>

      <Card>
        <CardContent className="p-0">
          {!hayDatos ? (
            <EmptyState
              icon={CalendarRange}
              title="Sin movimientos en el último año"
              description="Cuando se registren gastos aprobados aparecerá el resumen mensual."
            />
          ) : (
            <div className="overflow-hidden rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Total gastado</TableHead>
                    <TableHead className="text-center">Nº operaciones</TableHead>
                    <TableHead className="text-center">Nº reembolsos</TableHead>
                    <TableHead className="text-right">
                      Monto reembolsado
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meses.map((m) => (
                    <TableRow
                      key={`${m.anio}-${m.mes}`}
                      className="cursor-pointer"
                      onClick={() => verMes(m)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {m.etiqueta}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPEN(m.totalGastado)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {m.operaciones}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {m.numReembolsos}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPEN(m.montoReembolsado)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground/50" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totales */}
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell className="font-semibold text-foreground">
                      Total anual
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatPEN(totalGastado)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatPEN(totalReembolsado)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
