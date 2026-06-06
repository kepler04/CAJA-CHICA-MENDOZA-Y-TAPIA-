import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getGastos } from "@/app/actions/gastos";
import { GastosClient } from "./gastos-client";

export default async function GastosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [initial, areas, areasActivas] = await Promise.all([
    getGastos({ page: 1 }),
    prisma.area.findMany({ orderBy: { nombre: "asc" } }),
    prisma.area.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // Solo el CUSTODIO puede registrar gastos.
  const canCreate = user.role === "CUSTODIO";

  return (
    <GastosClient
      initial={initial}
      areas={areas}
      areasActivas={areasActivas}
      canCreate={canCreate}
    />
  );
}
