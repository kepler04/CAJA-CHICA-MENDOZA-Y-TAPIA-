import { getAreas } from "@/app/actions/areas";
import { getSessionUser } from "@/lib/auth";
import { AreasClient } from "./areas-client";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const [user, areas] = await Promise.all([getSessionUser(), getAreas()]);
  const canManage = user?.role === "GERENTE_GENERAL";

  return <AreasClient areas={areas} canManage={canManage} />;
}
