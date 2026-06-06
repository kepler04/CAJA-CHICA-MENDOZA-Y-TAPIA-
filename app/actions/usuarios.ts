"use server";

import { revalidatePath } from "next/cache";
import type { Role, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const VALID_ROLES: Role[] = [
  "CUSTODIO",
  "GERENTE_ADMIN",
  "GERENTE_CONTABLE",
  "GERENTE_GENERAL",
];

/** Verifica que el usuario actual sea GERENTE_GENERAL. */
async function requireGerenteGeneral() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "No autenticado." };
  }
  if (user.role !== "GERENTE_GENERAL") {
    return {
      ok: false as const,
      error: "No tienes permisos para esta acción.",
    };
  }
  return { ok: true as const, user };
}

/** Lista todos los usuarios, los más nuevos primero. */
export async function getUsuarios(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Crea un usuario en Supabase Auth y su perfil en la tabla User de forma
 * atómica. Si la creación del perfil falla, se revierte borrando la cuenta
 * de Auth (rollback entre los dos sistemas). Solo GERENTE_GENERAL.
 */
export async function createUsuario(input: {
  nombre: string;
  email: string;
  password: string;
  role: Role;
}): Promise<ActionResult<User>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  const nombre = input.nombre?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  const role = input.role;

  // Validaciones
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "El correo electrónico no es válido." };
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }
  if (!VALID_ROLES.includes(role)) {
    return { ok: false, error: "El rol seleccionado no es válido." };
  }

  // Evitar duplicados en el perfil
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese correo." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY para crear usuarios en Auth.",
    };
  }

  // 1) Crear cuenta en Supabase Auth (confirmada automáticamente)
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, role },
    });

  if (authError || !authData?.user) {
    return {
      ok: false,
      error:
        authError?.message ?? "No se pudo crear la cuenta de autenticación.",
    };
  }

  // 2) Crear el perfil en la base de datos; si falla, rollback en Auth
  try {
    const user = await prisma.user.create({
      data: { email, nombre, role },
    });
    revalidatePath("/usuarios");
    revalidatePath("/dashboard");
    return { ok: true, data: user };
  } catch {
    // Rollback: eliminar la cuenta de Auth recién creada
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return {
      ok: false,
      error: "No se pudo guardar el perfil del usuario. Se revirtió el cambio.",
    };
  }
}

/** Activa o desactiva un usuario (no se elimina). Solo GERENTE_GENERAL. */
export async function toggleUsuario(input: {
  id: string;
  activo: boolean;
}): Promise<ActionResult<User>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  // No permitir que el gerente se desactive a sí mismo.
  if (input.id === auth.user.id && !input.activo) {
    return { ok: false, error: "No puedes desactivar tu propia cuenta." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: input.id },
      data: { activo: input.activo },
    });
    revalidatePath("/usuarios");
    revalidatePath("/dashboard");
    return { ok: true, data: user };
  } catch {
    return { ok: false, error: "No se pudo cambiar el estado del usuario." };
  }
}

/** Cambia el rol de un usuario. Solo GERENTE_GENERAL. */
export async function updateRol(input: {
  id: string;
  role: Role;
}): Promise<ActionResult<User>> {
  const auth = await requireGerenteGeneral();
  if (!auth.ok) return auth;

  if (!VALID_ROLES.includes(input.role)) {
    return { ok: false, error: "El rol seleccionado no es válido." };
  }

  // Evitar quedarse sin ningún GERENTE_GENERAL: si este usuario es el que
  // estamos degradando y es el último gerente general activo, bloquear.
  if (input.id === auth.user.id && input.role !== "GERENTE_GENERAL") {
    const otrosGerentes = await prisma.user.count({
      where: {
        role: "GERENTE_GENERAL",
        activo: true,
        id: { not: input.id },
      },
    });
    if (otrosGerentes === 0) {
      return {
        ok: false,
        error:
          "Debe existir al menos un Gerente General. Asigna otro antes de cambiar tu rol.",
      };
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: input.id },
      data: { role: input.role },
    });
    revalidatePath("/usuarios");
    return { ok: true, data: user };
  } catch {
    return { ok: false, error: "No se pudo actualizar el rol." };
  }
}
