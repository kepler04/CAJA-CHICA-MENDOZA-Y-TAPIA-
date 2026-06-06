"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Power,
  PowerOff,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Area } from "@prisma/client";

import { createArea, updateArea, toggleArea } from "@/app/actions/areas";
import { cn, formatPEN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AreasClient({
  areas,
  canManage,
}: {
  areas: Area[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal crear/editar
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [montoTotal, setMontoTotal] = useState("1000");
  const [umbralAlerta, setUmbralAlerta] = useState("200");
  const [montoMaximo, setMontoMaximo] = useState("150");
  const [formError, setFormError] = useState<string | null>(null);

  const [toToggle, setToToggle] = useState<Area | null>(null);

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDescripcion("");
    setMontoTotal("1000");
    setUmbralAlerta("200");
    setMontoMaximo("150");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(area: Area) {
    setEditing(area);
    setNombre(area.nombre);
    setDescripcion(area.descripcion ?? "");
    setMontoTotal(String(area.montoTotal));
    setUmbralAlerta(String(area.umbralAlerta));
    setMontoMaximo(String(area.montoMaximo));
    setFormError(null);
    setFormOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim()) {
      setFormError("El nombre del área es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      descripcion,
      montoTotal: parseFloat(montoTotal),
      umbralAlerta: parseFloat(umbralAlerta),
      montoMaximo: parseFloat(montoMaximo),
    };

    startTransition(async () => {
      const result = editing
        ? await updateArea({ id: editing.id, ...payload })
        : await createArea(payload);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmToggle() {
    if (!toToggle) return;
    const area = toToggle;
    startTransition(async () => {
      const result = await toggleArea({ id: area.id, activo: !area.activo });
      setToToggle(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Áreas
          </h1>
          <p className="text-sm text-muted-foreground">
            Cada área tiene su propio presupuesto de caja chica.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="shadow-sm">
            <Plus className="size-4" />
            Nueva área
          </Button>
        )}
      </header>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Caja chica</TableHead>
              <TableHead className="text-right">Saldo actual</TableHead>
              <TableHead>Estado</TableHead>
              {canManage && (
                <TableHead className="text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-8 opacity-50" />
                    <p className="text-sm font-medium text-foreground">
                      No hay áreas registradas
                    </p>
                    {canManage && (
                      <p className="text-xs">
                        Crea la primera con el botón “Nueva área”.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => {
                const bajo = area.saldoActual < area.umbralAlerta;
                return (
                  <TableRow key={area.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {area.nombre}
                      </div>
                      {area.descripcion && (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {area.descripcion}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {formatPEN(area.montoTotal)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-right font-medium tabular-nums",
                        bajo ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {formatPEN(area.saldoActual)}
                    </TableCell>
                    <TableCell>
                      {area.activo ? (
                        <Badge variant="success">
                          <span className="size-1.5 rounded-full bg-success" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <span className="size-1.5 rounded-full bg-destructive" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(area)}
                            disabled={isPending}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToToggle(area)}
                            disabled={isPending}
                            className={cn(
                              area.activo
                                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                                : "text-success hover:bg-success/10 hover:text-success"
                            )}
                          >
                            {area.activo ? (
                              <>
                                <PowerOff className="size-3.5" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="size-3.5" />
                                Activar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal crear/editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar área" : "Nueva área"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modifica los datos y el presupuesto de caja chica del área."
                : "Registra un área y asígnale su presupuesto de caja chica."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Administración"
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
                disabled={isPending}
              />
            </div>

            {/* Presupuesto */}
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
              <MontoField
                id="montoTotal"
                label="Caja chica"
                value={montoTotal}
                onChange={setMontoTotal}
                disabled={isPending}
              />
              <MontoField
                id="umbralAlerta"
                label="Umbral alerta"
                value={umbralAlerta}
                onChange={setUmbralAlerta}
                disabled={isPending}
              />
              <MontoField
                id="montoMaximo"
                label="Máx. por gasto"
                value={montoMaximo}
                onChange={setMontoMaximo}
                disabled={isPending}
              />
            </div>
            {editing && (
              <p className="text-xs text-muted-foreground">
                Saldo actual del área:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatPEN(editing.saldoActual)}
                </span>{" "}
                · no se modifica al editar (se gestiona con gastos y
                reembolsos).
              </p>
            )}

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear área"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de desactivar/activar */}
      <AlertDialog
        open={!!toToggle}
        onOpenChange={(open) => !open && setToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.activo ? "¿Desactivar área?" : "¿Activar área?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle?.activo ? (
                <>
                  El área <strong>{toToggle?.nombre}</strong> dejará de estar
                  disponible para registrar gastos y su caja chica no contará
                  en el total. Podrás reactivarla cuando quieras (no se
                  elimina).
                </>
              ) : (
                <>
                  El área <strong>{toToggle?.nombre}</strong> volverá a estar
                  disponible y su caja chica contará en el total.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmToggle();
              }}
              disabled={isPending}
              className={cn(
                toToggle?.activo &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {toToggle?.activo ? "Sí, desactivar" : "Sí, activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MontoField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          S/
        </span>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pl-7 tabular-nums"
        />
      </div>
    </div>
  );
}
