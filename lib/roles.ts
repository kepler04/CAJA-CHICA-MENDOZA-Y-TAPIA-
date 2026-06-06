import type { Role } from "@prisma/client";

/**
 * Constantes y tipos relacionados con roles que pueden usarse tanto en
 * Client como en Server Components. Este módulo NO importa nada de
 * servidor (next/headers, prisma, supabase/server), por lo que es seguro
 * importarlo desde componentes marcados con "use client".
 */

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  role: Role;
};

/** Etiquetas legibles de cada rol para mostrar en la UI. */
export const ROLE_LABELS: Record<Role, string> = {
  CUSTODIO: "Custodio",
  GERENTE_ADMIN: "Gerente Administrativo",
  GERENTE_CONTABLE: "Gerente Contable",
  GERENTE_GENERAL: "Gerente General",
};

/**
 * Clases de estilo del badge de cada rol. Colores consistentes en todo
 * el sistema:
 *   CUSTODIO         → azul claro (#3b82f6)
 *   GERENTE_ADMIN    → amarillo   (#f59e0b)
 *   GERENTE_CONTABLE → morado     (#8b5cf6)
 *   GERENTE_GENERAL  → rojo       (#e50140)
 */
export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  CUSTODIO: "bg-[#3b82f6]/12 text-[#2563eb] ring-1 ring-inset ring-[#3b82f6]/25",
  GERENTE_ADMIN:
    "bg-[#f59e0b]/15 text-[#b45309] ring-1 ring-inset ring-[#f59e0b]/30",
  GERENTE_CONTABLE:
    "bg-[#8b5cf6]/12 text-[#7c3aed] ring-1 ring-inset ring-[#8b5cf6]/25",
  GERENTE_GENERAL:
    "bg-[#e50140]/12 text-[#e50140] ring-1 ring-inset ring-[#e50140]/25",
};

/** Punto de color sólido por rol (para indicadores pequeños). */
export const ROLE_DOT_CLASSES: Record<Role, string> = {
  CUSTODIO: "bg-[#3b82f6]",
  GERENTE_ADMIN: "bg-[#f59e0b]",
  GERENTE_CONTABLE: "bg-[#8b5cf6]",
  GERENTE_GENERAL: "bg-[#e50140]",
};

/** Orden y lista de roles para selects/menús. */
export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CUSTODIO", label: ROLE_LABELS.CUSTODIO },
  { value: "GERENTE_ADMIN", label: ROLE_LABELS.GERENTE_ADMIN },
  { value: "GERENTE_CONTABLE", label: ROLE_LABELS.GERENTE_CONTABLE },
  { value: "GERENTE_GENERAL", label: ROLE_LABELS.GERENTE_GENERAL },
];
