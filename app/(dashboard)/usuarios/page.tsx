import { redirect } from "next/navigation";

import { getUsuarios } from "@/app/actions/usuarios";
import { getSessionUser } from "@/lib/auth";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getSessionUser();

  // Defensa en profundidad: solo GERENTE_GENERAL. El middleware ya bloquea,
  // pero validamos también aquí por si la sesión cambió.
  if (!user) redirect("/login");
  if (user.role !== "GERENTE_GENERAL") redirect("/dashboard");

  const usuarios = await getUsuarios();

  return (
    <UsuariosClient
      usuarios={usuarios}
      currentUserId={user.id}
      adminConfigured={isAdminConfigured}
    />
  );
}
