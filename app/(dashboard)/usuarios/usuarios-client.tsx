"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Power,
  PowerOff,
  Loader2,
  AlertCircle,
  Users as UsersIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Role, User } from "@prisma/client";

import { createUsuario, toggleUsuario, updateRol } from "@/app/actions/usuarios";
import { cn } from "@/lib/utils";
import {
  ROLE_LABELS,
  ROLE_BADGE_CLASSES,
  ROLE_DOT_CLASSES,
  ROLE_OPTIONS,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ROLE_BADGE_CLASSES[role]
      )}
    >
      <span className={cn("size-1.5 rounded-full", ROLE_DOT_CLASSES[role])} />
      {ROLE_LABELS[role]}
    </span>
  );
}

export function UsuariosClient({
  usuarios,
  currentUserId,
  adminConfigured,
}: {
  usuarios: User[];
  currentUserId: string;
  adminConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal crear usuario
  const [formOpen, setFormOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("CUSTODIO");
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmación toggle
  const [toToggle, setToToggle] = useState<User | null>(null);

  function openCreate() {
    setNombre("");
    setEmail("");
    setPassword("");
    setRole("CUSTODIO");
    setShowPassword(false);
    setFormError(null);
    setFormOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const result = await createUsuario({ nombre, email, password, role });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setFormOpen(false);
      router.refresh();
    });
  }

  function handleRoleChange(user: User, newRole: Role) {
    if (newRole === user.role) return;
    startTransition(async () => {
      const result = await updateRol({ id: user.id, role: newRole });
      if (!result.ok) {
        // Revertimos visualmente refrescando desde el servidor.
        alert(result.error);
      }
      router.refresh();
    });
  }

  function confirmToggle() {
    if (!toToggle) return;
    const user = toToggle;
    startTransition(async () => {
      const result = await toggleUsuario({
        id: user.id,
        activo: !user.activo,
      });
      setToToggle(null);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra las cuentas y los roles del sistema.
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </header>

      {!adminConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Para <strong>crear</strong> nuevos usuarios falta configurar{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            en el archivo <code>.env</code>. Mientras tanto puedes cambiar
            roles y activar/desactivar usuarios existentes.
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UsersIcon className="size-8 opacity-50" />
                    <p className="text-sm font-medium text-foreground">
                      No hay usuarios registrados
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      {user.nombre}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (tú)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {/* Select inline para cambiar el rol */}
                      <Select
                        value={user.role}
                        onValueChange={(v) =>
                          handleRoleChange(user, v as Role)
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 w-auto min-w-[180px] border-none bg-transparent px-0 shadow-none hover:bg-muted/50 focus:ring-0 [&>svg]:opacity-40">
                          <SelectValue asChild>
                            <span>
                              <RoleBadge role={user.role} />
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.activo ? (
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
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToToggle(user)}
                          disabled={isPending || (isSelf && user.activo)}
                          title={
                            isSelf && user.activo
                              ? "No puedes desactivar tu propia cuenta"
                              : undefined
                          }
                          className={cn(
                            user.activo
                              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                              : "text-success hover:bg-success/10 hover:text-success"
                          )}
                        >
                          {user.activo ? (
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal crear usuario */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Crea una cuenta de acceso y asígnale un rol. La contraseña es
              temporal; el usuario podrá cambiarla luego.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="u-nombre">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. María Pérez"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="u-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@mendozaytapia.com"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="u-password">
                Contraseña temporal{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="u-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="u-role">
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Role)}
                disabled={isPending}
              >
                <SelectTrigger id="u-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación toggle */}
      <AlertDialog
        open={!!toToggle}
        onOpenChange={(open) => !open && setToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.activo
                ? "¿Desactivar usuario?"
                : "¿Activar usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle?.activo ? (
                <>
                  <strong>{toToggle?.nombre}</strong> no podrá iniciar sesión
                  mientras esté inactivo. Podrás reactivarlo cuando quieras (no
                  se elimina).
                </>
              ) : (
                <>
                  <strong>{toToggle?.nombre}</strong> volverá a tener acceso al
                  sistema.
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
