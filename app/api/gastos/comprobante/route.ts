import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/**
 * Asocia la URL del comprobante (ya subido a Storage desde el cliente) a un
 * gasto recién creado. Solo el custodio dueño del gasto puede hacerlo.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { gastoId?: string; comprobanteUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { gastoId, comprobanteUrl } = body;
  if (!gastoId || !comprobanteUrl) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 }
    );
  }

  const gasto = await prisma.gasto.findUnique({ where: { id: gastoId } });
  if (!gasto) {
    return NextResponse.json(
      { error: "Gasto no encontrado." },
      { status: 404 }
    );
  }
  if (gasto.creadoPor !== user.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  await prisma.gasto.update({
    where: { id: gastoId },
    data: { comprobanteUrl },
  });

  return NextResponse.json({ ok: true });
}
