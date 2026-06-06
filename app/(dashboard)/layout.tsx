import { redirect } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { getSessionUser } from "@/lib/auth";
import { contarPendientesPorRol } from "@/lib/pendientes";
import { getResumenFondo } from "@/lib/fondo";
import { prisma } from "@/lib/prisma";
import { ToastProvider } from "@/components/ui/toast";

// Todas las rutas del panel consultan la BD y la sesión: nunca se
// prerenderizan en build. Se renderizan por petición.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Defensa en profundidad: el middleware ya protege estas rutas,
  // pero si la sesión expiró entre el middleware y el render, redirigimos.
  if (!user) {
    redirect("/login");
  }

  // Datos para el sidebar: badge de aprobaciones, estado del fondo (suma de
  // áreas) y pendiente de reembolso para la alerta.
  const [pendingCount, fondo, pendienteReembolsoAgg] = await Promise.all([
    contarPendientesPorRol(user.role),
    getResumenFondo(),
    prisma.gasto.aggregate({
      _sum: { monto: true },
      where: { estado: "APROBADO_FINAL", reembolso: null },
    }),
  ]);

  // Alerta si alguna área está por debajo de su propio umbral.
  const algunAreaBajo = fondo.areas.some((a) => a.bajoUmbral);
  const pendienteReembolso = pendienteReembolsoAgg._sum.monto ?? 0;

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar
          user={user}
          pendingCount={pendingCount}
          algunAreaBajo={algunAreaBajo}
          pendienteReembolso={pendienteReembolso}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
