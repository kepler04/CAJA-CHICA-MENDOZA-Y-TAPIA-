import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import {
  getGastosParaReembolsar,
  getReembolsos,
} from "@/app/actions/reembolsos";
import { ReembolsosClient } from "./reembolsos-client";

export default async function ReembolsosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [gastosListos, reembolsos] = await Promise.all([
    getGastosParaReembolsar(),
    getReembolsos(),
  ]);

  return (
    <ReembolsosClient
      gastosListos={gastosListos}
      reembolsos={reembolsos}
      role={user.role}
    />
  );
}
