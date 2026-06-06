import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { nivelDeRol } from "@/lib/pendientes";
import { getGastosPendientes } from "@/app/actions/aprobaciones";
import { AprobacionesClient } from "./aprobaciones-client";

export default async function AprobacionesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // El CUSTODIO (y cualquier rol sin nivel de aprobación) no tiene acceso.
  if (!nivelDeRol(user.role)) {
    redirect("/dashboard");
  }

  const gastos = await getGastosPendientes();

  return <AprobacionesClient gastos={gastos} role={user.role} />;
}
