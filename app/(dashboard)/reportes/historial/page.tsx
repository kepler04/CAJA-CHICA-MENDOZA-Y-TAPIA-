import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { getHistorial12Meses } from "@/app/actions/reportes";
import { HistorialClient } from "./historial-client";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const meses = await getHistorial12Meses();

  return <HistorialClient meses={meses} />;
}
