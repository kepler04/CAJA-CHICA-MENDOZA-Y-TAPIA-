import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Página raíz de respaldo. Normalmente el middleware ya redirige "/" antes
 * de llegar aquí, pero si por alguna razón no lo hace (p. ej. el middleware
 * no se ejecuta), esta página garantiza la redirección y evita un 404.
 */
export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
