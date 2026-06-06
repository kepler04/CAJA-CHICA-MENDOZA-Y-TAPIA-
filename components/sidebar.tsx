"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  CheckCircle2,
  Wallet,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { AlertTriangle } from "lucide-react";

import { cn, formatPEN } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/logout-button";
import { ROLE_LABELS, type SessionUser } from "@/lib/roles";
import { useAprobacionesPendientes } from "@/hooks/useAprobacionesPendientes";
import { useToast } from "@/components/ui/toast";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Si está presente, el ítem solo se muestra a estos roles. */
  roles?: SessionUser["role"][];
  /** Clave para inyectar un badge numérico (ej. pendientes). */
  badge?: "pending";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Áreas", href: "/areas", icon: Building2 },
  { label: "Gastos", href: "/gastos", icon: Receipt },
  {
    label: "Aprobaciones",
    href: "/aprobaciones",
    icon: CheckCircle2,
    badge: "pending",
  },
  { label: "Reembolsos", href: "/reembolsos", icon: Wallet },
  { label: "Reportes", href: "/reportes", icon: BarChart3 },
  {
    label: "Usuarios",
    href: "/usuarios",
    icon: Users,
    roles: ["GERENTE_GENERAL"],
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    roles: ["GERENTE_GENERAL"],
  },
];

function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

export function Sidebar({
  user,
  pendingCount = 0,
  algunAreaBajo = false,
  pendienteReembolso = 0,
}: {
  user: SessionUser;
  pendingCount?: number;
  algunAreaBajo?: boolean;
  pendienteReembolso?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Conteo de pendientes en vivo vía Supabase Realtime + notificación toast.
  const livePending = useAprobacionesPendientes(user.role, {
    initialCount: pendingCount,
    onNuevoPendiente: (g) => {
      toast({
        title: "Nuevo gasto pendiente de aprobación",
        description: `${formatPEN(g.monto)} · Área: ${g.areaNombre ?? "—"}`,
      });
      // Refresca la ruta para que la tabla de /aprobaciones se actualice.
      router.refresh();
    },
  });

  // Alerta de reembolso urgente: alguna área bajo su umbral con gastos
  // listos para reembolsar.
  const alertaReembolso = algunAreaBajo && pendienteReembolso > 0;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca / logo */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
          <span className="font-display text-base font-semibold leading-none text-white">
            CC
          </span>
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold tracking-tight text-white">
            Caja Chica
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
            Mendoza y Tapia
          </p>
        </div>
      </div>

      {/* Tarjeta de usuario */}
      <div className="mx-3 mb-2 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 ring-1 ring-white/20">
            <AvatarFallback className="bg-sidebar-active text-xs font-semibold text-white">
              {initials(user.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {user.nombre}
            </p>
            <p className="truncate text-xs text-sidebar-muted">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {visibleItems.map((item, idx) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showBadge = item.badge === "pending" && livePending > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={cn(
                "group relative flex animate-fade-in-up items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white"
              )}
            >
              {/* Indicador lateral del ítem activo */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-ring transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "size-[18px] shrink-0 transition-transform",
                  !active && "group-hover:scale-105"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {showBadge && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-bold leading-none text-warning-foreground tabular-nums">
                  {livePending > 99 ? "99+" : livePending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alerta de reembolso urgente */}
      {alertaReembolso && (
        <Link
          href="/reembolsos"
          className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-orange-400/40 bg-orange-500/15 px-3 py-2.5 text-orange-50 transition-colors hover:bg-orange-500/25"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-300" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold leading-tight">
              Saldo bajo
            </p>
            <p className="text-[11px] leading-tight text-orange-100/90">
              {formatPEN(pendienteReembolso)} listos para reembolsar
            </p>
          </div>
        </Link>
      )}

      {/* Footer: cerrar sesión */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <LogoutButton />
        <p className="mt-2 px-3 text-[10px] text-sidebar-muted/70">
          Mendoza y Tapia S.A.C. · v1.0
        </p>
      </div>
    </aside>
  );
}
