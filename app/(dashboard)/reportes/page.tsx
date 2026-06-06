import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ReportesClient } from "./reportes-client";

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const areas = await prisma.area.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <ReportesClient
      areas={areas}
      desdeInicial={
        typeof searchParams.desde === "string" ? searchParams.desde : undefined
      }
      hastaInicial={
        typeof searchParams.hasta === "string" ? searchParams.hasta : undefined
      }
    />
  );
}
