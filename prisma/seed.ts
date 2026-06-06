import { PrismaClient, type Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Usuarios de prueba, uno por cada rol del sistema.
 *
 * NOTA IMPORTANTE: estos registros son los PERFILES en la tabla `User`
 * (nombre + rol). La autenticación (email/contraseña) la gestiona
 * Supabase Auth, que es un sistema independiente de la base de datos de
 * Prisma. Para que un usuario pueda iniciar sesión debes crear su cuenta
 * en Supabase Auth con EXACTAMENTE el mismo email; así `lib/auth.ts`
 * empareja la sesión de Supabase con el perfil y su rol.
 *
 * Crea las cuentas de Auth desde el panel de Supabase
 * (Authentication -> Users -> Add user) o con la API admin.
 */
const usuarios: { email: string; nombre: string; role: Role }[] = [
  {
    email: "nicool@mendozaytapia.com",
    nombre: "Nicool Custodio",
    role: "CUSTODIO",
  },
  {
    email: "admin@mendozaytapia.com",
    nombre: "Administrador General",
    role: "GERENTE_ADMIN",
  },
  {
    email: "contable@mendozaytapia.com",
    nombre: "Gerencia Contable",
    role: "GERENTE_CONTABLE",
  },
  {
    email: "dalena@mendozaytapia.com",
    nombre: "Dalena Mendoza",
    role: "GERENTE_GENERAL",
  },
];

async function main() {
  console.log("🌱 Iniciando seed…");

  // 1) Usuarios (idempotente con upsert por email)
  for (const u of usuarios) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, role: u.role, activo: true },
      create: u,
    });
    console.log(`  ✓ Usuario: ${user.email} (${user.role})`);
  }

  // 2) Fondo inicial (solo si no existe ninguno)
  const fondoExistente = await prisma.fondo.findFirst();
  if (!fondoExistente) {
    const fondo = await prisma.fondo.create({
      data: {
        montoTotal: 1000,
        saldoActual: 1000,
        umbralAlerta: 200,
      },
    });
    console.log(
      `  ✓ Fondo creado: total S/ ${fondo.montoTotal} · saldo S/ ${fondo.saldoActual} · umbral S/ ${fondo.umbralAlerta}`
    );
  } else {
    console.log("  • Fondo ya existente, se omite la creación.");
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
